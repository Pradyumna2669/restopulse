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

export type BusinessType = 'cafe' | 'restaurant' | 'fine_dining' | 'bakery' | 'fast_food' | 'bar';

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
  createdAt: string;
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
}

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
  status: 'paid' | 'unpaid';
  createdAt: string;

  // Delivery Partner Settlement
  deliveryPartner?: DeliveryPartner;
  partnerOrderId?: string;
  partnerPickupCode?: string;
  partnerCommissionAmount?: number;
  partnerNetPayout?: number;

  whatsappInvoiceSent: boolean;
  whatsappInvoiceTimestamp?: string;
  whatsappReviewSent: boolean;
  whatsappReviewTimestamp?: string;
  whatsappError?: string;
}
