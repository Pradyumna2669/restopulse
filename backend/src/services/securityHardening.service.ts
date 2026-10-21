import { Request, Response, NextFunction } from 'express';
import { RateLimitStatus } from '../types';

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export class SecurityHardeningService {
  // In-memory request timestamp store: key -> array of request epoch milliseconds
  private requestStore: Map<string, number[]> = new Map();

  // Rate Limiting Rules
  private rules: Record<string, RateLimitRule> = {
    general: { windowMs: 60 * 1000, maxRequests: 200, keyPrefix: 'gen' },
    publicTokens: { windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'tok' },
    webhooks: { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'wbk' },
    payments: { windowMs: 60 * 1000, maxRequests: 40, keyPrefix: 'pay' },
    auth: { windowMs: 60 * 1000, maxRequests: 15, keyPrefix: 'ath' }
  };

  private testRateLimitStrict: boolean = false;

  /**
   * Toggle strict rate limiting for automated unit testing (allows simulating exhaustion with low thresholds)
   */
  setStrictTestMode(enabled: boolean) {
    this.testRateLimitStrict = enabled;
  }

  /**
   * Reset the in-memory request store (useful between test runs)
   */
  resetStore() {
    this.requestStore.clear();
  }

  /**
   * Express Middleware applying Helmet-equivalent enterprise HTTP security headers
   */
  securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // 1. Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;"
    );

    // 2. Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 3. Prevent Clickjacking via iframes
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // 4. Enforce HTTPS via Strict-Transport-Security (1 year)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // 5. Legacy XSS filter protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 6. Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 7. Permissions Policy (Disables unused hardware sensors in iframe contexts)
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');

    // 8. Mask server identity
    res.removeHeader('X-Powered-By');

    next();
  };

  /**
   * Factory returning a sliding-window rate limiter middleware for specific endpoint groups
   */
  createRateLimiter(ruleKey: 'general' | 'publicTokens' | 'webhooks' | 'payments' | 'auth' = 'general') {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const rule = this.rules[ruleKey] || this.rules.general;

      // In strict test mode or header override, scale down limit to test 429 responses
      const maxAllowed = (this.testRateLimitStrict || req.headers['x-test-rate-limit'] === 'true')
        ? Math.min(rule.maxRequests, 3)
        : rule.maxRequests;

      const now = Date.now();
      const windowStart = now - rule.windowMs;
      const key = `${rule.keyPrefix}:${clientIp}`;

      let timestamps = this.requestStore.get(key) || [];
      // Evict entries older than windowStart
      timestamps = timestamps.filter(t => t > windowStart);

      if (timestamps.length >= maxAllowed) {
        const oldestTime = timestamps[0];
        const resetSeconds = Math.max(1, Math.ceil((oldestTime + rule.windowMs - now) / 1000));

        res.setHeader('X-RateLimit-Limit', maxAllowed.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', (Math.floor(now / 1000) + resetSeconds).toString());
        res.setHeader('Retry-After', resetSeconds.toString());

        return res.status(429).json({
          error: 'Too many requests, please try again later.',
          retryAfterSeconds: resetSeconds,
          limit: maxAllowed
        });
      }

      timestamps.push(now);
      this.requestStore.set(key, timestamps);

      const remaining = Math.max(0, maxAllowed - timestamps.length);
      res.setHeader('X-RateLimit-Limit', maxAllowed.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', (Math.floor(now / 1000) + Math.ceil(rule.windowMs / 1000)).toString());

      next();
    };
  }

  /**
   * Inspect current rate limit usage for a client IP
   */
  getRateLimitStatus(ip: string, ruleKey: string = 'general'): RateLimitStatus {
    const rule = this.rules[ruleKey] || this.rules.general;
    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const key = `${rule.keyPrefix}:${ip}`;

    let timestamps = this.requestStore.get(key) || [];
    timestamps = timestamps.filter(t => t > windowStart);

    const remaining = Math.max(0, rule.maxRequests - timestamps.length);
    const resetTime = new Date(now + rule.windowMs).toISOString();

    return {
      ip,
      endpoint: ruleKey,
      requestsCount: timestamps.length,
      limit: rule.maxRequests,
      remaining,
      resetTime
    };
  }
}

export const securityService = new SecurityHardeningService();
