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
  DeliveryPartnerConfig
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
}

const DATA_FILE = path.join(__dirname, 'store.json');

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
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
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
      waitlist: initialWaitlist
    };
    this.save(initial);
    return initial;
  }

  private save(data: StoreData) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save store.json:', e);
    }
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
      }
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

  addStockInward(rawMaterialId: string, quantityAdded: number, costPrice: number, supplierName?: string): { material: RawMaterial; log: StockInwardEntry } | undefined {
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
      if (profile.name) existing.name = profile.name;
      if (profile.email !== undefined) existing.email = profile.email;
      if (profile.notes !== undefined) existing.notes = profile.notes;
      if (profile.loyaltyPoints !== undefined) existing.loyaltyPoints = profile.loyaltyPoints;
      this.save(this.data);
      return existing;
    }

    const newCust: CustomerProfile = {
      id: 'cust_' + uuidv4().slice(0, 8),
      name: profile.name || 'Valued Guest',
      phone: cleanPhone,
      email: profile.email || '',
      visitsCount: 1,
      totalSpend: 0,
      loyaltyPoints: profile.loyaltyPoints || 0,
      tier: 'Bronze',
      favoriteItems: [],
      lastVisit: new Date().toISOString(),
      notes: profile.notes || ''
    };
    this.data.customers.push(newCust);
    this.save(this.data);
    return newCust;
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
}

export const store = new Store();

