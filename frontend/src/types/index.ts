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

export interface PaymentAutomationConfig {
  enableDynamicUpiQr: boolean;
  enableAutoSoundboxChime: boolean;
  enableEdcPush: boolean;
  enablePayAtTable: boolean;
  enableWhatsAppPayLink: boolean;
  enablePrePayCounter: boolean;
  upiVpa: string;
  merchantName: string;
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
  paymentConfig?: PaymentAutomationConfig;
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
  outletId?: string;
  outletStocks?: Record<string, number>;
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
  barcode?: string;
  sku?: string;
  isWeighed?: boolean;
  weightUnit?: 'g' | 'kg';
  pricePerKg?: number;
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

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedVariation?: Variation;
  selectedAddons?: Addon[];
  specialNotes?: string;
  station: KitchenStation;
  isWeighed?: boolean;
  measuredWeight?: number;
  weightUnit?: 'g' | 'kg';
  barcodeScanned?: boolean;
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
  isWeighed?: boolean;
  measuredWeight?: number;
  weightUnit?: 'g' | 'kg';
  barcodeScanned?: boolean;
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

  // Multi-Outlet Context (Phase 8)
  outletId?: string;
}

export interface SplitPaymentEntry {
  mode: 'cash' | 'upi' | 'card';
  amount: number;
}

export type RfmSegment = 'champions' | 'loyal' | 'at_risk' | 'dormant' | 'new';

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  anniversary?: string;
  visitsCount: number;
  totalSpend: number;
  loyaltyPoints: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP Platinum';
  rfmSegment?: RfmSegment;
  averageOrderValue?: number;
  daysSinceLastVisit?: number;
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
  items: CartItem[];
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

  // Staff attribution & Shift context (Phase 7)
  staffId?: string;
  staffName?: string;
  servedBy?: string;
  cashierId?: string;
  cashierName?: string;

  whatsappInvoiceSent: boolean;
  whatsappInvoiceTimestamp?: string;
  whatsappReviewSent: boolean;
  whatsappReviewTimestamp?: string;
  whatsappError?: string;

  // Offline Sync & Idempotency (Phase 2)
  clientTxId?: string;
  isOffline?: boolean;
  syncedAt?: string;

  // Multi-Outlet Context (Phase 8)
  outletId?: string;
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
  pin: string;
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
  entityType: 'bill' | 'order' | 'inventory' | 'cash_register' | 'menu' | 'profile' | 'staff' | 'customer' | 'payment';
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
export type PaymentProvider = 'manual' | 'razorpay' | 'phonepe' | 'paytm' | 'stripe' | 'pinelabs';

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
  upiUrl?: string;
  authCode?: string;
  rrn?: string;
  soundboxAnnounced?: boolean;
  settledAt?: string;
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

// ==========================================
// Phase 7: Reporting, Tax & Business Intelligence
// ==========================================

export interface HourlySalesEntry {
  hour: number;
  hourLabel: string;
  orderCount: number;
  grossSales: number;
  averageTicketSize: number;
  intensity: 'zero' | 'low' | 'medium' | 'high' | 'peak';
}

export interface HourlySalesDistribution {
  date: string;
  totalDaySales: number;
  totalOrders: number;
  overallAov: number;
  peakHour: {
    hour: number;
    hourLabel: string;
    grossSales: number;
    orderCount: number;
  };
  busiestWindow: string;
  hourlyBreakdown: HourlySalesEntry[];
}

export interface CategoryPerformanceEntry {
  categoryId: string;
  categoryName: string;
  icon: string;
  volume: number;
  grossRevenue: number;
  percentageOfTotalSales: number;
  uniqueItemCount: number;
  estimatedFoodCost: number;
  grossMarginPercent: number;
  topSellingItem: {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  };
}

export interface CategoryPerformanceReport {
  totalRevenue: number;
  totalVolume: number;
  totalCategoriesCount: number;
  topCategoryName: string;
  categories: CategoryPerformanceEntry[];
}

export interface StaffSalesEntry {
  staffId: string;
  staffName: string;
  role: StaffRole;
  billsCount: number;
  grossSales: number;
  averageTicket: number;
  tableTurns: number;
  tenderBreakdown: {
    cash: number;
    card: number;
    upi: number;
    split: number;
  };
  voidedBillsCount: number;
  discountsGiven: number;
}

export interface StaffSalesReport {
  totalStaffActive: number;
  totalSalesRecorded: number;
  topPerformer: {
    staffName: string;
    role: StaffRole;
    sales: number;
    billsCount: number;
  };
  staffBreakdown: StaffSalesEntry[];
}

export interface DiscountAuditRecord {
  id: string;
  billId: string;
  invoiceNumber: string;
  orderNumber: string;
  orderType: OrderType;
  tableNumber?: string;
  customerName?: string;
  billSubtotal: number;
  discountAmount: number;
  discountPercent: number;
  finalBillTotal: number;
  discountReason: string;
  isHighDiscount: boolean; // > ₹200
  requiresManagerApproval: boolean;
  managerApproval?: {
    userId: string;
    userName: string;
    role: string;
  };
  appliedBy?: {
    userId: string;
    userName: string;
    role: string;
  };
  timestamp: string;
}

export interface DiscountAuditReport {
  totalDiscountsGiven: number;
  totalDiscountedBills: number;
  averageDiscountAmount: number;
  discountPercentageOfGross: number;
  highDiscountCount: number;
  highDiscountValue: number;
  managerApprovalRate: number;
  topReasons: {
    reason: string;
    count: number;
    totalAmount: number;
    percentage: number;
  }[];
  records: DiscountAuditRecord[];
}

export interface Gstr1SacEntry {
  sacCode: '996331' | '996332';
  description: string;
  uqc: string;
  totalQuantity: number;
  totalValue: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessAmount: number;
  invoiceCount: number;
}

export interface Gstr1B2cEntry {
  stateCode: string;
  supplyType: 'INTER' | 'INTRA';
  taxRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  invoiceCount: number;
}

export interface Gstr1TaxLedger {
  gstin: string;
  legalName: string;
  tradeName: string;
  taxPeriod: string;
  financialYear: string;
  grossTurnover: number;
  netTaxableTurnover: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalGstLiability: number;
  totalInvoiceCount: number;
  voidedInvoicesExcluded: number;
  sacSummary: Gstr1SacEntry[];
  b2cSummary: Gstr1B2cEntry[];
}

export interface EodZReportData {
  reportNumber: string;
  store: {
    name: string;
    address: string;
    phone: string;
    gstin: string;
    fssai: string;
  };
  shiftInfo: {
    shiftId: string;
    status: 'open' | 'closed';
    openedAt: string;
    closedAt?: string;
    managerName: string;
  };
  financialSummary: {
    grossSales: number;
    discounts: number;
    taxableSales: number;
    cgst: number;
    sgst: number;
    roundOff: number;
    netTotal: number;
    billsCount: number;
    voidedCount: number;
    voidedAmount: number;
  };
  tenderBreakdown: {
    cash: { count: number; amount: number };
    card: { count: number; amount: number };
    upi: { count: number; amount: number };
    split: { count: number; amount: number };
    aggregators: {
      zomato: { count: number; amount: number };
      swiggy: { count: number; amount: number };
      ondc: { count: number; amount: number };
      magicpin: { count: number; amount: number };
      total: number;
    };
  };
  cashDrawerAudit: {
    openingFloat: number;
    cashSales: number;
    pettyExpensesTotal: number;
    pettyExpensesItemized: { category: string; amount: number; description: string }[];
    expectedCash: number;
    actualCashCounted: number;
    discrepancy: number;
    auditStatus: 'balanced' | 'short' | 'over';
  };
  topCategories: { categoryName: string; revenue: number; quantity: number }[];
  hourlySnapshot: { hourLabel: string; sales: number; count: number }[];
  generatedAt: string;
}

// ==========================================
// Phase 8: Multi-Outlet & Franchise Master Architecture
// ==========================================

export type OutletTier = 'flagship' | 'company_owned' | 'franchise' | 'cloud_kitchen' | 'kiosk';

export interface Organization {
  id: string;
  name: string;
  legalEntityName: string;
  corporateGstin: string;
  panNumber: string;
  registeredOffice: string;
  supportEmail: string;
  supportPhone: string;
  defaultFranchiseRoyaltyPercent: number; // e.g. 5.0%
  defaultMarketingLevyPercent: number;    // e.g. 2.0%
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  orgId: string;
  name: string;
  code: string; // e.g. "TDG"
  cuisineType: string;
  logoUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface Outlet {
  id: string; // e.g. "outlet_delhi_01"
  orgId: string;
  brandId: string;
  code: string; // e.g. "TDG-DEL-01"
  name: string;
  tier: OutletTier;
  isFranchise: boolean;
  franchiseOwnerName?: string;
  franchiseContactPhone?: string;
  franchiseRoyaltyPercent: number; // e.g. 5.0%
  marketingLevyPercent: number;    // e.g. 2.0%
  gstin: string; // Outlet-specific regional GSTIN
  fssaiNumber: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    stateCode: string;
  };
  posTerminalCount: number;
  active: boolean;
  openingTime: string;
  closingTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutletMenuOverride {
  id: string;
  outletId: string;
  menuItemId: string;
  priceOverride?: number; // Regional price override (e.g. ₹240 instead of ₹220)
  inStockOverride?: boolean; // Regional 86 / out of stock toggle
  gstRateOverride?: number; // Regional tax rate (e.g. 12% instead of 5%)
  isExcluded?: boolean; // Item excluded from outlet's menu
  updatedAt: string;
  updatedBy?: string;
}

export interface EffectiveMenuItem extends MenuItem {
  originalBasePrice: number;
  originalInStock: boolean;
  originalGstRate: number;
  hasPriceOverride: boolean;
  hasStockOverride: boolean;
  hasGstOverride: boolean;
  effectivePrice: number;
  outletId: string;
}

export type TransferStatus = 'draft' | 'requested' | 'approved' | 'dispatched' | 'received' | 'reconciled' | 'cancelled';

export interface TransferItem {
  rawMaterialId: string;
  rawMaterialName: string;
  unit: InventoryUnit;
  quantityRequested: number;
  quantityDispatched?: number;
  quantityReceived?: number;
  unitCost: number;
  totalCost: number;
  varianceReason?: string;
}

export interface InterStoreTransfer {
  id: string;
  transferNumber: string; // e.g. "IST-2026-001"
  sourceOutletId: string;
  sourceOutletName: string;
  destinationOutletId: string;
  destinationOutletName: string;
  status: TransferStatus;
  items: TransferItem[];
  subtotalCost: number;
  notes?: string;
  carrierName?: string;
  trackingReference?: string;
  vehicleNumber?: string;
  dispatchEstimatedArrival?: string;
  
  requestedBy: {
    userId: string;
    userName: string;
    role: string;
    timestamp: string;
  };
  approvedBy?: {
    userId: string;
    userName: string;
    role: string;
    timestamp: string;
  };
  dispatchedBy?: {
    userId: string;
    userName: string;
    role: string;
    timestamp: string;
  };
  receivedBy?: {
    userId: string;
    userName: string;
    role: string;
    timestamp: string;
  };
  reconciledBy?: {
    userId: string;
    userName: string;
    role: string;
    timestamp: string;
  };
  cancelledBy?: {
    userId: string;
    userName: string;
    role: string;
    reason: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OutletInventoryLevel {
  outletId: string;
  outletName: string;
  outletCity: string;
  currentStock: number;
  reorderLevel: number;
  isLowStock: boolean;
}

export interface MaterialStockMatrixEntry {
  rawMaterialId: string;
  rawMaterialName: string;
  category: string;
  unit: InventoryUnit;
  costPerUnit: number;
  totalNetworkStock: number;
  outlets: OutletInventoryLevel[];
}

export interface OutletRoyaltySummary {
  outletId: string;
  outletCode: string;
  outletName: string;
  tier: OutletTier;
  isFranchise: boolean;
  city: string;
  orderCount: number;
  grossSales: number;
  netSales: number;
  grossProfit: number;
  grossMarginPercent: number;
  royaltyPercent: number;
  royaltyFee: number;
  marketingLevyPercent: number;
  marketingLevyFee: number;
  totalFranchisePayable: number;
}

export interface ConsolidatedHqReport {
  generatedAt: string;
  period: string;
  organization: {
    name: string;
    legalEntityName: string;
    corporateGstin: string;
  };
  totalOutletsCount: number;
  activeOutletsCount: number;
  franchiseOutletsCount: number;
  companyOwnedCount: number;
  networkSummary: {
    totalGrossRevenue: number;
    totalNetSales: number;
    totalOrdersCount: number;
    averageOrderValue: number;
    totalEstimatedFoodCost: number;
    networkGrossProfit: number;
    networkGrossMarginPercent: number;
    totalFranchiseRoyaltiesEarned: number;
    totalMarketingLevyCollected: number;
    combinedEnterpriseFee: number;
  };
  outletRankings: {
    byRevenue: { outletId: string; outletName: string; grossSales: number }[];
    byOrderVolume: { outletId: string; outletName: string; orderCount: number }[];
    byGrossMargin: { outletId: string; outletName: string; grossMarginPercent: number }[];
  };
  outletBreakdown: OutletRoyaltySummary[];
}

// ==========================================
// PHASE 9: HARDWARE PERIPHERALS & BARCODE/SCALE TYPES
// ==========================================

export type WeighingScaleProtocol = 'CAS' | 'ESSAE' | 'TOLEDO' | 'GENERIC_ASCII';

export interface WeighingScaleConfig {
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  protocol: WeighingScaleProtocol;
  unit: 'g' | 'kg';
  tareWeight: number;
  stableThreshold: number;
  port?: string;
  autoTareOnRemoval?: boolean;
}

export interface WeighingScaleReading {
  rawWeight: number;
  tareWeight: number;
  netWeight: number;
  unit: 'g' | 'kg';
  isStable: boolean;
  protocol: WeighingScaleProtocol;
  rawPacket: string;
  timestamp: string;
}

export interface WeighableItemPriceCalculation {
  menuItemId: string;
  name: string;
  netWeight: number;
  unit: 'g' | 'kg';
  pricePerKg: number;
  calculatedPrice: number;
  tareWeightApplied: number;
  isStable: boolean;
  formattedDisplay: string;
}

export interface BarcodeScanEvent {
  barcode: string;
  source: 'hardware_scanner' | 'manual_entry' | 'camera_qr';
  timestamp: string;
  rawBuffer?: string;
}

export interface BarcodeResolvedItem {
  barcode: string;
  sku?: string;
  menuItem: MenuItem;
  isWeightEmbedded: boolean;
  embeddedWeight?: number;
  embeddedPrice?: number;
  unitPrice: number;
  finalPrice: number;
  quantity: number;
  resolvedAt: string;
}

export interface VfdPoleDisplayConfig {
  baudRate: number;
  lineCount: 2;
  charPerLine: 20;
  welcomeLine1: string;
  welcomeLine2: string;
  thankYouLine1: string;
  thankYouLine2: string;
  charset: string;
  port?: string;
}

export interface VfdDisplayPayload {
  line1: string;
  line2: string;
  command?: 'display' | 'clear' | 'welcome' | 'thank_you' | 'checkout';
}

export interface VfdGeneratedCommands {
  line1Formatted: string;
  line2Formatted: string;
  rawHex: string;
  byteCount: number;
  timestamp: string;
}

export interface HardwarePeripheralsStatus {
  scale: {
    connected: boolean;
    protocol: WeighingScaleProtocol;
    currentReading: WeighingScaleReading;
    tareWeight: number;
    simulated: boolean;
  };
  scanner: {
    active: boolean;
    lastScannedBarcode?: string;
    lastScannedAt?: string;
    totalScansToday: number;
  };
  vfd: {
    connected: boolean;
    currentLine1: string;
    currentLine2: string;
    lastCommandHex: string;
    lastUpdated: string;
  };
}

// ==========================================
// PHASE 10: PRODUCTION HARDENING & SYSTEM TYPES
// ==========================================

export interface BackupMetadata {
  id: string;
  filename: string;
  filepath: string;
  createdAt: string;
  sizeBytes: number;
  uncompressedSizeBytes: number;
  sha256Checksum: string;
  tag?: string;
  recordCounts: {
    orders: number;
    bills: number;
    menuItems: number;
    outlets: number;
    customers: number;
    inventory: number;
  };
}

export interface RestoreResult {
  success: boolean;
  restoredFrom: string;
  sha256Verified: boolean;
  restoredAt: string;
  durationMs: number;
  message: string;
}

export interface RateLimitStatus {
  ip: string;
  endpoint: string;
  requestsCount: number;
  limit: number;
  remaining: number;
  resetTime: string;
}

export interface SystemHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  timestamp: string;
  nodeVersion: string;
  environment: string;
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  database: {
    status: 'connected' | 'error';
    fileSizeBytes: number;
    writable: boolean;
    totalOrders: number;
    totalBills: number;
    totalMenuItems: number;
    lastWriteTime?: string;
  };
  outlets: {
    totalCount: number;
    activeCount: number;
    franchiseCount: number;
  };
  hardware: {
    scaleAvailable: boolean;
    scannerActive: boolean;
    vfdReady: boolean;
  };
  backups: {
    availableBackupsCount: number;
    latestBackupTimestamp?: string;
    latestBackupId?: string;
  };
  security: {
    rateLimitingActive: boolean;
    helmetHeadersEnforced: boolean;
    corsOrigin: string;
  };
}







// ==========================================
// Phase 11: Reelo-Style Marketing, RFM & Feedback Hub
// ==========================================
export interface MarketingCampaign {
  id: string;
  title: string;
  type: 'whatsapp' | 'sms';
  targetSegment: 'all' | RfmSegment;
  templateMessage: string;
  offerCode?: string;
  discountPercent?: number;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
}

export interface CustomerFeedback {
  id: string;
  customerPhone: string;
  customerName?: string;
  billId?: string;
  rating: number; // 1 to 5
  feedbackText?: string;
  tags: string[];
  npsCategory: 'promoter' | 'passive' | 'detractor';
  managerStatus: 'new' | 'reviewed' | 'resolved';
  managerNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AutomatedTriggerConfig {
  birthdayPerk: {
    enabled: boolean;
    offerText: string;
    discountPercent: number;
    validityDays: number;
  };
  winbackTrigger: {
    enabled: boolean;
    inactiveDaysThreshold: number;
    offerText: string;
    discountPercent: number;
  };
  feedbackNudge: {
    enabled: boolean;
    delayMinutes: number;
  };
}

export interface NpsSummaryReport {
  overallNps: number;
  totalResponses: number;
  averageRating: number;
  promoterCount: number;
  passiveCount: number;
  detractorCount: number;
  promoterPercent: number;
  detractorPercent: number;
  recentFeedbacks: CustomerFeedback[];
}
