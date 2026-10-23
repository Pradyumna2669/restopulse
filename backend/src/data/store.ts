import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  RestaurantProfile,
  Category,
  MenuItem,
  RestaurantTable,
  Order,
  OrderItem,
  Bill,
  OrderStatus,
  RawMaterial,
  StockInwardEntry,
  CashRegisterShift,
  PettyExpense,
  RecipeItem,
  CustomerProfile,
  TableReservation,
  GuestWaitlistEntry,
  SplitPaymentEntry,
  DeliveryPartner,
  DeliveryPartnerConfig,
  StaffRole,
  StaffPermission,
  StaffUser,
  AuditLog,
  PaymentTransaction,
  WebhookDeliveryLog,
  PartnerReconciliationEntry,
  ReconciliationReport,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  WastageLog,
  RecipeVarianceReport,
  WaiterCallRequest,
  Organization,
  Brand,
  Outlet,
  OutletMenuOverride,
  EffectiveMenuItem,
  InterStoreTransfer,
  TransferItem,
  TransferStatus,
  OutletInventoryLevel,
  MaterialStockMatrixEntry,
  OutletRoyaltySummary,
  ConsolidatedHqReport,
  MarketingCampaign,
  CustomerFeedback,
  AutomatedTriggerConfig,
  RfmSegment
} from '../types';

interface StoreData {
  profile: RestaurantProfile;
  categories: Category[];
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  orders: Order[];
  bills: Bill[];
  inventory: RawMaterial[];
  stockInwardLogs: StockInwardEntry[];
  cashRegister: CashRegisterShift;
  customers: CustomerProfile[];
  reservations: TableReservation[];
  waitlist: GuestWaitlistEntry[];
  staffUsers: StaffUser[];
  auditLogs: AuditLog[];
  payments: PaymentTransaction[];
  webhookLogs: WebhookDeliveryLog[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  wastageLogs: WastageLog[];
  waiterCalls: WaiterCallRequest[];
  organizations: Organization[];
  brands: Brand[];
  outlets: Outlet[];
  outletMenuOverrides: OutletMenuOverride[];
  stockTransfers: InterStoreTransfer[];
  marketingCampaigns?: MarketingCampaign[];
  customerFeedbacks?: CustomerFeedback[];
  marketingAutomations?: AutomatedTriggerConfig;
}

const DATA_FILE = path.join(__dirname, 'restopulse-db.json');

// Generate an unguessable cryptographic token for tables
export function generateSecureQrToken(): string {
  return 'tbl_' + crypto.randomBytes(8).toString('hex');
}

export const initialDeliveryPartners: DeliveryPartnerConfig[] = [
  {
    partner: 'zomato',
    name: 'Zomato Food Delivery',
    enabled: true,
    storeId: 'ZOM-DELHI-4902',
    apiKey: 'zom_live_98a7c2e3',
    webhookSecret: 'whsec_zomato_live_token',
    autoAcceptOrders: true,
    commissionPercent: 18,
    color: '#E23744',
    badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-600/60'
  },
  {
    partner: 'swiggy',
    name: 'Swiggy Delivery Network',
    enabled: true,
    storeId: 'SWG-BLR-8812',
    apiKey: 'swg_live_31b8f4a1',
    webhookSecret: 'whsec_swiggy_live_token',
    autoAcceptOrders: true,
    commissionPercent: 20,
    color: '#FC8019',
    badgeBg: 'bg-orange-950/80 text-orange-300 border-orange-600/60'
  },
  {
    partner: 'ondc',
    name: 'ONDC Open Network (Magicpin/Ola/Paytm)',
    enabled: true,
    storeId: 'ONDC-MUM-1049',
    apiKey: 'ondc_live_77c1d9f0',
    webhookSecret: 'whsec_ondc_live_token',
    autoAcceptOrders: false,
    commissionPercent: 5,
    color: '#2563EB',
    badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-600/60'
  },
  {
    partner: 'magicpin',
    name: 'Magicpin Local Delivery',
    enabled: true,
    storeId: 'MGCP-NCR-3390',
    apiKey: 'mgcp_live_44d6a8b2',
    webhookSecret: 'whsec_magicpin_live_token',
    autoAcceptOrders: true,
    commissionPercent: 12,
    color: '#8B5CF6',
    badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-600/60'
  }
];

const initialProfile: RestaurantProfile = {
  id: 'rest_01',
  name: 'The Daily Grind',
  tagline: 'Good coffee. Slow mornings.',
  businessType: 'cafe',
  openingHours: '09:00 – 22:00',
  isAcceptingOrders: true,
  enablePromotions: true,
  address: 'Shop 14-16, Food District, Sector 18, City Hub',
  phone: '+91 98765 43210',
  gstin: '24AAAAA0000A1Z5',
  fssai: '10019021000456',
  currencySymbol: '₹',
  googlePlaceReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
  featureFlags: {
    enableDineIn: true,
    enableTakeaway: true,
    enableDelivery: true,
    enableQrOrdering: true,
    enableWhatsAppInvoice: true,
    enableGoogleReviewPrompt: true,
    enableKds: true
  },
  openwaConfig: {
    apiUrl: 'http://localhost:2785',
    sessionId: 'default',
    apiKey: '',
    autoSendInvoice: true,
    autoSendReviewPrompt: true,
    reviewPromptDelayMinutes: 0
  },
  deliveryPartners: initialDeliveryPartners
};

const initialCategories: Category[] = [
  { id: 'cat_starters', name: 'Starters & Appetizers', icon: '🍲', sortOrder: 1 },
  { id: 'cat_tandoor', name: 'Tandoor & Grills', icon: '🍢', sortOrder: 2 },
  { id: 'cat_mains', name: 'Main Course', icon: '🍛', sortOrder: 3 },
  { id: 'cat_breads', name: 'Breads & Rice', icon: '🫓', sortOrder: 4 },
  { id: 'cat_beverages', name: 'Beverages & Shakes', icon: '🥤', sortOrder: 5 },
  { id: 'cat_desserts', name: 'Desserts', icon: '🍨', sortOrder: 6 }
];

const initialMenuItems: MenuItem[] = [
  {
    id: 'item_paneer_tikka',
    categoryId: 'cat_starters',
    name: 'Paneer Tikka Angara',
    description: 'Charcoal-smoked cottage cheese cubes marinated in fiery tandoori spices and roasted bell peppers',
    basePrice: 280,
    foodType: 'veg',
    station: 'tandoor',
    gstRate: 5,
    barcode: '8901030000018',
    sku: 'SKU-PTIK-01',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
    variations: [
      { id: 'v_reg', name: 'Regular (6 pcs)', price: 280 },
      { id: 'v_lg', name: 'Platter (10 pcs)', price: 420 }
    ],
    addons: [
      { id: 'a_cheese', name: 'Extra Cheese Burst', price: 40 },
      { id: 'a_mint', name: 'Extra Mint Dip', price: 20 }
    ],
    inStock: true
  },
  {
    id: 'item_butter_chicken',
    categoryId: 'cat_mains',
    name: 'Classic Butter Chicken',
    description: 'Clay-oven roasted chicken simmered in rich, velvety tomato and butter gravy with kasoori methi',
    basePrice: 380,
    foodType: 'non-veg',
    station: 'kitchen',
    gstRate: 5,
    barcode: '8901030000025',
    sku: 'SKU-BCHK-02',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
    variations: [
      { id: 'v_half', name: 'Half (2 pcs)', price: 380 },
      { id: 'v_full', name: 'Full (4 pcs)', price: 620 }
    ],
    addons: [
      { id: 'a_gravy', name: 'Extra Gravy Bowl', price: 60 }
    ],
    inStock: true
  },
  {
    id: 'item_dal_makhani',
    categoryId: 'cat_mains',
    name: 'Dal Makhani Bukhara',
    description: 'Slow-cooked black lentils simmered overnight with fresh churned white butter and mild spices',
    basePrice: 260,
    foodType: 'veg',
    station: 'kitchen',
    gstRate: 5,
    barcode: '8901030000032',
    sku: 'SKU-DMAK-03',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
    addons: [
      { id: 'a_cream', name: 'Double Cream Top', price: 30 }
    ],
    inStock: true
  },
  {
    id: 'item_garlic_naan',
    categoryId: 'cat_breads',
    name: 'Garlic Butter Naan',
    description: 'Crisp Indian leavened bread baked in tandoor, topped with roasted garlic and brushed with melted butter',
    basePrice: 75,
    foodType: 'veg',
    station: 'tandoor',
    gstRate: 5,
    barcode: '8901030000049',
    sku: 'SKU-GNAA-04',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    inStock: true
  },
  {
    id: 'item_virgin_mojito',
    categoryId: 'cat_beverages',
    name: 'Fresh Mint Virgin Mojito',
    description: 'Crushed garden mint, lime wedges, sparkling soda, and brown cane syrup served chilled',
    basePrice: 150,
    foodType: 'veg',
    station: 'bar',
    gstRate: 5,
    barcode: '8901030000056',
    sku: 'SKU-VMOJ-05',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    inStock: true
  },
  {
    id: 'item_gulab_jamun',
    categoryId: 'cat_desserts',
    name: 'Saffron Gulab Jamun with Ice Cream',
    description: 'Warm golden khoya dumplings soaked in saffron syrup served with vanilla bean ice cream',
    basePrice: 140,
    foodType: 'veg',
    station: 'dessert',
    gstRate: 5,
    barcode: '8901030000063',
    sku: 'SKU-GJAM-06',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    inStock: true
  },
  {
    id: 'item_pistachio_mithai',
    categoryId: 'cat_desserts',
    name: 'Royal Pistachio Kaju Katli',
    description: 'Handcrafted silver-leafed cashew diamond fudges infused with Iranian pistachios (sold by weight / ₹950/kg)',
    basePrice: 950,
    foodType: 'veg',
    station: 'dessert',
    gstRate: 5,
    barcode: '8901030001015',
    sku: '00101',
    isWeighed: true,
    weightUnit: 'kg',
    pricePerKg: 950,
    image: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=600&q=80',
    inStock: true
  },
  {
    id: 'item_belgian_truffle_cake',
    categoryId: 'cat_desserts',
    name: 'Dark Belgian Truffle Cake',
    description: '70% dark chocolate sponge cake layered with rich Belgian ganache (sold by weight / ₹850/kg)',
    basePrice: 850,
    foodType: 'egg',
    station: 'dessert',
    gstRate: 18,
    barcode: '8901030001022',
    sku: '00102',
    isWeighed: true,
    weightUnit: 'kg',
    pricePerKg: 850,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
    inStock: true
  }
];

const initialTables: RestaurantTable[] = [
  { id: 'tbl_t1', tableNumber: 'T-01', section: 'Ground Floor', capacity: 2, status: 'vacant', qrToken: 'sec_8f93a2b1c4e7' },
  { id: 'tbl_t2', tableNumber: 'T-02', section: 'Ground Floor', capacity: 4, status: 'vacant', qrToken: 'sec_3d8b19e4a7c2' },
  { id: 'tbl_t3', tableNumber: 'T-03', section: 'Ground Floor', capacity: 4, status: 'vacant', qrToken: 'sec_5e71c9a0f2b8' },
  { id: 'tbl_t4', tableNumber: 'T-04', section: 'Ground Floor', capacity: 6, status: 'vacant', qrToken: 'sec_9c2a4f61e8d3' },
  { id: 'tbl_ac1', tableNumber: 'AC-01', section: 'AC Hall', capacity: 4, status: 'vacant', qrToken: 'sec_7b4d2e83a9c5' },
  { id: 'tbl_ac2', tableNumber: 'AC-02', section: 'AC Hall', capacity: 4, status: 'vacant', qrToken: 'sec_2a9c4f7b1e8d' },
  { id: 'tbl_ac3', tableNumber: 'AC-03', section: 'AC Hall', capacity: 8, status: 'vacant', qrToken: 'sec_6f8b2d4c9a1e' },
  { id: 'tbl_roof1', tableNumber: 'RF-01', section: 'Rooftop Lounge', capacity: 4, status: 'vacant', qrToken: 'sec_4e1a7c9b2d8f' },
  { id: 'tbl_roof2', tableNumber: 'RF-02', section: 'Rooftop Lounge', capacity: 6, status: 'vacant', qrToken: 'sec_1c8e4a7d9b2f' }
];

const initialInventory: RawMaterial[] = [
  { id: 'raw_chicken', name: 'Chicken (Boneless)', category: 'Poultry', unit: 'kg', currentStock: 18.5, reorderLevel: 5.0, costPerUnit: 220, lastRestockedAt: new Date().toISOString() },
  { id: 'raw_butter', name: 'Amul Butter', category: 'Dairy', unit: 'kg', currentStock: 8.2, reorderLevel: 2.0, costPerUnit: 480, lastRestockedAt: new Date().toISOString() },
  { id: 'raw_cream', name: 'Fresh Cream', category: 'Dairy', unit: 'litres', currentStock: 6.0, reorderLevel: 2.0, costPerUnit: 190, lastRestockedAt: new Date().toISOString() },
  { id: 'raw_paneer', name: 'Fresh Malai Paneer', category: 'Dairy', unit: 'kg', currentStock: 12.0, reorderLevel: 3.0, costPerUnit: 320, lastRestockedAt: new Date().toISOString() },
  { id: 'raw_rice', name: 'Royal Basmati Rice', category: 'Grocery', unit: 'kg', currentStock: 45.0, reorderLevel: 10.0, costPerUnit: 95, lastRestockedAt: new Date().toISOString() },
  { id: 'raw_maida', name: 'Flour (Maida)', category: 'Grocery', unit: 'kg', currentStock: 25.0, reorderLevel: 8.0, costPerUnit: 38, lastRestockedAt: new Date().toISOString() },
  { id: 'raw_tomato', name: 'Fresh Red Tomatoes', category: 'Produce', unit: 'kg', currentStock: 15.0, reorderLevel: 5.0, costPerUnit: 35, lastRestockedAt: new Date().toISOString() },
  { id: 'raw_cheese', name: 'Mozzarella Cheese', category: 'Dairy', unit: 'kg', currentStock: 4.5, reorderLevel: 2.0, costPerUnit: 420, lastRestockedAt: new Date().toISOString() },
  { id: 'raw_cans', name: 'Cold Drink Cans (300ml)', category: 'Beverage', unit: 'pcs', currentStock: 48, reorderLevel: 15, costPerUnit: 28, lastRestockedAt: new Date().toISOString() },
  { id: 'raw_spices', name: 'Garam Masala & Spices', category: 'Grocery', unit: 'kg', currentStock: 3.5, reorderLevel: 1.0, costPerUnit: 650, lastRestockedAt: new Date().toISOString() }
];

const initialShift: CashRegisterShift = {
  id: 'shift_today',
  openedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  openingFloat: 2500,
  cashSales: 0,
  pettyExpenses: [
    {
      id: 'exp_1',
      category: 'Dairy & Milk',
      amount: 350,
      description: 'Morning fresh milk 5 litres',
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
    },
    {
      id: 'exp_2',
      category: 'Produce & Ice',
      amount: 180,
      description: 'Ice blocks for bar counter',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
    }
  ],
  expectedCash: 1970,
  status: 'open'
};

const initialCustomers: CustomerProfile[] = [
  {
    id: 'cust_1',
    name: 'Rohan Mehra',
    phone: '9876543210',
    email: 'rohan.mehra@gmail.com',
    visitsCount: 8,
    totalSpend: 6420,
    loyaltyPoints: 64,
    tier: 'Gold',
    favoriteItems: ['Classic Butter Chicken', 'Garlic Butter Naan'],
    lastVisit: new Date(Date.now() - 24 * 3600000).toISOString(),
    notes: 'Prefers mild spices. Regular diner with family.'
  },
  {
    id: 'cust_2',
    name: 'Priya Sharma',
    phone: '9812345678',
    email: 'priya.sharma@outlook.com',
    visitsCount: 4,
    totalSpend: 3180,
    loyaltyPoints: 31,
    tier: 'Silver',
    favoriteItems: ['Amritsari Paneer Tikka', 'Masala Chai'],
    lastVisit: new Date(Date.now() - 48 * 3600000).toISOString(),
    notes: 'Vegetarian. Likes corner tables.'
  },
  {
    id: 'cust_3',
    name: 'Vikram Malhotra',
    phone: '9988776655',
    email: 'vikram.m@corporates.in',
    visitsCount: 18,
    totalSpend: 19450,
    loyaltyPoints: 194,
    tier: 'VIP Platinum',
    favoriteItems: ['Hyderabadi Chicken Dum Biryani', 'Classic Butter Chicken'],
    lastVisit: new Date().toISOString(),
    notes: 'VIP guest. Corporate account.'
  }
];

const initialReservations: TableReservation[] = [
  {
    id: 'res_1',
    guestName: 'Amit Patel',
    guestPhone: '9876501234',
    pax: 4,
    tableId: 'tbl_ac1',
    tableNumber: 'AC-01',
    reservationDate: new Date().toISOString().split('T')[0],
    reservationTime: '20:00',
    advanceDeposit: 500,
    specialRequest: 'Anniversary celebration. Quiet table requested.',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  },
  {
    id: 'res_2',
    guestName: 'Dr. Sanjay Verma',
    guestPhone: '9811223344',
    pax: 6,
    tableId: 'tbl_roof2',
    tableNumber: 'RF-02',
    reservationDate: new Date().toISOString().split('T')[0],
    reservationTime: '21:15',
    advanceDeposit: 1000,
    specialRequest: 'Family dinner.',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  }
];

const initialWaitlist: GuestWaitlistEntry[] = [
  {
    id: 'wait_1',
    guestName: 'Rahul Khanna',
    guestPhone: '9876599887',
    pax: 2,
    sectionPreference: 'AC Hall',
    estimatedWaitMinutes: 15,
    status: 'waiting',
    createdAt: new Date(Date.now() - 10 * 60000).toISOString()
  }
];

const initialOrders: Order[] = [
  {
    id: 'ord_zomato_1',
    orderNumber: 'ZOM-8821',
    type: 'delivery',
    deliveryPartner: 'zomato',
    partnerOrderId: 'ZOM-8821',
    partnerPickupCode: '4821',
    partnerCommissionPercent: 18,
    partnerCommissionAmount: 144,
    partnerNetPayout: 656,
    customerName: 'Ananya Roy',
    customerPhone: '9876501234',
    deliveryAddress: 'B-402, Green Glen Layout, Bellandur, Bangalore',
    riderName: 'Rahul K. (Bajaj Pulsar)',
    riderPhone: '9811223344',
    riderStatus: 'assigned',
    partnerOrderStatus: 'preparing',
    status: 'preparing',
    items: [
      {
        id: 'item_z1',
        menuItemId: 'item_butter_chicken',
        name: 'Classic Butter Chicken',
        quantity: 1,
        unitPrice: 380,
        station: 'kitchen',
        kotStatus: 'prepared'
      },
      {
        id: 'item_z2',
        menuItemId: 'item_garlic_naan',
        name: 'Garlic Butter Naan',
        quantity: 2,
        unitPrice: 60,
        station: 'tandoor',
        kotStatus: 'pending'
      }
    ],
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ord_swiggy_1',
    orderNumber: 'SWG-4512',
    type: 'delivery',
    deliveryPartner: 'swiggy',
    partnerOrderId: 'SWG-4512',
    partnerPickupCode: '9014',
    partnerCommissionPercent: 20,
    partnerCommissionAmount: 110,
    partnerNetPayout: 440,
    customerName: 'Karan Kapoor',
    customerPhone: '9812345678',
    deliveryAddress: 'Flat 12, Sunrise Apts, 100ft Road, Indiranagar',
    riderName: 'Deepesh M. (Hero Splendor)',
    riderPhone: '9833445566',
    riderStatus: 'assigned',
    partnerOrderStatus: 'food_ready',
    status: 'ready',
    items: [
      {
        id: 'item_s1',
        menuItemId: 'item_paneer_tikka',
        name: 'Paneer Tikka Angara',
        quantity: 1,
        unitPrice: 280,
        station: 'tandoor',
        kotStatus: 'prepared'
      },
      {
        id: 'item_s2',
        menuItemId: 'item_dal_makhani',
        name: 'Dal Makhani Bukhara',
        quantity: 1,
        unitPrice: 270,
        station: 'kitchen',
        kotStatus: 'prepared'
      }
    ],
    createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ord_ondc_1',
    orderNumber: 'ONDC-1094',
    type: 'delivery',
    deliveryPartner: 'ondc',
    partnerOrderId: 'ONDC-1094',
    partnerPickupCode: '2231',
    partnerCommissionPercent: 5,
    partnerCommissionAmount: 24,
    partnerNetPayout: 456,
    customerName: 'Sunil Mehta',
    customerPhone: '9988776655',
    deliveryAddress: 'Shop 4, Hill Road, Bandra West, Mumbai',
    riderName: 'Shadowfax Rider: Vicky',
    riderPhone: '9844556677',
    riderStatus: 'unassigned',
    partnerOrderStatus: 'accepted',
    status: 'kot_printed',
    items: [
      {
        id: 'item_o1',
        menuItemId: 'item_biryani',
        name: 'Hyderabadi Chicken Dum Biryani',
        quantity: 1,
        unitPrice: 380,
        station: 'kitchen',
        kotStatus: 'pending'
      }
    ],
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const initialStaffUsers: StaffUser[] = [
  {
    id: 'staff-owner-01',
    username: 'admin',
    name: 'Rajesh Oberoi (Owner)',
    role: 'owner',
    pin: '1111',
    phone: '+919876543210',
    isActive: true,
    permissions: [
      'BILL_CREATE', 'BILL_VOID', 'BILL_REFUND', 'DISCOUNT_APPLY', 'DISCOUNT_OVERRIDE',
      'STOCK_VIEW', 'STOCK_INWARD', 'STOCK_ADJUST', 'PETTY_EXPENSE', 'SHIFT_CLOSE',
      'MENU_EDIT', 'REPORTS_VIEW', 'STAFF_MANAGE', 'SETTINGS_EDIT'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'staff-mgr-01',
    username: 'manager',
    name: 'Vikram Malhotra (Store Manager)',
    role: 'manager',
    pin: '2222',
    phone: '+919876543211',
    isActive: true,
    permissions: [
      'BILL_CREATE', 'BILL_VOID', 'BILL_REFUND', 'DISCOUNT_APPLY', 'DISCOUNT_OVERRIDE',
      'STOCK_VIEW', 'STOCK_INWARD', 'STOCK_ADJUST', 'PETTY_EXPENSE', 'SHIFT_CLOSE',
      'REPORTS_VIEW'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'staff-cashier-01',
    username: 'cashier',
    name: 'Pooja Sharma (Head Cashier)',
    role: 'cashier',
    pin: '3333',
    phone: '+919876543212',
    isActive: true,
    permissions: [
      'BILL_CREATE', 'DISCOUNT_APPLY', 'PETTY_EXPENSE', 'SHIFT_CLOSE', 'STOCK_VIEW'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'staff-waiter-01',
    username: 'waiter',
    name: 'Amit Kumar (Lead Captain)',
    role: 'waiter',
    pin: '4444',
    phone: '+919876543213',
    isActive: true,
    permissions: ['BILL_CREATE'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'staff-kitchen-01',
    username: 'kitchen',
    name: 'Chef Sanjeev (Kitchen Head)',
    role: 'kitchen',
    pin: '5555',
    phone: '+919876543214',
    isActive: true,
    permissions: [],
    createdAt: new Date().toISOString()
  },
  {
    id: 'staff-inv-01',
    username: 'inventory',
    name: 'Ramesh Verma (Storekeeper)',
    role: 'inventory',
    pin: '6666',
    phone: '+919876543215',
    isActive: true,
    permissions: ['STOCK_VIEW', 'STOCK_INWARD', 'STOCK_ADJUST'],
    createdAt: new Date().toISOString()
  }
];

export const initialSuppliers: Supplier[] = [
  {
    id: 'sup_metro',
    name: 'Metro Cash & Carry Wholesale',
    contactPerson: 'Sunil Mehta',
    phone: '+91 98221 44556',
    email: 'orders.mumbai@metro.co.in',
    gstin: '27AABCM8899C1ZM',
    address: 'Plot 44, Industrial Area, Kurla West, Mumbai',
    categoriesSupplied: ['Grocery', 'Dairy', 'Beverage'],
    paymentTerms: 'net_15',
    rating: 4.8,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup_farmfresh',
    name: 'Fresh Farm Produce Co.',
    contactPerson: 'Kailash Patel',
    phone: '+91 97665 11223',
    email: 'kailash@freshfarmproduce.com',
    gstin: '27AABCF1234D1ZP',
    address: 'Vashi APMC Market, Turbhe, Navi Mumbai',
    categoriesSupplied: ['Produce', 'Poultry'],
    paymentTerms: 'immediate',
    rating: 4.6,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup_amul',
    name: 'Amul Dairy Distributors Ltd',
    contactPerson: 'Dinesh Dave',
    phone: '+91 98980 99887',
    email: 'supply@amuldairy.in',
    gstin: '24AAACA0001A1Z9',
    address: 'Amul Depot, Sector 3, Vashi, Navi Mumbai',
    categoriesSupplied: ['Dairy'],
    paymentTerms: 'net_7',
    rating: 4.9,
    active: true,
    createdAt: new Date().toISOString()
  }
];

export const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po_101',
    poNumber: 'PO-2026-001',
    supplierId: 'sup_metro',
    supplierName: 'Metro Cash & Carry Wholesale',
    status: 'received',
    items: [
      { rawMaterialId: 'raw_rice', rawMaterialName: 'Royal Basmati Rice', quantity: 20, unit: 'kg', unitCost: 95, totalCost: 1900 },
      { rawMaterialId: 'raw_maida', rawMaterialName: 'Flour (Maida)', quantity: 15, unit: 'kg', unitCost: 38, totalCost: 570 }
    ],
    subtotal: 2470,
    tax: 123.5,
    totalAmount: 2593.5,
    expectedDeliveryDate: new Date(Date.now() - 48 * 3600000).toISOString(),
    receivedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    receivedBy: 'Ramesh Verma (Storekeeper)',
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600000).toISOString()
  },
  {
    id: 'po_102',
    poNumber: 'PO-2026-002',
    supplierId: 'sup_farmfresh',
    supplierName: 'Fresh Farm Produce Co.',
    status: 'ordered',
    items: [
      { rawMaterialId: 'raw_chicken', rawMaterialName: 'Chicken (Boneless)', quantity: 25, unit: 'kg', unitCost: 220, totalCost: 5500 },
      { rawMaterialId: 'raw_tomato', rawMaterialName: 'Fresh Red Tomatoes', quantity: 30, unit: 'kg', unitCost: 35, totalCost: 1050 }
    ],
    subtotal: 6550,
    tax: 327.5,
    totalAmount: 6877.5,
    expectedDeliveryDate: new Date(Date.now() + 24 * 3600000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString()
  }
];

export const DEFAULT_OUTLET_ID = 'outlet_delhi_01';

export const initialOrganization: Organization = {
  id: 'org_pulse_01',
  name: 'RestoPulse Hospitality Group',
  legalEntityName: 'RestoPulse Foods & Beverages Pvt. Ltd.',
  corporateGstin: '07AAAAA0000A1Z5',
  panNumber: 'AAAAA0000A',
  registeredOffice: 'Express Towers, Level 14, Nariman Point, Mumbai 400021',
  supportEmail: 'franchise@restopulse.com',
  supportPhone: '+91 22 6600 9900',
  defaultFranchiseRoyaltyPercent: 5.0,
  defaultMarketingLevyPercent: 2.0,
  currency: 'INR',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString()
};

export const initialBrands: Brand[] = [
  {
    id: 'brand_tdg',
    orgId: 'org_pulse_01',
    name: 'The Daily Grind',
    code: 'TDG',
    cuisineType: 'Artisanal Coffee & Continental Bakery',
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z'
  }
];

export const initialOutlets: Outlet[] = [
  {
    id: 'outlet_delhi_01',
    orgId: 'org_pulse_01',
    brandId: 'brand_tdg',
    code: 'TDG-DEL-01',
    name: 'The Daily Grind - Connaught Place (Flagship)',
    tier: 'flagship',
    isFranchise: false,
    franchiseRoyaltyPercent: 0,
    marketingLevyPercent: 0,
    gstin: '07AAAAA0000A1Z5',
    fssaiNumber: '13320001000452',
    phone: '+91 11 4152 8900',
    email: 'delhi.flagship@restopulse.com',
    address: {
      street: '14/A Inner Circle, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      stateCode: '07'
    },
    posTerminalCount: 3,
    active: true,
    openingTime: '08:00',
    closingTime: '23:00',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'outlet_blr_01',
    orgId: 'org_pulse_01',
    brandId: 'brand_tdg',
    code: 'TDG-BLR-01',
    name: 'The Daily Grind - Indiranagar (Franchise)',
    tier: 'franchise',
    isFranchise: true,
    franchiseOwnerName: 'Naveen Gowda',
    franchiseContactPhone: '+91 98450 12345',
    franchiseRoyaltyPercent: 5.0,
    marketingLevyPercent: 2.0,
    gstin: '29BBBBB1111B1Z2',
    fssaiNumber: '11221002000881',
    phone: '+91 80 4120 5544',
    email: 'blr.indiranagar@restopulse.com',
    address: {
      street: '100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      stateCode: '29'
    },
    posTerminalCount: 2,
    active: true,
    openingTime: '09:00',
    closingTime: '23:00',
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'outlet_mum_01',
    orgId: 'org_pulse_01',
    brandId: 'brand_tdg',
    code: 'TDG-MUM-01',
    name: 'The Daily Grind - Bandra West (Franchise)',
    tier: 'franchise',
    isFranchise: true,
    franchiseOwnerName: 'Zubin Mehta',
    franchiseContactPhone: '+91 98200 67890',
    franchiseRoyaltyPercent: 6.0,
    marketingLevyPercent: 2.0,
    gstin: '27CCCCC2222C1Z8',
    fssaiNumber: '12720003000714',
    phone: '+91 22 2640 1199',
    email: 'mum.bandra@restopulse.com',
    address: {
      street: 'Pali Hill, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      stateCode: '27'
    },
    posTerminalCount: 2,
    active: true,
    openingTime: '09:00',
    closingTime: '00:00',
    createdAt: '2025-09-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'outlet_gurgaon_01',
    orgId: 'org_pulse_01',
    brandId: 'brand_tdg',
    code: 'TDG-GUR-01',
    name: 'The Daily Grind - Cyber Hub (Company Owned)',
    tier: 'company_owned',
    isFranchise: false,
    franchiseRoyaltyPercent: 0,
    marketingLevyPercent: 0,
    gstin: '06DDDDD3333D1Z1',
    fssaiNumber: '10621001000339',
    phone: '+91 124 400 8822',
    email: 'gurgaon.cyberhub@restopulse.com',
    address: {
      street: 'DLF Cyber Hub, DLF Phase 2',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122002',
      stateCode: '06'
    },
    posTerminalCount: 2,
    active: true,
    openingTime: '08:30',
    closingTime: '23:30',
    createdAt: '2025-11-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  }
];

export const initialOutletMenuOverrides: OutletMenuOverride[] = [
  {
    id: 'ovr_blr_paneer_tikka',
    outletId: 'outlet_blr_01',
    menuItemId: 'item_paneer_tikka',
    priceOverride: 310,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Naveen Gowda (Franchise Owner)'
  },
  {
    id: 'ovr_mum_butter_chicken',
    outletId: 'outlet_mum_01',
    menuItemId: 'item_butter_chicken',
    priceOverride: 420,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Zubin Mehta (Franchise Owner)'
  },
  {
    id: 'ovr_blr_garlic_naan',
    outletId: 'outlet_blr_01',
    menuItemId: 'item_garlic_naan',
    inStockOverride: false,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Chef Indiranagar'
  }
];


export const defaultMarketingAutomations: AutomatedTriggerConfig = {
  birthdayPerk: {
    enabled: true,
    offerText: '🎂 *Happy Birthday {{name}} from {{restaurantName}}!*\n\nCelebrate your special day with us! Show this message and enjoy a *complimentary dessert* and *20% off* your meal today. ✨\n\nValid for 7 days. We look forward to hosting you!',
    discountPercent: 20,
    validityDays: 7
  },
  winbackTrigger: {
    enabled: true,
    inactiveDaysThreshold: 30,
    offerText: '☕ *We Miss You, {{name}}!*\n\nIt has been a while since your last visit to *{{restaurantName}}*. We would love to welcome you back!\n\nHere is an exclusive *15% discount voucher* (Promo: *WELCOMEBACK15*) on your next dining or takeaway visit. See you soon! ❤️',
    discountPercent: 15
  },
  feedbackNudge: {
    enabled: true,
    delayMinutes: 30
  }
};

export const initialMarketingCampaigns: MarketingCampaign[] = [
  {
    id: 'cmp_weekend_brunch',
    title: 'Weekend Chef Specials (Flat 20% Off)',
    type: 'whatsapp',
    targetSegment: 'all',
    templateMessage: '🍽️ *WEEKEND SPECIAL AT {{restaurantName}}!*\n\nHey {{name}},\nKickstart your weekend with our chef\'s new artisanal tasting menu. Get *{{discount}}% OFF* this Saturday & Sunday with code *{{offerCode}}*.\n\nYou also have *{{points}} loyalty points* ready to redeem!\n\n📍 Visit us today to reserve your table.',
    offerCode: 'WEEKEND20',
    discountPercent: 20,
    status: 'completed',
    sentAt: '2026-10-21T10:00:00.000Z',
    recipientCount: 12,
    deliveredCount: 11,
    failedCount: 1,
    createdAt: '2026-10-20T16:00:00.000Z'
  },
  {
    id: 'cmp_dormant_winback',
    title: '30-Day Inactive Win-Back (We Miss You)',
    type: 'whatsapp',
    targetSegment: 'at_risk',
    templateMessage: '✨ *WE MISS YOU AT {{restaurantName}}!*\n\nDear {{name}},\nIt\'s been over 30 days! As our valued {{tier}} member, enjoy *{{discount}}% OFF* your next order with code *{{offerCode}}*.\n\nTreat yourself today — we\'d love to serve you again! ❤️',
    offerCode: 'COMEBACK15',
    discountPercent: 15,
    status: 'draft',
    recipientCount: 5,
    deliveredCount: 0,
    failedCount: 0,
    createdAt: '2026-10-22T14:00:00.000Z'
  }
];

export const initialCustomerFeedbacks: CustomerFeedback[] = [
  {
    id: 'fb_001',
    customerPhone: '9876543210',
    customerName: 'Rohan Mehra',
    rating: 5,
    feedbackText: 'Outstanding butter chicken and warm ambiance! Staff was super polite.',
    tags: ['food', 'service', 'ambience'],
    npsCategory: 'promoter',
    managerStatus: 'reviewed',
    createdAt: '2026-10-22T18:30:00.000Z'
  },
  {
    id: 'fb_002',
    customerPhone: '9822012345',
    customerName: 'Ananya Iyer',
    rating: 5,
    feedbackText: 'Loved the artisan coffee and quick takeaway service.',
    tags: ['coffee', 'speed'],
    npsCategory: 'promoter',
    managerStatus: 'reviewed',
    createdAt: '2026-10-22T19:15:00.000Z'
  },
  {
    id: 'fb_003',
    customerPhone: '9899011223',
    customerName: 'Vikram Malhotra',
    rating: 2,
    feedbackText: 'Main course took almost 30 minutes to arrive. Food was good once it came though.',
    tags: ['delay', 'service'],
    npsCategory: 'detractor',
    managerStatus: 'new',
    managerNotes: 'Spoke with head waiter; delayed due to peak rush.',
    createdAt: '2026-10-23T09:45:00.000Z'
  }
];

export const initialStockTransfers: InterStoreTransfer[] = [
  {
    id: 'ist_01',
    transferNumber: 'IST-2026-001',
    sourceOutletId: 'outlet_delhi_01',
    sourceOutletName: 'The Daily Grind - Connaught Place (Flagship)',
    destinationOutletId: 'outlet_blr_01',
    destinationOutletName: 'The Daily Grind - Indiranagar (Franchise)',
    status: 'dispatched',
    items: [
      {
        rawMaterialId: 'raw_paneer',
        rawMaterialName: 'Fresh Malai Paneer',
        unit: 'kg',
        quantityRequested: 10,
        quantityDispatched: 10,
        unitCost: 320,
        totalCost: 3200
      },
      {
        rawMaterialId: 'raw_butter',
        rawMaterialName: 'Amul Butter',
        unit: 'kg',
        quantityRequested: 5,
        quantityDispatched: 5,
        unitCost: 480,
        totalCost: 2400
      }
    ],
    subtotalCost: 5600,
    notes: 'Urgent weekend inventory replenishment for Bangalore launch',
    carrierName: 'Blue Dart Cold Express',
    trackingReference: 'BD-EXP-889021',
    vehicleNumber: 'DL-01-AB-1234',
    requestedBy: {
      userId: 'staff_mgr_blr',
      userName: 'Naveen Gowda',
      role: 'Franchise Partner',
      timestamp: new Date(Date.now() - 36 * 3600000).toISOString()
    },
    approvedBy: {
      userId: 'usr_mgr_01',
      userName: 'Vikram Malhotra',
      role: 'Head of Operations',
      timestamp: new Date(Date.now() - 30 * 3600000).toISOString()
    },
    dispatchedBy: {
      userId: 'usr_staff_01',
      userName: 'Ramesh Verma',
      role: 'Central Warehouse Keeper',
      timestamp: new Date(Date.now() - 18 * 3600000).toISOString()
    },
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 3600000).toISOString()
  }
];

class Store {
  private data: StoreData;

  constructor() {
    this.data = this.load();
  }

  private load(): StoreData {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.profile.featureFlags) {
          parsed.profile.featureFlags = initialProfile.featureFlags;
        }
        if (!parsed.profile.deliveryPartners || parsed.profile.deliveryPartners.length === 0) {
          parsed.profile.deliveryPartners = initialDeliveryPartners;
        }
        if (!parsed.orders || parsed.orders.length === 0) {
          parsed.orders = initialOrders;
        }
        if (!parsed.bills) {
          parsed.bills = [];
        }
        if (!parsed.inventory || parsed.inventory.length === 0) {
          parsed.inventory = initialInventory;
        }
        if (!parsed.stockInwardLogs) {
          parsed.stockInwardLogs = [];
        }
        if (!parsed.cashRegister) {
          parsed.cashRegister = initialShift;
        }
        if (!parsed.customers || parsed.customers.length === 0) {
          parsed.customers = initialCustomers;
        }
        if (!parsed.reservations) {
          parsed.reservations = initialReservations;
        }
        if (!parsed.waitlist) {
          parsed.waitlist = initialWaitlist;
        }
        if (!parsed.staffUsers || parsed.staffUsers.length === 0) {
          parsed.staffUsers = initialStaffUsers;
        }
        if (!parsed.auditLogs) {
          parsed.auditLogs = [];
        }
        if (!parsed.payments) {
          parsed.payments = [];
        }
        if (!parsed.webhookLogs) {
          parsed.webhookLogs = [];
        }
        if (!parsed.suppliers || parsed.suppliers.length === 0) {
          parsed.suppliers = initialSuppliers;
        }
        if (!parsed.purchaseOrders || parsed.purchaseOrders.length === 0) {
          parsed.purchaseOrders = initialPurchaseOrders;
        }
        if (!parsed.wastageLogs) {
          parsed.wastageLogs = [];
        }
        if (!parsed.waiterCalls) {
          parsed.waiterCalls = [];
        }
        if (!parsed.organizations || parsed.organizations.length === 0) {
          parsed.organizations = [initialOrganization];
        }
        if (!parsed.brands || parsed.brands.length === 0) {
          parsed.brands = initialBrands;
        }
        if (!parsed.outlets || parsed.outlets.length === 0) {
          parsed.outlets = initialOutlets;
        }
        if (!parsed.outletMenuOverrides || !parsed.outletMenuOverrides.some((o: any) => o.menuItemId === 'item_paneer_tikka')) {
          parsed.outletMenuOverrides = initialOutletMenuOverrides;
        }
        if (!parsed.stockTransfers || !parsed.stockTransfers.some((t: any) => t.items?.some((i: any) => i.rawMaterialId === 'raw_paneer'))) {
          parsed.stockTransfers = initialStockTransfers;
        }
        if (!parsed.menuItems || !parsed.menuItems.some((m: any) => m.id === 'item_pistachio_mithai')) {
          if (!parsed.menuItems) parsed.menuItems = [];
          for (const initItem of initialMenuItems) {
            const existing = parsed.menuItems.find((m: any) => m.id === initItem.id);
            if (!existing) {
              parsed.menuItems.push({ ...initItem });
            } else {
              if (initItem.barcode) existing.barcode = initItem.barcode;
              if (initItem.sku) existing.sku = initItem.sku;
              if (initItem.isWeighed) {
                existing.isWeighed = initItem.isWeighed;
                existing.pricePerKg = initItem.pricePerKg;
                existing.weightUnit = initItem.weightUnit;
              }
            }
          }
        }
        // Ensure every table has a secure qrToken
        parsed.tables = parsed.tables.map((t: RestaurantTable) => {
          if (!t.qrToken || t.qrToken.startsWith('qr_')) {
            return { ...t, qrToken: generateSecureQrToken() };
          }
          return t;
        });
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load store.json, creating initial store:', e);
    }

    const initial: StoreData = {
      profile: initialProfile,
      categories: initialCategories,
      menuItems: initialMenuItems,
      tables: initialTables,
      orders: [],
      bills: [],
      inventory: initialInventory,
      stockInwardLogs: [],
      cashRegister: initialShift,
      customers: initialCustomers,
      reservations: initialReservations,
      waitlist: initialWaitlist,
      staffUsers: initialStaffUsers,
      auditLogs: [],
      payments: [],
      webhookLogs: [],
      suppliers: initialSuppliers,
      purchaseOrders: initialPurchaseOrders,
      wastageLogs: [],
      waiterCalls: [],
      organizations: [initialOrganization],
      brands: initialBrands,
      outlets: initialOutlets,
      outletMenuOverrides: initialOutletMenuOverrides,
      stockTransfers: initialStockTransfers
    };
    this.save(initial);
    return initial;
  }

  private save(data: StoreData) {
    try {
      const tempFile = `${DATA_FILE}.tmp.${process.pid}.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      try {
        fs.renameSync(tempFile, DATA_FILE);
      } catch (err: any) {
        if (err.code === 'EEXIST' || err.code === 'EPERM') {
          fs.copyFileSync(tempFile, DATA_FILE);
          try { fs.unlinkSync(tempFile); } catch {}
        } else {
          throw err;
        }
      }
    } catch (e) {
      console.error('Failed to save store.json:', e);
    }
  }

  reload(): StoreData {
    this.data = this.load();
    return this.data;
  }

  getDatabasePath(): string {
    return DATA_FILE;
  }

  // Profile
  getProfile(): RestaurantProfile {
    return this.data.profile;
  }

  updateProfile(update: Partial<RestaurantProfile>): RestaurantProfile {
    this.data.profile = { 
      ...this.data.profile, 
      ...update,
      featureFlags: {
        ...this.data.profile.featureFlags,
        ...(update.featureFlags || {})
      },
      openwaConfig: {
        ...this.data.profile.openwaConfig,
        ...(update.openwaConfig || {})
      },
    };
    this.save(this.data);
    return this.data.profile;
  }

  // Categories
  getCategories(): Category[] {
    return this.data.categories;
  }

  addCategory(name: string, icon: string): Category {
    const newCat: Category = {
      id: 'cat_' + uuidv4().slice(0, 8),
      name,
      icon: icon || '🍽️',
      sortOrder: this.data.categories.length + 1
    };
    this.data.categories.push(newCat);
    this.save(this.data);
    return newCat;
  }

  updateCategory(id: string, name: string, icon?: string): Category | undefined {
    const cat = this.data.categories.find(c => c.id === id);
    if (cat) {
      if (name) cat.name = name;
      if (icon) cat.icon = icon;
      this.save(this.data);
      return cat;
    }
    return undefined;
  }

  deleteCategory(id: string): boolean {
    const initialLen = this.data.categories.length;
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    if (this.data.categories.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  // Menu Items
  getMenuItems(): MenuItem[] {
    return this.data.menuItems;
  }

  addMenuItem(itemData: Omit<MenuItem, 'id'>): MenuItem {
    const newItem: MenuItem = {
      ...itemData,
      id: 'item_' + uuidv4().slice(0, 8)
    };
    this.data.menuItems.push(newItem);
    this.save(this.data);
    return newItem;
  }

  updateMenuItem(id: string, update: Partial<MenuItem>): MenuItem | undefined {
    const idx = this.data.menuItems.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.data.menuItems[idx] = { ...this.data.menuItems[idx], ...update };
      this.save(this.data);
      return this.data.menuItems[idx];
    }
    return undefined;
  }

  deleteMenuItem(id: string): boolean {
    const initialLen = this.data.menuItems.length;
    this.data.menuItems = this.data.menuItems.filter(i => i.id !== id);
    if (this.data.menuItems.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  toggleMenuItemStock(id: string): MenuItem | undefined {
    const item = this.data.menuItems.find(i => i.id === id);
    if (item) {
      item.inStock = !item.inStock;
      this.save(this.data);
      return item;
    }
    return undefined;
  }

  // Tables Management
  getTables(): RestaurantTable[] {
    return this.data.tables;
  }

  getTableBySecureToken(token: string): RestaurantTable | undefined {
    // Only resolve by secure unguessable qrToken or exact internal ID
    return this.data.tables.find(t => t.qrToken === token || t.id === token);
  }

  addTable(tableNumber: string, section: string, capacity: number): RestaurantTable {
    const newTable: RestaurantTable = {
      id: 'tbl_' + uuidv4().slice(0, 8),
      tableNumber,
      section: section || 'Main Hall',
      capacity: capacity || 4,
      status: 'vacant',
      qrToken: generateSecureQrToken()
    };
    this.data.tables.push(newTable);
    this.save(this.data);
    return newTable;
  }

  updateTable(id: string, update: Partial<RestaurantTable>): RestaurantTable | undefined {
    const idx = this.data.tables.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.tables[idx] = { ...this.data.tables[idx], ...update };
      this.save(this.data);
      return this.data.tables[idx];
    }
    return undefined;
  }

  deleteTable(id: string): boolean {
    const initialLen = this.data.tables.length;
    this.data.tables = this.data.tables.filter(t => t.id !== id);
    if (this.data.tables.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  rotateTableQrToken(id: string): RestaurantTable | undefined {
    const table = this.data.tables.find(t => t.id === id);
    if (table) {
      table.qrToken = generateSecureQrToken();
      this.save(this.data);
      return table;
    }
    return undefined;
  }

  updateTableStatus(tableId: string, status: RestaurantTable['status'], currentOrderId?: string) {
    const table = this.data.tables.find(t => t.id === tableId);
    if (table) {
      table.status = status;
      table.currentOrderId = currentOrderId;
      this.save(this.data);
    }
  }

  transferTable(fromTableId: string, toTableId: string): { success: boolean; message?: string; fromTable?: RestaurantTable; toTable?: RestaurantTable; order?: Order } {
    const fromTable = this.data.tables.find(t => t.id === fromTableId);
    const toTable = this.data.tables.find(t => t.id === toTableId);

    if (!fromTable || !toTable) {
      return { success: false, message: 'Invalid source or destination table' };
    }

    if (toTable.status === 'running' && toTable.id !== fromTable.id) {
      return { success: false, message: `Destination Table ${toTable.tableNumber} is already occupied!` };
    }

    // Find active order for fromTable
    let order: Order | undefined;
    if (fromTable.currentOrderId) {
      order = this.getOrderById(fromTable.currentOrderId);
    } else {
      order = this.getOrders().find(o => o.tableId === fromTable.id && o.status !== 'settled' && o.status !== 'cancelled');
    }

    if (order) {
      order.tableId = toTable.id;
      order.tableNumber = toTable.tableNumber;
      order.specialNotes = (order.specialNotes ? order.specialNotes + ' | ' : '') + `[Shifted from Table ${fromTable.tableNumber} to Table ${toTable.tableNumber} at ${new Date().toLocaleTimeString()}]`;
      order.updatedAt = new Date().toISOString();
      toTable.currentOrderId = order.id;
    } else {
      toTable.currentOrderId = undefined;
    }

    toTable.status = fromTable.status;
    fromTable.status = 'vacant';
    fromTable.currentOrderId = undefined;

    this.save(this.data);
    return { success: true, fromTable, toTable, order };
  }

  vacateTable(tableId: string): { success: boolean; table?: RestaurantTable } {
    const table = this.data.tables.find(t => t.id === tableId);
    if (!table) return { success: false };

    if (table.currentOrderId) {
      const order = this.getOrderById(table.currentOrderId);
      if (order && order.status !== 'settled') {
        order.status = 'cancelled';
        order.updatedAt = new Date().toISOString();
      }
    }
    table.status = 'vacant';
    table.currentOrderId = undefined;
    this.save(this.data);
    return { success: true, table };
  }


  // Orders
  getOrders(): Order[] {
    if (!this.data.orders) {
      this.data.orders = [];
    }
    return this.data.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id);
  }

  createOrder(order: Order): Order {
    if (!this.data.orders) {
      this.data.orders = [];
    }
    this.data.orders.push(order);
    if (order.tableId) {
      this.updateTableStatus(order.tableId, 'running', order.id);
    }
    this.deductInventoryForOrder(order);
    this.save(this.data);
    return order;
  }

  updateOrder(id: string, update: Partial<Order>): Order | undefined {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      orders[idx] = { ...orders[idx], ...update, updatedAt: new Date().toISOString() };
      this.save(this.data);
      return orders[idx];
    }
    return undefined;
  }

  updateOrderStatus(id: string, status: OrderStatus): Order | undefined {
    const order = this.getOrderById(id);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      this.save(this.data);
      return order;
    }
    return undefined;
  }

  updateOrderItemStatus(orderId: string, itemId: string, kotStatus: 'pending' | 'printed' | 'prepared'): Order | undefined {
    const order = this.getOrderById(orderId);
    if (order) {
      const item = order.items.find(i => i.id === itemId);
      if (item) {
        item.kotStatus = kotStatus;
        order.updatedAt = new Date().toISOString();
        if (order.items.every(i => i.kotStatus === 'prepared')) {
          order.status = 'ready';
        } else if (order.items.some(i => i.kotStatus === 'prepared') && order.status === 'kot_printed') {
          order.status = 'preparing';
        }
        this.save(this.data);
        return order;
      }
    }
    return undefined;
  }

  // Bills
  getBills(): Bill[] {
    if (!this.data.bills) {
      this.data.bills = [];
    }
    return this.data.bills;
  }

  getBillById(id: string): Bill | undefined {
    return this.data.bills.find(b => b.id === id);
  }

  createBill(bill: Bill): Bill {
    this.data.bills.unshift(bill);
    const order = this.getOrderById(bill.orderId);
    if (order && order.tableId) {
      this.updateTableStatus(order.tableId, 'vacant', undefined);
      this.updateOrder(order.id, { status: 'settled' });
    }

    // Cash Drawer tally
    let cashAdded = 0;
    if (bill.paymentMode === 'cash') {
      cashAdded = bill.total;
    } else if (bill.paymentMode === 'split' && bill.splitPayments) {
      cashAdded = bill.splitPayments.find(p => p.mode === 'cash')?.amount || 0;
    }

    if (cashAdded > 0) {
      const register = this.getCashRegister();
      if (register && register.status === 'open') {
        register.cashSales += cashAdded;
        const totalExpenses = register.pettyExpenses.reduce((sum, e) => sum + e.amount, 0);
        register.expectedCash = Number((register.openingFloat + register.cashSales - totalExpenses).toFixed(2));
      }
    }

    // Customer CRM Profile & Loyalty
    if (bill.customerPhone) {
      this.recordCustomerBill(bill);
    }

    this.save(this.data);
    return bill;
  }

  updateBill(id: string, update: Partial<Bill>): Bill | undefined {
    const idx = this.data.bills.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.data.bills[idx] = { ...this.data.bills[idx], ...update };
      this.save(this.data);
      return this.data.bills[idx];
    }
    return undefined;
  }

  // ==========================================
  // Inventory & Recipe Management
  // ==========================================
  getInventory(): RawMaterial[] {
    if (!this.data.inventory || this.data.inventory.length === 0) {
      this.data.inventory = initialInventory;
    }
    return this.data.inventory;
  }

  addRawMaterial(data: Omit<RawMaterial, 'id'>): RawMaterial {
    const newMaterial: RawMaterial = {
      id: 'raw_' + uuidv4().slice(0, 8),
      ...data,
      lastRestockedAt: new Date().toISOString()
    };
    this.data.inventory.push(newMaterial);
    this.save(this.data);
    return newMaterial;
  }

  updateRawMaterial(id: string, update: Partial<RawMaterial>): RawMaterial | undefined {
    const idx = this.data.inventory.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.data.inventory[idx] = { ...this.data.inventory[idx], ...update };
      this.save(this.data);
      return this.data.inventory[idx];
    }
    return undefined;
  }

  deleteRawMaterial(id: string): boolean {
    const initialLen = this.data.inventory.length;
    this.data.inventory = this.data.inventory.filter(m => m.id !== id);
    if (this.data.inventory.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  addStockInward(
    param1: string | Partial<StockInwardEntry>,
    param2?: number,
    param3?: number,
    param4?: string,
    param5?: string
  ): { material: RawMaterial; log: StockInwardEntry } | undefined {
    let rawMaterialId: string;
    let quantityAdded: number;
    let costPrice: number;
    let supplierName: string | undefined;
    let purchaseOrderId: string | undefined;

    if (typeof param1 === 'object') {
      rawMaterialId = param1.rawMaterialId!;
      quantityAdded = param1.quantityAdded!;
      costPrice = param1.costPrice!;
      supplierName = param1.supplierName;
      purchaseOrderId = param1.purchaseOrderId;
    } else {
      rawMaterialId = param1;
      quantityAdded = param2!;
      costPrice = param3!;
      supplierName = param4;
      purchaseOrderId = param5;
    }

    const material = this.data.inventory.find(m => m.id === rawMaterialId);
    if (!material) return undefined;

    material.currentStock = Number((material.currentStock + Number(quantityAdded)).toFixed(2));
    if (costPrice) material.costPerUnit = Number(costPrice);
    material.lastRestockedAt = new Date().toISOString();

    const log: StockInwardEntry = {
      id: 'inw_' + uuidv4().slice(0, 8),
      rawMaterialId,
      rawMaterialName: material.name,
      quantityAdded: Number(quantityAdded),
      unit: material.unit,
      costPrice: Number(costPrice) || material.costPerUnit,
      supplierName: supplierName || 'Local Supplier',
      purchaseOrderId,
      createdAt: new Date().toISOString()
    };

    if (!this.data.stockInwardLogs) {
      this.data.stockInwardLogs = [];
    }
    this.data.stockInwardLogs.unshift(log);
    this.save(this.data);
    return { material, log };
  }

  getStockInwardLogs(): StockInwardEntry[] {
    return this.data.stockInwardLogs || [];
  }

  // ==========================================
  // Suppliers & Procurement Management (Phase 4)
  // ==========================================
  getSuppliers(): Supplier[] {
    if (!this.data.suppliers) {
      this.data.suppliers = initialSuppliers;
    }
    return this.data.suppliers;
  }

  getSupplierById(id: string): Supplier | undefined {
    return this.getSuppliers().find(s => s.id === id);
  }

  createSupplier(supplier: Supplier): Supplier {
    if (!this.data.suppliers) {
      this.data.suppliers = [];
    }
    this.data.suppliers.push(supplier);
    this.save(this.data);
    return supplier;
  }

  updateSupplier(id: string, update: Partial<Supplier>): Supplier | undefined {
    const suppliers = this.getSuppliers();
    const idx = suppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      suppliers[idx] = { ...suppliers[idx], ...update };
      this.save(this.data);
      return suppliers[idx];
    }
    return undefined;
  }

  deleteSupplier(id: string): boolean {
    const initialLen = this.getSuppliers().length;
    this.data.suppliers = this.data.suppliers.filter(s => s.id !== id);
    if (this.data.suppliers.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  // ==========================================
  // Purchase Orders Workflow (Phase 4)
  // ==========================================
  getPurchaseOrders(): PurchaseOrder[] {
    if (!this.data.purchaseOrders) {
      this.data.purchaseOrders = initialPurchaseOrders;
    }
    return this.data.purchaseOrders;
  }

  getPurchaseOrderById(id: string): PurchaseOrder | undefined {
    return this.getPurchaseOrders().find(p => p.id === id);
  }

  createPurchaseOrder(po: PurchaseOrder): PurchaseOrder {
    if (!this.data.purchaseOrders) {
      this.data.purchaseOrders = [];
    }
    this.data.purchaseOrders.unshift(po);
    this.save(this.data);
    return po;
  }

  updatePurchaseOrder(id: string, update: Partial<PurchaseOrder>): PurchaseOrder | undefined {
    const orders = this.getPurchaseOrders();
    const idx = orders.findIndex(p => p.id === id);
    if (idx !== -1) {
      orders[idx] = { ...orders[idx], ...update };
      this.save(this.data);
      return orders[idx];
    }
    return undefined;
  }

  // ==========================================
  // Wastage & Spoilage Logs (Phase 4)
  // ==========================================
  getWastageLogs(): WastageLog[] {
    if (!this.data.wastageLogs) {
      this.data.wastageLogs = [];
    }
    return this.data.wastageLogs;
  }

  createWastageLog(log: WastageLog): WastageLog {
    if (!this.data.wastageLogs) {
      this.data.wastageLogs = [];
    }
    this.data.wastageLogs.unshift(log);
    this.save(this.data);
    return log;
  }

  deductInventoryForOrder(order: Order) {
    if (!this.data.inventory || this.data.inventory.length === 0) return;

    for (const orderItem of order.items) {
      const menuItem = this.data.menuItems.find(m => m.id === orderItem.menuItemId);
      if (menuItem && menuItem.recipe && menuItem.recipe.length > 0) {
        for (const recipeItem of menuItem.recipe) {
          const raw = this.data.inventory.find(m => m.id === recipeItem.rawMaterialId);
          if (raw) {
            const deduction = Number((orderItem.quantity * recipeItem.quantityRequired).toFixed(2));
            raw.currentStock = Math.max(0, Number((raw.currentStock - deduction).toFixed(2)));
          }
        }
      }
    }
    this.save(this.data);
  }

  updateMenuItemRecipe(menuItemId: string, recipe: RecipeItem[]): MenuItem | undefined {
    const item = this.data.menuItems.find(m => m.id === menuItemId);
    if (item) {
      item.recipe = recipe;
      this.save(this.data);
      return item;
    }
    return undefined;
  }

  // ==========================================
  // Cash Register & Shift Drawer
  // ==========================================
  getCashRegister(): CashRegisterShift {
    if (!this.data.cashRegister) {
      this.data.cashRegister = initialShift;
    }
    return this.data.cashRegister;
  }

  addPettyExpense(category: string, amount: number, description: string): CashRegisterShift {
    const register = this.getCashRegister();
    const expense: PettyExpense = {
      id: 'exp_' + uuidv4().slice(0, 8),
      category: category || 'General Store Expense',
      amount: Number(amount) || 0,
      description: description || '',
      createdAt: new Date().toISOString()
    };
    register.pettyExpenses.unshift(expense);
    const totalExpenses = register.pettyExpenses.reduce((sum, e) => sum + e.amount, 0);
    register.expectedCash = Number((register.openingFloat + register.cashSales - totalExpenses).toFixed(2));
    this.save(this.data);
    return register;
  }

  addCashFloat(amount: number, description: string): CashRegisterShift {
    const register = this.getCashRegister();
    register.openingFloat += Number(amount) || 0;
    const totalExpenses = register.pettyExpenses.reduce((sum, e) => sum + e.amount, 0);
    register.expectedCash = Number((register.openingFloat + register.cashSales - totalExpenses).toFixed(2));
    if (description) {
      register.notes = (register.notes ? register.notes + ' | ' : '') + `[Added Float ₹${amount}: ${description}]`;
    }
    this.save(this.data);
    return register;
  }

  closeCashRegister(actualCashCounted: number, notes?: string): CashRegisterShift {
    const register = this.getCashRegister();
    const totalExpenses = register.pettyExpenses.reduce((sum, e) => sum + e.amount, 0);
    register.expectedCash = Number((register.openingFloat + register.cashSales - totalExpenses).toFixed(2));
    register.actualCashCounted = Number(actualCashCounted) || 0;
    register.discrepancy = Number((register.actualCashCounted - register.expectedCash).toFixed(2));
    register.closedAt = new Date().toISOString();
    register.status = 'closed';
    if (notes) register.notes = notes;
    this.save(this.data);
    return register;
  }

  openCashRegister(openingFloat: number): CashRegisterShift {
    const newShift: CashRegisterShift = {
      id: 'shift_' + Date.now(),
      openedAt: new Date().toISOString(),
      openingFloat: Number(openingFloat) || 0,
      cashSales: 0,
      pettyExpenses: [],
      expectedCash: Number(openingFloat) || 0,
      status: 'open'
    };
    this.data.cashRegister = newShift;
    this.save(this.data);
    return newShift;
  }

  // ==========================================
  // Customer CRM & Loyalty Points
  // ==========================================
  getCustomers(): CustomerProfile[] {
    if (!this.data.customers || this.data.customers.length === 0) {
      this.data.customers = initialCustomers;
    }
    return this.data.customers;
  }

  getCustomerByPhone(phone: string): CustomerProfile | undefined {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    return this.getCustomers().find(c => c.phone.replace(/\D/g, '').slice(-10) === cleanPhone);
  }

  upsertCustomer(profile: Partial<CustomerProfile> & { phone: string; name?: string }): CustomerProfile {
    const cleanPhone = profile.phone.replace(/\D/g, '').slice(-10);
    const existing = this.getCustomerByPhone(cleanPhone);

    if (existing) {
      Object.assign(existing, profile);
      existing.phone = cleanPhone;
      this.save(this.data);
      return existing;
    }

    const newCust: CustomerProfile = {
      id: profile.id || ('cust_' + uuidv4().slice(0, 8)),
      name: profile.name || 'Valued Guest',
      phone: cleanPhone,
      email: profile.email || '',
      birthday: profile.birthday,
      anniversary: profile.anniversary,
      visitsCount: profile.visitsCount !== undefined ? profile.visitsCount : 1,
      totalSpend: profile.totalSpend !== undefined ? profile.totalSpend : 0,
      loyaltyPoints: profile.loyaltyPoints || 0,
      tier: profile.tier || 'Bronze',
      favoriteItems: profile.favoriteItems || [],
      lastVisit: profile.lastVisit || new Date().toISOString(),
      notes: profile.notes || ''
    };
    this.data.customers.push(newCust);
    this.save(this.data);
    return newCust;
  }

  updateCustomer(id: string, update: Partial<CustomerProfile>): CustomerProfile | undefined {
    const customers = this.getCustomers();
    const idx = customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...update };
      this.save(this.data);
      return customers[idx];
    }
    return undefined;
  }

  recordCustomerBill(bill: Bill): CustomerProfile | undefined {
    if (!bill.customerPhone) return undefined;
    const cleanPhone = bill.customerPhone.replace(/\D/g, '').slice(-10);
    let cust = this.getCustomerByPhone(cleanPhone);

    if (!cust) {
      cust = {
        id: 'cust_' + uuidv4().slice(0, 8),
        name: bill.customerName || 'Valued Guest',
        phone: cleanPhone,
        email: '',
        visitsCount: 0,
        totalSpend: 0,
        loyaltyPoints: 0,
        tier: 'Bronze',
        favoriteItems: [],
        lastVisit: new Date().toISOString(),
        notes: ''
      };
      this.data.customers.push(cust);
    } else if (bill.customerName && cust.name === 'Valued Guest') {
      cust.name = bill.customerName;
    }

    cust.visitsCount += 1;
    cust.totalSpend = Number((cust.totalSpend + bill.total).toFixed(2));
    cust.lastVisit = new Date().toISOString();

    // Loyalty Points: 1 point per ₹100 spent
    const earned = Math.floor(bill.total / 100);
    const redeemed = bill.pointsRedeemed || 0;
    cust.loyaltyPoints = Math.max(0, cust.loyaltyPoints + earned - redeemed);
    bill.pointsEarned = earned;

    // Recalculate Tier
    if (cust.totalSpend >= 15000) {
      cust.tier = 'VIP Platinum';
    } else if (cust.totalSpend >= 5000) {
      cust.tier = 'Gold';
    } else if (cust.totalSpend >= 2000) {
      cust.tier = 'Silver';
    } else {
      cust.tier = 'Bronze';
    }

    // Add ordered item names to favorites if not already present
    if (bill.items) {
      const itemNames = bill.items.map(i => i.name);
      const unique = Array.from(new Set([...cust.favoriteItems, ...itemNames]));
      cust.favoriteItems = unique.slice(0, 10);
    }

    this.save(this.data);
    return cust;
  }

  // ==========================================
  // Table Reservations
  // ==========================================
  getReservations(): TableReservation[] {
    if (!this.data.reservations) {
      this.data.reservations = initialReservations;
    }
    return this.data.reservations;
  }

  createReservation(data: Omit<TableReservation, 'id' | 'createdAt'>): TableReservation {
    const reservation: TableReservation = {
      id: 'res_' + uuidv4().slice(0, 8),
      ...data,
      createdAt: new Date().toISOString()
    };
    if (!this.data.reservations) {
      this.data.reservations = [];
    }
    this.data.reservations.unshift(reservation);
    this.save(this.data);
    return reservation;
  }

  updateReservationStatus(id: string, status: TableReservation['status'], tableId?: string): TableReservation | undefined {
    const res = this.getReservations().find(r => r.id === id);
    if (res) {
      res.status = status;
      if (tableId) {
        res.tableId = tableId;
        const tbl = this.data.tables.find(t => t.id === tableId);
        if (tbl) res.tableNumber = tbl.tableNumber;
      }
      this.save(this.data);
      return res;
    }
    return undefined;
  }

  // ==========================================
  // Guest Waitlist
  // ==========================================
  getWaitlist(): GuestWaitlistEntry[] {
    if (!this.data.waitlist) {
      this.data.waitlist = initialWaitlist;
    }
    return this.data.waitlist;
  }

  addToWaitlist(data: Omit<GuestWaitlistEntry, 'id' | 'createdAt' | 'status'>): GuestWaitlistEntry {
    const entry: GuestWaitlistEntry = {
      id: 'wait_' + uuidv4().slice(0, 8),
      ...data,
      status: 'waiting',
      createdAt: new Date().toISOString()
    };
    if (!this.data.waitlist) {
      this.data.waitlist = [];
    }
    this.data.waitlist.push(entry);
    this.save(this.data);
    return entry;
  }

  updateWaitlistStatus(id: string, status: GuestWaitlistEntry['status']): GuestWaitlistEntry | undefined {
    const entry = this.getWaitlist().find(w => w.id === id);
    if (entry) {
      entry.status = status;
      this.save(this.data);
      return entry;
    }
    return undefined;
  }

  // ==========================================
  // Delivery Partner Integrations (Zomato / Swiggy / ONDC)
  // ==========================================
  getDeliveryPartners(): DeliveryPartnerConfig[] {
    const prof = this.getProfile();
    if (!prof.deliveryPartners || prof.deliveryPartners.length === 0) {
      prof.deliveryPartners = initialDeliveryPartners;
      this.save(this.data);
    }
    return prof.deliveryPartners;
  }

  updateDeliveryPartnerConfig(partner: DeliveryPartner, update: Partial<DeliveryPartnerConfig>): DeliveryPartnerConfig | undefined {
    const list = this.getDeliveryPartners();
    const config = list.find(p => p.partner === partner);
    if (config) {
      Object.assign(config, update);
      this.save(this.data);
      return config;
    }
    return undefined;
  }

  simulatePartnerOrder(partner: DeliveryPartner, customPayload?: Partial<Order>): Order {
    const partners = this.getDeliveryPartners();
    const partnerConfig = partners.find(p => p.partner === partner) || {
      partner,
      name: partner.toUpperCase(),
      enabled: true,
      storeId: `${partner.toUpperCase()}-STORE`,
      commissionPercent: 18,
      apiKey: '',
      webhookSecret: '',
      autoAcceptOrders: true,
      color: '#E23744',
      badgeBg: 'bg-rose-950/80 text-rose-300'
    };

    const prefix = partner === 'zomato' ? 'ZOM' : partner === 'swiggy' ? 'SWG' : partner === 'ondc' ? 'ONDC' : 'MGC';
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const partnerOrderId = `${prefix}-${randCode}`;
    const partnerPickupCode = String(Math.floor(1000 + Math.random() * 9000));

    // Choose 1 or 2 menu items
    const menuItems = this.getMenuItems();
    const sampleItems = menuItems.length > 0 ? [menuItems[Math.floor(Math.random() * menuItems.length)]] : [];
    const orderItems: OrderItem[] = sampleItems.map((item) => ({
      id: 'poi_' + uuidv4().slice(0, 8),
      menuItemId: item.id,
      name: item.name,
      quantity: Math.floor(1 + Math.random() * 2),
      unitPrice: item.basePrice,
      station: item.station || 'kitchen',
      kotStatus: 'pending'
    }));

    let subtotal = orderItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    if (subtotal === 0) subtotal = 380;
    const commPercent = partnerConfig.commissionPercent || 18;
    const commAmount = Number(((subtotal * commPercent) / 100).toFixed(2));
    const netPayout = Number((subtotal - commAmount).toFixed(2));

    const sampleGuests = [
      { name: 'Aditi Deshmukh', phone: '9822334455', address: 'Flat 401, Sapphire Heights, 12th Main Road' },
      { name: 'Nikhil Saxena', phone: '9833441122', address: 'House 8B, Defence Colony, Ring Road' },
      { name: 'Ritika Sen', phone: '9877001122', address: 'Tower 2, Apt 904, Prestige Palms, Whitefield' },
      { name: 'Manish Chawla', phone: '9811998877', address: 'Plot 42, Pocket C, Vasant Kunj' }
    ];
    const guest = sampleGuests[Math.floor(Math.random() * sampleGuests.length)];

    const riders = [
      { name: 'Mahesh (Honda Activa)', phone: '9899001122' },
      { name: 'Praveen (Hero Splendor)', phone: '9822114455' },
      { name: 'Vikas (TVS Jupiter)', phone: '9844332211' }
    ];
    const rider = riders[Math.floor(Math.random() * riders.length)];

    const newOrder: Order = {
      id: 'ord_' + uuidv4().slice(0, 8),
      orderNumber: partnerOrderId,
      type: 'delivery',
      deliveryPartner: partner,
      partnerOrderId,
      partnerPickupCode,
      partnerCommissionPercent: commPercent,
      partnerCommissionAmount: commAmount,
      partnerNetPayout: netPayout,
      partnerOrderStatus: partnerConfig.autoAcceptOrders ? 'accepted' : 'placed',
      customerName: guest.name,
      customerPhone: guest.phone,
      deliveryAddress: guest.address,
      riderName: rider.name,
      riderPhone: rider.phone,
      riderStatus: 'assigned',
      items: orderItems,
      status: partnerConfig.autoAcceptOrders ? 'preparing' : 'kot_printed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...customPayload
    };

    // Auto-upsert into CRM tagged with partner channel
    this.upsertCustomer({
      phone: newOrder.customerPhone || '9876543210',
      name: newOrder.customerName || 'Delivery Guest',
      notes: `Acquired via ${partnerConfig.name}`
    });

    return this.createOrder(newOrder);
  }

  updatePartnerOrderStatus(orderId: string, partnerStatus: Order['partnerOrderStatus'], riderStatus?: Order['riderStatus']): Order | undefined {
    const order = this.getOrderById(orderId);
    if (!order) return undefined;

    order.partnerOrderStatus = partnerStatus;
    if (riderStatus) order.riderStatus = riderStatus;

    if (partnerStatus === 'food_ready') {
      order.status = 'ready';
    } else if (partnerStatus === 'picked_up') {
      order.riderStatus = 'out_for_delivery';
    } else if (partnerStatus === 'delivered') {
      order.status = 'settled';
      order.riderStatus = 'delivered';
    }

    order.updatedAt = new Date().toISOString();
    this.save(this.data);
    return order;
  }

  // ==========================================
  // Staff Accounts & Access Control (Phase 1)
  // ==========================================
  getStaffUsers(includeInactive = false): StaffUser[] {
    if (!this.data.staffUsers || this.data.staffUsers.length === 0) {
      this.data.staffUsers = initialStaffUsers;
    }
    return includeInactive ? this.data.staffUsers : this.data.staffUsers.filter(u => u.isActive);
  }

  getStaffUserById(id: string): StaffUser | undefined {
    return this.getStaffUsers(true).find(u => u.id === id);
  }

  getStaffUserByPin(pin: string): StaffUser | undefined {
    return this.getStaffUsers().find(u => u.pin === pin);
  }

  verifyPin(pin: string, requiredRoles?: StaffRole[]): { success: boolean; user?: StaffUser; error?: string } {
    const user = this.getStaffUserByPin(pin);
    if (!user) {
      return { success: false, error: 'Invalid security PIN' };
    }
    if (!user.isActive) {
      return { success: false, error: 'Staff account is inactive' };
    }
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      return { success: false, error: `Unauthorized: Action requires ${requiredRoles.join(' or ')} privileges` };
    }
    return { success: true, user };
  }

  createStaffUser(userData: Omit<StaffUser, 'id' | 'createdAt'>): StaffUser {
    const newUser: StaffUser = {
      ...userData,
      id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    this.data.staffUsers.push(newUser);
    this.save(this.data);
    return newUser;
  }

  updateStaffUser(id: string, update: Partial<StaffUser>): StaffUser | undefined {
    const idx = this.data.staffUsers.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.data.staffUsers[idx] = { ...this.data.staffUsers[idx], ...update };
      this.save(this.data);
      return this.data.staffUsers[idx];
    }
    return undefined;
  }

  // ==========================================
  // Immutable Audit Trail Engine (Phase 1)
  // ==========================================
  addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    if (!this.data.auditLogs) {
      this.data.auditLogs = [];
    }
    const log: AuditLog = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(log);
    // Keep max 2,000 logs in local storage
    if (this.data.auditLogs.length > 2000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 2000);
    }
    this.save(this.data);
    return log;
  }

  getAuditLogs(filter?: { entityType?: string; entityId?: string; role?: StaffRole; limit?: number }): AuditLog[] {
    let logs = this.data.auditLogs || [];
    if (filter?.entityType) {
      logs = logs.filter(l => l.entityType === filter.entityType);
    }
    if (filter?.entityId) {
      logs = logs.filter(l => l.entityId === filter.entityId);
    }
    if (filter?.role) {
      logs = logs.filter(l => l.role === filter.role);
    }
    if (filter?.limit) {
      logs = logs.slice(0, filter.limit);
    }
    return logs;
  }

  // ==========================================
  // Bill Cancellation & Void Engine (Phase 1)
  // ==========================================
  voidBill(
    billId: string,
    voidedBy: { userId: string; userName: string; role: StaffRole },
    reason: string,
    approvedBy?: { userId: string; userName: string; role: StaffRole }
  ): { success: boolean; bill?: Bill; error?: string } {
    const bill = this.getBillById(billId);
    if (!bill) {
      return { success: false, error: 'Bill not found' };
    }
    if (bill.status === 'cancelled') {
      return { success: false, error: 'Bill is already cancelled / voided' };
    }

    const previousStatus = bill.status;
    bill.status = 'cancelled';
    bill.cancelledAt = new Date().toISOString();
    bill.cancelledBy = `${voidedBy.userName} (${voidedBy.role})`;
    bill.cancellationReason = reason;

    // Deduct cash from cash register if it was paid in cash
    let cashToDeduct = 0;
    if (bill.paymentMode === 'cash') {
      cashToDeduct = bill.total;
    } else if (bill.paymentMode === 'split' && bill.splitPayments) {
      cashToDeduct = bill.splitPayments.find(p => p.mode === 'cash')?.amount || 0;
    }

    if (cashToDeduct > 0) {
      const register = this.getCashRegister();
      if (register && register.status === 'open') {
        register.cashSales = Math.max(0, register.cashSales - cashToDeduct);
        const totalExpenses = register.pettyExpenses.reduce((sum, e) => sum + e.amount, 0);
        register.expectedCash = Number((register.openingFloat + register.cashSales - totalExpenses).toFixed(2));
      }
    }

    // Reverse loyalty points if customer phone is recorded
    if (bill.customerPhone) {
      const customer = this.getCustomerByPhone(bill.customerPhone);
      if (customer) {
        const pointsEarned = bill.pointsEarned || Math.floor(bill.total / 100);
        customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints - pointsEarned + (bill.pointsRedeemed || 0));
        customer.totalSpend = Math.max(0, customer.totalSpend - bill.total);
        customer.visitsCount = Math.max(0, customer.visitsCount - 1);
      }
    }

    // Add immutable audit log
    this.addAuditLog({
      userId: voidedBy.userId,
      userName: voidedBy.userName,
      role: voidedBy.role,
      action: 'BILL_VOIDED',
      entityType: 'bill',
      entityId: bill.id,
      details: {
        invoiceNumber: bill.invoiceNumber,
        total: bill.total,
        paymentMode: bill.paymentMode,
        previousStatus
      },
      reason,
      approvedBy
    });

    this.save(this.data);
    return { success: true, bill };
  }

  // ==========================================
  // Payments & Provider Reconciliation (Phase 3)
  // ==========================================
  getPayments(): PaymentTransaction[] {
    if (!this.data.payments) this.data.payments = [];
    return this.data.payments;
  }

  getPaymentById(id: string): PaymentTransaction | undefined {
    return this.getPayments().find(p => p.id === id);
  }

  getPaymentByIdempotencyKey(key: string): PaymentTransaction | undefined {
    return this.getPayments().find(p => p.idempotencyKey === key);
  }

  createPayment(payment: PaymentTransaction): PaymentTransaction {
    if (!this.data.payments) this.data.payments = [];
    this.data.payments.unshift(payment);
    this.save(this.data);
    return payment;
  }

  updatePayment(id: string, update: Partial<PaymentTransaction>): PaymentTransaction | undefined {
    const idx = this.data.payments.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.payments[idx] = { ...this.data.payments[idx], ...update, updatedAt: new Date().toISOString() };
      this.save(this.data);
      return this.data.payments[idx];
    }
    return undefined;
  }

  // ==========================================
  // Aggregator Webhook Deduplication (Phase 3)
  // ==========================================
  addWebhookLog(entry: Omit<WebhookDeliveryLog, 'id' | 'timestamp'>): WebhookDeliveryLog {
    if (!this.data.webhookLogs) this.data.webhookLogs = [];
    const log: WebhookDeliveryLog = {
      ...entry,
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    this.data.webhookLogs.unshift(log);
    if (this.data.webhookLogs.length > 1000) {
      this.data.webhookLogs = this.data.webhookLogs.slice(0, 1000);
    }
    this.save(this.data);
    return log;
  }

  getWebhookLogs(limit = 100): WebhookDeliveryLog[] {
    return (this.data.webhookLogs || []).slice(0, limit);
  }

  isWebhookEventProcessed(eventId: string): boolean {
    return (this.data.webhookLogs || []).some(
      l => l.eventId === eventId && l.status === 'processed'
    );
  }

  // ==========================================
  // Financial Reconciliation Engine (Phase 3)
  // ==========================================
  getAggregatorReconciliation(): ReconciliationReport {
    const partners: DeliveryPartner[] = ['zomato', 'swiggy', 'ondc', 'magicpin'];
    const bills = this.getBills().filter(b => b.status === 'paid');
    const partnerConfigs = this.getDeliveryPartners();

    const partnerBreakdown: PartnerReconciliationEntry[] = partners.map(partner => {
      const cfg = partnerConfigs.find(c => c.partner === partner);
      const partnerName = cfg?.name || partner.toUpperCase();
      const commPct = cfg?.commissionPercent || (partner === 'zomato' ? 18 : partner === 'swiggy' ? 20 : partner === 'ondc' ? 12 : 15);

      const partnerBills = bills.filter(b => b.deliveryPartner === partner);
      const grossSales = partnerBills.reduce((sum, b) => sum + b.total, 0);
      const commissionAmount = Number(((grossSales * commPct) / 100).toFixed(2));
      const gstOnCommission = Number((commissionAmount * 0.18).toFixed(2)); // 18% GST on aggregator commission fees
      const tcsAmount = Number((grossSales * 0.01).toFixed(2)); // 1% TCS under GST section 52
      const netPayout = Number((grossSales - commissionAmount - gstOnCommission - tcsAmount).toFixed(2));

      return {
        partner,
        partnerName,
        orderCount: partnerBills.length,
        grossSales,
        commissionAmount,
        gstOnCommission,
        tcsAmount,
        netPayout,
        discrepancy: 0
      };
    });

    const totalGrossOnlineSales = partnerBreakdown.reduce((sum, p) => sum + p.grossSales, 0);
    const totalCommissionsDeducted = partnerBreakdown.reduce((sum, p) => sum + p.commissionAmount, 0);
    const totalGstOnCommissions = partnerBreakdown.reduce((sum, p) => sum + p.gstOnCommission, 0);
    const totalNetPayoutReceivable = partnerBreakdown.reduce((sum, p) => sum + p.netPayout, 0);

    const cashBills = bills.filter(b => b.paymentMode === 'cash');
    const cashSales = cashBills.reduce((sum, b) => sum + b.total, 0);

    const onlineBills = bills.filter(b => b.paymentMode === 'upi' || b.paymentMode === 'card');
    const onlineGatewaySales = onlineBills.reduce((sum, b) => sum + b.total, 0);

    return {
      periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
      periodEnd: new Date().toISOString(),
      totalGrossOnlineSales,
      totalCommissionsDeducted,
      totalGstOnCommissions,
      totalNetPayoutReceivable,
      partnerBreakdown,
      cashVsOnlineSplit: {
        cashSales,
        onlineGatewaySales,
        aggregatorNetSales: totalNetPayoutReceivable
      }
    };
  }

  // ==========================================
  // Waiter Assistance Calls (Phase 5)
  // ==========================================
  getWaiterCalls(): WaiterCallRequest[] {
    if (!this.data.waiterCalls) {
      this.data.waiterCalls = [];
    }
    return this.data.waiterCalls;
  }

  getWaiterCallById(id: string): WaiterCallRequest | undefined {
    return this.getWaiterCalls().find(c => c.id === id);
  }

  createWaiterCall(call: WaiterCallRequest): WaiterCallRequest {
    if (!this.data.waiterCalls) {
      this.data.waiterCalls = [];
    }
    this.data.waiterCalls.unshift(call);
    this.save(this.data);
    return call;
  }

  updateWaiterCall(id: string, update: Partial<WaiterCallRequest>): WaiterCallRequest | undefined {
    const calls = this.getWaiterCalls();
    const idx = calls.findIndex(c => c.id === id);
    if (idx !== -1) {
      calls[idx] = { ...calls[idx], ...update };
      this.save(this.data);
      return calls[idx];
    }
    return undefined;
  }

  // ==========================================
  // Phase 8: Multi-Outlet & Franchise Master
  // ==========================================

  // 1. Organization & Brands Master
  getOrganization(): Organization {
    if (!this.data.organizations || this.data.organizations.length === 0) {
      this.data.organizations = [initialOrganization];
    }
    return this.data.organizations[0];
  }

  updateOrganization(update: Partial<Organization>): Organization {
    const org = this.getOrganization();
    this.data.organizations[0] = { ...org, ...update, updatedAt: new Date().toISOString() };
    this.save(this.data);
    return this.data.organizations[0];
  }

  getBrands(): Brand[] {
    if (!this.data.brands || this.data.brands.length === 0) {
      this.data.brands = initialBrands;
    }
    return this.data.brands;
  }

  // 2. Outlets Directory & Management
  getOutlets(): Outlet[] {
    if (!this.data.outlets || this.data.outlets.length === 0) {
      this.data.outlets = initialOutlets;
    }
    return this.data.outlets;
  }

  getOutletById(id: string): Outlet | undefined {
    return this.getOutlets().find(o => o.id === id || o.code.toLowerCase() === id.toLowerCase());
  }

  createOutlet(outletData: Omit<Outlet, 'id' | 'createdAt' | 'updatedAt'>): Outlet {
    const outlets = this.getOutlets();
    const newOutlet: Outlet = {
      ...outletData,
      id: 'outlet_' + uuidv4().slice(0, 8),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    outlets.push(newOutlet);
    this.save(this.data);
    return newOutlet;
  }

  updateOutlet(id: string, update: Partial<Outlet>): Outlet | undefined {
    const outlets = this.getOutlets();
    const idx = outlets.findIndex(o => o.id === id);
    if (idx !== -1) {
      outlets[idx] = { ...outlets[idx], ...update, updatedAt: new Date().toISOString() };
      this.save(this.data);
      return outlets[idx];
    }
    return undefined;
  }

  // 3. Central Menu Master & Overrides
  getOutletMenuOverrides(outletId?: string): OutletMenuOverride[] {
    if (!this.data.outletMenuOverrides) {
      this.data.outletMenuOverrides = initialOutletMenuOverrides;
    }
    if (outletId) {
      return this.data.outletMenuOverrides.filter(o => o.outletId === outletId);
    }
    return this.data.outletMenuOverrides;
  }

  setOutletMenuOverride(
    outletId: string,
    menuItemId: string,
    override: { priceOverride?: number; inStockOverride?: boolean; gstRateOverride?: number; isExcluded?: boolean; updatedBy?: string }
  ): OutletMenuOverride {
    const overrides = this.getOutletMenuOverrides();
    const existingIdx = overrides.findIndex(o => o.outletId === outletId && o.menuItemId === menuItemId);
    if (existingIdx !== -1) {
      overrides[existingIdx] = {
        ...overrides[existingIdx],
        ...override,
        updatedAt: new Date().toISOString()
      };
      this.save(this.data);
      return overrides[existingIdx];
    } else {
      const newOverride: OutletMenuOverride = {
        id: 'ovr_' + uuidv4().slice(0, 8),
        outletId,
        menuItemId,
        ...override,
        updatedAt: new Date().toISOString()
      };
      overrides.push(newOverride);
      this.save(this.data);
      return newOverride;
    }
  }

  removeOutletMenuOverride(outletId: string, menuItemId: string): boolean {
    const overrides = this.getOutletMenuOverrides();
    const initialLen = overrides.length;
    this.data.outletMenuOverrides = overrides.filter(o => !(o.outletId === outletId && o.menuItemId === menuItemId));
    if (this.data.outletMenuOverrides.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  getEffectiveMenuForOutlet(outletId: string): EffectiveMenuItem[] {
    const baseItems = this.getMenuItems();
    const overrides = this.getOutletMenuOverrides(outletId);
    const overrideMap = new Map(overrides.map(o => [o.menuItemId, o]));

    return baseItems.map(item => {
      const ovr = overrideMap.get(item.id);
      const isExcluded = ovr?.isExcluded ?? false;
      const effectivePrice = ovr?.priceOverride !== undefined ? ovr.priceOverride : item.basePrice;
      const effectiveStock = ovr?.inStockOverride !== undefined ? ovr.inStockOverride : item.inStock;
      const effectiveGst = ovr?.gstRateOverride !== undefined ? ovr.gstRateOverride : item.gstRate;

      return {
        ...item,
        basePrice: effectivePrice,
        inStock: isExcluded ? false : effectiveStock,
        gstRate: effectiveGst,
        originalBasePrice: item.basePrice,
        originalInStock: item.inStock,
        originalGstRate: item.gstRate,
        hasPriceOverride: ovr?.priceOverride !== undefined,
        hasStockOverride: ovr?.inStockOverride !== undefined,
        hasGstOverride: ovr?.gstRateOverride !== undefined,
        effectivePrice,
        outletId
      };
    });
  }

  // 4. Inter-Store Stock Transfers (IST) & Physical Inventory
  getStockTransfers(filter?: { status?: TransferStatus; sourceOutletId?: string; destinationOutletId?: string }): InterStoreTransfer[] {
    if (!this.data.stockTransfers) {
      this.data.stockTransfers = initialStockTransfers;
    }
    let result = this.data.stockTransfers;
    if (filter) {
      if (filter.status) result = result.filter(t => t.status === filter.status);
      if (filter.sourceOutletId) result = result.filter(t => t.sourceOutletId === filter.sourceOutletId);
      if (filter.destinationOutletId) result = result.filter(t => t.destinationOutletId === filter.destinationOutletId);
    }
    return result;
  }

  getStockTransferById(id: string): InterStoreTransfer | undefined {
    return this.getStockTransfers().find(t => t.id === id || t.transferNumber === id);
  }

  createStockTransfer(transfer: InterStoreTransfer): InterStoreTransfer {
    if (!this.data.stockTransfers) {
      this.data.stockTransfers = [];
    }
    this.data.stockTransfers.unshift(transfer);
    this.save(this.data);
    return transfer;
  }

  updateStockTransfer(id: string, update: Partial<InterStoreTransfer>): InterStoreTransfer | undefined {
    const transfers = this.getStockTransfers();
    const idx = transfers.findIndex(t => t.id === id || t.transferNumber === id);
    if (idx !== -1) {
      transfers[idx] = { ...transfers[idx], ...update, updatedAt: new Date().toISOString() };
      this.save(this.data);
      return transfers[idx];
    }
    return undefined;
  }

  getMaterialStockForOutlet(rawMaterialId: string, outletId: string): number {
    const mat = this.data.inventory.find(m => m.id === rawMaterialId);
    if (!mat) return 0;
    if (mat.outletStocks && mat.outletStocks[outletId] !== undefined) {
      return mat.outletStocks[outletId];
    }
    if (outletId === DEFAULT_OUTLET_ID) {
      return mat.currentStock;
    }
    const defaultPortion = Math.max(5, Math.round(mat.currentStock * 0.4));
    if (!mat.outletStocks) mat.outletStocks = {};
    mat.outletStocks[outletId] = defaultPortion;
    return defaultPortion;
  }

  dispatchStockTransfer(
    transferId: string,
    dispatchedBy: { userId: string; userName: string; role: string },
    carrierDetails?: { carrierName?: string; trackingReference?: string; vehicleNumber?: string }
  ): InterStoreTransfer | undefined {
    const transfer = this.getStockTransferById(transferId);
    if (!transfer) return undefined;
    if (transfer.status === 'dispatched' || transfer.status === 'received' || transfer.status === 'cancelled') {
      throw new Error(`Transfer ${transfer.transferNumber} is already in '${transfer.status}' status`);
    }

    // Deduct stock from source outlet
    for (const item of transfer.items) {
      const qtyToDispatch = item.quantityDispatched ?? item.quantityRequested;
      item.quantityDispatched = qtyToDispatch;
      const mat = this.data.inventory.find(m => m.id === item.rawMaterialId);
      if (mat) {
        if (!mat.outletStocks) mat.outletStocks = {};
        const currentSrc = this.getMaterialStockForOutlet(item.rawMaterialId, transfer.sourceOutletId);
        mat.outletStocks[transfer.sourceOutletId] = Math.max(0, Number((currentSrc - qtyToDispatch).toFixed(2)));
        if (transfer.sourceOutletId === DEFAULT_OUTLET_ID) {
          mat.currentStock = mat.outletStocks[transfer.sourceOutletId];
        }
      }
    }

    transfer.status = 'dispatched';
    transfer.dispatchedBy = {
      ...dispatchedBy,
      timestamp: new Date().toISOString()
    };
    if (carrierDetails) {
      if (carrierDetails.carrierName) transfer.carrierName = carrierDetails.carrierName;
      if (carrierDetails.trackingReference) transfer.trackingReference = carrierDetails.trackingReference;
      if (carrierDetails.vehicleNumber) transfer.vehicleNumber = carrierDetails.vehicleNumber;
    }
    transfer.updatedAt = new Date().toISOString();
    this.save(this.data);
    return transfer;
  }

  receiveStockTransfer(
    transferId: string,
    receivedBy: { userId: string; userName: string; role: string },
    receivedItems?: { rawMaterialId: string; quantityReceived: number; varianceReason?: string }[]
  ): InterStoreTransfer | undefined {
    const transfer = this.getStockTransferById(transferId);
    if (!transfer) return undefined;
    if (transfer.status !== 'dispatched') {
      throw new Error(`Transfer ${transfer.transferNumber} must be in 'dispatched' status before receiving (current: '${transfer.status}')`);
    }

    // Inward stock into destination outlet
    for (const item of transfer.items) {
      const rec = receivedItems?.find(r => r.rawMaterialId === item.rawMaterialId);
      const qtyReceived = rec ? rec.quantityReceived : (item.quantityDispatched ?? item.quantityRequested);
      item.quantityReceived = qtyReceived;
      if (rec?.varianceReason) item.varianceReason = rec.varianceReason;

      const mat = this.data.inventory.find(m => m.id === item.rawMaterialId);
      if (mat) {
        if (!mat.outletStocks) mat.outletStocks = {};
        const currentDest = this.getMaterialStockForOutlet(item.rawMaterialId, transfer.destinationOutletId);
        mat.outletStocks[transfer.destinationOutletId] = Number((currentDest + qtyReceived).toFixed(2));
        if (transfer.destinationOutletId === DEFAULT_OUTLET_ID) {
          mat.currentStock = mat.outletStocks[transfer.destinationOutletId];
        }
      }
    }

    transfer.status = 'received';
    transfer.receivedBy = {
      ...receivedBy,
      timestamp: new Date().toISOString()
    };
    transfer.updatedAt = new Date().toISOString();
    this.save(this.data);
    return transfer;
  }

  cancelStockTransfer(
    transferId: string,
    cancelledBy: { userId: string; userName: string; role: string; reason: string }
  ): InterStoreTransfer | undefined {
    const transfer = this.getStockTransferById(transferId);
    if (!transfer) return undefined;
    if (transfer.status === 'received' || transfer.status === 'reconciled') {
      throw new Error(`Cannot cancel transfer ${transfer.transferNumber} that is already received/reconciled`);
    }

    // If already dispatched, revert stock back to source outlet
    if (transfer.status === 'dispatched') {
      for (const item of transfer.items) {
        const qtyDispatched = item.quantityDispatched ?? item.quantityRequested;
        const mat = this.data.inventory.find(m => m.id === item.rawMaterialId);
        if (mat) {
          if (!mat.outletStocks) mat.outletStocks = {};
          const currentSrc = this.getMaterialStockForOutlet(item.rawMaterialId, transfer.sourceOutletId);
          mat.outletStocks[transfer.sourceOutletId] = Number((currentSrc + qtyDispatched).toFixed(2));
          if (transfer.sourceOutletId === DEFAULT_OUTLET_ID) {
            mat.currentStock = mat.outletStocks[transfer.sourceOutletId];
          }
        }
      }
    }

    transfer.status = 'cancelled';
    transfer.cancelledBy = {
      ...cancelledBy,
      timestamp: new Date().toISOString()
    };
    transfer.updatedAt = new Date().toISOString();
    this.save(this.data);
    return transfer;
  }

  // 5. System-Wide Raw Material Matrix
  getMaterialStockMatrix(): MaterialStockMatrixEntry[] {
    const outlets = this.getOutlets();
    const inventory = this.data.inventory || [];

    return inventory.map(mat => {
      const outletLevels: OutletInventoryLevel[] = outlets.map(outlet => {
        const stock = this.getMaterialStockForOutlet(mat.id, outlet.id);
        return {
          outletId: outlet.id,
          outletName: outlet.name,
          outletCity: outlet.address.city,
          currentStock: stock,
          reorderLevel: mat.reorderLevel,
          isLowStock: stock <= mat.reorderLevel
        };
      });

      const totalNetworkStock = outletLevels.reduce((sum, o) => sum + o.currentStock, 0);

      return {
        rawMaterialId: mat.id,
        rawMaterialName: mat.name,
        category: mat.category,
        unit: mat.unit,
        costPerUnit: mat.costPerUnit,
        totalNetworkStock: Number(totalNetworkStock.toFixed(2)),
        outlets: outletLevels
      };
    });
  }

  // 6. Consolidated Headquarters Report & Royalty Engine
  getConsolidatedHqReport(period?: string): ConsolidatedHqReport {
    const org = this.getOrganization();
    const outlets = this.getOutlets();
    const bills = this.data.bills || [];

    const benchmarkData: Record<string, { grossSales: number; orderCount: number; grossMarginPercent: number }> = {
      outlet_blr_01: { grossSales: 184500, orderCount: 142, grossMarginPercent: 68.5 },
      outlet_mum_01: { grossSales: 242000, orderCount: 178, grossMarginPercent: 71.2 },
      outlet_gurgaon_01: { grossSales: 118000, orderCount: 94, grossMarginPercent: 66.0 }
    };

    const outletSummaries: OutletRoyaltySummary[] = outlets.map(outlet => {
      const outletBills = bills.filter(b => {
        if (b.status === 'cancelled') return false;
        if (b.outletId) return b.outletId === outlet.id;
        return outlet.id === DEFAULT_OUTLET_ID;
      });

      let grossSales = 0;
      let netSales = 0;
      let orderCount = 0;
      let grossProfit = 0;
      let grossMarginPercent = 0;

      if (outletBills.length > 0) {
        grossSales = outletBills.reduce((sum, b) => sum + (b.subtotal || b.total), 0);
        const discounts = outletBills.reduce((sum, b) => sum + (b.discountAmount || 0), 0);
        netSales = Math.max(0, grossSales - discounts);
        orderCount = outletBills.length;
        const estimatedCost = netSales * 0.30;
        grossProfit = Number((netSales - estimatedCost).toFixed(2));
        grossMarginPercent = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(1)) : 70.0;
      } else if (benchmarkData[outlet.id]) {
        const bench = benchmarkData[outlet.id];
        grossSales = bench.grossSales;
        netSales = Math.round(bench.grossSales * 0.94);
        orderCount = bench.orderCount;
        grossMarginPercent = bench.grossMarginPercent;
        grossProfit = Number((netSales * (grossMarginPercent / 100)).toFixed(2));
      }

      const royaltyPercent = outlet.isFranchise ? outlet.franchiseRoyaltyPercent : 0;
      const royaltyFee = Number((netSales * (royaltyPercent / 100)).toFixed(2));

      const marketingLevyPercent = outlet.isFranchise ? outlet.marketingLevyPercent : 0;
      const marketingLevyFee = Number((netSales * (marketingLevyPercent / 100)).toFixed(2));

      const totalFranchisePayable = Number((royaltyFee + marketingLevyFee).toFixed(2));

      return {
        outletId: outlet.id,
        outletCode: outlet.code,
        outletName: outlet.name,
        tier: outlet.tier,
        isFranchise: outlet.isFranchise,
        city: outlet.address.city,
        orderCount,
        grossSales: Number(grossSales.toFixed(2)),
        netSales: Number(netSales.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
        grossMarginPercent,
        royaltyPercent,
        royaltyFee,
        marketingLevyPercent,
        marketingLevyFee,
        totalFranchisePayable
      };
    });

    const totalGrossRevenue = outletSummaries.reduce((sum, o) => sum + o.grossSales, 0);
    const totalNetSales = outletSummaries.reduce((sum, o) => sum + o.netSales, 0);
    const totalOrdersCount = outletSummaries.reduce((sum, o) => sum + o.orderCount, 0);
    const averageOrderValue = totalOrdersCount > 0 ? Number((totalGrossRevenue / totalOrdersCount).toFixed(2)) : 0;
    const networkGrossProfit = outletSummaries.reduce((sum, o) => sum + o.grossProfit, 0);
    const totalEstimatedFoodCost = Number((totalNetSales - networkGrossProfit).toFixed(2));
    const networkGrossMarginPercent = totalNetSales > 0 ? Number(((networkGrossProfit / totalNetSales) * 100).toFixed(1)) : 70;
    const totalFranchiseRoyaltiesEarned = outletSummaries.reduce((sum, o) => sum + o.royaltyFee, 0);
    const totalMarketingLevyCollected = outletSummaries.reduce((sum, o) => sum + o.marketingLevyFee, 0);
    const combinedEnterpriseFee = Number((totalFranchiseRoyaltiesEarned + totalMarketingLevyCollected).toFixed(2));

    const byRevenue = [...outletSummaries]
      .sort((a, b) => b.grossSales - a.grossSales)
      .map(o => ({ outletId: o.outletId, outletName: o.outletName, grossSales: o.grossSales }));

    const byOrderVolume = [...outletSummaries]
      .sort((a, b) => b.orderCount - a.orderCount)
      .map(o => ({ outletId: o.outletId, outletName: o.outletName, orderCount: o.orderCount }));

    const byGrossMargin = [...outletSummaries]
      .sort((a, b) => b.grossMarginPercent - a.grossMarginPercent)
      .map(o => ({ outletId: o.outletId, outletName: o.outletName, grossMarginPercent: o.grossMarginPercent }));

    return {
      generatedAt: new Date().toISOString(),
      period: period || 'Current Operational Month (M-T-D)',
      organization: {
        name: org.name,
        legalEntityName: org.legalEntityName,
        corporateGstin: org.corporateGstin
      },
      totalOutletsCount: outlets.length,
      activeOutletsCount: outlets.filter(o => o.active).length,
      franchiseOutletsCount: outlets.filter(o => o.isFranchise).length,
      companyOwnedCount: outlets.filter(o => !o.isFranchise).length,
      networkSummary: {
        totalGrossRevenue: Number(totalGrossRevenue.toFixed(2)),
        totalNetSales: Number(totalNetSales.toFixed(2)),
        totalOrdersCount,
        averageOrderValue,
        totalEstimatedFoodCost,
        networkGrossProfit: Number(networkGrossProfit.toFixed(2)),
        networkGrossMarginPercent,
        totalFranchiseRoyaltiesEarned: Number(totalFranchiseRoyaltiesEarned.toFixed(2)),
        totalMarketingLevyCollected: Number(totalMarketingLevyCollected.toFixed(2)),
        combinedEnterpriseFee
      },
      outletRankings: {
        byRevenue,
        byOrderVolume,
        byGrossMargin
      },
      outletBreakdown: outletSummaries
    };
  }

  // ==========================================
  // 5. Reelo Marketing Campaigns, Feedback & Automations
  // ==========================================
  getMarketingCampaigns(): MarketingCampaign[] {
    if (!this.data.marketingCampaigns || this.data.marketingCampaigns.length === 0) {
      this.data.marketingCampaigns = initialMarketingCampaigns;
      this.save(this.data);
    }
    return this.data.marketingCampaigns;
  }

  getMarketingCampaignById(id: string): MarketingCampaign | undefined {
    return this.getMarketingCampaigns().find(c => c.id === id);
  }

  createMarketingCampaign(campaign: MarketingCampaign): MarketingCampaign {
    if (!this.data.marketingCampaigns) {
      this.data.marketingCampaigns = [];
    }
    this.data.marketingCampaigns.push(campaign);
    this.save(this.data);
    return campaign;
  }

  updateMarketingCampaign(id: string, update: Partial<MarketingCampaign>): MarketingCampaign | undefined {
    const campaigns = this.getMarketingCampaigns();
    const idx = campaigns.findIndex(c => c.id === id);
    if (idx !== -1) {
      campaigns[idx] = { ...campaigns[idx], ...update };
      this.save(this.data);
      return campaigns[idx];
    }
    return undefined;
  }

  deleteMarketingCampaign(id: string): boolean {
    const campaigns = this.getMarketingCampaigns();
    const idx = campaigns.findIndex(c => c.id === id);
    if (idx !== -1) {
      campaigns.splice(idx, 1);
      this.save(this.data);
      return true;
    }
    return false;
  }

  getCustomerFeedbacks(): CustomerFeedback[] {
    if (!this.data.customerFeedbacks || this.data.customerFeedbacks.length === 0) {
      this.data.customerFeedbacks = initialCustomerFeedbacks;
      this.save(this.data);
    }
    return this.data.customerFeedbacks;
  }

  addCustomerFeedback(feedback: CustomerFeedback): CustomerFeedback {
    if (!this.data.customerFeedbacks) {
      this.data.customerFeedbacks = [];
    }
    this.data.customerFeedbacks.push(feedback);
    this.save(this.data);
    return feedback;
  }

  updateCustomerFeedback(id: string, update: Partial<CustomerFeedback>): CustomerFeedback | undefined {
    const list = this.getCustomerFeedbacks();
    const idx = list.findIndex(f => f.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...update };
      this.save(this.data);
      return list[idx];
    }
    return undefined;
  }

  getMarketingAutomations(): AutomatedTriggerConfig {
    if (!this.data.marketingAutomations) {
      this.data.marketingAutomations = defaultMarketingAutomations;
      this.save(this.data);
    }
    return this.data.marketingAutomations;
  }

  updateMarketingAutomations(update: Partial<AutomatedTriggerConfig>): AutomatedTriggerConfig {
    const current = this.getMarketingAutomations();
    this.data.marketingAutomations = {
      ...current,
      ...update,
      birthdayPerk: {
        ...current.birthdayPerk,
        ...(update.birthdayPerk || {})
      },
      winbackTrigger: {
        ...current.winbackTrigger,
        ...(update.winbackTrigger || {})
      },
      feedbackNudge: {
        ...current.feedbackNudge,
        ...(update.feedbackNudge || {})
      }
    };
    this.save(this.data);
    return this.data.marketingAutomations;
  }
}

export const store = new Store();


