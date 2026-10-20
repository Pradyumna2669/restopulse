import React, { useState, useEffect } from 'react';
import {
  RestaurantProfile,
  RestaurantTable,
  MenuItem,
  Category,
  Order,
  CourseType,
  CourseStatus,
  WaiterCallRequest,
  CartItem
} from '../types';
import { ApiService } from '../services/api';
import {
  Smartphone,
  Bell,
  UtensilsCrossed,
  Flame,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  AlertTriangle,
  Play
} from 'lucide-react';

interface WaiterCompanionViewProps {
  profile: RestaurantProfile;
  tables: RestaurantTable[];
  categories: Category[];
  menuItems: MenuItem[];
  currencySymbol: string;
  onRefreshTables: () => void;
  onRefreshOrders: () => void;
  activeStaffName?: string;
}

export const WaiterCompanionView: React.FC<WaiterCompanionViewProps> = ({
  profile: _profile,
  tables,
  categories,
  menuItems,
  currencySymbol,
  onRefreshTables,
  onRefreshOrders,
  activeStaffName = 'Vikram (Waiter)'
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'order-pad' | 'kds-tracking'>('tables');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(tables[0] || null);
  const [tableFilterSection, setTableFilterSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [waiterCalls, setWaiterCalls] = useState<WaiterCallRequest[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  // Table-side order pad state
  const [seatNumber, setSeatNumber] = useState<string>('1');
  const [currentCourse, setCurrentCourse] = useState<CourseType>('appetizer');
  const [holdCourse, setHoldCourse] = useState<boolean>(false);
  const [padCart, setPadCart] = useState<
    Array<{
      cartItemId: string;
      item: MenuItem;
      quantity: number;
      seatNumber: string;
      course: CourseType;
      courseStatus: CourseStatus;
      specialNotes: string;
    }>
  >([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Poll waiter calls and active orders
  const refreshAuxiliary = async () => {
    try {
      const [calls, freshOrders] = await Promise.all([
        ApiService.getWaiterCalls().catch(() => []),
        ApiService.getOrders().catch(() => [])
      ]);
      setWaiterCalls(calls);
      setActiveOrders(freshOrders);
    } catch {}
  };

  useEffect(() => {
    refreshAuxiliary();
    const interval = setInterval(refreshAuxiliary, 5000);
    return () => clearInterval(interval);
  }, []);

  const sections = ['all', ...Array.from(new Set(tables.map(t => t.section)))];
  const pendingCalls = waiterCalls.filter(c => c.status === 'pending');

  const filteredTables = tables.filter(t => {
    if (tableFilterSection !== 'all' && t.section !== tableFilterSection) return false;
    return true;
  });

  const filteredMenu = menuItems.filter(item => {
    if (!item.inStock) return false;
    if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleResolveCall = async (callId: string) => {
    try {
      await ApiService.resolveWaiterCall(callId, activeStaffName);
      setWaiterCalls(prev => prev.map(c => (c.id === callId ? { ...c, status: 'resolved' as const } : c)));
    } catch {}
  };

  const handleAddToCart = (item: MenuItem) => {
    const existingIndex = padCart.findIndex(
      p => p.item.id === item.id && p.seatNumber === seatNumber && p.course === currentCourse
    );

    if (existingIndex >= 0) {
      setPadCart(prev =>
        prev.map((p, idx) => (idx === existingIndex ? { ...p, quantity: p.quantity + 1 } : p))
      );
    } else {
      setPadCart(prev => [
        ...prev,
        {
          cartItemId: `pad_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          item,
          quantity: 1,
          seatNumber,
          course: currentCourse,
          courseStatus: holdCourse ? 'hold' : 'fired',
          specialNotes: ''
        }
      ]);
    }
  };

  const handleUpdateQty = (cartItemId: string, delta: number) => {
    setPadCart(prev =>
      prev
        .map(p => {
          if (p.cartItemId !== cartItemId) return p;
          const newQty = p.quantity + delta;
          return newQty > 0 ? { ...p, quantity: newQty } : null;
        })
        .filter(Boolean) as any
    );
  };

  const handleToggleHold = (cartItemId: string) => {
    setPadCart(prev =>
      prev.map(p =>
        p.cartItemId === cartItemId
          ? { ...p, courseStatus: p.courseStatus === 'hold' ? 'fired' : 'hold' }
          : p
      )
    );
  };

  const handleFireCourse = async (orderId: string, course: CourseType) => {
    try {
      await ApiService.fireCourse(orderId, course, activeStaffName);
      refreshAuxiliary();
      onRefreshOrders();
      setFeedbackMsg({ type: 'success', text: `Course "${course.toUpperCase()}" fired to kitchen!` });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to fire course' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleFireItem = async (orderId: string, itemId: string) => {
    try {
      await ApiService.fireOrderItem(orderId, itemId, activeStaffName);
      refreshAuxiliary();
      onRefreshOrders();
      setFeedbackMsg({ type: 'success', text: 'Item fired to kitchen station!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to fire item' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleSendKotToKitchen = async () => {
    if (!selectedTable) {
      setFeedbackMsg({ type: 'error', text: 'Please select a dining table first' });
      return;
    }
    if (padCart.length === 0) {
      setFeedbackMsg({ type: 'error', text: 'Order pad is empty. Add items first' });
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const cartPayload: CartItem[] = padCart.map(p => ({
        cartItemId: p.cartItemId,
        menuItemId: p.item.id,
        name: p.item.name,
        quantity: p.quantity,
        unitPrice: p.item.basePrice,
        station: p.item.station,
        specialNotes: p.specialNotes || undefined
      }));

      // Create staff order with course and seat tags
      const created = await ApiService.createStaffOrder({
        type: 'dine_in',
        tableId: selectedTable.id,
        tableNumber: selectedTable.tableNumber,
        customerName: `Table ${selectedTable.tableNumber} Guest`,
        items: cartPayload,
        specialNotes: `Punched via Waiter Companion by ${activeStaffName}`
      });

      // Update table to running
      await ApiService.updateTable(selectedTable.id, {
        status: 'running',
        currentOrderId: created.id
      });

      setPadCart([]);
      onRefreshTables();
      onRefreshOrders();
      refreshAuxiliary();
      setFeedbackMsg({
        type: 'success',
        text: `KOT #${created.orderNumber} dispatched to kitchen for Table ${selectedTable.tableNumber}!`
      });
      setTimeout(() => setFeedbackMsg(null), 4500);
      setActiveTab('kds-tracking');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to punch order' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const padSubtotal = padCart.reduce((sum, p) => sum + p.item.basePrice * p.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-canvas-100 font-sans text-stone-900 select-none overflow-y-auto">
      {/* Top Companion Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-olive-900 text-stone-100 flex items-center justify-center shadow-sm">
            <Smartphone className="w-5 h-5 text-terracotta-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-stone-900">Waiter Companion</h1>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Table-Side POS</span>
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Active Server: <strong className="text-stone-700">{activeStaffName}</strong> • Fast Course Sequencing & Table Assist
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'tables'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-stone-500" />
            <span>Tables ({tables.length})</span>
            {pendingCalls.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                {pendingCalls.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('order-pad')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'order-pad'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-stone-500" />
            <span>Order Pad</span>
            {padCart.length > 0 && (
              <span className="bg-terracotta-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {padCart.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('kds-tracking')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'kds-tracking'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Live Courses & KDS</span>
          </button>
        </div>
      </header>

      {/* Floating Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`mx-6 mt-4 p-3 rounded-xl border text-xs font-bold flex items-center space-x-2 transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Pending Waiter Calls Alert Ribbon */}
      {pendingCalls.length > 0 && (
        <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center animate-bounce">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">
                {pendingCalls.length} Table Service Request{pendingCalls.length > 1 ? 's' : ''} Pending
              </p>
              <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
                {pendingCalls.map(c => (
                  <span
                    key={c.id}
                    className="bg-white border border-amber-300 px-2.5 py-1 rounded-lg text-[11px] font-medium text-stone-800 flex items-center space-x-2 shadow-xs"
                  >
                    <span>
                      Table <strong>{c.tableNumber}</strong>: <span className="capitalize">{c.type}</span>
                    </span>
                    <button
                      onClick={() => handleResolveCall(c.id)}
                      className="text-emerald-700 hover:text-emerald-800 font-bold ml-1 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]"
                    >
                      ✓ Attend
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW BODY */}
      <div className="p-6 flex-1">
        {/* TAB 1: TABLES GRID */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            {/* Section Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1">
              {sections.map(sec => (
                <button
                  key={sec}
                  onClick={() => setTableFilterSection(sec)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap ${
                    tableFilterSection === sec
                      ? 'bg-olive-900 text-white shadow-sm'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {sec === 'all' ? 'All Sections' : sec}
                </button>
              ))}
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredTables.map(t => {
                const isSelected = selectedTable?.id === t.id;
                const hasPendingCall = pendingCalls.some(c => c.tableId === t.id || c.tableNumber === t.tableNumber);

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTable(t)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative bg-white flex flex-col justify-between min-h-[140px] shadow-xs hover:shadow-md ${
                      isSelected
                        ? 'border-terracotta-500 ring-2 ring-terracotta-500/30'
                        : t.status === 'running'
                        ? 'border-amber-300 bg-amber-50/20'
                        : t.status === 'billed'
                        ? 'border-blue-300 bg-blue-50/20'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {hasPendingCall && (
                      <span className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full shadow animate-bounce">
                        <Bell className="w-3 h-3" />
                      </span>
                    )}

                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-base font-black text-stone-900 font-mono">{t.tableNumber}</span>
                        <p className="text-[11px] text-stone-500">{t.section}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          t.status === 'running'
                            ? 'bg-amber-100 text-amber-800'
                            : t.status === 'billed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="text-stone-400 text-[11px]">Cap: {t.capacity}p</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTable(t);
                          setActiveTab('order-pad');
                        }}
                        className="px-2 py-1 rounded-lg bg-terracotta-50 text-terracotta-700 hover:bg-terracotta-100 text-[11px] font-bold transition-colors"
                      >
                        + Order
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: TABLE-SIDE ORDER PAD */}
        {activeTab === 'order-pad' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Menu & Course Controls */}
            <div className="lg:col-span-2 space-y-4">
              {/* Selected Table & Seat / Course Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-stone-500">Selected Table:</span>
                    <select
                      value={selectedTable?.id || ''}
                      onChange={e => {
                        const tbl = tables.find(t => t.id === e.target.value);
                        if (tbl) setSelectedTable(tbl);
                      }}
                      className="text-sm font-bold bg-stone-100 border border-stone-300 rounded-xl px-2.5 py-1 text-stone-800"
                    >
                      {tables.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.tableNumber} ({t.section}) - {t.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Seat Selection */}
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="text-stone-500 font-medium">Seat:</span>
                    {['1', '2', '3', '4', 'Shared'].map(seat => (
                      <button
                        key={seat}
                        onClick={() => setSeatNumber(seat)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs ${
                          seatNumber === seat
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {seat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Course Selection & Hold Toggle */}
                <div className="flex items-center justify-between border-t border-stone-100 pt-3 flex-wrap gap-2">
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="text-stone-500 font-medium mr-1">Course:</span>
                    {(['appetizer', 'main', 'dessert', 'beverage'] as CourseType[]).map(c => (
                      <button
                        key={c}
                        onClick={() => setCurrentCourse(c)}
                        className={`px-3 py-1 rounded-xl font-bold capitalize transition-all text-xs ${
                          currentCourse === c
                            ? 'bg-terracotta-500 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  {/* Course Hold Checkbox */}
                  <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-stone-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                    <input
                      type="checkbox"
                      checked={holdCourse}
                      onChange={e => setHoldCourse(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Hold in Kitchen until fired</span>
                  </label>
                </div>
              </div>

              {/* Menu Filter & Search */}
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search dishes, drinks, appetizers..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-stone-200 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-stone-400"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategory === 'all'
                        ? 'bg-stone-800 text-white'
                        : 'bg-white text-stone-600 border border-stone-200'
                    }`}
                  >
                    All
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        selectedCategory === cat.id
                          ? 'bg-stone-800 text-white'
                          : 'bg-white text-stone-600 border border-stone-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Item Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredMenu.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className="bg-white border border-stone-200 p-3 rounded-2xl flex flex-col justify-between hover:border-terracotta-400 transition-all cursor-pointer shadow-xs hover:shadow"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-stone-900 text-xs leading-snug">{item.name}</span>
                        <span className="text-[10px] text-stone-400 uppercase font-bold shrink-0 ml-1">
                          {item.station}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-stone-800">
                        {currencySymbol}{item.basePrice}
                      </span>
                      <button className="p-1 rounded-lg bg-terracotta-50 text-terracotta-700 hover:bg-terracotta-100 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Active Order Pad Slip */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between min-h-[500px]">
              <div>
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div>
                    <h2 className="font-bold text-sm text-stone-900">
                      Table {selectedTable ? selectedTable.tableNumber : '—'} Order Pad
                    </h2>
                    <p className="text-[11px] text-stone-500">{selectedTable?.section}</p>
                  </div>
                  {padCart.length > 0 && (
                    <button
                      onClick={() => setPadCart([])}
                      className="text-stone-400 hover:text-rose-600 text-xs flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Cart Items List */}
                {padCart.length === 0 ? (
                  <div className="py-16 text-center text-stone-400 space-y-2">
                    <UtensilsCrossed className="w-8 h-8 mx-auto text-stone-300" />
                    <p className="text-xs">No items punched on pad</p>
                    <p className="text-[11px] text-stone-400">Tap items on the left to add them table-side</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 mt-3 max-h-[380px] overflow-y-auto space-y-2">
                    {padCart.map(item => (
                      <div key={item.cartItemId} className="pt-2 first:pt-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-2">
                            <span className="font-bold text-xs text-stone-800">{item.item.name}</span>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold border border-blue-200">
                                Seat {item.seatNumber}
                              </span>
                              <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded capitalize font-medium">
                                {item.course}
                              </span>
                              <button
                                onClick={() => handleToggleHold(item.cartItemId)}
                                className={`text-[10px] px-1.5 py-0.2 rounded font-bold transition-colors ${
                                  item.courseStatus === 'hold'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {item.courseStatus === 'hold' ? 'HOLD' : 'FIRE'}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleUpdateQty(item.cartItemId, -1)}
                              className="p-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold text-xs w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQty(item.cartItemId, 1)}
                              className="p-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[11px] text-stone-500">
                          <span>{currencySymbol}{item.item.basePrice} each</span>
                          <span className="font-mono font-bold text-stone-800">
                            {currencySymbol}{item.item.basePrice * item.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Pad Footer & Send KOT */}
              <div className="border-t border-stone-200 pt-3 mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-stone-600">
                  <span>Subtotal ({padCart.reduce((sum, p) => sum + p.quantity, 0)} items):</span>
                  <span className="font-mono font-bold text-sm text-stone-900">
                    {currencySymbol}{padSubtotal.toFixed(2)}
                  </span>
                </div>

                <button
                  disabled={padCart.length === 0 || isSubmittingOrder}
                  onClick={handleSendKotToKitchen}
                  className="w-full py-3 bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingOrder ? 'Dispatching to Kitchen...' : 'Send KOT to Kitchen'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE COURSES & KDS TRACKING */}
        {activeTab === 'kds-tracking' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">Active Dining Table Orders</h2>
                <p className="text-xs text-stone-500">Fire on-hold courses and track station prep status table-side</p>
              </div>
              <button
                onClick={() => {
                  refreshAuxiliary();
                  onRefreshOrders();
                }}
                className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 hover:text-stone-900 text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Refresh Tickets
              </button>
            </div>

            {/* Orders with Courses */}
            {activeOrders.filter(o => o.type === 'dine_in' && ['kot_printed', 'preparing', 'ready'].includes(o.status)).length === 0 ? (
              <div className="py-20 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
                <UtensilsCrossed className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                <h3 className="text-sm font-bold text-stone-600">No Active Dining Room Tickets</h3>
                <p className="text-xs text-stone-400 mt-1">Punch a table order using the Order Pad to begin course tracking</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders
                  .filter(o => o.type === 'dine_in' && ['kot_printed', 'preparing', 'ready'].includes(o.status))
                  .map(order => {
                    const heldItems = order.items.filter(i => i.courseStatus === 'hold');

                    return (
                      <div
                        key={order.id}
                        className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-black text-stone-900 font-mono text-sm">{order.orderNumber}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-olive-100 text-olive-900">
                                  Table {order.tableNumber || 'N/A'}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-400 mt-0.5">
                                Placed {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                order.status === 'ready'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          {/* Quick Course Fire Action Strip */}
                          {heldItems.length > 0 && (
                            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                              <span className="text-[11px] font-bold text-amber-900 flex items-center space-x-1">
                                <Flame className="w-3.5 h-3.5 text-orange-500" />
                                <span>Courses on Hold ({heldItems.length} items):</span>
                              </span>
                              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                                {(['appetizer', 'main', 'dessert', 'beverage'] as CourseType[]).map(c => {
                                  const hasHeld = heldItems.some(i => i.course === c);
                                  if (!hasHeld) return null;
                                  return (
                                    <button
                                      key={c}
                                      onClick={() => handleFireCourse(order.id, c)}
                                      className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] flex items-center space-x-1 shadow-xs transition-colors"
                                    >
                                      <Play className="w-2.5 h-2.5" />
                                      <span className="capitalize">Fire {c}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Items List */}
                          <div className="divide-y divide-stone-100 mt-3 space-y-2">
                            {order.items.map(item => (
                              <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                                <div>
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-mono font-bold text-stone-900">{item.quantity}x</span>
                                    <span className="font-medium text-stone-800">{item.name}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 mt-0.5 text-[10px]">
                                    {item.course && (
                                      <span className="bg-stone-100 text-stone-600 px-1 rounded capitalize">
                                        {item.course}
                                      </span>
                                    )}
                                    {item.seatNumber && (
                                      <span className="bg-blue-50 text-blue-700 px-1 rounded">
                                        Seat {item.seatNumber}
                                      </span>
                                    )}
                                    {item.courseStatus === 'hold' && (
                                      <span className="bg-amber-100 text-amber-800 font-bold px-1 rounded">
                                        HOLD
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1.5">
                                  {item.courseStatus === 'hold' && (
                                    <button
                                      onClick={() => handleFireItem(order.id, item.id)}
                                      className="px-2 py-0.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded text-[10px] flex items-center space-x-1"
                                      title="Fire this single item into kitchen"
                                    >
                                      <Play className="w-2 h-2" />
                                      <span>Fire</span>
                                    </button>
                                  )}
                                  <span
                                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                      item.kotStatus === 'prepared'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-stone-100 text-stone-500'
                                    }`}
                                  >
                                    {item.kotStatus}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-stone-100 pt-2 flex items-center justify-between text-xs text-stone-500">
                          <span>Total Items: {order.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
                          <span className="font-mono font-bold text-stone-800">
                            {currencySymbol}
                            {order.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
