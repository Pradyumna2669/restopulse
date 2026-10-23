import React, { useState, useEffect } from 'react';
import {
  Order,
  OrderStatus,
  OrderType,
  RestaurantProfile,
  OrderItem
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DeliveryPartnerBadge } from '../components/DeliveryPartnerBadge';
import {
  Search,
  Clock,
  CheckCircle2,
  Utensils,
  Receipt,
  Printer,
  X,
  Volume2,
  VolumeX,
  Flame,
  Check,
  ShoppingBag
} from 'lucide-react';

interface LiveOrdersPipelineViewProps {
  orders: Order[];
  profile: RestaurantProfile;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onPrintKOT?: (order: Order) => void;
  onPrintBill?: (order: Order) => void;
  onSettleOrder?: (order: Order) => void;
  onNewOrderPunch?: () => void;
}

export const LiveOrdersPipelineView: React.FC<LiveOrdersPipelineViewProps> = ({
  orders,
  profile,
  onUpdateOrderStatus,
  onPrintKOT,
  onPrintBill,
  onSettleOrder,
  onNewOrderPunch
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'served' | 'settled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | OrderType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Elapsed time ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedTime = (createdAt: string) => {
    const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
    return minutes;
  };

  const getElapsedBadge = (minutes: number) => {
    if (minutes >= 25) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
          <Clock className="w-3 h-3 text-rose-600" />
          <span>{minutes}m (Delayed)</span>
        </span>
      );
    }
    if (minutes >= 15) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{minutes}m</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
        <Clock className="w-3 h-3 text-emerald-600" />
        <span>{minutes}m</span>
      </span>
    );
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
      case 'kot_printed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            New / Inbound
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Flame className="w-3 h-3 text-amber-500 animate-bounce" />
            Cooking in Kitchen
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Ready for Pickup
          </span>
        );
      case 'served':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
            <Utensils className="w-3 h-3 text-purple-600" />
            Served to Guest
          </span>
        );
      case 'settled':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
            <Check className="w-3 h-3 text-stone-500" />
            Settled / Closed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <X className="w-3 h-3 text-rose-600" />
            Cancelled
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const handleAdvanceStatus = async (order: Order, nextStatus: OrderStatus) => {
    setUpdatingId(order.id);
    try {
      await onUpdateOrderStatus(order.id, nextStatus);
    } catch {
      alert('Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter Orders
  const filteredOrders = orders.filter(o => {
    if (activeStatusTab === 'pending' && o.status !== 'pending' && o.status !== 'kot_printed') return false;
    if (activeStatusTab === 'preparing' && o.status !== 'preparing') return false;
    if (activeStatusTab === 'ready' && o.status !== 'ready') return false;
    if (activeStatusTab === 'served' && o.status !== 'served') return false;
    if (activeStatusTab === 'settled' && o.status !== 'settled') return false;
    if (activeStatusTab === 'all' && o.status === 'cancelled') return false;

    if (typeFilter !== 'all' && o.type !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = o.orderNumber?.toLowerCase().includes(q);
      const matchCustomer = o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q);
      const matchTable = o.tableNumber?.toLowerCase().includes(q);
      const matchItems = o.items.some(i => i.name.toLowerCase().includes(q));
      if (!matchNumber && !matchCustomer && !matchTable && !matchItems) return false;
    }

    return true;
  });

  // Status Counts
  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'kot_printed').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;
  const servedCount = orders.filter(o => o.status === 'served').length;
  const activeCount = orders.filter(o => o.status !== 'settled' && o.status !== 'cancelled').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-canvas-border shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Active Orders Pipeline</h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {activeCount} Active
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time visual order queue from kitchen firing to bill settlement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNewOrderPunch && (
            <Button
              variant="primary"
              size="md"
              onClick={onNewOrderPunch}
              className="font-bold shadow-sm"
            >
              <ShoppingBag className="w-4 h-4 mr-1.5" />
              + New Order / Punch Bill
            </Button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-stone-100 text-stone-400 border-canvas-border hover:bg-stone-200'
            }`}
            title={soundEnabled ? 'Chimes enabled' : 'Chimes muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Interactive Status Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-canvas-border shadow-xs">
        {/* Status Pipeline Buttons */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { key: 'all', label: 'All Active', count: activeCount },
            { key: 'pending', label: '🔔 Inbound / Pending', count: pendingCount, alert: pendingCount > 0 },
            { key: 'preparing', label: '🍳 Kitchen Cooking', count: preparingCount },
            { key: 'ready', label: '✨ Ready', count: readyCount },
            { key: 'served', label: '🍽️ Served', count: servedCount },
            { key: 'settled', label: 'Completed / Closed', count: orders.filter(o => o.status === 'settled').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveStatusTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                activeStatusTab === tab.key
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeStatusTab === tab.key
                  ? 'bg-stone-800 text-stone-200'
                  : tab.alert
                    ? 'bg-amber-100 text-amber-800 font-extrabold animate-pulse'
                    : 'bg-canvas-200 text-stone-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Channel Type Filter Pills */}
        <div className="flex items-center space-x-1 shrink-0 overflow-x-auto text-[11px]">
          {[
            { key: 'all', label: 'All Types' },
            { key: 'dine_in', label: '🍽️ Dine-In' },
            { key: 'takeaway', label: '🛍️ Takeaway' },
            { key: 'delivery', label: '🛵 Delivery' }
          ].map(type => (
            <button
              key={type.key}
              onClick={() => setTypeFilter(type.key as any)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                typeFilter === type.key
                  ? 'bg-terracotta-600 text-white shadow-xs'
                  : 'bg-canvas-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by order number (e.g. ORD-0004), table #, customer name, or item..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-canvas-border bg-white text-xs placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. Orders Grid Display */}
      {filteredOrders.length === 0 ? (
        <Card className="py-16 text-center space-y-3 bg-white">
          <div className="w-12 h-12 rounded-2xl bg-canvas-100 text-stone-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-stone-800">No Orders in this View</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchQuery
              ? `No orders matching "${searchQuery}". Clear your search query to see all orders.`
              : 'New orders will automatically appear here as guests or staff place them.'}
          </p>
          {onNewOrderPunch && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNewOrderPunch}
              className="mt-2 text-xs"
            >
              + Punch New Order
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const minutesElapsed = getElapsedTime(order.createdAt);
            const isUpdating = updatingId === order.id;
            const totalAmount = order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

            return (
              <Card
                key={order.id}
                className={`p-4 space-y-3.5 border transition-all hover:shadow-md ${
                  order.status === 'pending' || order.status === 'kot_printed'
                    ? 'border-blue-300 ring-2 ring-blue-500/10 bg-gradient-to-b from-blue-50/20 to-white'
                    : order.status === 'ready'
                      ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/20 to-white'
                      : 'border-canvas-border bg-white'
                }`}
              >
                {/* Order Card Header */}
                <div className="flex items-start justify-between gap-2 border-b border-canvas-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-stone-900">
                        {order.orderNumber || order.id.slice(0, 8)}
                      </span>
                      {order.type === 'dine_in' && order.tableNumber && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-stone-900 text-white">
                          Table {order.tableNumber}
                        </span>
                      )}
                      {order.type === 'takeaway' && order.takeawayToken && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-600 text-white font-mono">
                          Token #{order.takeawayToken}
                        </span>
                      )}
                      {order.deliveryPartner && (
                        <DeliveryPartnerBadge partner={order.deliveryPartner} />
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                      <span>{order.customerName || 'Walk-in Guest'}</span>
                      {order.customerPhone && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{order.customerPhone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {getStatusBadge(order.status)}
                    {order.status !== 'settled' && order.status !== 'cancelled' && (
                      getElapsedBadge(minutesElapsed)
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 py-1">
                  {order.items.map((item: OrderItem, idx: number) => (
                    <div key={idx} className="flex items-start justify-between text-xs">
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-bold text-stone-800 shrink-0">
                          {item.quantity}x
                        </span>
                        <div>
                          <span className="font-medium text-stone-900">{item.name}</span>
                          {item.selectedVariation && (
                            <span className="text-[11px] text-stone-500 ml-1">
                              ({item.selectedVariation.name})
                            </span>
                          )}
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <div className="text-[10px] text-stone-400">
                              + {item.selectedAddons.map(a => a.name).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-stone-600 shrink-0">
                        {profile.currencySymbol || '₹'}{(item.quantity * item.unitPrice).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Kitchen Special Notes */}
                {order.specialNotes && (
                  <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 font-medium">
                    ⚠️ Note: {order.specialNotes}
                  </div>
                )}

                {/* Bill Amount & Quick Actions */}
                <div className="border-t border-canvas-border pt-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Total Amount</span>
                    <span className="font-mono font-extrabold text-sm text-stone-900">
                      {profile.currencySymbol || '₹'}{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* 1-Click Action Buttons based on lifecycle */}
                  <div className="flex items-center gap-1.5">
                    {/* Print KOT */}
                    {onPrintKOT && (
                      <button
                        onClick={() => onPrintKOT(order)}
                        className="p-2 rounded-xl border border-canvas-border text-stone-600 hover:text-stone-900 hover:bg-canvas-100 transition-colors cursor-pointer"
                        title="Print Kitchen Ticket (KOT)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Step 1: Pending -> Accept (Preparing) */}
                    {(order.status === 'pending' || order.status === 'kot_printed') && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleAdvanceStatus(order, 'preparing')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Accept Order
                      </Button>
                    )}

                    {/* Step 2: Preparing -> Ready */}
                    {order.status === 'preparing' && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleAdvanceStatus(order, 'ready')}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Mark Ready
                      </Button>
                    )}

                    {/* Step 3: Ready -> Served / Delivered */}
                    {order.status === 'ready' && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleAdvanceStatus(order, order.type === 'dine_in' ? 'served' : 'settled')}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                      >
                        <Utensils className="w-3.5 h-3.5 mr-1" />
                        {order.type === 'dine_in' ? 'Mark Served' : 'Handover & Close'}
                      </Button>
                    )}

                    {/* Step 4: Served / Ready -> Settle Bill */}
                    {(order.status === 'served' || order.status === 'ready') && onSettleOrder && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSettleOrder(order)}
                        className="text-xs font-bold border-stone-800 text-stone-900 hover:bg-stone-900 hover:text-white cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1" />
                        Settle Bill
                      </Button>
                    )}

                    {/* Settled: Print Receipt */}
                    {order.status === 'settled' && onPrintBill && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPrintBill(order)}
                        className="text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1" />
                        Print Bill
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
