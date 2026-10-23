import { v4 as uuidv4 } from 'uuid';
import {
  CustomerProfile,
  MarketingCampaign,
  CustomerFeedback,
  AutomatedTriggerConfig,
  NpsSummaryReport,
  RfmSegment
} from '../types';
import { store } from '../data/store';
import { OpenWAService } from './openwa.service';

export class MarketingEngineService {
  /**
   * Recency, Frequency, Monetary (RFM) Segmentation Engine
   */
  public static calculateRfmSegments(): {
    summary: Record<RfmSegment | 'all', number>;
    segments: Record<RfmSegment, CustomerProfile[]>;
    customers: CustomerProfile[];
  } {
    const rawCustomers = store.getCustomers();
    const now = Date.now();

    const segmentedCustomers: CustomerProfile[] = rawCustomers.map(customer => {
      // Calculate days since last visit
      const lastVisitTime = customer.lastVisit ? Date.parse(customer.lastVisit) : (now - 45 * 86400000);
      const daysSinceLastVisit = Math.max(0, Math.floor((now - (isNaN(lastVisitTime) ? (now - 45 * 86400000) : lastVisitTime)) / 86400000));
      
      const visits = customer.visitsCount || 1;
      const spend = customer.totalSpend || 0;
      const averageOrderValue = visits > 0 ? Math.round(spend / visits) : 0;

      let segment: RfmSegment;
      if (daysSinceLastVisit <= 30 && visits >= 5) {
        segment = 'champions';
      } else if (daysSinceLastVisit <= 30 && visits >= 2) {
        segment = 'loyal';
      } else if (visits <= 1 && daysSinceLastVisit <= 30) {
        segment = 'new';
      } else if (daysSinceLastVisit > 30 && daysSinceLastVisit <= 60) {
        segment = 'at_risk';
      } else {
        segment = 'dormant';
      }

      return {
        ...customer,
        rfmSegment: segment,
        daysSinceLastVisit,
        averageOrderValue
      };
    });

    const segments: Record<RfmSegment, CustomerProfile[]> = {
      champions: segmentedCustomers.filter(c => c.rfmSegment === 'champions'),
      loyal: segmentedCustomers.filter(c => c.rfmSegment === 'loyal'),
      at_risk: segmentedCustomers.filter(c => c.rfmSegment === 'at_risk'),
      dormant: segmentedCustomers.filter(c => c.rfmSegment === 'dormant'),
      new: segmentedCustomers.filter(c => c.rfmSegment === 'new')
    };

    const summary: Record<RfmSegment | 'all', number> = {
      all: segmentedCustomers.length,
      champions: segments.champions.length,
      loyal: segments.loyal.length,
      at_risk: segments.at_risk.length,
      dormant: segments.dormant.length,
      new: segments.new.length
    };

    return {
      summary,
      segments,
      customers: segmentedCustomers
    };
  }

  /**
   * Broadcast WhatsApp Campaign to Customer Segment
   */
  public static async broadcastCampaign(campaignId: string): Promise<{
    success: boolean;
    campaign: MarketingCampaign;
    recipientCount: number;
    deliveredCount: number;
    failedCount: number;
    error?: string;
  }> {
    const campaign = store.getMarketingCampaignById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    const { segments, customers } = this.calculateRfmSegments();
    const profile = store.getProfile();

    // Determine target recipient list
    let targetList: CustomerProfile[] = [];
    if (campaign.targetSegment === 'all') {
      targetList = customers;
    } else {
      targetList = segments[campaign.targetSegment as RfmSegment] || [];
    }

    // Filter valid phone numbers
    targetList = targetList.filter(c => c.phone && c.phone.trim().length >= 10);

    store.updateMarketingCampaign(campaign.id, {
      status: 'sending',
      recipientCount: targetList.length
    });

    let deliveredCount = 0;
    let failedCount = 0;

    for (const customer of targetList) {
      const chatId = OpenWAService.normalizeChatId(customer.phone);
      
      // Personalize message with dynamic template tokens
      let personalizedMsg = campaign.templateMessage
        .replace(/\{\{name\}\}/gi, customer.name || 'Valued Guest')
        .replace(/\{\{points\}\}/gi, String(customer.loyaltyPoints || 0))
        .replace(/\{\{offerCode\}\}/gi, campaign.offerCode || 'RESTROPLUS')
        .replace(/\{\{discount\}\}/gi, String(campaign.discountPercent || 15))
        .replace(/\{\{restaurantName\}\}/gi, profile.name)
        .replace(/\{\{tier\}\}/gi, customer.tier || 'Bronze');

      try {
        const sendResult = await OpenWAService.sendTextMessage(chatId, personalizedMsg);
        if (sendResult.success) {
          deliveredCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        failedCount++;
      }
    }

    const updated = store.updateMarketingCampaign(campaign.id, {
      status: deliveredCount > 0 ? 'completed' : (targetList.length === 0 ? 'completed' : 'failed'),
      deliveredCount,
      failedCount,
      sentAt: new Date().toISOString()
    });

    // Record audit log
    store.addAuditLog({
      userId: 'staff-manager-01',
      userName: 'Manager',
      role: 'manager',
      action: 'MARKETING_CAMPAIGN_BROADCAST',
      entityType: 'customer',
      entityId: campaign.id,
      details: {
        campaignTitle: campaign.title,
        targetSegment: campaign.targetSegment,
        recipientCount: targetList.length,
        deliveredCount,
        failedCount
      }
    });

    return {
      success: true,
      campaign: updated || campaign,
      recipientCount: targetList.length,
      deliveredCount,
      failedCount
    };
  }

  /**
   * Submit Customer Feedback & Smart Review Routing
   */
  public static submitCustomerFeedback(data: {
    customerPhone: string;
    customerName?: string;
    billId?: string;
    rating: number;
    feedbackText?: string;
    tags?: string[];
  }): {
    feedback: CustomerFeedback;
    isPromoter: boolean;
    googleReviewUrl?: string;
    managerAlertTriggered: boolean;
  } {
    const profile = store.getProfile();
    const rating = Math.min(5, Math.max(1, Number(data.rating) || 5));

    let npsCategory: 'promoter' | 'passive' | 'detractor';
    if (rating >= 4) {
      npsCategory = 'promoter';
    } else if (rating === 3) {
      npsCategory = 'passive';
    } else {
      npsCategory = 'detractor';
    }

    const feedback: CustomerFeedback = {
      id: 'fb_' + uuidv4().slice(0, 8),
      customerPhone: data.customerPhone,
      customerName: data.customerName || 'Valued Guest',
      billId: data.billId,
      rating,
      feedbackText: data.feedbackText || '',
      tags: data.tags || (rating >= 4 ? ['service', 'food'] : ['service']),
      npsCategory,
      managerStatus: npsCategory === 'detractor' ? 'new' : 'reviewed',
      createdAt: new Date().toISOString()
    };

    store.addCustomerFeedback(feedback);

    // If detractor, flag manager audit alert for service recovery
    if (npsCategory === 'detractor') {
      store.addAuditLog({
        userId: 'system',
        userName: 'System Feedback Sentinel',
        role: 'manager',
        action: 'GUEST_DETRACTOR_ALERT',
        entityType: 'customer',
        entityId: feedback.id,
        details: {
          customerName: feedback.customerName,
          customerPhone: feedback.customerPhone,
          rating: feedback.rating,
          feedbackText: feedback.feedbackText
        },
        reason: 'Low customer rating received (1-2 stars). Service recovery required.'
      });
    }

    return {
      feedback,
      isPromoter: npsCategory === 'promoter',
      googleReviewUrl: npsCategory === 'promoter' ? profile.googlePlaceReviewUrl : undefined,
      managerAlertTriggered: npsCategory === 'detractor'
    };
  }

  /**
   * Compute Net Promoter Score (NPS) and Review Intelligence Summary
   */
  public static getNpsSummary(): NpsSummaryReport {
    const feedbacks = store.getCustomerFeedbacks();
    const total = feedbacks.length;

    if (total === 0) {
      return {
        overallNps: 0,
        totalResponses: 0,
        averageRating: 5.0,
        promoterCount: 0,
        passiveCount: 0,
        detractorCount: 0,
        promoterPercent: 0,
        detractorPercent: 0,
        recentFeedbacks: []
      };
    }

    const promoterCount = feedbacks.filter((f: CustomerFeedback) => f.npsCategory === 'promoter').length;
    const passiveCount = feedbacks.filter((f: CustomerFeedback) => f.npsCategory === 'passive').length;
    const detractorCount = feedbacks.filter((f: CustomerFeedback) => f.npsCategory === 'detractor').length;

    const promoterPercent = Math.round((promoterCount / total) * 100);
    const detractorPercent = Math.round((detractorCount / total) * 100);
    const overallNps = promoterPercent - detractorPercent;

    const sumRating = feedbacks.reduce((acc: number, f: CustomerFeedback) => acc + f.rating, 0);
    const averageRating = Number((sumRating / total).toFixed(1));

    return {
      overallNps,
      totalResponses: total,
      averageRating,
      promoterCount,
      passiveCount,
      detractorCount,
      promoterPercent,
      detractorPercent,
      recentFeedbacks: [...feedbacks].reverse().slice(0, 20)
    };
  }

  /**
   * Run Daily Marketing Automation Triggers (Birthdays & Win-Back Dormancy)
   */
  public static async runDailyAutomations(): Promise<{
    birthdaysTriggered: number;
    winbackTriggered: number;
    totalDispatched: number;
  }> {
    const automations = store.getMarketingAutomations();
    const profile = store.getProfile();
    const { customers } = this.calculateRfmSegments();

    const todayStr = new Date().toISOString().slice(5, 10); // MM-DD
    let birthdaysTriggered = 0;
    let winbackTriggered = 0;

    for (const customer of customers) {
      if (!customer.phone || customer.phone.length < 10) continue;
      const chatId = OpenWAService.normalizeChatId(customer.phone);

      // 1. Birthday Perk Check
      if (automations.birthdayPerk.enabled && customer.birthday) {
        const custBday = customer.birthday.slice(5, 10);
        if (custBday === todayStr) {
          const bdayMsg = automations.birthdayPerk.offerText
            .replace(/\{\{name\}\}/gi, customer.name)
            .replace(/\{\{restaurantName\}\}/gi, profile.name)
            .replace(/\{\{discount\}\}/gi, String(automations.birthdayPerk.discountPercent));
          
          await OpenWAService.sendTextMessage(chatId, bdayMsg);
          birthdaysTriggered++;
        }
      }

      // 2. Win-Back Inactivity Check (Customer inactive exactly at threshold e.g. 30 days)
      if (automations.winbackTrigger.enabled) {
        if (customer.daysSinceLastVisit === automations.winbackTrigger.inactiveDaysThreshold) {
          const winbackMsg = automations.winbackTrigger.offerText
            .replace(/\{\{name\}\}/gi, customer.name)
            .replace(/\{\{restaurantName\}\}/gi, profile.name)
            .replace(/\{\{discount\}\}/gi, String(automations.winbackTrigger.discountPercent));

          await OpenWAService.sendTextMessage(chatId, winbackMsg);
          winbackTriggered++;
        }
      }
    }

    return {
      birthdaysTriggered,
      winbackTriggered,
      totalDispatched: birthdaysTriggered + winbackTriggered
    };
  }
}
