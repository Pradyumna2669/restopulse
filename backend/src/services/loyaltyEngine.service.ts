import {
  BusinessType,
  ConceptConfig,
  CustomerProfile,
  LoyaltySettings,
  LoyaltyTierConfig,
  Order,
  PublicOrderToken
} from '../types';
import { store } from '../data/store';

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  enabled: true,
  pointValueInCurrency: 1.0, // 1 loyalty point = ₹1.00
  minRedeemablePoints: 25,
  maxRedeemPercentPerBill: 50, // max 50% of bill payable via loyalty
  tiers: [
    {
      tier: 'Bronze',
      minSpend: 0,
      pointsPerHundred: 1, // 1% points
      discountPercent: 0,
      redemptionMaxPercent: 20,
      welcomeBonusPoints: 0
    },
    {
      tier: 'Silver',
      minSpend: 2500,
      pointsPerHundred: 2, // 2% points
      discountPercent: 5,
      redemptionMaxPercent: 30,
      welcomeBonusPoints: 50
    },
    {
      tier: 'Gold',
      minSpend: 7500,
      pointsPerHundred: 3, // 3% points
      discountPercent: 10,
      redemptionMaxPercent: 40,
      welcomeBonusPoints: 150
    },
    {
      tier: 'VIP Platinum',
      minSpend: 15000,
      pointsPerHundred: 5, // 5% points
      discountPercent: 15,
      redemptionMaxPercent: 50,
      welcomeBonusPoints: 300
    }
  ]
};

export const CONCEPT_PRESETS: Record<BusinessType, ConceptConfig> = {
  cafe: {
    type: 'cafe',
    displayName: 'Artisan Café & Roastery',
    tagline: 'Fresh brews, slow mornings & handcrafted pastries.',
    tableTerminology: 'table',
    defaultOrderType: 'dine_in',
    enableCourseSequencing: false,
    enableTableReservations: true,
    enableRiderDispatch: true,
    enableTokenDisplay: false,
    enableWeighingScale: false,
    recommendedStations: ['kitchen', 'counter'],
    primaryAccentColor: '#D85836'
  },
  bakery: {
    type: 'bakery',
    displayName: 'Artisan Bakery & Patisserie',
    tagline: 'Warm oven delights, artisanal sourdough & delicate desserts.',
    tableTerminology: 'token',
    defaultOrderType: 'takeaway',
    enableCourseSequencing: false,
    enableTableReservations: false,
    enableRiderDispatch: true,
    enableTokenDisplay: true,
    enableWeighingScale: true,
    recommendedStations: ['dessert', 'counter'],
    primaryAccentColor: '#C07D38'
  },
  qsr: {
    type: 'qsr',
    displayName: 'Quick Service Restaurant (QSR)',
    tagline: 'Fast, fresh, high-volume counter ordering.',
    tableTerminology: 'token',
    defaultOrderType: 'takeaway',
    enableCourseSequencing: false,
    enableTableReservations: false,
    enableRiderDispatch: true,
    enableTokenDisplay: true,
    enableWeighingScale: false,
    recommendedStations: ['kitchen', 'counter'],
    primaryAccentColor: '#E65100'
  },
  fast_food: {
    type: 'fast_food',
    displayName: 'Fast Food Counter',
    tagline: 'Speedy burgers, wraps, shakes & combo meals.',
    tableTerminology: 'token',
    defaultOrderType: 'takeaway',
    enableCourseSequencing: false,
    enableTableReservations: false,
    enableRiderDispatch: true,
    enableTokenDisplay: true,
    enableWeighingScale: false,
    recommendedStations: ['kitchen', 'counter'],
    primaryAccentColor: '#D32F2F'
  },
  casual_dining: {
    type: 'casual_dining',
    displayName: 'Casual Dining Restaurant',
    tagline: 'Comfortable family dining, multi-course meals & full hospitality.',
    tableTerminology: 'table',
    defaultOrderType: 'dine_in',
    enableCourseSequencing: true,
    enableTableReservations: true,
    enableRiderDispatch: true,
    enableTokenDisplay: false,
    enableWeighingScale: false,
    recommendedStations: ['kitchen', 'tandoor', 'bar', 'dessert'],
    primaryAccentColor: '#2E7D32'
  },
  restaurant: {
    type: 'restaurant',
    displayName: 'Standard Full-Service Restaurant',
    tagline: 'Comprehensive table service, KDS routing & delivery.',
    tableTerminology: 'table',
    defaultOrderType: 'dine_in',
    enableCourseSequencing: true,
    enableTableReservations: true,
    enableRiderDispatch: true,
    enableTokenDisplay: false,
    enableWeighingScale: false,
    recommendedStations: ['kitchen', 'tandoor', 'dessert'],
    primaryAccentColor: '#1B5E20'
  },
  fine_dining: {
    type: 'fine_dining',
    displayName: 'Fine Dining & Gastronomy',
    tagline: 'Exquisite multi-course tasting menus, wine pairings & white-glove service.',
    tableTerminology: 'table',
    defaultOrderType: 'dine_in',
    enableCourseSequencing: true,
    enableTableReservations: true,
    enableRiderDispatch: false,
    enableTokenDisplay: false,
    enableWeighingScale: false,
    recommendedStations: ['kitchen', 'tandoor', 'bar', 'dessert'],
    primaryAccentColor: '#4A148C'
  },
  bar: {
    type: 'bar',
    displayName: 'Cocktail Bar & Lounge',
    tagline: 'Craft cocktails, premium spirits, small plates & evening beats.',
    tableTerminology: 'seat',
    defaultOrderType: 'dine_in',
    enableCourseSequencing: false,
    enableTableReservations: true,
    enableRiderDispatch: false,
    enableTokenDisplay: false,
    enableWeighingScale: false,
    recommendedStations: ['bar', 'kitchen'],
    primaryAccentColor: '#6A1B9A'
  }
};

export class LoyaltyEngineService {
  private static loyaltySettings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS;

  public static getSettings(): LoyaltySettings {
    return this.loyaltySettings;
  }

  public static updateSettings(newSettings: Partial<LoyaltySettings>): LoyaltySettings {
    this.loyaltySettings = { ...this.loyaltySettings, ...newSettings };
    return this.loyaltySettings;
  }

  public static getConceptPreset(type: BusinessType): ConceptConfig {
    return CONCEPT_PRESETS[type] || CONCEPT_PRESETS.cafe;
  }

  /**
   * Evaluates loyalty tier progression based on total cumulative spend
   */
  public static evaluateCustomerTier(totalSpend: number): 'Bronze' | 'Silver' | 'Gold' | 'VIP Platinum' {
    const tiers = [...this.loyaltySettings.tiers].sort((a, b) => b.minSpend - a.minSpend);
    for (const t of tiers) {
      if (totalSpend >= t.minSpend) {
        return t.tier;
      }
    }
    return 'Bronze';
  }

  /**
   * Computes points earned on a transaction
   */
  public static calculatePointsEarned(spendAmount: number, tier: string): number {
    if (!this.loyaltySettings.enabled || spendAmount <= 0) return 0;
    const tierConfig = this.loyaltySettings.tiers.find(t => t.tier === tier) || this.loyaltySettings.tiers[0];
    const earned = Math.floor((spendAmount / 100) * tierConfig.pointsPerHundred);
    return Math.max(0, earned);
  }

  /**
   * Validates and executes points redemption
   */
  public static validateAndRedeemPoints(
    customerId: string,
    pointsToRedeem: number,
    billTotal: number
  ): {
    success: boolean;
    discountAmount: number;
    pointsRedeemed: number;
    newBalance: number;
    error?: string;
  } {
    if (!this.loyaltySettings.enabled) {
      return { success: false, discountAmount: 0, pointsRedeemed: 0, newBalance: 0, error: 'Loyalty program is disabled' };
    }

    if (pointsToRedeem < this.loyaltySettings.minRedeemablePoints) {
      return {
        success: false,
        discountAmount: 0,
        pointsRedeemed: 0,
        newBalance: 0,
        error: `Minimum ${this.loyaltySettings.minRedeemablePoints} points required for redemption`
      };
    }

    const customers = store.getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return { success: false, discountAmount: 0, pointsRedeemed: 0, newBalance: 0, error: 'Customer profile not found' };
    }

    if (customer.loyaltyPoints < pointsToRedeem) {
      return {
        success: false,
        discountAmount: 0,
        pointsRedeemed: 0,
        newBalance: customer.loyaltyPoints,
        error: `Insufficient points balance. Available: ${customer.loyaltyPoints}`
      };
    }

    const maxDiscountAllowed = (billTotal * this.loyaltySettings.maxRedeemPercentPerBill) / 100;
    const proposedDiscount = pointsToRedeem * this.loyaltySettings.pointValueInCurrency;

    if (proposedDiscount > maxDiscountAllowed) {
      const maxPoints = Math.floor(maxDiscountAllowed / this.loyaltySettings.pointValueInCurrency);
      return {
        success: false,
        discountAmount: 0,
        pointsRedeemed: 0,
        newBalance: customer.loyaltyPoints,
        error: `Redemption exceeds maximum ${this.loyaltySettings.maxRedeemPercentPerBill}% cap (₹${maxDiscountAllowed.toFixed(0)} max = ${maxPoints} pts)`
      };
    }

    // Deduct points
    const newBalance = customer.loyaltyPoints - pointsToRedeem;
    store.updateCustomer(customerId, { loyaltyPoints: newBalance });

    store.addAuditLog({
      userId: customer.id,
      userName: customer.name,
      role: 'cashier',
      action: 'LOYALTY_POINTS_REDEEMED',
      entityType: 'customer',
      entityId: customer.id,
      details: {
        pointsRedeemed: pointsToRedeem,
        discountAmount: proposedDiscount,
        remainingBalance: newBalance,
        billTotal
      }
    });

    return {
      success: true,
      discountAmount: proposedDiscount,
      pointsRedeemed: pointsToRedeem,
      newBalance
    };
  }

  /**
   * Generates public order token feed for counter TV screens
   */
  public static getPublicOrderTokens(): {
    preparing: PublicOrderToken[];
    ready: PublicOrderToken[];
  } {
    const orders = store.getOrders();
    const now = Date.now();

    const preparing: PublicOrderToken[] = [];
    const ready: PublicOrderToken[] = [];

    for (const o of orders) {
      if (o.status === 'cancelled' || o.status === 'settled') continue;

      const elapsedMinutes = Math.max(0, Math.floor((now - new Date(o.createdAt).getTime()) / 60000));
      const tokenRecord: PublicOrderToken = {
        orderId: o.id,
        orderNumber: o.orderNumber,
        takeawayToken: o.takeawayToken || o.orderNumber.replace(/[^0-9]/g, '').slice(-3) || '001',
        customerName: o.customerName,
        status: o.status === 'ready' ? 'ready' : 'preparing',
        elapsedMinutes,
        readyAt: o.updatedAt
      };

      if (o.status === 'ready') {
        ready.push(tokenRecord);
      } else if (['kot_printed', 'preparing'].includes(o.status)) {
        preparing.push(tokenRecord);
      }
    }

    // Sort ready tokens by newest first; preparing tokens by oldest first (highest wait)
    ready.sort((a, b) => new Date(b.readyAt || '').getTime() - new Date(a.readyAt || '').getTime());
    preparing.sort((a, b) => b.elapsedMinutes - a.elapsedMinutes);

    return { preparing, ready };
  }
}
