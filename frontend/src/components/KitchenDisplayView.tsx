import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, KitchenStation, RestaurantProfile } from '../types';
import { ApiService } from '../services/api';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  RefreshCw,
  Printer,
  RotateCcw,
  Utensils,
  ArrowLeft,
  Flame,
  Wine,
  Check,
  User,
  Coffee
} from 'lucide-react';
import { DeliveryPartnerBadge } from './DeliveryPartnerBadge';

interface KitchenDisplayViewProps {
  profile: RestaurantProfile;
  orders: Order[];
  onRefreshOrders: () => void;
  onExit: () => void;
}

export const KitchenDisplayView: React.FC<KitchenDisplayViewProps> = ({
  profile,
  orders: initialOrders,
  onRefreshOrders,
  onExit
}) => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedStation, setSelectedStation] = useState<KitchenStation | 'all'>('all');
  const [statusTab, setStatusTab] = useState<'active' | 'kot_printed' | 'preparing' | 'ready' | 'served'>('active');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [printingKotOrder, setPrintingKotOrder] = useState<Order | null>(null);

  // Time ticker to update "X mins ago" every 10 seconds
  const [currentTime, setCurrentTime] = useState(Date.now());
  const prevOrderCountRef = useRef(initialOrders.length);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Polling for new orders every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(async () => {
      try {
        const freshOrders = await ApiService.getOrders();
        if (freshOrders && freshOrders.length > 0) {
          // Play sound if new orders arrived
          if (freshOrders.length > prevOrderCountRef.current && soundEnabled) {
            playKitchenChime();
          }
          prevOrderCountRef.current = freshOrders.length;
          setOrders(freshOrders);
        }
      } catch {
        // silent fail in polling
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, soundEnabled]);

  // Web Audio Kitchen Bell Chime
  const playKitchenChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio autoplay policy catch
    }
  };

  // Status updates
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    // Optimistic local update
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: nextStatus, updatedAt: new Date().toISOString() } : o))
    );

    try {
      await ApiService.updateOrderStatus(orderId, nextStatus);
      onRefreshOrders();
    } catch (err: any) {
      console.error('Failed to update status on server:', err);
    }
  };

  const handleToggleItemPrepared = async (orderId: string, itemId: string, currentKotStatus: string) => {
    const nextStatus = currentKotStatus === 'prepared' ? 'printed' : 'prepared';

    // Optimistic update
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const updatedItems = o.items.map(i => (i.id === itemId ? { ...i, kotStatus: nextStatus as any } : i));
        const allDone = updatedItems.every(i => i.kotStatus === 'prepared');
        return {
          ...o,
          items: updatedItems,
          status: allDone ? 'ready' : o.status === 'kot_printed' ? 'preparing' : o.status
        };
      })
    );

    try {
      await ApiService.updateOrderItemStatus(orderId, itemId, nextStatus as any);
      onRefreshOrders();
    } catch (err: any) {
      console.error('Failed to toggle item status on server:', err);
    }
  };

  // Filter orders according to station and status tab
  const filteredOrders = orders.filter(order => {
    // Filter by status
    if (statusTab === 'active') {
      if (order.status !== 'kot_printed' && order.status !== 'preparing' && order.status !== 'ready') {
        return false;
      }
    } else {
      if (order.status !== statusTab) return false;
    }

    // Filter by station
    if (selectedStation !== 'all') {
      const hasStationItem = order.items.some(i => i.station === selectedStation);
      if (!hasStationItem) return false;
    }

    return true;
  });

  // Calculate elapsed time in minutes & seconds
  const getElapsedTime = (createdAt: string) => {
    const diffMs = currentTime - new Date(createdAt).getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return { mins, secs, totalSec: diffSec };
  };

  // Metrics
  const activeCount = orders.filter(o => ['kot_printed', 'preparing', 'ready'].includes(o.status)).length;
  const newKotCount = orders.filter(o => o.status === 'kot_printed').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;
  const urgentCount = orders.filter(
    o => ['kot_printed', 'preparing'].includes(o.status) && getElapsedTime(o.createdAt).mins >= 12
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Top KDS Command Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-xl">
        <div className="flex items-center space-x-4">
          <button
            onClick={onExit}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>POS Cashier</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-black text-white tracking-wide">Live Kitchen Display (KDS)</h1>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-Time Sync</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {profile.name} • Paperless Kitchen Order Tickets & Prep Workflow
              </p>
            </div>
          </div>
        </div>

        {/* Live Metrics Ribbons */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-slate-850 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center space-x-2">
            <span className="text-slate-400">Active Tickets:</span>
            <span className="font-mono font-black text-brand-400 text-sm">{activeCount}</span>
          </div>

          {urgentCount > 0 && (
            <div className="bg-rose-950/80 border border-rose-800 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 text-rose-300 font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{urgentCount} Delayed (&gt;12m)</span>
            </div>
          )}

          {/* Sound & Polling Controls */}
          <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playKitchenChime();
              }}
              title={soundEnabled ? 'Chime Sound Enabled' : 'Chime Sound Muted'}
              className={`p-1.5 rounded-lg transition-colors ${
                soundEnabled ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Live Auto-Sync Active (5s)' : 'Live Auto-Sync Paused'}
              className={`p-1.5 rounded-lg transition-colors ${
                autoRefresh ? 'bg-emerald-600/30 text-emerald-300' : 'text-slate-500 hover:text-white'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin-slow' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Bar: Station Filters & Status Tabs */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Stations Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSelectedStation('all')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedStation === 'all'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/50'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>All Stations</span>
          </button>

          <button
            onClick={() => setSelectedStation('kitchen')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedStation === 'kitchen'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/50'
            }`}
          >
            <span>👨‍🍳 Main Kitchen</span>
          </button>

          <button
            onClick={() => setSelectedStation('tandoor')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedStation === 'tandoor'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Tandoor & Grill</span>
          </button>

          <button
            onClick={() => setSelectedStation('bar')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedStation === 'bar'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/50'
            }`}
          >
            <Wine className="w-3.5 h-3.5 text-purple-400" />
            <span>Bar & Drinks</span>
          </button>

          <button
            onClick={() => setSelectedStation('dessert')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedStation === 'dessert'
                ? 'bg-pink-600 text-white shadow-md'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/50'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-pink-400" />
            <span>Dessert Counter</span>
          </button>
        </div>

        {/* Status Stages */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setStatusTab('active')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              statusTab === 'active' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusTab('kot_printed')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              statusTab === 'kot_printed'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            New KOT ({newKotCount})
          </button>
          <button
            onClick={() => setStatusTab('preparing')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              statusTab === 'preparing'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-blue-400'
            }`}
          >
            Preparing ({preparingCount})
          </button>
          <button
            onClick={() => setStatusTab('ready')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              statusTab === 'ready'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            Ready ({readyCount})
          </button>
          <button
            onClick={() => setStatusTab('served')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              statusTab === 'served' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Ticket Cards Grid */}
      <main className="flex-1 p-6 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-600">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-400">All Kitchen Stations are Clear</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              No pending orders for {selectedStation === 'all' ? 'any station' : selectedStation} under {statusTab} status.
              New QR scans and POS orders will pop up here with an alert chime!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map(order => {
              const { mins, secs } = getElapsedTime(order.createdAt);
              const isUrgent = mins >= 12;
              const isWarning = mins >= 8 && mins < 12;

              // Items filtered for station if station is selected
              const visibleItems =
                selectedStation === 'all'
                  ? order.items
                  : order.items.filter(i => i.station === selectedStation);

              if (visibleItems.length === 0) return null;

              const allItemsPrepared = visibleItems.every(i => i.kotStatus === 'prepared');

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border flex flex-col overflow-hidden shadow-xl transition-all duration-300 ${
                    order.status === 'ready'
                      ? 'bg-slate-900 border-emerald-500/60 shadow-emerald-950/20'
                      : isUrgent
                      ? 'bg-slate-900 border-rose-500/70 shadow-rose-950/30'
                      : isWarning
                      ? 'bg-slate-900 border-amber-500/60 shadow-amber-950/20'
                      : 'bg-slate-900 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className={`px-4 py-3 border-b flex items-start justify-between ${
                      order.status === 'ready'
                        ? 'bg-emerald-950/40 border-emerald-500/30'
                        : isUrgent
                        ? 'bg-rose-950/40 border-rose-500/30'
                        : isWarning
                        ? 'bg-amber-950/40 border-amber-500/30'
                        : 'bg-slate-850 border-slate-700/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs font-mono font-black text-white">{order.orderNumber}</span>
                        {order.deliveryPartner && order.deliveryPartner !== 'direct' ? (
                          <DeliveryPartnerBadge
                            partner={order.deliveryPartner}
                            partnerOrderId={order.partnerOrderId}
                            partnerPickupCode={order.partnerPickupCode}
                            size="sm"
                          />
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              order.type === 'dine_in'
                                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                                : order.type === 'takeaway'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {order.type === 'dine_in'
                              ? `Table ${order.tableNumber || 'N/A'}`
                              : order.type === 'takeaway'
                              ? 'Takeaway'
                              : 'Direct Delivery'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[130px] font-medium text-slate-300">
                          {order.customerName || 'Guest'}
                        </span>
                        {order.riderName && (
                          <span className="text-[10px] text-amber-400 font-mono font-bold truncate">
                            • 🛵 {order.riderName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timer Badge */}
                    <div className="flex flex-col items-end">
                      <div
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-black font-mono shadow-sm ${
                          order.status === 'ready'
                            ? 'bg-emerald-500 text-white'
                            : isUrgent
                            ? 'bg-rose-600 text-white animate-pulse'
                            : isWarning
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-200 border border-slate-700'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                        </span>
                      </div>

                      <span className="text-[9px] uppercase font-bold text-slate-400 mt-1">
                        {order.status === 'kot_printed'
                          ? (allItemsPrepared ? 'Ready to Start' : 'New Ticket')
                          : order.status === 'preparing'
                          ? (allItemsPrepared ? 'All Items Checked' : 'In Prep')
                          : order.status === 'ready'
                          ? 'Food Ready'
                          : 'Served'}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-3.5 flex-1 space-y-2.5 divide-y divide-slate-800/80">
                    {visibleItems.map(item => {
                      const isPrepared = item.kotStatus === 'prepared';

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItemPrepared(order.id, item.id, item.kotStatus)}
                          className={`pt-2.5 first:pt-0 flex items-start space-x-2.5 cursor-pointer group transition-all`}
                        >
                          {/* Item Prepared Checkbox */}
                          <div
                            className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                              isPrepared
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'border-slate-600 group-hover:border-slate-400 bg-slate-950'
                            }`}
                          >
                            {isPrepared && <Check className="w-3.5 h-3.5" />}
                          </div>

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline space-x-2">
                              <span
                                className={`text-sm font-black font-mono shrink-0 ${
                                  isPrepared ? 'text-slate-500 line-through' : 'text-amber-400'
                                }`}
                              >
                                {item.quantity}x
                              </span>
                              <span
                                className={`text-xs font-bold leading-snug truncate ${
                                  isPrepared ? 'text-slate-500 line-through' : 'text-white'
                                }`}
                              >
                                {item.name}
                              </span>
                            </div>

                            {/* Variation / Addon */}
                            {item.selectedVariation && (
                              <p className="text-[10px] text-slate-400 ml-6">
                                Size: <strong>{item.selectedVariation.name}</strong>
                              </p>
                            )}

                            {/* Chef Cooking Notes */}
                            {item.specialNotes && (
                              <div className="mt-1 ml-6 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded px-2 py-0.5 text-[10px] font-medium flex items-center space-x-1">
                                <span>Note:</span>
                                <strong>"{item.specialNotes}"</strong>
                              </div>
                            )}
                          </div>

                          {/* Station Tag */}
                          <span className="text-[9px] uppercase font-bold text-slate-500 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 shrink-0">
                            {item.station}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card Action Controls */}
                  <div className="p-3 border-t border-slate-800 bg-slate-850/60 flex items-center space-x-2">
                    <button
                      onClick={() => setPrintingKotOrder(order)}
                      title="Print KOT Paper Slip"
                      className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {order.status === 'kot_printed' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-98"
                      >
                        <ChefHat className="w-4 h-4" />
                        <span>Start Cooking</span>
                      </button>
                    )}

                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-98"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Order Ready</span>
                      </button>
                    )}

                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-98"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {order.type === 'delivery'
                            ? `Hand to ${order.deliveryPartner ? order.deliveryPartner.toUpperCase() : 'Rider'}`
                            : order.type === 'takeaway'
                            ? 'Hand to Customer'
                            : 'Serve to Table'}
                        </span>
                      </button>
                    )}

                    {order.status === 'served' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all border border-slate-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Recall Ticket</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Printable KOT Thermal Slip Modal */}
      {printingKotOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 font-mono text-xs space-y-4">
            <div className="text-center border-b pb-3 border-dashed border-gray-400">
              <h2 className="text-base font-black uppercase tracking-wider">{profile.name}</h2>
              <p className="text-[11px] font-bold text-gray-700 uppercase mt-0.5">KITCHEN ORDER TICKET (KOT)</p>
              <div className="text-2xl font-black mt-2 bg-gray-100 py-1 rounded">
                TABLE: {printingKotOrder.tableNumber || 'TAKEAWAY'}
              </div>
            </div>

            <div className="flex justify-between text-[11px] border-b pb-2 border-dashed border-gray-300">
              <div>
                <p>Order: <strong>{printingKotOrder.orderNumber}</strong></p>
                <p>Guest: <strong>{printingKotOrder.customerName || 'Walk-in'}</strong></p>
              </div>
              <div className="text-right">
                <p>{new Date(printingKotOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="uppercase">{printingKotOrder.type}</p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 border-b pb-3 border-dashed border-gray-400">
              <div className="flex font-black border-b border-gray-200 pb-1">
                <span className="w-8">QTY</span>
                <span className="flex-1">ITEM DESCRIPTION</span>
                <span>STN</span>
              </div>
              {printingKotOrder.items.map(i => (
                <div key={i.id} className="text-xs">
                  <div className="flex items-start">
                    <span className="w-8 font-black text-sm">{i.quantity}</span>
                    <span className="flex-1 font-bold">{i.name}</span>
                    <span className="text-[10px] uppercase font-semibold text-gray-600">{i.station}</span>
                  </div>
                  {i.selectedVariation && (
                    <p className="text-[10px] text-gray-600 ml-8">Opt: {i.selectedVariation.name}</p>
                  )}
                  {i.specialNotes && (
                    <p className="text-[10px] text-red-600 ml-8 font-bold">** NOTE: {i.specialNotes} **</p>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center text-[10px] text-gray-500">
              Printed via RestoPulse KDS • Chef Copy
            </div>

            {/* Modal Actions */}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-black text-white py-2 rounded-lg font-bold flex items-center justify-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Physical KOT</span>
              </button>
              <button
                onClick={() => setPrintingKotOrder(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
