import {
  RestaurantProfile,
  Category,
  MenuItem,
  RestaurantTable,
  Bill,
  CartItem,
  FeatureFlags,
  Order,
  OrderStatus,
  RawMaterial,
  StockInwardEntry,
  CashRegisterShift,
  RecipeItem,
  CustomerProfile,
  TableReservation,
  GuestWaitlistEntry,
  DeliveryPartner,
  DeliveryPartnerConfig,
  StaffUser,
  AuditLog,
  PaymentTransaction,
  ReconciliationReport,
  WebhookDeliveryLog,
  Supplier,
  PurchaseOrder,
  WastageLog,
  RecipeVarianceReport,
  CourseType,
  OrderItem,
  WaiterCallRequest,
  KdsPerformanceReport
} from '../types';

const API_BASE = '/api';

// Helper for fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const ApiService = {
  async getProfile(): Promise<RestaurantProfile> {
    const res = await fetchWithTimeout(`${API_BASE}/profile`);
    if (!res.ok) throw new Error('Failed to get profile');
    return res.json();
  },

  async updateProfile(profile: Partial<RestaurantProfile>): Promise<RestaurantProfile> {
    const res = await fetchWithTimeout(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    return res.json();
  },

  async updateFeatures(flags: Partial<FeatureFlags>): Promise<FeatureFlags> {
    const res = await fetchWithTimeout(`${API_BASE}/features`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flags)
    });
    return res.json();
  },

  async getOpenWAStatus(): Promise<{ online: boolean; apiUrl: string; sessionId: string; error?: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/openwa/status`, {}, 2000);
      return res.json();
    } catch (e: any) {
      return { online: false, apiUrl: 'http://localhost:2785', sessionId: 'default', error: e.message };
    }
  },

  // Menu APIs
  async getMenu(): Promise<{ categories: Category[]; items: MenuItem[] }> {
    const res = await fetchWithTimeout(`${API_BASE}/menu`);
    if (!res.ok) throw new Error('Failed to get menu');
    return res.json();
  },

  async addMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
    const res = await fetchWithTimeout(`${API_BASE}/menu/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error('Failed to create menu item');
    return res.json();
  },

  async updateMenuItem(id: string, update: Partial<MenuItem>): Promise<MenuItem> {
    const res = await fetchWithTimeout(`${API_BASE}/menu/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    if (!res.ok) throw new Error('Failed to update menu item');
    return res.json();
  },

  async deleteMenuItem(id: string): Promise<{ success: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/menu/items/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async toggleItemStock(id: string): Promise<MenuItem> {
    const res = await fetchWithTimeout(`${API_BASE}/menu/items/${id}/stock`, {
      method: 'PATCH'
    });
    return res.json();
  },

  async addCategory(name: string, icon: string): Promise<Category> {
    const res = await fetchWithTimeout(`${API_BASE}/menu/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon })
    });
    return res.json();
  },

  async updateCategory(id: string, name: string, icon?: string): Promise<Category> {
    const res = await fetchWithTimeout(`${API_BASE}/menu/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon })
    });
    if (!res.ok) throw new Error('Failed to update category');
    return res.json();
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/menu/categories/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Tables APIs
  async getTables(): Promise<RestaurantTable[]> {
    const res = await fetchWithTimeout(`${API_BASE}/tables`);
    if (!res.ok) throw new Error('Failed to get tables');
    return res.json();
  },

  async addTable(data: { tableNumber: string; section: string; capacity: number }): Promise<RestaurantTable> {
    const res = await fetchWithTimeout(`${API_BASE}/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add table');
    return res.json();
  },

  async updateTable(id: string, update: Partial<RestaurantTable>): Promise<RestaurantTable> {
    const res = await fetchWithTimeout(`${API_BASE}/tables/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    if (!res.ok) throw new Error('Failed to update table');
    return res.json();
  },

  async deleteTable(id: string): Promise<{ success: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/tables/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async rotateTableQr(id: string): Promise<{ success: boolean; table: RestaurantTable }> {
    const res = await fetchWithTimeout(`${API_BASE}/tables/${id}/rotate-qr`, {
      method: 'POST'
    });
    return res.json();
  },

  async transferTable(fromTableId: string, toTableId: string): Promise<{ success: boolean; tables: RestaurantTable[]; order?: Order }> {
    const res = await fetchWithTimeout(`${API_BASE}/tables/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromTableId, toTableId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to transfer table');
    }
    return res.json();
  },

  async vacateTable(tableId: string): Promise<{ success: boolean; tables: RestaurantTable[] }> {
    const res = await fetchWithTimeout(`${API_BASE}/tables/${tableId}/vacate`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to vacate table');
    }
    return res.json();
  },

  async getTable(identifier: string): Promise<RestaurantTable> {
    const res = await fetchWithTimeout(`${API_BASE}/table/${identifier}`);
    if (!res.ok) throw new Error('Table not found');
    return res.json();
  },

  // Orders & KDS APIs
  async getOrders(): Promise<Order[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/orders`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async createStaffOrder(data: {
    type: string;
    tableId?: string;
    tableNumber?: string;
    customerName?: string;
    customerPhone?: string;
    items: CartItem[];
    deliveryAddress?: string;
    takeawayToken?: string;
    riderName?: string;
    riderPhone?: string;
    riderStatus?: string;
    specialNotes?: string;
  }): Promise<Order> {
    const res = await fetchWithTimeout(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 4000);
    return res.json();
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const res = await fetchWithTimeout(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update order status');
    return res.json();
  },

  async updateOrderItemStatus(orderId: string, itemId: string, kotStatus: 'pending' | 'printed' | 'prepared'): Promise<Order> {
    const res = await fetchWithTimeout(`${API_BASE}/orders/${orderId}/items/${itemId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kotStatus })
    });
    if (!res.ok) throw new Error('Failed to update order item status');
    return res.json();
  },

  async fireCourse(orderId: string, course: CourseType, waiterId?: string): Promise<{ success: boolean; firedItemsCount: number; order: Order }> {
    const res = await fetchWithTimeout(`${API_BASE}/orders/${orderId}/courses/${course}/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waiterId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fire course');
    }
    return res.json();
  },

  async fireOrderItem(orderId: string, itemId: string, waiterId?: string): Promise<{ success: boolean; item: OrderItem; order: Order }> {
    const res = await fetchWithTimeout(`${API_BASE}/orders/${orderId}/items/${itemId}/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waiterId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fire item');
    }
    return res.json();
  },

  async getKdsPerformance(): Promise<KdsPerformanceReport> {
    const res = await fetchWithTimeout(`${API_BASE}/reports/kds-performance`);
    if (!res.ok) throw new Error('Failed to fetch KDS performance metrics');
    return res.json();
  },

  async getWaiterCalls(status?: 'pending' | 'acknowledged' | 'resolved'): Promise<WaiterCallRequest[]> {
    const url = status ? `${API_BASE}/waiter-calls?status=${status}` : `${API_BASE}/waiter-calls`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    return res.json();
  },

  async createWaiterCall(data: { tableId: string; tableNumber: string; type: string; message?: string }): Promise<WaiterCallRequest> {
    const res = await fetchWithTimeout(`${API_BASE}/waiter-calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create waiter call');
    return res.json();
  },

  async resolveWaiterCall(callId: string, resolvedBy?: string): Promise<{ success: boolean; call: WaiterCallRequest }> {
    const res = await fetchWithTimeout(`${API_BASE}/waiter-calls/${callId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvedBy })
    });
    if (!res.ok) throw new Error('Failed to resolve waiter call');
    return res.json();
  },

  // Billing APIs
  async getBills(): Promise<Bill[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/bills`, {}, 2000);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async createBill(data: {
    orderType: string;
    tableNumber?: string;
    takeawayToken?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    riderName?: string;
    items: CartItem[];
    discountAmount: number;
    discountReason?: string;
    paymentMode: string;
    splitPayments?: { mode: 'cash' | 'upi' | 'card'; amount: number }[];
    pointsRedeemed?: number;
    sendWhatsApp: boolean;
    createdBy?: { userId: string; userName: string; role: string };
    managerApproval?: { userId: string; userName: string; role: string };
    clientTxId?: string;
    isOffline?: boolean;
  }): Promise<Bill> {
    const res = await fetchWithTimeout(`${API_BASE}/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 5000);
    return res.json();
  },


  async placeCustomerOrder(data: {
    tableId: string;
    customerName: string;
    customerPhone: string;
    items: CartItem[];
    paymentMode: string;
    specialNotes?: string;
  }): Promise<{ success: boolean; order: any; bill: Bill; message: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/customer-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 5000);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to place order');
    }
    return res.json();
  },

  async resendWhatsApp(billId: string): Promise<{ success: boolean; bill: Bill }> {
    const res = await fetchWithTimeout(`${API_BASE}/bills/${billId}/send-whatsapp`, {
      method: 'POST'
    }, 5000);
    return res.json();
  },

  async resendReview(billId: string): Promise<{ success: boolean; bill: Bill }> {
    const res = await fetchWithTimeout(`${API_BASE}/bills/${billId}/send-review`, {
      method: 'POST'
    }, 5000);
    return res.json();
  },

  // Inventory APIs
  async getInventory(): Promise<RawMaterial[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/inventory`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async addRawMaterial(data: Omit<RawMaterial, 'id'>): Promise<RawMaterial> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateRawMaterial(id: string, update: Partial<RawMaterial>): Promise<RawMaterial> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    return res.json();
  },

  async deleteRawMaterial(id: string): Promise<{ success: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async addStockInward(data: {
    rawMaterialId: string;
    quantityAdded: number;
    costPrice?: number;
    supplierName?: string;
  }): Promise<{ success: boolean; material: RawMaterial; log: StockInwardEntry }> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory/inward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getStockInwardLogs(): Promise<StockInwardEntry[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/inventory/inward-logs`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async updateMenuItemRecipe(menuItemId: string, recipe: RecipeItem[]): Promise<MenuItem> {
    const res = await fetchWithTimeout(`${API_BASE}/menu/items/${menuItemId}/recipe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe })
    });
    return res.json();
  },

  // Procurement & Supplier Master APIs (Phase 4)
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/inventory/suppliers`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateSupplier(id: string, update: Partial<Supplier>): Promise<Supplier> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    return res.json();
  },

  async deleteSupplier(id: string): Promise<{ success: boolean }> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory/suppliers/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Purchase Order Workflow APIs (Phase 4)
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/inventory/purchase-orders`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async createPurchaseOrder(data: {
    supplierId: string;
    items: { rawMaterialId: string; rawMaterialName: string; quantity: number; unit: string; unitCost: number }[];
    notes?: string;
    expectedDeliveryDate?: string;
  }): Promise<PurchaseOrder> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory/purchase-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async receivePurchaseOrder(id: string, receivedBy?: string): Promise<{ success: boolean; po?: PurchaseOrder; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory/purchase-orders/${id}/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receivedBy })
    });
    return res.json();
  },

  async cancelPurchaseOrder(id: string): Promise<{ success: boolean; po?: PurchaseOrder; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory/purchase-orders/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  // Wastage & Spoilage APIs (Phase 4)
  async getWastageLogs(): Promise<WastageLog[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/inventory/wastage`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async logWastage(data: {
    rawMaterialId: string;
    quantity: number;
    reason: string;
    notes?: string;
    loggedBy?: string;
    managerPin?: string;
  }): Promise<{ success: boolean; wastage?: WastageLog; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/inventory/wastage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getRecipeVarianceReport(): Promise<RecipeVarianceReport[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/inventory/recipe-variance`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  // Cash Register APIs
  async getCashRegister(): Promise<CashRegisterShift> {
    const res = await fetchWithTimeout(`${API_BASE}/cash-register`, {}, 2500);
    return res.json();
  },

  async addPettyExpense(data: { category: string; amount: number; description: string }): Promise<CashRegisterShift> {
    const res = await fetchWithTimeout(`${API_BASE}/cash-register/expense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async addCashFloat(data: { amount: number; description: string }): Promise<CashRegisterShift> {
    const res = await fetchWithTimeout(`${API_BASE}/cash-register/float`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async closeCashRegister(data: { actualCashCounted: number; notes?: string }): Promise<CashRegisterShift> {
    const res = await fetchWithTimeout(`${API_BASE}/cash-register/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async openCashRegister(openingFloat: number): Promise<CashRegisterShift> {
    const res = await fetchWithTimeout(`${API_BASE}/cash-register/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openingFloat })
    });
    return res.json();
  },

  // Customer CRM & Loyalty APIs
  async getCustomers(): Promise<CustomerProfile[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/customers`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async getCustomerByPhone(phone: string): Promise<CustomerProfile | null> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/customers/${phone}`, {}, 2000);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async upsertCustomer(data: { phone: string; name?: string; email?: string; notes?: string; loyaltyPoints?: number }): Promise<CustomerProfile> {
    const res = await fetchWithTimeout(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Table Reservations APIs
  async getReservations(): Promise<TableReservation[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/reservations`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async createReservation(data: {
    guestName: string;
    guestPhone: string;
    pax: number;
    tableId?: string;
    tableNumber?: string;
    reservationDate: string;
    reservationTime: string;
    advanceDeposit?: number;
    specialRequest?: string;
  }): Promise<TableReservation> {
    const res = await fetchWithTimeout(`${API_BASE}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateReservationStatus(id: string, status: TableReservation['status'], tableId?: string): Promise<TableReservation> {
    const res = await fetchWithTimeout(`${API_BASE}/reservations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, tableId })
    });
    return res.json();
  },

  // Guest Waitlist APIs
  async getWaitlist(): Promise<GuestWaitlistEntry[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/waitlist`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async addToWaitlist(data: {
    guestName: string;
    guestPhone: string;
    pax: number;
    sectionPreference?: string;
    estimatedWaitMinutes?: number;
  }): Promise<GuestWaitlistEntry> {
    const res = await fetchWithTimeout(`${API_BASE}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateWaitlistStatus(id: string, status: GuestWaitlistEntry['status'], tableNumber?: string): Promise<GuestWaitlistEntry> {
    const res = await fetchWithTimeout(`${API_BASE}/waitlist/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, tableNumber })
    });
    return res.json();
  },

  async notifyWaitlistWhatsApp(id: string, tableNumber?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/waitlist/${id}/notify-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber })
    });
    return res.json();
  },

  // Food Delivery Partner APIs (Zomato / Swiggy / ONDC)
  async getDeliveryPartners(): Promise<DeliveryPartnerConfig[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/delivery-partners`, {}, 2500);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async updateDeliveryPartner(partner: DeliveryPartner, config: Partial<DeliveryPartnerConfig>): Promise<DeliveryPartnerConfig> {
    const res = await fetchWithTimeout(`${API_BASE}/delivery-partners/${partner}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  async simulatePartnerOrder(partner: DeliveryPartner, customPayload?: any): Promise<{ success: boolean; order: Order }> {
    const res = await fetchWithTimeout(`${API_BASE}/delivery-partners/simulate/${partner}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customPayload || {})
    });
    return res.json();
  },

  async updatePartnerOrderStatus(orderId: string, partnerStatus: Order['partnerOrderStatus'], riderStatus?: Order['riderStatus']): Promise<Order> {
    const res = await fetchWithTimeout(`${API_BASE}/orders/${orderId}/partner-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerStatus, riderStatus })
    });
    return res.json();
  },

  // Staff & Security APIs (Phase 1)
  async getStaff(): Promise<StaffUser[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/staff`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async loginStaff(pin?: string, username?: string): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, username })
    });
    return res.json();
  },

  async verifyManagerPin(pin: string): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/auth/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, requiredRoles: ['manager', 'owner'] })
    });
    return res.json();
  },

  async voidBill(id: string, voidedBy: any, reason: string, managerPin?: string): Promise<{ success: boolean; bill?: Bill; error?: string }> {
    const res = await fetchWithTimeout(`${API_BASE}/bills/${id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voidedBy, reason, managerPin })
    });
    return res.json();
  },

  async getAuditLogs(filter?: { entityType?: string; entityId?: string; role?: string; limit?: number }): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (filter?.entityType) params.append('entityType', filter.entityType);
    if (filter?.entityId) params.append('entityId', filter.entityId);
    if (filter?.role) params.append('role', filter.role);
    if (filter?.limit) params.append('limit', String(filter.limit));
    const url = `${API_BASE}/audit-logs?${params.toString()}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    return res.json();
  },

  // Payment Gateway & Reconciliation APIs (Phase 3)
  async initiatePayment(data: {
    billId?: string;
    orderId?: string;
    amount: number;
    provider?: string;
    method?: string;
    payerPhone?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; payment: PaymentTransaction }> {
    const res = await fetchWithTimeout(`${API_BASE}/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async confirmPayment(id: string, providerTxId?: string): Promise<{ success: boolean; payment: PaymentTransaction }> {
    const res = await fetchWithTimeout(`${API_BASE}/payments/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerTxId })
    });
    return res.json();
  },

  async refundPayment(id: string, amount: number, reason: string, managerPin: string): Promise<{ success: boolean; payment: PaymentTransaction }> {
    const res = await fetchWithTimeout(`${API_BASE}/payments/${id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reason, managerPin })
    });
    return res.json();
  },

  async getReconciliationReport(): Promise<ReconciliationReport | null> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/reports/reconciliation`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async getWebhookLogs(limit = 50): Promise<WebhookDeliveryLog[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/webhooks/logs?limit=${limit}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }
};
