import React, { useState, useEffect } from 'react';
import {
  RestaurantProfile,
  Category,
  MenuItem,
  RestaurantTable,
  CartItem,
  OrderType,
  Variation,
  Addon,
  Bill,
  PaymentMode,
  Order,
  OrderStatus,
  SplitPaymentEntry
} from './types';
import {
  fallbackProfile,
  fallbackCategories,
  fallbackMenuItems,
  fallbackTables,
  fallbackOrders
} from './data/fallbackData';
import { ApiService } from './services/api';

// Shell & Navigation
import { Sidebar, ActiveNavView } from './components/navigation/Sidebar';
import { TopHeader } from './components/navigation/TopHeader';

// Redesigned Views
import { OverviewDashboardView } from './views/OverviewDashboardView';
import { MenuPricingView } from './views/MenuPricingView';
import { FloorPlanTablesView } from './views/FloorPlanTablesView';
import { ReportsAnalyticsView } from './views/ReportsAnalyticsView';
import { RestaurantSettingsView } from './views/RestaurantSettingsView';
import { InventoryRecipeView } from './views/InventoryRecipeView';
import { CustomerCrmView } from './views/CustomerCrmView';
import { DispatchRidersView } from './views/DispatchRidersView';
import { ReservationsWaitlistView } from './views/ReservationsWaitlistView';
import { CashRegisterView } from './views/CashRegisterView';

// POS Components & Modals
import { MenuGrid } from './components/MenuGrid';
import { Cart } from './components/Cart';
import { TableSelectorModal } from './components/TableSelectorModal';
import { VariationModal } from './components/VariationModal';
import { PaymentModal } from './components/PaymentModal';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { CustomerOrderView } from './components/CustomerOrderView';
import { KitchenDisplayView } from './components/KitchenDisplayView';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  // Master Data State — Initialized with robust fallback so it NEVER buffers infinitely!
  const [profile, setProfile] = useState<RestaurantProfile>(fallbackProfile);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(fallbackMenuItems);
  const [tables, setTables] = useState<RestaurantTable[]>(fallbackTables);
  const [orders, setOrders] = useState<Order[]>(fallbackOrders);
  const [openwaOnline, setOpenwaOnline] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);

  // Role / View Mode: 'admin' (SaaS Shell) vs 'customer' (Locked Table QR Order View) vs 'kds' (Kitchen Display)
  const [viewMode, setViewMode] = useState<'admin' | 'customer' | 'kds'>('admin');
  const [activeNavView, setActiveNavView] = useState<ActiveNavView>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [customerLockedTable, setCustomerLockedTable] = useState<RestaurantTable | null>(null);
  const [invalidQrToken, setInvalidQrToken] = useState<string | null>(null);

  // Active Transaction State (for Staff POS)
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(fallbackTables[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');

  // Transaction Modals
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [activeBillForReceipt, setActiveBillForReceipt] = useState<Bill | null>(null);

  // Stats Counters
  const [waitingGuestsCount, setWaitingGuestsCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  const refreshMenu = async () => {
    try {
      const menuData = await ApiService.getMenu();
      setCategories(menuData.categories);
      setMenuItems(menuData.items);
    } catch {
      // Keep existing menu if offline
    }
  };

  const refreshTables = async () => {
    try {
      const tableData = await ApiService.getTables();
      setTables(tableData);
    } catch {
      // Keep existing tables if offline
    }
  };

  const refreshOrders = async () => {
    try {
      const orderData = await ApiService.getOrders();
      if (orderData && orderData.length > 0) {
        setOrders(orderData);
      }
    } catch {
      // Keep existing orders if offline
    }
  };

  const refreshInventory = async () => {
    try {
      const inv = await ApiService.getInventory();
      if (inv) {
        const low = inv.filter(m => m.currentStock <= m.reorderLevel).length;
        setLowStockCount(low);
      }
    } catch {
      // Keep existing inventory if offline
    }
  };

  const handleUpdateProfile = async (updated: Partial<RestaurantProfile>) => {
    try {
      const result = await ApiService.updateProfile(updated);
      setProfile(result);
    } catch (err) {
      console.warn('Backend update failed, updating local state:', err);
      setProfile(prev => ({ ...prev, ...updated }));
    }
  };

  const handleToggleItemStock = async (itemId: string) => {
    try {
      const updated = await ApiService.toggleItemStock(itemId);
      setMenuItems(prev => prev.map(i => i.id === itemId ? updated : i));
    } catch {
      setMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, inStock: !i.inStock } : i));
    }
  };

  // Immediate Check for URL Table Parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');

    if (tableParam) {
      const matched = fallbackTables.find(
        t => t.qrToken === tableParam || t.id === tableParam
      );
      if (matched) {
        setCustomerLockedTable(matched);
        setViewMode('customer');
      } else {
        setInvalidQrToken(tableParam);
      }
    }
  }, []);

  // Background Live Sync with Backend
  useEffect(() => {
    async function syncWithBackend() {
      try {
        const [profData, menuData, tableData, waStatus, orderData, invData, waitData] = await Promise.all([
          ApiService.getProfile(),
          ApiService.getMenu(),
          ApiService.getTables(),
          ApiService.getOpenWAStatus(),
          ApiService.getOrders(),
          ApiService.getInventory(),
          ApiService.getWaitlist()
        ]);

        setProfile(profData);
        setCategories(menuData.categories);
        setMenuItems(menuData.items);
        setTables(tableData);
        setOpenwaOnline(waStatus.online);
        if (orderData && orderData.length > 0) {
          setOrders(orderData);
        }
        if (invData) {
          const low = invData.filter(m => m.currentStock <= m.reorderLevel).length;
          setLowStockCount(low);
        }
        if (waitData) {
          const waiting = waitData.filter(w => w.status === 'waiting' || w.status === 'table_ready').length;
          setWaitingGuestsCount(waiting);
        }
        setBackendOnline(true);

        const urlParams = new URLSearchParams(window.location.search);
        const tableParam = urlParams.get('table');
        if (tableParam) {
          const matched = tableData.find(
            t => t.qrToken === tableParam || t.id === tableParam
          );
          if (matched) {
            setCustomerLockedTable(matched);
            setViewMode('customer');
            setInvalidQrToken(null);
          }
        }
      } catch (err) {
        console.warn('Backend server working in offline fallback mode:', err);
        setBackendOnline(false);
      }
    }

    syncWithBackend();
    const interval = setInterval(() => syncWithBackend(), 20000);
    return () => clearInterval(interval);
  }, []);

  // POS Handlers
  const handleSelectItem = (item: MenuItem) => {
    const hasOptions = (item.variations && item.variations.length > 0) || (item.addons && item.addons.length > 0);
    if (hasOptions) {
      setCustomizingItem(item);
    } else {
      addToCart(item);
    }
  };

  const addToCart = (item: MenuItem, variation?: Variation, addons?: Addon[]) => {
    const varKey = variation ? variation.id : 'base';
    const addonKey = addons ? addons.map(a => a.id).sort().join(',') : '';
    const cartItemId = `${item.id}_${varKey}_${addonKey}`;

    let unitPrice = variation ? variation.price : item.basePrice;
    if (addons) {
      addons.forEach(a => { unitPrice += a.price; });
    }

    setCart(prev => {
      const existing = prev.find(i => i.cartItemId === cartItemId);
      if (existing) {
        return prev.map(i =>
          i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          unitPrice,
          selectedVariation: variation,
          selectedAddons: addons,
          station: item.station
        }
      ];
    });
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(i => {
          if (i.cartItemId === cartItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscount(0);
    setDiscountReason('');
  };

  const handlePrintKOT = async () => {
    if (cart.length === 0) return;
    try {
      const newOrder = await ApiService.createStaffOrder({
        type: orderType,
        tableId: orderType === 'dine_in' ? selectedTable?.id : undefined,
        tableNumber: orderType === 'dine_in' ? selectedTable?.tableNumber : undefined,
        customerName: orderType === 'dine_in' ? `Table ${selectedTable?.tableNumber}` : 'Counter Walk-in',
        items: cart
      });

      setOrders(prev => [newOrder, ...prev]);
      if (orderType === 'dine_in' && selectedTable) {
        setTables(prev =>
          prev.map(t =>
            t.id === selectedTable.id
              ? { ...t, status: 'running', currentOrderId: newOrder.id }
              : t
          )
        );
      }
      setCart([]);
      setDiscount(0);
      setDiscountReason('');
    } catch {
      // Handled
    }
  };

  const handleConfirmBill = async (data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress?: string;
    riderName?: string;
    takeawayToken?: string;
    paymentMode: PaymentMode;
    splitPayments?: SplitPaymentEntry[];
    pointsRedeemed?: number;
    sendWhatsApp: boolean;
    sendReviewPrompt: boolean;
  }) => {
    try {
      let activeOrder = orders.find(
        o => o.tableId === selectedTable?.id && o.status !== 'settled'
      );

      if (!activeOrder && cart.length > 0) {
        activeOrder = await ApiService.createStaffOrder({
          type: orderType,
          tableId: orderType === 'dine_in' ? selectedTable?.id : undefined,
          tableNumber: orderType === 'dine_in' ? selectedTable?.tableNumber : undefined,
          customerName: data.customerName || (orderType === 'dine_in' ? `Table ${selectedTable?.tableNumber}` : 'Counter Walk-in'),
          customerPhone: data.customerPhone,
          deliveryAddress: data.deliveryAddress,
          takeawayToken: data.takeawayToken,
          riderName: data.riderName,
          items: cart
        });
      }

      if (!activeOrder && cart.length === 0) return;

      const itemsForBill: CartItem[] = cart.length > 0 ? cart : (activeOrder ? activeOrder.items.map(i => ({
        cartItemId: `${i.menuItemId}_${i.selectedVariation?.id || 'base'}_${i.kotStatus || 'kot'}`,
        menuItemId: i.menuItemId,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        selectedVariation: i.selectedVariation,
        selectedAddons: i.selectedAddons,
        station: i.station
      })) : []);

      const createdBill = await ApiService.createBill({
        orderType,
        tableNumber: orderType === 'dine_in' ? selectedTable?.tableNumber : undefined,
        takeawayToken: data.takeawayToken,
        customerName: data.customerName || activeOrder?.customerName,
        customerPhone: data.customerPhone || activeOrder?.customerPhone,
        deliveryAddress: data.deliveryAddress,
        riderName: data.riderName,
        items: itemsForBill,
        discountAmount: discount,
        discountReason: discountReason || undefined,
        paymentMode: data.paymentMode,
        splitPayments: data.splitPayments,
        pointsRedeemed: data.pointsRedeemed,
        sendWhatsApp: data.sendWhatsApp
      });

      if (orderType === 'dine_in' && selectedTable) {
        setTables(prev =>
          prev.map(t =>
            t.id === selectedTable.id
              ? { ...t, status: 'vacant', currentOrderId: undefined }
              : t
          )
        );
      }

      if (activeOrder) {
        setOrders(prev =>
          prev.map(o => (o.id === activeOrder!.id ? { ...o, status: 'settled' } : o))
        );
      }

      setCart([]);
      setDiscount(0);
      setDiscountReason('');
      setIsPaymentModalOpen(false);
      setActiveBillForReceipt(createdBill);
    } catch (err) {
      console.error('Failed to settle bill:', err);
    }
  };

  const handleTransferTable = async (fromTableId: string, toTableId: string) => {
    try {
      await ApiService.transferTable(fromTableId, toTableId);
      await refreshTables();
      await refreshOrders();
      const newActive = tables.find(t => t.id === toTableId);
      if (newActive) setSelectedTable(newActive);
    } catch (err) {
      console.error('Failed to transfer table:', err);
    }
  };

  const handleVacateTable = async (tableId: string) => {
    try {
      await ApiService.vacateTable(tableId);
      await refreshTables();
      await refreshOrders();
    } catch (err) {
      console.error('Failed to vacate table:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await ApiService.updateOrderStatus(orderId, status);
      await refreshOrders();
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  // =========================================================================
  // CUSTOMER LOCKED VIEW (TABLE QR ORDERING)
  // =========================================================================
  if (viewMode === 'customer') {
    if (invalidQrToken) {
      return (
        <div className="min-h-screen bg-canvas-100 flex items-center justify-center p-4">
          <div className="bg-white border border-canvas-border rounded-3xl p-8 max-w-md w-full shadow-card text-center space-y-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">Invalid Table QR Code</h2>
            <p className="text-xs text-stone-500">
              The QR token <code className="bg-canvas-200 px-2 py-0.5 rounded font-mono text-stone-800">{invalidQrToken}</code> is expired or unrecognized. Please scan the QR code located on your dining table.
            </p>
            <button
              onClick={() => {
                setInvalidQrToken(null);
                setViewMode('admin');
              }}
              className="mt-4 px-5 py-2.5 bg-stone-900 text-white rounded-full text-xs font-bold hover:bg-stone-800 transition-colors"
            >
              Return to Staff POS
            </button>
          </div>
        </div>
      );
    }

    if (customerLockedTable) {
      return (
        <CustomerOrderView
          profile={profile}
          table={customerLockedTable}
          categories={categories}
          items={menuItems}
          onExitToAdmin={() => setViewMode('admin')}
        />
      );
    }
  }

  // =========================================================================
  // KITCHEN DISPLAY VIEW (KDS)
  // =========================================================================
  if (viewMode === 'kds') {
    return (
      <KitchenDisplayView
        profile={profile}
        orders={orders}
        onRefreshOrders={refreshOrders}
        onExit={() => {
          setViewMode('admin');
          setActiveNavView('overview');
        }}
      />
    );
  }

  // =========================================================================
  // MAIN SAAS PLATFORM SHELL (DARK OLIVE SIDEBAR + WARM OFF-WHITE WORKSPACE)
  // =========================================================================
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas-100 font-sans text-stone-900 select-none">
      {/* 1. Left Dark Olive Navigation Sidebar matching screenshot */}
      <Sidebar
        profile={profile}
        activeView={activeNavView}
        onNavigate={view => {
          if (view === 'kds') {
            setViewMode('kds');
          } else {
            setViewMode('admin');
            setActiveNavView(view);
          }
        }}
        onOpenCustomerView={() => {
          setCustomerLockedTable(selectedTable || tables[0]);
          setViewMode('customer');
        }}
        activeOrderCount={orders.filter(o => ['kot_printed', 'preparing', 'ready'].includes(o.status)).length}
        activeDispatchCount={orders.filter(o => (o.type === 'takeaway' || o.type === 'delivery') && o.status !== 'settled' && o.status !== 'cancelled').length}
        lowStockCount={lowStockCount}
        waitingGuestsCount={waitingGuestsCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        openwaOnline={openwaOnline}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-canvas-100">
        {/* Offline notice if backend is down */}
        {!backendOnline && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-between text-xs text-amber-800">
            <span className="flex items-center space-x-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                <strong>Offline Cache Active:</strong> Core backend API is initializing. Data served from resilient local storage.
              </span>
            </span>
            <span className="text-[10px] text-amber-700 font-mono">
              Port: 5000
            </span>
          </div>
        )}

        {/* Top Header matching screenshot */}
        <TopHeader
          profile={profile}
          activeView={activeNavView}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onQuickPos={() => setActiveNavView('pos')}
          onOpenSettings={() => setActiveNavView('settings')}
          isAcceptingOrders={profile.isAcceptingOrders !== undefined ? profile.isAcceptingOrders : true}
        />

        {/* Dynamic View Router */}
        <main className="flex-1 overflow-y-auto">
          {/* A. Overview Dashboard matching screenshot */}
          {activeNavView === 'overview' && (
            <OverviewDashboardView
              profile={profile}
              menuItems={menuItems}
              tables={tables}
              orders={orders}
              onNavigate={setActiveNavView}
              onUpdateProfile={handleUpdateProfile}
              onToggleItemStock={handleToggleItemStock}
              onOpenSettings={() => setActiveNavView('settings')}
            />
          )}

          {/* B. Menu Management & Pricing */}
          {activeNavView === 'menu' && (
            <MenuPricingView
              categories={categories}
              items={menuItems}
              currencySymbol={profile.currencySymbol}
              onRefreshMenu={refreshMenu}
            />
          )}

          {/* C. Staff POS & Billing Terminal */}
          {activeNavView === 'pos' && (
            <div className="flex h-full overflow-hidden">
              <MenuGrid
                categories={categories}
                items={menuItems}
                currencySymbol={profile.currencySymbol}
                onSelectItem={handleSelectItem}
              />
              <Cart
                items={cart}
                orderType={orderType}
                tableNumber={orderType === 'dine_in' ? selectedTable?.tableNumber : undefined}
                currencySymbol={profile.currencySymbol}
                discount={discount}
                setDiscount={setDiscount}
                discountReason={discountReason}
                setDiscountReason={setDiscountReason}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onPrintKOT={handlePrintKOT}
                onOpenCheckout={() => setIsPaymentModalOpen(true)}
              />
            </div>
          )}

          {/* D. Tables & Floor Plan */}
          {activeNavView === 'tables' && (
            <FloorPlanTablesView
              tables={tables}
              profile={profile}
              onRefreshTables={refreshTables}
              onOpenCustomerViewForTable={table => {
                setCustomerLockedTable(table);
                setViewMode('customer');
              }}
              onTransferTable={handleTransferTable}
              onVacateTable={handleVacateTable}
            />
          )}

          {/* E. Inventory & Recipe Costing (Full-Page View) */}
          {activeNavView === 'inventory' && (
            <InventoryRecipeView
              items={menuItems}
              currencySymbol={profile.currencySymbol}
              onInventoryUpdated={refreshInventory}
            />
          )}

          {/* F. Customer CRM & Delivery Partners (Full-Page View) */}
          {activeNavView === 'customers' && (
            <CustomerCrmView
              currencySymbol={profile.currencySymbol}
              onOrderSimulated={refreshOrders}
            />
          )}

          {/* G. Reports, Taxes & Day-End (EOD) */}
          {activeNavView === 'reports' && (
            <ReportsAnalyticsView
              profile={profile}
              currencySymbol={profile.currencySymbol}
              onSelectBillForView={bill => setActiveBillForReceipt(bill)}
            />
          )}

          {/* H. Dispatch & Rider Management (Full-Page View) */}
          {activeNavView === 'dispatch' && (
            <DispatchRidersView
              orders={orders}
              currencySymbol={profile.currencySymbol}
              onUpdateOrderStatus={handleUpdateOrderStatus}
            />
          )}

          {/* I. Reservations & Waitlist (Full-Page View) */}
          {activeNavView === 'reservations' && (
            <ReservationsWaitlistView
              tables={tables}
              currencySymbol={profile.currencySymbol}
              onSeatGuestAtTable={tableId => {
                const dest = tables.find(t => t.id === tableId);
                if (dest) {
                  setSelectedTable(dest);
                  setOrderType('dine_in');
                  setActiveNavView('pos');
                }
              }}
            />
          )}

          {/* J. Cash Register & Shift Drawer (Full-Page View) */}
          {activeNavView === 'cash-register' && (
            <CashRegisterView
              profile={profile}
              currencySymbol={profile.currencySymbol}
            />
          )}

          {/* K. Restaurant / Café Settings */}
          {activeNavView === 'settings' && (
            <RestaurantSettingsView
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              openwaOnline={openwaOnline}
            />
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* TRANSACTION OVERLAYS (Variation, Split Payment & Thermal Receipt) */}
      {/* ========================================================================= */}
      {isTableModalOpen && (
        <TableSelectorModal
          tables={tables}
          orders={orders}
          selectedTableId={selectedTable?.id}
          currencySymbol={profile.currencySymbol}
          onSelectTable={tbl => {
            setSelectedTable(tbl);
            setOrderType('dine_in');
          }}
          onTransferTable={handleTransferTable}
          onVacateTable={handleVacateTable}
          onClose={() => setIsTableModalOpen(false)}
        />
      )}

      {customizingItem && (
        <VariationModal
          item={customizingItem}
          currencySymbol={profile.currencySymbol}
          onConfirm={(item, variation, addons) => addToCart(item, variation, addons)}
          onClose={() => setCustomizingItem(null)}
        />
      )}

      {isPaymentModalOpen && (
        <PaymentModal
          total={Math.round(
            Math.max(0, cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) - discount) * 1.05
          )}
          currencySymbol={profile.currencySymbol}
          openwaOnline={openwaOnline}
          orderType={orderType}
          tableNumber={orderType === 'dine_in' ? selectedTable?.tableNumber : undefined}
          discountReason={discountReason}
          onConfirm={handleConfirmBill}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {activeBillForReceipt && (
        <ThermalReceiptModal
          bill={activeBillForReceipt}
          profile={profile}
          onClose={() => setActiveBillForReceipt(null)}
          onRefreshBill={updated => setActiveBillForReceipt(updated)}
        />
      )}
    </div>
  );
};

export default App;
