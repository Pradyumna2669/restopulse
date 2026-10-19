import { RestaurantProfile, Category, MenuItem, RestaurantTable } from '../types';

export const fallbackProfile: RestaurantProfile = {
  id: 'rest_01',
  name: 'RestoPulse Grand Diner',
  tagline: 'Authentic Flavours & Modern Hospitality',
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
  }
};

export const fallbackCategories: Category[] = [
  { id: 'cat_starters', name: 'Starters & Appetizers', icon: '🍲', sortOrder: 1 },
  { id: 'cat_tandoor', name: 'Tandoor & Grills', icon: '🍢', sortOrder: 2 },
  { id: 'cat_mains', name: 'Main Course', icon: '🍛', sortOrder: 3 },
  { id: 'cat_breads', name: 'Breads & Rice', icon: '🫓', sortOrder: 4 },
  { id: 'cat_beverages', name: 'Beverages & Shakes', icon: '🥤', sortOrder: 5 },
  { id: 'cat_desserts', name: 'Desserts', icon: '🍨', sortOrder: 6 }
];

export const fallbackMenuItems: MenuItem[] = [
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

export const fallbackTables: RestaurantTable[] = [
  { id: 'tbl_t1', tableNumber: 'T-01', section: 'Ground Floor', capacity: 2, status: 'vacant', qrToken: 'sec_8f93a2b1c4e7' },
  { id: 'tbl_t2', tableNumber: 'T-02', section: 'Ground Floor', capacity: 4, status: 'running', qrToken: 'sec_3d8b19e4a7c2' },
  { id: 'tbl_t3', tableNumber: 'T-03', section: 'Ground Floor', capacity: 4, status: 'vacant', qrToken: 'sec_5e71c9a0f2b8' },
  { id: 'tbl_t4', tableNumber: 'T-04', section: 'Ground Floor', capacity: 6, status: 'vacant', qrToken: 'sec_9c2a4f61e8d3' },
  { id: 'tbl_ac1', tableNumber: 'AC-01', section: 'AC Hall', capacity: 4, status: 'running', qrToken: 'sec_7b4d2e83a9c5' },
  { id: 'tbl_ac2', tableNumber: 'AC-02', section: 'AC Hall', capacity: 4, status: 'vacant', qrToken: 'sec_2a9c4f7b1e8d' },
  { id: 'tbl_ac3', tableNumber: 'AC-03', section: 'AC Hall', capacity: 8, status: 'vacant', qrToken: 'sec_6f8b2d4c9a1e' },
  { id: 'tbl_roof1', tableNumber: 'RF-01', section: 'Rooftop Lounge', capacity: 4, status: 'running', qrToken: 'sec_4e1a7c9b2d8f' },
  { id: 'tbl_roof2', tableNumber: 'RF-02', section: 'Rooftop Lounge', capacity: 6, status: 'vacant', qrToken: 'sec_1c8e4a7d9b2f' }
];

export const fallbackOrders = [
  {
    id: 'ord_demo_1',
    orderNumber: 'ORD-0001',
    type: 'dine_in' as const,
    tableId: 'tbl_t2',
    tableNumber: 'T-02',
    customerName: 'Rahul Verma',
    customerPhone: '9876543210',
    status: 'preparing' as const,
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'oi_1',
        menuItemId: 'item_butter_chicken',
        name: 'Classic Butter Chicken',
        quantity: 1,
        unitPrice: 380,
        selectedVariation: { id: 'v_half', name: 'Half (2 pcs)', price: 380 },
        specialNotes: 'Medium spicy, extra butter',
        station: 'kitchen' as const,
        kotStatus: 'prepared' as const
      },
      {
        id: 'oi_2',
        menuItemId: 'item_garlic_naan',
        name: 'Garlic Butter Naan',
        quantity: 3,
        unitPrice: 75,
        specialNotes: 'Crispy well-done',
        station: 'tandoor' as const,
        kotStatus: 'printed' as const
      }
    ]
  },
  {
    id: 'ord_demo_2',
    orderNumber: 'ORD-0002',
    type: 'dine_in' as const,
    tableId: 'tbl_ac1',
    tableNumber: 'AC-01',
    customerName: 'Priya Sharma',
    customerPhone: '9898989898',
    status: 'kot_printed' as const,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'oi_3',
        menuItemId: 'item_paneer_tikka',
        name: 'Paneer Tikka Angara',
        quantity: 1,
        unitPrice: 280,
        specialNotes: 'Extra spicy with onion rings',
        station: 'tandoor' as const,
        kotStatus: 'printed' as const
      },
      {
        id: 'oi_4',
        menuItemId: 'item_virgin_mojito',
        name: 'Fresh Mint Virgin Mojito',
        quantity: 2,
        unitPrice: 150,
        specialNotes: 'Less ice, extra mint',
        station: 'bar' as const,
        kotStatus: 'printed' as const
      }
    ]
  },
  {
    id: 'ord_demo_3',
    orderNumber: 'ORD-0003',
    type: 'dine_in' as const,
    tableId: 'tbl_roof1',
    tableNumber: 'RF-01',
    customerName: 'Amit Patel',
    customerPhone: '9123456780',
    status: 'ready' as const,
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'oi_5',
        menuItemId: 'item_gulab_jamun',
        name: 'Saffron Gulab Jamun with Ice Cream',
        quantity: 2,
        unitPrice: 140,
        specialNotes: 'Warm jamun, cold ice cream on side',
        station: 'dessert' as const,
        kotStatus: 'prepared' as const
      }
    ]
  }
];
