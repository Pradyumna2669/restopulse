import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { store } from '../data/store';
import { OpenWAService } from '../services/openwa.service';
import { Order, Bill, OrderItem, DeliveryPartner } from '../types';

export const apiRouter = Router();

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
  const profile = store.getProfile();
  const { apiUrl, sessionId, apiKey } = profile.openwaConfig;

  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers['X-Api-Key'] = apiKey;

    const resp = await axios.get(`${apiUrl}/api/sessions/${sessionId}`, {
      headers,
      timeout: 3000
    });

    res.json({
      online: true,
      apiUrl,
      sessionId,
      sessionData: resp.data
    });
  } catch (err: any) {
    res.json({
      online: false,
      apiUrl,
      sessionId,
      error: err.code === 'ECONNREFUSED' 
        ? `OpenWA service is offline at ${apiUrl}. Make sure OpenWA is running.` 
        : (err.message || 'Error communicating with OpenWA')
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


  if (customerPhone && sendWhatsApp) {
    OpenWAService.dispatchInvoice(createdBill.id).catch(err => {
      console.error('[OpenWA] Async dispatch error:', err);
    });
  }

  res.status(201).json(createdBill);
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

// Live Inbound Webhook for delivery partners (Zomato / Swiggy Webhook receiver)
apiRouter.post('/webhooks/aggregators/:partner', (req: Request, res: Response) => {
  const partner = req.params.partner as DeliveryPartner;
  console.log(`[Aggregator Webhook] Inbound order payload from ${partner.toUpperCase()}:`, req.body);
  const order = store.simulatePartnerOrder(partner, req.body);
  res.status(200).json({
    status: 'acknowledged',
    orderId: order.partnerOrderId,
    restaurantOrderId: order.id,
    timestamp: new Date().toISOString()
  });
});

apiRouter.patch('/orders/:id/partner-status', (req: Request, res: Response) => {
  const { partnerStatus, riderStatus } = req.body;
  const order = store.updatePartnerOrderStatus(req.params.id, partnerStatus, riderStatus);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

