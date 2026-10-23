import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { store } from '../data/store';
import { OpenWAService } from '../services/openwa.service';
import { EscPosService } from '../services/escpos.service';
import { AggregatorSecurityService } from '../services/aggregatorSecurity.service';
import { InventoryCostingService } from '../services/inventoryCosting.service';
import { KdsService } from '../services/kdsService';
import { LoyaltyEngineService } from '../services/loyaltyEngine.service';
import { ReportingService } from '../services/reporting.service';
import { MultiOutletService } from '../services/multiOutlet.service';
import { hardwareService } from '../services/hardwarePeripheral.service';
import { securityService } from '../services/securityHardening.service';
import { backupService } from '../services/backup.service';
import { systemHealthService } from '../services/systemHealth.service';
import { MarketingEngineService } from '../services/marketingEngine.service';
import {
  Order,
  Bill,
  OrderItem,
  DeliveryPartner,
  EscPosOptions,
  PaymentProvider,
  Supplier,
  PurchaseOrder,
  WastageLog,
  CourseType,
  BusinessType
} from '../types';

export const apiRouter = Router();

// HTTP Security Headers Middleware (Phase 10)
apiRouter.use(securityService.securityHeadersMiddleware);

// Multi-Tenant Outlet Context Middleware (Phase 8)
apiRouter.use((req: Request, res: Response, next) => {
  const headerOutlet = req.headers['x-outlet-id'] as string;
  (req as any).outletId = headerOutlet || 'outlet_delhi_01';
  next();
});

// ==========================================
// 1. Profile & Feature Flags
// ==========================================
apiRouter.get('/profile', (req: Request, res: Response) => {
  res.json(store.getProfile());
});

apiRouter.put('/profile', (req: Request, res: Response) => {
  const updated = store.updateProfile(req.body);
  res.json(updated);
});

apiRouter.put('/features', (req: Request, res: Response) => {
  const profile = store.getProfile();
  const updated = store.updateProfile({
    featureFlags: { ...profile.featureFlags, ...req.body }
  });
  res.json(updated.featureFlags);
});

apiRouter.get('/openwa/status', async (req: Request, res: Response) => {
  const result = await OpenWAService.checkConnection();
  res.json({
    online: result.online,
    statusCode: result.statusCode,
    apiUrl: result.apiUrl,
    sessionId: result.sessionId,
    sessionData: result.details,
    error: result.error
  });
});

apiRouter.post('/openwa/test-connection', async (req: Request, res: Response) => {
  const { apiUrl, sessionId, apiKey } = req.body || {};
  const result = await OpenWAService.checkConnection({ apiUrl, sessionId, apiKey });
  res.json({
    online: result.online,
    statusCode: result.statusCode,
    apiUrl: result.apiUrl,
    sessionId: result.sessionId,
    sessionData: result.details,
    error: result.error
  });
});

apiRouter.post('/openwa/send-test', async (req: Request, res: Response) => {
  const { phone, text, apiUrl, sessionId, apiKey } = req.body || {};

  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Recipient phone number is required (e.g. 919876543210).'
    });
  }

  const messageText = text && typeof text === 'string' && text.trim().length > 0 
    ? text.trim() 
    : '🎉 *Hello from RestroPlus POS!*\n\nYour self-hosted WhatsApp Gateway connection has been verified and is working properly. ✨';

  const chatId = OpenWAService.normalizeChatId(phone.trim());
  console.log(`[OpenWA Test] Dispatching test WhatsApp to ${chatId}...`);

  const result = await OpenWAService.sendTextMessage(chatId, messageText, {
    apiUrl,
    sessionId,
    apiKey
  });

  if (result.success) {
    res.json({
      success: true,
      chatId,
      messageId: result.messageId,
      message: `Test message successfully dispatched to ${chatId}`
    });
  } else {
    res.status(result.statusCode === 401 ? 401 : (result.statusCode || 502)).json({
      success: false,
      chatId,
      statusCode: result.statusCode,
      error: result.error || 'Failed to dispatch test WhatsApp message'
    });
  }
});

// ==========================================
// 2. Menu & Categories Management
// ==========================================
apiRouter.get('/menu', (req: Request, res: Response) => {
  res.json({
    categories: store.getCategories(),
    items: store.getMenuItems()
  });
});

apiRouter.post('/menu/items', (req: Request, res: Response) => {
  const { categoryId, name, description, basePrice, foodType, station, gstRate = 5, variations, addons, inStock = true, image } = req.body;
  
  if (!name || !categoryId || basePrice === undefined) {
    return res.status(400).json({ error: 'Name, Category, and Base Price are required.' });
  }

  const newItem = store.addMenuItem({
    categoryId,
    name,
    description: description || '',
    basePrice: Number(basePrice),
    foodType: foodType || 'veg',
    station: station || 'kitchen',
    gstRate: Number(gstRate),
    variations: variations || [],
    addons: addons || [],
    inStock: inStock !== false,
    image: image || ''
  });

  res.status(201).json(newItem);
});

apiRouter.put('/menu/items/:id', (req: Request, res: Response) => {
  const updated = store.updateMenuItem(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(updated);
});

apiRouter.delete('/menu/items/:id', (req: Request, res: Response) => {
  const success = store.deleteMenuItem(req.params.id);
  res.json({ success });
});

apiRouter.patch('/menu/items/:id/stock', (req: Request, res: Response) => {
  const item = store.toggleMenuItemStock(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

apiRouter.post('/menu/categories', (req: Request, res: Response) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  const cat = store.addCategory(name, icon);
  res.status(201).json(cat);
});

apiRouter.put('/menu/categories/:id', (req: Request, res: Response) => {
  const { name, icon } = req.body;
  const updated = store.updateCategory(req.params.id, name, icon);
  if (!updated) return res.status(404).json({ error: 'Category not found' });
  res.json(updated);
});

apiRouter.delete('/menu/categories/:id', (req: Request, res: Response) => {
  const success = store.deleteCategory(req.params.id);
  res.json({ success });
});

// ==========================================
// 3. Tables & Secure QR Code Management
// ==========================================
apiRouter.get('/tables', (req: Request, res: Response) => {
  res.json(store.getTables());
});

apiRouter.post('/tables', (req: Request, res: Response) => {
  const { tableNumber, section, capacity } = req.body;
  if (!tableNumber) return res.status(400).json({ error: 'Table number is required' });

  const table = store.addTable(tableNumber, section, Number(capacity) || 4);
  res.status(201).json(table);
});

apiRouter.put('/tables/:id', (req: Request, res: Response) => {
  const updated = store.updateTable(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Table not found' });
  res.json(updated);
});

apiRouter.delete('/tables/:id', (req: Request, res: Response) => {
  const success = store.deleteTable(req.params.id);
  res.json({ success });
});

// Rotate / regenerate table QR token (Security feature)
apiRouter.post('/tables/:id/rotate-qr', (req: Request, res: Response) => {
  const table = store.rotateTableQrToken(req.params.id);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  res.json({ success: true, table });
});

// Customer looks up table strictly via secure unguessable QR token or exact ID
apiRouter.get('/table/:token', (req: Request, res: Response) => {
  const table = store.getTableBySecureToken(req.params.token);
  if (!table) {
    return res.status(404).json({ error: 'Invalid or expired table QR code. Please scan the QR stand at your table.' });
  }
  res.json({
    id: table.id,
    tableNumber: table.tableNumber,
    section: table.section,
    capacity: table.capacity,
    status: table.status,
    qrToken: table.qrToken
  });
});

apiRouter.put('/tables/:id/status', (req: Request, res: Response) => {
  const { status, currentOrderId } = req.body;
  store.updateTableStatus(req.params.id, status, currentOrderId);
  res.json({ success: true, tables: store.getTables() });
});

apiRouter.post('/tables/transfer', (req: Request, res: Response) => {
  const { fromTableId, toTableId } = req.body;
  if (!fromTableId || !toTableId) {
    return res.status(400).json({ error: 'Both fromTableId and toTableId are required' });
  }
  const result = store.transferTable(fromTableId, toTableId);
  if (!result.success) {
    return res.status(400).json({ error: result.message || 'Transfer failed' });
  }
  res.json({ tables: store.getTables(), ...result });
});

apiRouter.post('/tables/:id/vacate', (req: Request, res: Response) => {
  const result = store.vacateTable(req.params.id);
  if (!result.success) {
    return res.status(404).json({ error: 'Table not found' });
  }
  res.json({ tables: store.getTables(), ...result });
});


// ==========================================
// 4. Customer Self-Ordering (QR Scan & Order)
// ==========================================
apiRouter.post('/customer-order', async (req: Request, res: Response) => {
  const profile = store.getProfile();
  if (profile.isAcceptingOrders === false) {
    return res.status(403).json({ error: 'Store is currently paused and not accepting new orders. Please check with staff.' });
  }
  if (!profile.featureFlags.enableQrOrdering) {
    return res.status(403).json({ error: 'QR Table Ordering is currently disabled by Admin.' });
  }

  const { tableId, customerName, customerPhone, items, paymentMode = 'upi', specialNotes } = req.body;

  // Resolve table strictly by secure token or id
  const table = store.getTableBySecureToken(tableId);
  if (!table) {
    return res.status(404).json({ error: 'Invalid table for ordering.' });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty.' });
  }

  const orderCount = store.getOrders().length + 1;
  const orderNumber = `ORD-${String(orderCount).padStart(4, '0')}`;

  const formattedItems: OrderItem[] = items.map((i: any) => ({
    id: uuidv4(),
    menuItemId: i.menuItemId,
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    selectedVariation: i.selectedVariation,
    selectedAddons: i.selectedAddons || [],
    specialNotes: i.specialNotes || specialNotes || '',
    station: i.station || 'kitchen',
    kotStatus: 'printed'
  }));

  const newOrder: Order = {
    id: uuidv4(),
    orderNumber,
    type: 'dine_in',
    tableId: table.id,
    tableNumber: table.tableNumber,
    customerName,
    customerPhone,
    items: formattedItems,
    status: 'kot_printed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const createdOrder = store.createOrder(newOrder);

  // Auto-generate Bill & Invoice for this specific customer order
  let subtotal = 0;
  formattedItems.forEach(i => {
    subtotal += i.quantity * i.unitPrice;
  });

  const cgstAmount = Number((subtotal * 0.025).toFixed(2));
  const sgstAmount = Number((subtotal * 0.025).toFixed(2));
  const rawTotal = subtotal + cgstAmount + sgstAmount;
  const total = Math.round(rawTotal);
  const roundOff = Number((total - rawTotal).toFixed(2));

  const billCount = store.getBills().length + 1;
  const currentYear = new Date().getFullYear();
  const invoiceNumber = `INV-${currentYear}-${String(billCount).padStart(4, '0')}`;

  const newBill: Bill = {
    id: uuidv4(),
    invoiceNumber,
    orderId: createdOrder.id,
    orderNumber: createdOrder.orderNumber,
    orderType: 'dine_in',
    tableNumber: table.tableNumber,
    customerName,
    customerPhone,
    items: formattedItems,
    subtotal,
    discountAmount: 0,
    cgstAmount,
    sgstAmount,
    roundOff,
    total,
    paymentMode,
    status: 'paid',
    createdAt: new Date().toISOString(),
    whatsappInvoiceSent: false,
    whatsappReviewSent: false
  };

  const createdBill = store.createBill(newBill);

  if (customerPhone && profile.featureFlags.enableWhatsAppInvoice) {
    OpenWAService.dispatchInvoice(createdBill.id).catch(err => {
      console.error('[OpenWA] Customer order async dispatch error:', err);
    });
  }

  res.status(201).json({
    success: true,
    order: createdOrder,
    bill: createdBill,
    message: `Order #${createdOrder.orderNumber} placed for Table ${table.tableNumber}! KOT sent to kitchen.`
  });
});

// ==========================================
// 5. Staff POS Orders & KOT
// ==========================================
apiRouter.get('/orders', (req: Request, res: Response) => {
  res.json(store.getOrders());
});

apiRouter.post('/orders', (req: Request, res: Response) => {
  const {
    type,
    tableId,
    tableNumber,
    customerName,
    customerPhone,
    items,
    deliveryAddress,
    takeawayToken,
    riderName,
    riderPhone,
    riderStatus
  } = req.body;

  const orderCount = store.getOrders().length + 1;
  const orderNumber = `ORD-${String(orderCount).padStart(4, '0')}`;

  const formattedItems: OrderItem[] = items.map((i: any) => ({
    id: uuidv4(),
    menuItemId: i.menuItemId,
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    selectedVariation: i.selectedVariation,
    selectedAddons: i.selectedAddons || [],
    specialNotes: i.specialNotes || '',
    station: i.station || 'kitchen',
    kotStatus: 'printed'
  }));

  // Auto-generate takeaway token if not provided and order is takeaway
  const finalTakeawayToken = (type === 'takeaway' && !takeawayToken)
    ? `TK-${String(orderCount % 100 || 1).padStart(2, '0')}`
    : takeawayToken;

  const newOrder: Order = {
    id: uuidv4(),
    orderNumber,
    type: type || 'dine_in',
    tableId,
    tableNumber,
    customerName,
    customerPhone,
    deliveryAddress,
    takeawayToken: finalTakeawayToken,
    riderName,
    riderPhone,
    riderStatus: riderStatus || (type === 'delivery' ? 'unassigned' : undefined),
    items: formattedItems,
    status: 'kot_printed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const created = store.createOrder(newOrder);
  res.status(201).json(created);
});


apiRouter.patch('/orders/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  const updated = store.updateOrderStatus(req.params.id, status);
  if (!updated) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(updated);
});

apiRouter.patch('/orders/:orderId/items/:itemId/status', (req: Request, res: Response) => {
  const { kotStatus } = req.body;
  if (!kotStatus) {
    return res.status(400).json({ error: 'kotStatus is required' });
  }
  const updated = store.updateOrderItemStatus(req.params.orderId, req.params.itemId, kotStatus);
  if (!updated) {
    return res.status(404).json({ error: 'Order or item not found' });
  }
  res.json(updated);
});

// ==========================================
// 6. Billing & Invoicing (With Auto WhatsApp)
// ==========================================
apiRouter.get('/bills', (req: Request, res: Response) => {
  res.json(store.getBills());
});

apiRouter.post('/bills', async (req: Request, res: Response) => {
  const {
    orderId,
    orderNumber,
    orderType,
    tableNumber,
    takeawayToken,
    customerName,
    customerPhone,
    deliveryAddress,
    riderName,
    items,
    discountAmount = 0,
    discountReason,
    paymentMode = 'cash',
    splitPayments,
    pointsRedeemed = 0,
    sendWhatsApp = true
  } = req.body;

  let subtotal = 0;
  items.forEach((item: OrderItem) => {
    subtotal += item.quantity * item.unitPrice;
  });

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const cgstAmount = Number((taxableAmount * 0.025).toFixed(2));
  const sgstAmount = Number((taxableAmount * 0.025).toFixed(2));
  const rawTotal = taxableAmount + cgstAmount + sgstAmount;
  const total = Math.round(rawTotal);
  const roundOff = Number((total - rawTotal).toFixed(2));

  const billCount = store.getBills().length + 1;
  const currentYear = new Date().getFullYear();
  const invoiceNumber = `INV-${currentYear}-${String(billCount).padStart(4, '0')}`;

  const newBill: Bill = {
    id: uuidv4(),
    invoiceNumber,
    orderId: orderId || uuidv4(),
    orderNumber: orderNumber || 'DIRECT',
    orderType: orderType || 'counter',
    tableNumber,
    takeawayToken,
    customerName,
    customerPhone,
    deliveryAddress,
    riderName,
    items,
    subtotal,
    discountAmount,
    discountReason,
    cgstAmount,
    sgstAmount,
    roundOff,
    total,
    paymentMode,
    splitPayments: splitPayments || undefined,
    pointsRedeemed: Number(pointsRedeemed) || 0,
    status: 'paid',
    createdAt: new Date().toISOString(),
    whatsappInvoiceSent: false,
    whatsappReviewSent: false
  };

  const createdBill = store.createBill(newBill);

  // Phase 4: Automatically deduct inventory based on recipe BOM
  if (items && items.length > 0) {
    try {
      InventoryCostingService.deductRecipeStockOnOrder(items);
    } catch (e) {
      console.error('[Inventory] Failed to auto-deduct BOM stock:', e);
    }
  }

  // Phase 1: Audit high discounts and staff actions
  if (discountAmount > 0) {
    store.addAuditLog({
      userId: req.body.createdBy?.userId || 'staff-cashier-01',
      userName: req.body.createdBy?.userName || 'Pooja Sharma (Head Cashier)',
      role: req.body.createdBy?.role || 'cashier',
      action: discountAmount > 200 ? 'HIGH_DISCOUNT_APPLIED' : 'DISCOUNT_APPLIED',
      entityType: 'bill',
      entityId: createdBill.id,
      details: {
        invoiceNumber: createdBill.invoiceNumber,
        subtotal: createdBill.subtotal,
        discountAmount,
        discountReason: discountReason || 'Discretionary'
      },
      reason: discountReason,
      approvedBy: req.body.managerApproval
    });
  }

  if (customerPhone && sendWhatsApp) {
    OpenWAService.dispatchInvoice(createdBill.id).catch(err => {
      console.error('[OpenWA] Async dispatch error:', err);
    });
  }

  res.status(201).json(createdBill);
});

apiRouter.post('/bills/:id/void', (req: Request, res: Response) => {
  const { voidedBy, reason, managerPin } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Cancellation / void reason is required' });
  }

  const actor = voidedBy || { userId: 'staff-cashier-01', userName: 'Cashier', role: 'cashier' };
  let approval: { userId: string; userName: string; role: any } | undefined;

  // Manager PIN approval required if actor is not manager or owner
  if (actor.role !== 'manager' && actor.role !== 'owner') {
    if (!managerPin) {
      return res.status(403).json({ error: 'Manager PIN approval is required to void bills' });
    }
    const pinCheck = store.verifyPin(managerPin, ['manager', 'owner']);
    if (!pinCheck.success || !pinCheck.user) {
      return res.status(401).json({ error: pinCheck.error || 'Invalid manager approval PIN' });
    }
    approval = {
      userId: pinCheck.user.id,
      userName: pinCheck.user.name,
      role: pinCheck.user.role
    };
  }

  const result = store.voidBill(req.params.id, actor, reason, approval);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, bill: result.bill });
});

apiRouter.post('/bills/:id/send-whatsapp', async (req: Request, res: Response) => {
  const bill = store.getBillById(req.params.id);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  const updatedBill = await OpenWAService.dispatchInvoice(bill.id);
  res.json({ success: true, bill: updatedBill });
});

apiRouter.post('/bills/:id/send-review', async (req: Request, res: Response) => {
  const bill = store.getBillById(req.params.id);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  await OpenWAService.dispatchReviewPrompt(bill.id);
  res.json({ success: true, bill: store.getBillById(bill.id) });
});

// ==========================================
// 7. Inventory & Raw Materials Management
// ==========================================
apiRouter.get('/inventory', (req: Request, res: Response) => {
  res.json(store.getInventory());
});

apiRouter.post('/inventory', (req: Request, res: Response) => {
  const { name, category, unit, currentStock, reorderLevel, costPerUnit } = req.body;
  if (!name || !unit) {
    return res.status(400).json({ error: 'Name and unit are required' });
  }
  const created = store.addRawMaterial({
    name,
    category: category || 'General',
    unit,
    currentStock: Number(currentStock) || 0,
    reorderLevel: Number(reorderLevel) || 5,
    costPerUnit: Number(costPerUnit) || 0
  });
  res.status(201).json(created);
});

apiRouter.put('/inventory/:id', (req: Request, res: Response) => {
  const updated = store.updateRawMaterial(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Material not found' });
  }
  res.json(updated);
});

apiRouter.delete('/inventory/:id', (req: Request, res: Response) => {
  const success = store.deleteRawMaterial(req.params.id);
  res.json({ success });
});

apiRouter.post('/inventory/inward', (req: Request, res: Response) => {
  const { rawMaterialId, quantityAdded, costPrice, supplierName } = req.body;
  if (!rawMaterialId || !quantityAdded) {
    return res.status(400).json({ error: 'rawMaterialId and quantityAdded are required' });
  }
  const result = store.addStockInward(rawMaterialId, Number(quantityAdded), Number(costPrice) || 0, supplierName);
  if (!result) {
    return res.status(404).json({ error: 'Raw material not found' });
  }
  res.status(201).json({ success: true, ...result });
});

apiRouter.get('/inventory/inward-logs', (req: Request, res: Response) => {
  res.json(store.getStockInwardLogs());
});

apiRouter.put('/menu/items/:id/recipe', (req: Request, res: Response) => {
  const { recipe } = req.body;
  const updated = store.updateMenuItemRecipe(req.params.id, recipe || []);
  if (!updated) {
    return res.status(404).json({ error: 'Menu item not found' });
  }
  res.json(updated);
});

// ==========================================
// 8. Cash Register & Shift Drawer
// ==========================================
apiRouter.get('/cash-register', (req: Request, res: Response) => {
  res.json(store.getCashRegister());
});

apiRouter.post('/cash-register/expense', (req: Request, res: Response) => {
  const { category, amount, description } = req.body;
  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }
  const register = store.addPettyExpense(category, Number(amount), description);
  res.json(register);
});

apiRouter.post('/cash-register/float', (req: Request, res: Response) => {
  const { amount, description } = req.body;
  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }
  const register = store.addCashFloat(Number(amount), description);
  res.json(register);
});

apiRouter.post('/cash-register/close', (req: Request, res: Response) => {
  const { actualCashCounted, notes } = req.body;
  const register = store.closeCashRegister(Number(actualCashCounted) || 0, notes);
  res.json(register);
});

apiRouter.post('/cash-register/open', (req: Request, res: Response) => {
  const { openingFloat } = req.body;
  const register = store.openCashRegister(Number(openingFloat) || 0);
  res.json(register);
});

// ==========================================
// 9. Customer CRM & Loyalty Points
// ==========================================
apiRouter.get('/customers', (req: Request, res: Response) => {
  res.json(store.getCustomers());
});

apiRouter.get('/customers/:phone', (req: Request, res: Response) => {
  const customer = store.getCustomerByPhone(req.params.phone);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json(customer);
});

apiRouter.post('/customers', (req: Request, res: Response) => {
  const { phone, name, email, notes, loyaltyPoints } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  const cust = store.upsertCustomer({ phone, name, email, notes, loyaltyPoints });
  res.status(200).json(cust);
});

// ==========================================
// 10. Table Reservations
// ==========================================
apiRouter.get('/reservations', (req: Request, res: Response) => {
  res.json(store.getReservations());
});

apiRouter.post('/reservations', async (req: Request, res: Response) => {
  const { guestName, guestPhone, pax, tableId, tableNumber, reservationDate, reservationTime, advanceDeposit, specialRequest } = req.body;
  if (!guestName || !guestPhone || !reservationDate || !reservationTime) {
    return res.status(400).json({ error: 'guestName, guestPhone, reservationDate, and reservationTime are required' });
  }

  const reservation = store.createReservation({
    guestName,
    guestPhone,
    pax: Number(pax) || 2,
    tableId,
    tableNumber,
    reservationDate,
    reservationTime,
    advanceDeposit: Number(advanceDeposit) || 0,
    specialRequest,
    status: 'confirmed'
  });

  // Optional: Auto WhatsApp confirmation
  if (guestPhone) {
    OpenWAService.dispatchReservationConfirmed(guestName, guestPhone, reservationDate, reservationTime, Number(pax) || 2, tableNumber).catch(err => {
      console.warn('[OpenWA] Reservation WhatsApp dispatch failed:', err);
    });
  }

  res.status(201).json(reservation);
});

apiRouter.patch('/reservations/:id/status', (req: Request, res: Response) => {
  const { status, tableId } = req.body;
  const updated = store.updateReservationStatus(req.params.id, status, tableId);
  if (!updated) {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  res.json(updated);
});

// ==========================================
// 11. Guest Waitlist
// ==========================================
apiRouter.get('/waitlist', (req: Request, res: Response) => {
  res.json(store.getWaitlist());
});

apiRouter.post('/waitlist', (req: Request, res: Response) => {
  const { guestName, guestPhone, pax, sectionPreference, estimatedWaitMinutes } = req.body;
  if (!guestName || !guestPhone) {
    return res.status(400).json({ error: 'guestName and guestPhone are required' });
  }

  const entry = store.addToWaitlist({
    guestName,
    guestPhone,
    pax: Number(pax) || 2,
    sectionPreference,
    estimatedWaitMinutes: Number(estimatedWaitMinutes) || 15
  });

  res.status(201).json(entry);
});

apiRouter.patch('/waitlist/:id/status', async (req: Request, res: Response) => {
  const { status, tableNumber } = req.body;
  const updated = store.updateWaitlistStatus(req.params.id, status);
  if (!updated) {
    return res.status(404).json({ error: 'Waitlist entry not found' });
  }

  // If table is ready, auto WhatsApp notification
  if (status === 'table_ready') {
    OpenWAService.dispatchTableReadyAlert(updated.guestName, updated.guestPhone, tableNumber).catch(err => {
      console.warn('[OpenWA] Table ready alert dispatch failed:', err);
    });
  }

  res.json(updated);
});

apiRouter.post('/waitlist/:id/notify-whatsapp', async (req: Request, res: Response) => {
  const { tableNumber } = req.body;
  const entry = store.getWaitlist().find(w => w.id === req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Waitlist entry not found' });
  }

  const result = await OpenWAService.dispatchTableReadyAlert(entry.guestName, entry.guestPhone, tableNumber);
  res.json(result);
});

// ==========================================
// 12. Delivery Partner Integrations (Zomato / Swiggy / ONDC)
// ==========================================
apiRouter.get('/delivery-partners', (req: Request, res: Response) => {
  res.json(store.getDeliveryPartners());
});

apiRouter.put('/delivery-partners/:partner', (req: Request, res: Response) => {
  const partner = req.params.partner as DeliveryPartner;
  const updated = store.updateDeliveryPartnerConfig(partner, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Delivery partner not found' });
  }
  res.json(updated);
});

apiRouter.post('/delivery-partners/simulate/:partner', (req: Request, res: Response) => {
  const partner = req.params.partner as DeliveryPartner;
  const validPartners: DeliveryPartner[] = ['zomato', 'swiggy', 'ondc', 'magicpin'];
  if (!validPartners.includes(partner)) {
    return res.status(400).json({ error: 'Invalid delivery partner name' });
  }

  const order = store.simulatePartnerOrder(partner, req.body);
  res.status(201).json({ success: true, order });
});

// Live Inbound Webhook for delivery partners with HMAC-SHA256 & Idempotency (Phase 3)
apiRouter.post('/webhooks/aggregators/:partner', securityService.createRateLimiter('webhooks'), (req: Request, res: Response) => {
  const partner = req.params.partner as DeliveryPartner;
  const signature = req.headers['x-aggregator-signature'] as string | undefined;
  const eventId = (req.headers['x-event-id'] as string) || req.body?.eventId || `evt_${Date.now()}`;
  const eventType = (req.body?.eventType || 'ORDER_PLACED') as 'ORDER_PLACED' | 'ORDER_CANCELLED' | 'RIDER_ASSIGNED';

  const result = AggregatorSecurityService.processInboundWebhook(
    partner,
    eventId,
    eventType,
    req.body,
    signature,
    JSON.stringify(req.body)
  );

  if (result.status === 'signature_mismatch') {
    return res.status(401).json({ error: result.error, status: result.status });
  }

  if (result.status === 'duplicate_skipped') {
    return res.status(200).json({ status: 'duplicate_skipped', message: 'Event already processed' });
  }

  res.status(200).json({
    status: 'acknowledged',
    orderId: result.order?.partnerOrderId,
    restaurantOrderId: result.order?.id,
    timestamp: new Date().toISOString()
  });
});

apiRouter.get('/webhooks/logs', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 50;
  res.json(store.getWebhookLogs(limit));
});

apiRouter.patch('/orders/:id/partner-status', (req: Request, res: Response) => {
  const { partnerStatus, riderStatus } = req.body;
  const order = store.updatePartnerOrderStatus(req.params.id, partnerStatus, riderStatus);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// ==========================================
// 13. Staff RBAC, Authentication & Audit Logs (Phase 1)
// ==========================================
apiRouter.get('/staff', (req: Request, res: Response) => {
  res.json(store.getStaffUsers());
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, pin } = req.body;
  const staff = store.getStaffUsers().find(u => u.username === username && u.pin === pin && u.isActive);
  if (!staff) {
    return res.status(401).json({ error: 'Invalid username or PIN' });
  }
  store.addAuditLog({
    userId: staff.id,
    userName: staff.name,
    role: staff.role,
    action: 'STAFF_LOGIN',
    entityType: 'staff',
    entityId: staff.id
  });
  res.json({ success: true, user: staff });
});

apiRouter.post('/auth/verify-pin', (req: Request, res: Response) => {
  const { pin, requiredRoles } = req.body;
  const verification = store.verifyPin(pin, requiredRoles);
  if (!verification.success) {
    return res.status(401).json({ error: verification.error });
  }
  res.json({ success: true, user: verification.user });
});

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const filter = {
    action: req.query.action as string,
    role: req.query.role as any,
    limit: Number(req.query.limit) || 100
  };
  res.json(store.getAuditLogs(filter));
});

// ==========================================
// 14. Offline Sync & Idempotent Ingestion (Phase 2)
// ==========================================
apiRouter.post('/orders/sync-offline', (req: Request, res: Response) => {
  const { orders } = req.body;
  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({ error: 'Array of orders is required' });
  }
  const synced: Order[] = [];
  for (const o of orders) {
    const existing = store.getOrders().find(order => order.clientTxId && order.clientTxId === o.clientTxId);
    if (existing) {
      synced.push(existing);
      continue;
    }
    const created = store.createOrder({ ...o, isOffline: true, syncedAt: new Date().toISOString() });
    synced.push(created);
  }
  res.json({ success: true, count: synced.length, orders: synced });
});

apiRouter.post('/bills/sync-offline', (req: Request, res: Response) => {
  const { bills } = req.body;
  if (!bills || !Array.isArray(bills)) {
    return res.status(400).json({ error: 'Array of bills is required' });
  }
  const synced: Bill[] = [];
  for (const b of bills) {
    const existing = store.getBills().find(bill => bill.clientTxId && bill.clientTxId === b.clientTxId);
    if (existing) {
      synced.push(existing);
      continue;
    }
    const created = store.createBill({ ...b, isOffline: true, syncedAt: new Date().toISOString() });
    synced.push(created);
  }
  res.json({ success: true, count: synced.length, bills: synced });
});

// ==========================================
// 15. Raw ESC/POS Thermal Printing (Phase 2)
// ==========================================
apiRouter.post('/printer/escpos/bill', (req: Request, res: Response) => {
  const { bill, profile: billProfile, options } = req.body;
  const currentProfile = billProfile || store.getProfile();
  const rawBytes = EscPosService.generateBillEscPos(bill, currentProfile, options);
  res.json({
    format: 'escpos',
    paperWidth: options?.paperWidth || '80mm',
    length: rawBytes.length,
    base64: rawBytes.toString('base64'),
    hex: rawBytes.toString('hex')
  });
});

apiRouter.post('/printer/escpos/kot', (req: Request, res: Response) => {
  const { order, options } = req.body;
  const rawBytes = EscPosService.generateKotEscPos(order, options);
  res.json({
    format: 'escpos-kot',
    paperWidth: options?.paperWidth || '80mm',
    length: rawBytes.length,
    base64: rawBytes.toString('base64'),
    hex: rawBytes.toString('hex')
  });
});

// ==========================================
// 16. Payment Gateway & Reconciliation (Phase 3)
// ==========================================
apiRouter.post('/payments/initiate', securityService.createRateLimiter('payments'), (req: Request, res: Response) => {
  const { billId, orderId, amount, provider = 'razorpay', method, payerPhone, idempotencyKey } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid payment amount is required' });
  }
  const payment = AggregatorSecurityService.initiatePayment({
    billId,
    orderId,
    amount,
    provider: provider as PaymentProvider,
    method,
    payerPhone,
    idempotencyKey
  });
  res.status(201).json({ success: true, payment });
});

apiRouter.post('/payments/:id/confirm', (req: Request, res: Response) => {
  const { providerTxId } = req.body;
  const result = AggregatorSecurityService.confirmPayment(req.params.id, providerTxId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
});

apiRouter.post('/payments/:id/refund', (req: Request, res: Response) => {
  const { amount, reason, managerPin } = req.body;
  if (!amount || !reason || !managerPin) {
    return res.status(400).json({ error: 'Amount, reason, and managerPin are required' });
  }
  const pinCheck = store.verifyPin(managerPin, ['manager', 'owner']);
  if (!pinCheck.success || !pinCheck.user) {
    return res.status(401).json({ error: 'Invalid Manager PIN for refund' });
  }
  const result = AggregatorSecurityService.refundPayment(
    req.params.id,
    Number(amount),
    reason,
    { userId: pinCheck.user.id, userName: pinCheck.user.name, role: pinCheck.user.role }
  );
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
});

apiRouter.get('/payments', (req: Request, res: Response) => {
  res.json(store.getPayments());
});

apiRouter.get('/reports/reconciliation', (req: Request, res: Response) => {
  res.json(store.getAggregatorReconciliation());
});

// ==========================================
// 17. Procurement & Advanced Inventory (Phase 4)
// ==========================================
apiRouter.get('/inventory/suppliers', (req: Request, res: Response) => {
  res.json(store.getSuppliers());
});

apiRouter.post('/inventory/suppliers', (req: Request, res: Response) => {
  const { name, contactPerson, phone, email, gstin, address, categoriesSupplied, paymentTerms } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Supplier name and phone are required' });
  }
  const newSupplier: Supplier = {
    id: `sup_${uuidv4().substring(0, 8)}`,
    name,
    contactPerson: contactPerson || name,
    phone,
    email: email || '',
    gstin,
    address,
    categoriesSupplied: categoriesSupplied || ['General'],
    paymentTerms: paymentTerms || 'net_15',
    active: true,
    createdAt: new Date().toISOString()
  };
  const created = store.createSupplier(newSupplier);
  res.status(201).json(created);
});

apiRouter.put('/inventory/suppliers/:id', (req: Request, res: Response) => {
  const updated = store.updateSupplier(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Supplier not found' });
  }
  res.json(updated);
});

apiRouter.delete('/inventory/suppliers/:id', (req: Request, res: Response) => {
  const success = store.deleteSupplier(req.params.id);
  res.json({ success });
});

apiRouter.get('/inventory/purchase-orders', (req: Request, res: Response) => {
  res.json(store.getPurchaseOrders());
});

apiRouter.post('/inventory/purchase-orders', (req: Request, res: Response) => {
  const { supplierId, items, notes, expectedDeliveryDate, status } = req.body;
  if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'supplierId and at least one order item are required' });
  }

  const supplier = store.getSupplierById(supplierId);
  const supplierName = supplier ? supplier.name : 'Unknown Supplier';

  let subtotal = 0;
  const formattedItems = items.map((i: any) => {
    const totalCost = Number(i.quantity) * Number(i.unitCost);
    subtotal += totalCost;
    return {
      rawMaterialId: i.rawMaterialId,
      rawMaterialName: i.rawMaterialName,
      quantity: Number(i.quantity),
      unit: i.unit,
      unitCost: Number(i.unitCost),
      totalCost
    };
  });

  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const totalAmount = Math.round((subtotal + tax) * 100) / 100;
  const count = store.getPurchaseOrders().length + 1;
  const poNumber = `PO-2026-${String(count).padStart(3, '0')}`;

  const po: PurchaseOrder = {
    id: `po_${uuidv4().substring(0, 8)}`,
    poNumber,
    supplierId,
    supplierName,
    status: status || 'ordered',
    items: formattedItems,
    subtotal,
    tax,
    totalAmount,
    expectedDeliveryDate,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const created = store.createPurchaseOrder(po);
  res.status(201).json(created);
});

apiRouter.post('/inventory/purchase-orders/:id/receive', (req: Request, res: Response) => {
  const { receivedBy } = req.body;
  const result = InventoryCostingService.processGoodsReceived(
    req.params.id,
    receivedBy || 'Storekeeper'
  );

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result);
});

apiRouter.post('/inventory/purchase-orders/:id/cancel', (req: Request, res: Response) => {
  const po = store.getPurchaseOrderById(req.params.id);
  if (!po) {
    return res.status(404).json({ error: 'Purchase Order not found' });
  }
  if (po.status === 'received') {
    return res.status(400).json({ error: 'Cannot cancel an already received Purchase Order' });
  }

  const updated = store.updatePurchaseOrder(po.id, {
    status: 'cancelled',
    updatedAt: new Date().toISOString()
  });

  res.json({ success: true, po: updated });
});

apiRouter.get('/inventory/wastage', (req: Request, res: Response) => {
  res.json(store.getWastageLogs());
});

apiRouter.post('/inventory/wastage', (req: Request, res: Response) => {
  const { rawMaterialId, quantity, reason, notes, loggedBy, managerPin } = req.body;
  if (!rawMaterialId || !quantity || !reason) {
    return res.status(400).json({ error: 'rawMaterialId, quantity, and reason are required' });
  }

  const result = InventoryCostingService.logWastage({
    rawMaterialId,
    quantity: Number(quantity),
    reason,
    notes,
    loggedBy: loggedBy || 'Staff',
    managerPin
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json(result);
});

apiRouter.get('/inventory/recipe-variance', (req: Request, res: Response) => {
  const report = InventoryCostingService.getRecipeVarianceReport();
  res.json(report);
});

// ==========================================
// 18. Advanced KDS Course Sequencing & Waiter Assistance (Phase 5)
// ==========================================
apiRouter.post('/orders/:orderId/items/:itemId/fire', (req: Request, res: Response) => {
  const result = KdsService.fireItem(req.params.orderId, req.params.itemId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
});

apiRouter.post('/orders/:orderId/courses/:course/fire', (req: Request, res: Response) => {
  const result = KdsService.fireCourse(req.params.orderId, req.params.course as CourseType);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
});

apiRouter.get('/reports/kds-performance', (req: Request, res: Response) => {
  const report = KdsService.getKdsPerformanceMetrics();
  res.json(report);
});

apiRouter.get('/waiter-calls', (req: Request, res: Response) => {
  res.json(store.getWaiterCalls());
});

apiRouter.post('/waiter-calls', (req: Request, res: Response) => {
  const { tableId, tableNumber, type, message } = req.body;
  if (!tableNumber || !type) {
    return res.status(400).json({ error: 'tableNumber and type are required' });
  }
  const call = KdsService.createWaiterCall({
    tableId: tableId || 'tbl_direct',
    tableNumber,
    type,
    message
  });
  res.status(201).json(call);
});

apiRouter.post('/waiter-calls/:id/resolve', (req: Request, res: Response) => {
  const { assignedWaiter } = req.body;
  const result = KdsService.resolveWaiterCall(req.params.id, assignedWaiter);
  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }
  res.json(result);
});

// ==========================================
// 19. Customer Loyalty & Multi-Concept Configuration (Phase 6)
// ==========================================
apiRouter.get('/loyalty/settings', (req: Request, res: Response) => {
  res.json(LoyaltyEngineService.getSettings());
});

apiRouter.put('/loyalty/settings', (req: Request, res: Response) => {
  const updated = LoyaltyEngineService.updateSettings(req.body);
  res.json(updated);
});

apiRouter.post('/loyalty/redeem', (req: Request, res: Response) => {
  const { customerId, pointsToRedeem, billTotal } = req.body;
  if (!customerId || pointsToRedeem === undefined || billTotal === undefined) {
    return res.status(400).json({ error: 'customerId, pointsToRedeem and billTotal are required' });
  }
  const result = LoyaltyEngineService.validateAndRedeemPoints(customerId, Number(pointsToRedeem), Number(billTotal));
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result);
});

apiRouter.get('/concepts/preset/:type', (req: Request, res: Response) => {
  const preset = LoyaltyEngineService.getConceptPreset(req.params.type as BusinessType);
  res.json(preset);
});

apiRouter.get('/public/tokens', securityService.createRateLimiter('publicTokens'), (req: Request, res: Response) => {
  res.json(LoyaltyEngineService.getPublicOrderTokens());
});

// ==========================================
// 20. Reporting, Tax & Business Intelligence (Phase 7)
// ==========================================
apiRouter.get('/reports/sales-hourly', (req: Request, res: Response) => {
  const date = req.query.date as string | undefined;
  const report = ReportingService.getHourlySales(date);
  res.json(report);
});

apiRouter.get('/reports/category-performance', (req: Request, res: Response) => {
  const report = ReportingService.getCategoryPerformance();
  res.json(report);
});

apiRouter.get('/reports/staff-sales', (req: Request, res: Response) => {
  const report = ReportingService.getStaffSales();
  res.json(report);
});

apiRouter.get('/reports/discount-audit', (req: Request, res: Response) => {
  const report = ReportingService.getDiscountAudit();
  res.json(report);
});

apiRouter.get('/reports/gstr-1', (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'OCT-2026';
  const report = ReportingService.getGstr1TaxLedger(period);
  res.json(report);
});

apiRouter.get('/reports/gstr-1/export', (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'json';
  if (format === 'csv') {
    const csvData = ReportingService.exportGstr1Csv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="GSTR1_Ledger.csv"');
    return res.send(csvData);
  }
  const jsonData = ReportingService.exportGstr1Json();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="GSTR1_Filing.json"');
  return res.json(jsonData);
});

apiRouter.get('/reports/eod-z-report', (req: Request, res: Response) => {
  const report = ReportingService.getEodZReport();
  res.json(report);
});

apiRouter.post('/printer/escpos/z-report', (req: Request, res: Response) => {
  const { options } = req.body;
  const report = ReportingService.getEodZReport();
  const profile = store.getProfile();
  const rawBytes = EscPosService.generateZReportEscPos(report, profile, options);
  res.json({
    format: 'escpos-z-report',
    paperWidth: options?.paperWidth || '80mm',
    length: rawBytes.length,
    base64: rawBytes.toString('base64'),
    hex: rawBytes.toString('hex')
  });
});

// ==========================================
// 21. Multi-Outlet & Franchise Master (Phase 8)
// ==========================================

// Organization & Brands
apiRouter.get('/organization', (req: Request, res: Response) => {
  res.json(MultiOutletService.getOrganization());
});

apiRouter.put('/organization', (req: Request, res: Response) => {
  const updated = MultiOutletService.updateOrganization(req.body);
  res.json(updated);
});

apiRouter.get('/brands', (req: Request, res: Response) => {
  res.json(MultiOutletService.getBrands());
});

// Outlets Directory
apiRouter.get('/outlets', (req: Request, res: Response) => {
  const active = req.query.active !== undefined ? req.query.active === 'true' : undefined;
  const isFranchise = req.query.isFranchise !== undefined ? req.query.isFranchise === 'true' : undefined;
  const city = req.query.city as string;
  const outlets = MultiOutletService.getOutlets({ active, isFranchise, city });
  res.json(outlets);
});

apiRouter.post('/outlets', (req: Request, res: Response) => {
  try {
    const created = MultiOutletService.createOutlet(req.body);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/outlets/:id', (req: Request, res: Response) => {
  const outlet = MultiOutletService.getOutletById(req.params.id);
  if (!outlet) {
    return res.status(404).json({ error: `Outlet '${req.params.id}' not found` });
  }
  res.json(outlet);
});

apiRouter.put('/outlets/:id', (req: Request, res: Response) => {
  try {
    const updated = MultiOutletService.updateOutlet(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Central Menu Master & Overrides
apiRouter.get('/outlets/:outletId/menu', (req: Request, res: Response) => {
  try {
    const menu = MultiOutletService.getEffectiveMenu(req.params.outletId);
    res.json(menu);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

apiRouter.get('/outlets/:outletId/menu/overrides', (req: Request, res: Response) => {
  const overrides = MultiOutletService.getMenuOverrides(req.params.outletId);
  res.json(overrides);
});

apiRouter.put('/outlets/:outletId/menu/:menuItemId/override', (req: Request, res: Response) => {
  try {
    const override = MultiOutletService.setMenuOverride(
      req.params.outletId,
      req.params.menuItemId,
      req.body
    );
    res.json(override);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/outlets/:outletId/menu/:menuItemId/override', (req: Request, res: Response) => {
  const removed = MultiOutletService.removeMenuOverride(req.params.outletId, req.params.menuItemId);
  res.json({ success: removed });
});

// Inter-Store Stock Transfers (IST)
apiRouter.get('/inventory/transfers', (req: Request, res: Response) => {
  const status = req.query.status as any;
  const sourceOutletId = req.query.sourceOutletId as string;
  const destinationOutletId = req.query.destinationOutletId as string;
  const transfers = MultiOutletService.getTransfers({ status, sourceOutletId, destinationOutletId });
  res.json(transfers);
});

apiRouter.post('/inventory/transfers', (req: Request, res: Response) => {
  try {
    const transfer = MultiOutletService.createTransfer(req.body);
    res.status(201).json(transfer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/inventory/transfers/:id', (req: Request, res: Response) => {
  const transfer = MultiOutletService.getTransferById(req.params.id);
  if (!transfer) {
    return res.status(404).json({ error: `Transfer '${req.params.id}' not found` });
  }
  res.json(transfer);
});

apiRouter.post('/inventory/transfers/:id/approve', (req: Request, res: Response) => {
  try {
    const { approvedBy } = req.body;
    const transfer = MultiOutletService.approveTransfer(req.params.id, approvedBy || {
      userId: 'usr_mgr',
      userName: 'Manager',
      role: 'manager'
    });
    res.json(transfer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/inventory/transfers/:id/dispatch', (req: Request, res: Response) => {
  try {
    const { dispatchedBy, carrierDetails } = req.body;
    const transfer = MultiOutletService.dispatchTransfer(
      req.params.id,
      dispatchedBy || { userId: 'usr_staff', userName: 'Warehouse Keeper', role: 'inventory' },
      carrierDetails
    );
    res.json(transfer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/inventory/transfers/:id/receive', (req: Request, res: Response) => {
  try {
    const { receivedBy, receivedItems } = req.body;
    const transfer = MultiOutletService.receiveTransfer(
      req.params.id,
      receivedBy || { userId: 'usr_staff', userName: 'Receiving Staff', role: 'inventory' },
      receivedItems
    );
    res.json(transfer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/inventory/transfers/:id/cancel', (req: Request, res: Response) => {
  try {
    const { cancelledBy } = req.body;
    const transfer = MultiOutletService.cancelTransfer(
      req.params.id,
      cancelledBy || { userId: 'usr_mgr', userName: 'Store Manager', role: 'manager', reason: 'Order cancelled' }
    );
    res.json(transfer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Headquarters Analytics & Inventory Matrix
apiRouter.get('/reports/hq-consolidated', (req: Request, res: Response) => {
  const period = req.query.period as string;
  const report = MultiOutletService.getConsolidatedHqReport(period);
  res.json(report);
});

apiRouter.get('/reports/hq-inventory-matrix', (req: Request, res: Response) => {
  const matrix = MultiOutletService.getInventoryMatrix();
  res.json(matrix);
});

// ==========================================
// PHASE 9: HARDWARE PERIPHERALS API ROUTES
// ==========================================

// 1. Overall Hardware Peripherals Status
apiRouter.get('/hardware/status', (req: Request, res: Response) => {
  res.json(hardwareService.getHardwareStatus());
});

// 2. Weighing Scale Endpoints
apiRouter.get('/hardware/scale/read', (req: Request, res: Response) => {
  const reading = hardwareService.getCurrentScaleReading();
  res.json(reading);
});

apiRouter.post('/hardware/scale/parse', (req: Request, res: Response) => {
  try {
    const { rawPacket, protocol, tareWeight } = req.body;
    if (!rawPacket) {
      return res.status(400).json({ error: 'rawPacket is required' });
    }
    const reading = hardwareService.decodeScalePacket(rawPacket, protocol, tareWeight);
    res.json(reading);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/hardware/scale/simulate', (req: Request, res: Response) => {
  try {
    const { weight, isStable, unit } = req.body;
    if (typeof weight !== 'number') {
      return res.status(400).json({ error: 'weight numeric value is required' });
    }
    const reading = hardwareService.simulateScaleReading(weight, isStable ?? true, unit || 'kg');
    res.json(reading);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/hardware/scale/tare', (req: Request, res: Response) => {
  try {
    const { tareWeight } = req.body;
    const result = hardwareService.setTare(tareWeight);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/hardware/scale/tare/reset', (req: Request, res: Response) => {
  const result = hardwareService.resetTare();
  res.json(result);
});

apiRouter.post('/hardware/scale/calculate-price', (req: Request, res: Response) => {
  try {
    const { menuItemId, weight, unit, tareWeight } = req.body;
    if (!menuItemId || typeof weight !== 'number') {
      return res.status(400).json({ error: 'menuItemId and numeric weight are required' });
    }
    const calc = hardwareService.calculateWeighedPrice(menuItemId, weight, unit || 'kg', tareWeight);
    res.json(calc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Barcode Scanner & SKU Endpoints
apiRouter.get('/hardware/barcode/lookup/:code', (req: Request, res: Response) => {
  try {
    const resolved = hardwareService.resolveBarcode(req.params.code, 'hardware_scanner');
    res.json(resolved);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

apiRouter.post('/hardware/barcode/scan', (req: Request, res: Response) => {
  try {
    const { barcode, source } = req.body;
    if (!barcode) {
      return res.status(400).json({ error: 'barcode string is required' });
    }
    const resolved = hardwareService.resolveBarcode(barcode, source || 'hardware_scanner');
    res.json(resolved);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Customer-Facing VFD Pole Display Endpoints
apiRouter.post('/hardware/vfd/display', (req: Request, res: Response) => {
  try {
    const { line1, line2 } = req.body;
    const cmds = hardwareService.generateVfdCommandBytes(line1 || '', line2 || '');
    res.json(cmds);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/hardware/vfd/welcome', (req: Request, res: Response) => {
  const { storeName } = req.body;
  const profile = store.getProfile();
  const cmds = hardwareService.getVfdWelcomeMessage(storeName || profile.name || 'RestoPulse');
  res.json(cmds);
});

apiRouter.post('/hardware/vfd/item-added', (req: Request, res: Response) => {
  try {
    const { itemName, itemPrice, runningTotal } = req.body;
    if (!itemName || typeof itemPrice !== 'number' || typeof runningTotal !== 'number') {
      return res.status(400).json({ error: 'itemName, itemPrice, and runningTotal are required' });
    }
    const cmds = hardwareService.getVfdItemAddedMessage(itemName, itemPrice, runningTotal);
    res.json(cmds);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/hardware/vfd/checkout', (req: Request, res: Response) => {
  try {
    const { totalPaid, paymentMode } = req.body;
    if (typeof totalPaid !== 'number') {
      return res.status(400).json({ error: 'totalPaid numeric value is required' });
    }
    const cmds = hardwareService.getVfdCheckoutMessage(totalPaid, paymentMode || 'UPI');
    res.json(cmds);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/hardware/vfd/thank-you', (req: Request, res: Response) => {
  const { changeDue } = req.body;
  const cmds = hardwareService.getVfdThankYouMessage(changeDue);
  res.json(cmds);
});

// ==========================================
// PHASE 10: PRODUCTION HARDENING & SYSTEM ROUTES
// ==========================================

// 1. System Deep Health Check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json(systemHealthService.getDeepHealthReport());
});

apiRouter.get('/system/health', (req: Request, res: Response) => {
  res.json(systemHealthService.getDeepHealthReport());
});

// 2. Rate Limiting Inspection
apiRouter.get('/system/rate-limit-status', (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const group = (req.query.group as string) || 'general';
  res.json(securityService.getRateLimitStatus(clientIp, group));
});

// 3. Database Hot Backups & Disaster Recovery
apiRouter.get('/system/backups', (req: Request, res: Response) => {
  res.json(backupService.listBackups());
});

apiRouter.post('/system/backups/create', (req: Request, res: Response) => {
  try {
    const { tag } = req.body;
    const backup = backupService.createBackup(tag || 'manual');
    res.status(201).json(backup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/system/backups/restore', (req: Request, res: Response) => {
  try {
    const { backupId } = req.body;
    if (!backupId) {
      return res.status(400).json({ error: 'backupId or filename is required for restore' });
    }
    const result = backupService.restoreBackup(backupId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/system/backups/:id', (req: Request, res: Response) => {
  const success = backupService.deleteBackup(req.params.id);
  if (!success) {
    return res.status(404).json({ error: `Backup '${req.params.id}' not found` });
  }
  res.json({ success: true, message: `Backup '${req.params.id}' deleted` });
});






// ==========================================
// Phase 11: Reelo Marketing Campaigns, RFM & Feedback Hub
// ==========================================

// 1. RFM Customer Segments
apiRouter.get('/marketing/segments', (req: Request, res: Response) => {
  const result = MarketingEngineService.calculateRfmSegments();
  res.json(result);
});

// 2. Marketing Campaigns CRUD & Broadcast
apiRouter.get('/marketing/campaigns', (req: Request, res: Response) => {
  res.json(store.getMarketingCampaigns());
});

apiRouter.post('/marketing/campaigns', (req: Request, res: Response) => {
  const { title, type, targetSegment, templateMessage, offerCode, discountPercent } = req.body;

  if (!title || !templateMessage) {
    return res.status(400).json({ error: 'Title and templateMessage are required' });
  }

  const newCampaign = {
    id: 'cmp_' + uuidv4().slice(0, 8),
    title,
    type: type || 'whatsapp',
    targetSegment: targetSegment || 'all',
    templateMessage,
    offerCode: offerCode || 'SPECIAL',
    discountPercent: Number(discountPercent) || 0,
    status: 'draft' as const,
    recipientCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    createdAt: new Date().toISOString()
  };

  const created = store.createMarketingCampaign(newCampaign);
  res.status(201).json(created);
});

apiRouter.post('/marketing/campaigns/:id/send', async (req: Request, res: Response) => {
  try {
    const result = await MarketingEngineService.broadcastCampaign(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/marketing/campaigns/:id', (req: Request, res: Response) => {
  const success = store.deleteMarketingCampaign(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json({ success: true, message: 'Campaign deleted' });
});

// 3. Customer Feedback & NPS Intelligence
apiRouter.get('/marketing/feedback', (req: Request, res: Response) => {
  const report = MarketingEngineService.getNpsSummary();
  res.json(report);
});

apiRouter.post('/marketing/feedback', (req: Request, res: Response) => {
  const { customerPhone, customerName, billId, rating, feedbackText, tags } = req.body;

  if (!customerPhone || !rating) {
    return res.status(400).json({ error: 'customerPhone and rating are required' });
  }

  const result = MarketingEngineService.submitCustomerFeedback({
    customerPhone,
    customerName,
    billId,
    rating: Number(rating),
    feedbackText,
    tags
  });

  res.status(201).json(result);
});

apiRouter.patch('/marketing/feedback/:id/resolve', (req: Request, res: Response) => {
  const { notes } = req.body;
  const updated = store.updateCustomerFeedback(req.params.id, {
    managerStatus: 'resolved',
    managerNotes: notes || 'Resolved with guest by restaurant management',
    resolvedAt: new Date().toISOString()
  });

  if (!updated) {
    return res.status(404).json({ error: 'Feedback record not found' });
  }

  res.json(updated);
});

// 4. Marketing Lifecycle Automations (Birthday, Inactivity Win-Back, Review Nudge)
apiRouter.get('/marketing/automations', (req: Request, res: Response) => {
  res.json(store.getMarketingAutomations());
});

apiRouter.put('/marketing/automations', (req: Request, res: Response) => {
  const updated = store.updateMarketingAutomations(req.body);
  res.json(updated);
});

apiRouter.post('/marketing/automations/run-daily', async (req: Request, res: Response) => {
  const result = await MarketingEngineService.runDailyAutomations();
  res.json(result);
});
