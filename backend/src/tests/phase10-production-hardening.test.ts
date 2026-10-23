import http from 'http';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { apiRouter } from '../routes/api.routes';
import { securityService } from '../services/securityHardening.service';
import { backupService } from '../services/backup.service';
import { systemHealthService } from '../services/systemHealth.service';

const app = express();
app.disable('x-powered-by');
app.use(securityService.securityHeadersMiddleware);
app.use(express.json());
app.use('/api', apiRouter);

// Global root /health
app.get('/health', (req, res) => {
  res.json(systemHealthService.getDeepHealthReport());
});

let server: http.Server;
let port: number;

function request(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      ...(headers || {})
    };
    if (data) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(data).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let resBody = '';
        res.on('data', chunk => { resBody += chunk; });
        res.on('end', () => {
          let parsed = resBody;
          try {
            parsed = JSON.parse(resBody);
          } catch {
            // keep raw string
          }
          resolve({ status: res.statusCode || 200, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string, details?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`, details ? JSON.stringify(details, null, 2) : '');
    failedTests++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🛡️ PHASE 10: PRODUCTION HARDENING & SYSTEM VERIFICATION');
  console.log('======================================================\n');

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      port = addr.port;
      resolve();
    });
  });

  try {
    // -----------------------------------------------------------------------
    // Test 1: HTTP Security Headers Enforcement & Helmet Hardening
    // -----------------------------------------------------------------------
    console.log('--- Test 1: HTTP Security Headers Enforcement & Helmet Hardening ---');

    const secRes = await request('GET', '/api/profile');
    assert(secRes.status === 200, 'Profile endpoint accessible', secRes.status);

    // 1.1 Content Security Policy
    const csp = secRes.headers['content-security-policy'] as string;
    assert(!!csp && csp.includes("default-src 'self'"), 'CSP header enforced with default-src self', csp);

    // 1.2 MIME Sniffing Protection
    const nosniff = secRes.headers['x-content-type-options'];
    assert(nosniff === 'nosniff', 'X-Content-Type-Options header is nosniff', nosniff);

    // 1.3 Clickjacking Defense
    const xframe = secRes.headers['x-frame-options'];
    assert(xframe === 'SAMEORIGIN', 'X-Frame-Options header is SAMEORIGIN', xframe);

    // 1.4 HSTS
    const hsts = secRes.headers['strict-transport-security'] as string;
    assert(!!hsts && hsts.includes('max-age=31536000'), 'Strict-Transport-Security enforced for 1 year', hsts);

    // 1.5 XSS Protection & Referrer Policy
    const xss = secRes.headers['x-xss-protection'];
    assert(xss === '1; mode=block', 'X-XSS-Protection header is active', xss);

    const referrer = secRes.headers['referrer-policy'];
    assert(referrer === 'strict-origin-when-cross-origin', 'Referrer-Policy header is strict-origin', referrer);

    // 1.6 Absence of X-Powered-By
    const poweredBy = secRes.headers['x-powered-by'];
    assert(!poweredBy, 'X-Powered-By header is stripped to mask server architecture', poweredBy);

    // -----------------------------------------------------------------------
    // Test 2: Sliding-Window Rate Limiter & Abuse Defense
    // -----------------------------------------------------------------------
    console.log('\n--- Test 2: Sliding-Window Rate Limiter & Abuse Defense ---');

    securityService.resetStore();

    // 2.1 Standard request receives rate limit tracking headers
    const normRes = await request('GET', '/api/public/tokens');
    assert(normRes.status === 200, 'Public tokens endpoint responds 200', normRes.status);
    assert(!!normRes.headers['x-ratelimit-limit'], 'Response contains X-RateLimit-Limit', normRes.headers['x-ratelimit-limit']);
    assert(!!normRes.headers['x-ratelimit-remaining'], 'Response contains X-RateLimit-Remaining', normRes.headers['x-ratelimit-remaining']);

    // 2.2 Trigger rate limiting using strict test header
    const headersTest = { 'x-test-rate-limit': 'true', 'x-forwarded-for': '203.0.113.19' };
    const r1 = await request('GET', '/api/public/tokens', undefined, headersTest);
    const r2 = await request('GET', '/api/public/tokens', undefined, headersTest);
    const r3 = await request('GET', '/api/public/tokens', undefined, headersTest);
    assert(r1.status === 200 && r2.status === 200 && r3.status === 200, 'Initial 3 rapid requests allowed', [r1.status, r2.status, r3.status]);

    // 4th request from same IP exceeds strict quota (3 requests)
    const r4 = await request('GET', '/api/public/tokens', undefined, headersTest);
    assert(r4.status === 429, 'Excess burst requests trigger HTTP 429 Too Many Requests', r4.status);
    assert(r4.body.error && r4.body.error.includes('Too many requests'), 'Returns standard rate limit error body', r4.body);
    assert(typeof r4.body.retryAfterSeconds === 'number', 'Returns retryAfterSeconds metric', r4.body.retryAfterSeconds);
    assert(!!r4.headers['retry-after'], 'Sets HTTP Retry-After response header', r4.headers['retry-after']);

    // 2.3 Rate Limit Status Inspection API
    const rateStatusRes = await request('GET', '/api/system/rate-limit-status?group=publicTokens', undefined, {
      'x-forwarded-for': '203.0.113.19'
    });
    assert(rateStatusRes.status === 200, 'GET /api/system/rate-limit-status returns 200', rateStatusRes.body);
    assert(rateStatusRes.body.ip === '203.0.113.19', 'Tracks target IP', rateStatusRes.body.ip);
    assert(rateStatusRes.body.requestsCount >= 3, 'Reports tracked requests count', rateStatusRes.body.requestsCount);

    // Reset store after test
    securityService.resetStore();

    // -----------------------------------------------------------------------
    // Test 3: Database Hot Backup, SHA-256 Hashing & Atomic Disaster Recovery
    // -----------------------------------------------------------------------
    console.log('\n--- Test 3: Database Hot Backup, SHA-256 Hashing & Atomic Disaster Recovery ---');

    // 3.1 Create Hot Backup Snapshot
    const backupRes = await request('POST', '/api/system/backups/create', { tag: 'phase10-test' });
    assert(backupRes.status === 201, 'POST /api/system/backups/create returns 201', backupRes.body);
    assert(!!backupRes.body.id, 'Backup ID generated', backupRes.body.id);
    assert(backupRes.body.filename.endsWith('.json.gz'), 'Backup file is gzip compressed (.json.gz)', backupRes.body.filename);
    assert(backupRes.body.sha256Checksum.length === 64, 'SHA-256 integrity hash is 64 hex characters', backupRes.body.sha256Checksum);
    assert(backupRes.body.recordCounts.menuItems >= 6, 'Captures menu items count', backupRes.body.recordCounts.menuItems);
    assert(backupRes.body.sizeBytes > 0, 'Backup size is non-zero', backupRes.body.sizeBytes);

    // Verify backup file physically exists on disk
    assert(fs.existsSync(backupRes.body.filepath), 'Compressed backup file verified on disk');

    // 3.2 List Backups
    const listRes = await request('GET', '/api/system/backups');
    assert(listRes.status === 200, 'GET /api/system/backups returns 200', listRes.body);
    assert(Array.isArray(listRes.body), 'Backups returned as array', listRes.body.length);
    assert(listRes.body.some((b: any) => b.id === backupRes.body.id), 'Newly created backup present in directory');

    // 3.3 Atomic Disaster Recovery Restore
    const restoreRes = await request('POST', '/api/system/backups/restore', { backupId: backupRes.body.id });
    assert(restoreRes.status === 200, 'POST /api/system/backups/restore returns 200', restoreRes.body);
    assert(restoreRes.body.success === true, 'Restore operation reports success=true', restoreRes.body);
    assert(restoreRes.body.sha256Verified === true, 'Pre-restore SHA-256 checksum verified', restoreRes.body);
    assert(typeof restoreRes.body.durationMs === 'number', 'Reports restore duration in milliseconds', restoreRes.body.durationMs);

    // 3.4 Tamper detection test: corrupting checksum should reject restore
    const badRestoreRes = await request('POST', '/api/system/backups/restore', { backupId: 'non_existent_id' });
    assert(badRestoreRes.status === 400, 'Restoring invalid/missing backup returns 400 error', badRestoreRes.body);

    // -----------------------------------------------------------------------
    // Test 4: Deep System Diagnostics & Health Monitoring (/health)
    // -----------------------------------------------------------------------
    console.log('\n--- Test 4: Deep System Diagnostics & Health Monitoring (/health) ---');

    // 4.1 Root /health endpoint
    const healthRes = await request('GET', '/health');
    assert(healthRes.status === 200, 'Root /health returns 200 OK', healthRes.body);
    assert(healthRes.body.status === 'healthy', 'Overall health status is "healthy"', healthRes.body.status);
    assert(typeof healthRes.body.uptimeSeconds === 'number', 'Uptime reported in seconds', healthRes.body.uptimeSeconds);
    assert(healthRes.body.database.writable === true, 'Database writability canary test passed', healthRes.body.database.writable);
    assert(healthRes.body.database.status === 'connected', 'Database reported connected', healthRes.body.database.status);
    assert(healthRes.body.memory.heapUsedMb > 0, 'Memory heap usage tracked in MB', healthRes.body.memory.heapUsedMb);
    assert(healthRes.body.outlets.totalCount >= 4, 'Multi-outlet network tracked', healthRes.body.outlets.totalCount);
    assert(healthRes.body.hardware.scannerActive === true, 'Barcode scanner hardware active', healthRes.body.hardware);
    assert(healthRes.body.backups.availableBackupsCount >= 1, 'Hot backup archives tracked in health report', healthRes.body.backups);
    assert(healthRes.body.security.rateLimitingActive === true, 'Security rate limiting active', healthRes.body.security);

    // 4.2 API namespace health endpoint
    const apiHealthRes = await request('GET', '/api/system/health');
    assert(apiHealthRes.status === 200, 'GET /api/system/health returns 200', apiHealthRes.body);
    assert(apiHealthRes.body.status === 'healthy', 'API health status is "healthy"', apiHealthRes.body.status);

    // -----------------------------------------------------------------------
    // Test 5: Full End-to-End Multi-Concept Verification Matrix
    // -----------------------------------------------------------------------
    console.log('\n--- Test 5: Full End-to-End Multi-Concept Verification Matrix ---');

    // 5.1 Concept 1: Specialty Café
    console.log('  ☕ Verifying Concept 1: Specialty Coffee Café...');
    const cafePreset = await request('GET', '/api/concepts/preset/cafe');
    assert(cafePreset.body.type === 'cafe', 'Café concept preset loaded', cafePreset.body.type);
    assert(cafePreset.body.tableTerminology === 'table', 'Café uses table terminology', cafePreset.body.tableTerminology);
    assert(cafePreset.body.enableTableReservations === true, 'Café enables table reservations', cafePreset.body.enableTableReservations);

    const cafeOrder = await request('POST', '/api/orders', {
      type: 'takeaway',
      customerName: 'Aarav Coffee Lover',
      items: [
        {
          menuItemId: 'item_virgin_mojito',
          name: 'Fresh Mint Virgin Mojito',
          quantity: 2,
          unitPrice: 150,
          station: 'bar'
        }
      ]
    });
    assert(cafeOrder.status === 201, 'Café counter order created', cafeOrder.body);
    assert(!!cafeOrder.body.takeawayToken, 'Café order assigned token number', cafeOrder.body.takeawayToken);

    // 5.2 Concept 2: Artisan Deli & Bakery
    console.log('  🥖 Verifying Concept 2: Artisan Deli & Bakery...');
    const bakeryPreset = await request('GET', '/api/concepts/preset/bakery');
    assert(bakeryPreset.body.enableWeighingScale === true, 'Bakery concept enables digital weighing scale', bakeryPreset.body);

    // Simulate Mithai sold by weight (350 grams @ ₹950/kg = ₹332.50)
    const deliWeighRes = await request('POST', '/api/hardware/scale/calculate-price', {
      menuItemId: 'item_pistachio_mithai',
      weight: 350,
      unit: 'g'
    });
    assert(deliWeighRes.status === 200, 'Bakery scale calculates gram-to-price', deliWeighRes.body);
    assert(deliWeighRes.body.calculatedPrice === 332.5, 'Exact price computed: ₹332.50', deliWeighRes.body.calculatedPrice);

    // GS1 weight-embedded barcode scan
    const gs1Scan = await request('POST', '/api/hardware/barcode/scan', {
      barcode: '2000101004508',
      source: 'hardware_scanner'
    });
    assert(gs1Scan.body.isWeightEmbedded === true, 'Bakery scanner decodes GS1 retail barcode', gs1Scan.body);

    // 5.3 Concept 3: QSR / Fast Food
    console.log('  🍔 Verifying Concept 3: QSR / Fast Food Counter...');
    const qsrPreset = await request('GET', '/api/concepts/preset/qsr');
    assert(qsrPreset.body.defaultOrderType === 'takeaway', 'QSR defaults to takeaway', qsrPreset.body.defaultOrderType);
    assert(qsrPreset.body.tableTerminology === 'token', 'QSR uses token terminology', qsrPreset.body.tableTerminology);
    assert(qsrPreset.body.enableTokenDisplay === true, 'QSR enables token display screen', qsrPreset.body.enableTokenDisplay);

    // Offline sync idempotency resilience
    const offlineSyncRes = await request('POST', '/api/orders/sync-offline', {
      orders: [
        {
          clientTxId: 'ctx_qsr_test_884920',
          type: 'takeaway',
          items: [
            {
              menuItemId: 'item_garlic_naan',
              name: 'Garlic Butter Naan',
              quantity: 3,
              unitPrice: 75,
              station: 'tandoor'
            }
          ]
        }
      ]
    });
    assert(offlineSyncRes.status === 200, 'Offline sync accepted idempotently', offlineSyncRes.body);
    assert(offlineSyncRes.body.orders && offlineSyncRes.body.orders[0]?.clientTxId === 'ctx_qsr_test_884920', 'Client transaction UUID attached', offlineSyncRes.body);

    // 5.4 Concept 4: Cloud Kitchen / Delivery Hub
    console.log('  🛵 Verifying Concept 4: Cloud Kitchen / Delivery Hub...');
    const swiggyOrder = await request('POST', '/api/delivery-partners/simulate/swiggy', {
      customerName: 'Delivery Customer',
      customerPhone: '9876543210',
      deliveryAddress: 'Block C, Indiranagar, Bengaluru'
    });
    assert(swiggyOrder.status === 201, 'Cloud Kitchen aggregator order simulated', swiggyOrder.body);
    assert(swiggyOrder.body.order.deliveryPartner === 'swiggy', 'Order tagged with delivery partner', swiggyOrder.body.order.deliveryPartner);

    // Partner financial reconciliation
    const reconRes = await request('GET', '/api/reports/reconciliation');
    assert(reconRes.status === 200, 'Aggregator financial reconciliation report generated', reconRes.body);
    assert(Array.isArray(reconRes.body.partnerBreakdown), 'Reconciliation partner breakdown generated', reconRes.body.partnerBreakdown);

    // 5.5 Concept 5: Casual Dining Restaurant
    console.log('  🍽️ Verifying Concept 5: Casual Dining Restaurant...');
    const tablesRes = await request('GET', '/api/tables');
    let vacantTable = tablesRes.body.find((t: any) => t.status === 'vacant') || tablesRes.body[0];
    assert(!!vacantTable, 'Found vacant dining table for Casual Dining', vacantTable?.tableNumber);

    // Table dine-in order with course sequencing
    const dineInOrder = await request('POST', '/api/orders', {
      type: 'dine_in',
      tableId: vacantTable.id,
      tableNumber: vacantTable.tableNumber,
      customerName: 'Sharma Family',
      items: [
        {
          menuItemId: 'item_paneer_tikka',
          name: 'Paneer Tikka Angara',
          quantity: 2,
          unitPrice: 280,
          station: 'tandoor',
          course: 'appetizer',
          courseStatus: 'fired'
        },
        {
          menuItemId: 'item_dal_makhani',
          name: 'Dal Makhani Bukhara',
          quantity: 1,
          unitPrice: 260,
          station: 'kitchen',
          course: 'main',
          courseStatus: 'hold'
        }
      ]
    });
    assert(dineInOrder.status === 201, 'Casual dining table order placed', dineInOrder.body);

    // Fire on-hold mains to kitchen
    const fireCourseRes = await request('POST', `/api/orders/${dineInOrder.body.id}/courses/main/fire`);
    assert(fireCourseRes.status === 200, 'Main course fired to kitchen station', fireCourseRes.body);

    // 5.6 Concept 6: Fine Dining & Banquets
    console.log('  🍷 Verifying Concept 6: Fine Dining & Banquets...');
    // Table Reservation
    const reservationRes = await request('POST', '/api/reservations', {
      guestName: 'Ambassador V.K. Singhania',
      guestPhone: '9811002233',
      pax: 4,
      reservationDate: '2026-10-25',
      reservationTime: '20:00',
      tableId: vacantTable.id,
      tableNumber: vacantTable.tableNumber,
      specialRequest: 'Anniversary celebration'
    });
    assert(reservationRes.status === 201, 'Table reservation booked', reservationRes.body);

    // Waiter Call Assistance
    const waiterCallRes = await request('POST', '/api/waiter-calls', {
      tableId: vacantTable.id,
      tableNumber: vacantTable.tableNumber,
      type: 'service',
      message: 'Wine recommendations requested'
    });
    assert(waiterCallRes.status === 201, 'Table assistance call created', waiterCallRes.body);

    // Resolve Waiter Call
    const resolveCallRes = await request('POST', `/api/waiter-calls/${waiterCallRes.body.id}/resolve`, {
      assignedWaiter: 'Captain Vikram'
    });
    assert(resolveCallRes.status === 200, 'Waiter call resolved by Captain', resolveCallRes.body);

    // Statutory GSTR-1 Tax Ledger
    const gstr1Res = await request('GET', '/api/reports/gstr-1');
    assert(gstr1Res.status === 200, 'Fine dining statutory GSTR-1 ledger generated', gstr1Res.body);
    assert(gstr1Res.body.sacSummary.some((s: any) => s.sacCode === '996331'), 'SAC 996331 dining turnover present', gstr1Res.body.sacSummary);

    // 80mm ESC/POS Day-End Z-Report
    const zReportRes = await request('POST', '/api/printer/escpos/z-report', {});
    assert(zReportRes.status === 200, '80mm ESC/POS Z-Report generated', zReportRes.body);
    assert(zReportRes.body.hex.startsWith('1b40'), 'Z-Report binary starts with ESC @', zReportRes.body.hex);

  } finally {
    server.close();
  }

  console.log('\n======================================================');
  console.log(`📊 PHASE 10 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test harness exception:', err);
  process.exit(1);
});
