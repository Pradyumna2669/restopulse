export type FoodType = 'veg' | 'non-veg' | 'egg';
export type KitchenStation = 'kitchen' | 'tandoor' | 'bar' | 'dessert' | 'counter';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'pending' | 'kot_printed' | 'preparing' | 'ready' | 'served' | 'settled' | 'cancelled';
export type PaymentMode = 'cash' | 'upi' | 'card' | 'split';
export type TableStatus = 'vacant' | 'running' | 'billed';

export interface FeatureFlags {
  enableDineIn: boolean;
  enableTakeaway: boolean;
  enableDelivery: boolean;
  enableQrOrdering: boolean;
  enableWhatsAppInvoice: boolean;
  enableGoogleReviewPrompt: boolean;
  enableKds: boolean;
}

export type DeliveryPartner = 'direct' | 'zomato' | 'swiggy' | 'ondc' | 'magicpin';

export interface DeliveryPartnerConfig {
  partner: DeliveryPartner;
  name: string;
  enabled: boolean;
  storeId: string;
  apiKey: string;
  webhookSecret: string;
  autoAcceptOrders: boolean;
  commissionPercent: number;
  color: string;
  badgeBg: string;
}

export type BusinessType = 'cafe' | 'restaurant' | 'fine_dining' | 'bakery' | 'fast_food' | 'bar' | 'qsr' | 'casual_dining';

export interface ConceptConfig {
  type: BusinessType;
  displayName: string;
  tagline: string;
  tableTerminology: 'table' | 'token' | 'seat';
  defaultOrderType: OrderType;
  enableCourseSequencing: boolean;
  enableTableReservations: boolean;
  enableRiderDispatch: boolean;
  enableTokenDisplay: boolean;
  enableWeighingScale: boolean;
  recommendedStations: KitchenStation[];
  primaryAccentColor: string;
}

export interface LoyaltyTierConfig {
  tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP Platinum';
  minSpend: number;
  pointsPerHundred: number;
  discountPercent: number;
  redemptionMaxPercent: number;
  welcomeBonusPoints: number;
}

export interface LoyaltySettings {
  enabled: boolean;
  pointValueInCurrency: number;
  minRedeemablePoints: number;
  maxRedeemPercentPerBill: number;
  tiers: LoyaltyTierConfig[];
}

export interface PublicOrderToken {
  orderId: string;
  orderNumber: string;
  takeawayToken?: string;
  customerName?: string;
  status: 'preparing' | 'ready';
  elapsedMinutes: number;
  readyAt?: string;
}

export interface RestaurantProfile {
  id: string;
  name: string;
  tagline: string;
  businessType?: BusinessType;
  openingHours?: string;
  isAcceptingOrders?: boolean;
  enablePromotions?: boolean;
  address: string;
  phone: string;
  gstin: string;
  fssai: string;
  currencySymbol: string;
  googlePlaceReviewUrl: string;
  featureFlags: FeatureFlags;
  openwaConfig: {
    apiUrl: string;
    sessionId: string;
    apiKey?: string;
    autoSendInvoice: boolean;
    autoSendReviewPrompt: boolean;
    reviewPromptDelayMinutes: number;
  };
  deliveryPartners?: DeliveryPartnerConfig[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

export interface Variation {
  id: string;
  name: string;
  price: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export type InventoryUnit = 'kg' | 'grams' | 'litres' | 'ml' | 'pcs';

export interface RecipeItem {
  rawMaterialId: string;
  rawMaterialName?: string;
  quantityRequired: number;
  unit: InventoryUnit;
}

export interface RawMaterial {
  id: string;
  name: string;
  category: string;
  unit: InventoryUnit;
  currentStock: number;
  reorderLevel: number;
  costPerUnit: number;
  lastRestockedAt?: string;
}

export interface StockInwardEntry {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  quantityAdded: number;
  unit: InventoryUnit;
  costPrice: number;
  supplierName?: string;
  purchaseOrderId?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin?: string;
  address?: string;
  categoriesSupplied: string[];
  paymentTerms: 'immediate' | 'net_7' | 'net_15' | 'net_30';
  rating?: number;
  active: boolean;
  createdAt: string;
}

export interface PurchaseOrderItem {
  rawMaterialId: string;
  rawMaterialName: string;
  quantity: number;
  unit: InventoryUnit;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  expectedDeliveryDate?: string;
  receivedAt?: string;
  receivedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WastageLog {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  quantity: number;
  unit: InventoryUnit;
  cost: number;
  reason: 'spoilage' | 'expired' | 'damaged' | 'prep_waste' | 'audit_discrepancy';
  loggedBy: string;
  managerApproval?: {
    userId: string;
    userName: string;
    role: string;
  };
  notes?: string;
  createdAt: string;
}

export interface RecipeVarianceReport {
  rawMaterialId: string;
  rawMaterialName: string;
  unit: InventoryUnit;
  theoreticalConsumption: number;
  actualStockOnHand: number;
  recordedWastage: number;
  variance: number;
  costImpact: number;
}

export interface PettyExpense {
  id: string;
  category: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface CashRegisterShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  cashSales: number;
  pettyExpenses: PettyExpense[];
  expectedCash: number;
  actualCashCounted?: number;
  discrepancy?: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  foodType: FoodType;
  station: KitchenStation;
  gstRate: number;
  variations?: Variation[];
  addons?: Addon[];
  inStock: boolean;
  image?: string;
  recipe?: RecipeItem[];
}

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  section: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  qrToken?: string;
}

export type CourseType = 'appetizer' | 'main' | 'dessert' | 'beverage';
export type CourseStatus = 'hold' | 'fired' | 'preparing' | 'ready';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedVariation?: Variation;
  selectedAddons?: Addon[];
  specialNotes?: string;
  station: KitchenStation;
  kotStatus: 'pending' | 'printed' | 'prepared';
  seatNumber?: string;
  course?: CourseType;
  courseStatus?: CourseStatus;
}

export interface WaiterCallRequest {
  id: string;
  tableId: string;
  tableNumber: string;
  type: 'service' | 'bill' | 'water' | 'clean' | 'custom';
  message?: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  assignedWaiter?: string;
}

export interface KdsPerformanceReport {
  overallAvgPrepMinutes: number;
  stationMetrics: {
    station: KitchenStation;
    avgPrepMinutes: number;
    activeTicketsCount: number;
    completedTodayCount: number;
    delayedTicketsCount: number;
  }[];
  activeDelayedOrdersCount: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  takeawayToken?: string;
  riderName?: string;
  riderPhone?: string;
  riderStatus?: 'unassigned' | 'assigned' | 'out_for_delivery' | 'delivered';
  specialNotes?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;

  // Delivery Partner Integration Fields
  deliveryPartner?: DeliveryPartner;
  partnerOrderId?: string; // e.g. "ZOM-8821" or "SWG-4512"
  partnerPickupCode?: string; // e.g. "4821"
  partnerCommissionPercent?: number; // e.g. 18%
  partnerCommissionAmount?: number;
  partnerNetPayout?: number;
  partnerOrderStatus?: 'placed' | 'accepted' | 'preparing' | 'food_ready' | 'picked_up' | 'delivered' | 'cancelled';

  // Offline Sync & Idempotency (Phase 2)
  clientTxId?: string;
  isOffline?: boolean;
  syncedAt?: string;
}

export interface SplitPaymentEntry {
  mode: 'cash' | 'upi' | 'card';
  amount: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  visitsCount: number;
  totalSpend: number;
  loyaltyPoints: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP Platinum';
  favoriteItems: string[];
  lastVisit: string;
  notes?: string;
  channel?: DeliveryPartner;
}

export interface TableReservation {
  id: string;
  guestName: string;
  guestPhone: string;
  pax: number;
  tableId?: string;
  tableNumber?: string;
  reservationDate: string;
  reservationTime: string;
  advanceDeposit?: number;
  specialRequest?: string;
  status: 'confirmed' | 'seated' | 'cancelled' | 'no_show';
  createdAt: string;
}

export interface GuestWaitlistEntry {
  id: string;
  guestName: string;
  guestPhone: string;
  pax: number;
  sectionPreference?: string;
  estimatedWaitMinutes: number;
  status: 'waiting' | 'table_ready' | 'seated' | 'cancelled';
  createdAt: string;
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  orderType: OrderType;
  tableNumber?: string;
  takeawayToken?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  riderName?: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  cgstAmount: number;
  sgstAmount: number;
  roundOff: number;
  total: number;
  paymentMode: PaymentMode;
  splitPayments?: SplitPaymentEntry[];
  pointsEarned?: number;
  pointsRedeemed?: number;
  status: 'paid' | 'unpaid' | 'cancelled';
  createdAt: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  
  // Delivery Partner Settlement
  deliveryPartner?: DeliveryPartner;
  partnerOrderId?: string;
  partnerPickupCode?: string;
  partnerCommissionAmount?: number;
  partnerNetPayout?: number;

  whatsappInvoiceSent: boolean;
  whatsappInvoiceTimestamp?: string;
  whatsappInvoiceMessageId?: string;
  whatsappReviewSent: boolean;
  whatsappReviewTimestamp?: string;
  whatsappReviewMessageId?: string;
  whatsappError?: string;

  // Offline Sync & Idempotency (Phase 2)
  clientTxId?: string;
  isOffline?: boolean;
  syncedAt?: string;
}

export interface EscPosOptions {
  paperWidth: '58mm' | '80mm';
  kickDrawer?: boolean;
  cutPaper?: boolean;
  includeGstBreakup?: boolean;
}

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'waiter' | 'kitchen' | 'inventory';

export type StaffPermission =
  | 'BILL_CREATE'
  | 'BILL_VOID'
  | 'BILL_REFUND'
  | 'DISCOUNT_APPLY'
  | 'DISCOUNT_OVERRIDE'
  | 'STOCK_VIEW'
  | 'STOCK_INWARD'
  | 'STOCK_ADJUST'
  | 'PETTY_EXPENSE'
  | 'SHIFT_CLOSE'
  | 'MENU_EDIT'
  | 'REPORTS_VIEW'
  | 'STAFF_MANAGE'
  | 'SETTINGS_EDIT';

export interface StaffUser {
  id: string;
  username: string;
  name: string;
  role: StaffRole;
  pin: string; // 4-digit PIN for quick terminal authentication & overrides
  phone?: string;
  isActive: boolean;
  permissions: StaffPermission[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: StaffRole;
  action: string;
  entityType: 'bill' | 'order' | 'inventory' | 'cash_register' | 'menu' | 'profile' | 'staff' | 'customer';
  entityId: string;
  details?: Record<string, any>;
  reason?: string;
  approvedBy?: {
    userId: string;
    userName: string;
    role: StaffRole;
  };
  outletId?: string;
}

// ==========================================
// Phase 3: Payments, Aggregators & Reconciliation
// ==========================================

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded' | 'timeout';
export type PaymentProvider = 'manual' | 'razorpay' | 'phonepe' | 'paytm' | 'stripe';

export interface PaymentTransaction {
  id: string;
  billId?: string;
  orderId?: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerTransactionId?: string;
  status: PaymentStatus;
  idempotencyKey: string;
  paymentMethod?: 'upi' | 'card' | 'netbanking' | 'wallet' | 'cash';
  payerDetails?: {
    phone?: string;
    vpa?: string;
  };
  refundDetails?: {
    refundId: string;
    amount: number;
    reason: string;
    refundedAt: string;
    approvedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  eventId: string;
  partner: DeliveryPartner;
  timestamp: string;
  signatureValid: boolean;
  status: 'processed' | 'duplicate_skipped' | 'signature_mismatch' | 'failed';
  orderId?: string;
  error?: string;
}

export interface PartnerReconciliationEntry {
  partner: DeliveryPartner;
  partnerName: string;
  orderCount: number;
  grossSales: number;
  commissionAmount: number;
  gstOnCommission: number;
  tcsAmount: number;
  netPayout: number;
  discrepancy: number;
}

export interface ReconciliationReport {
  periodStart: string;
  periodEnd: string;
  totalGrossOnlineSales: number;
  totalCommissionsDeducted: number;
  totalGstOnCommissions: number;
  totalNetPayoutReceivable: number;
  partnerBreakdown: PartnerReconciliationEntry[];
  cashVsOnlineSplit: {
    cashSales: number;
    onlineGatewaySales: number;
    aggregatorNetSales: number;
  };
}



