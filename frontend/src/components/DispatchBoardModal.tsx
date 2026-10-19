import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import {
  X,
  Bike,
  ShoppingBag,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  MessageCircle,
  ChefHat
} from 'lucide-react';
import { DeliveryPartnerBadge } from './DeliveryPartnerBadge';

interface DispatchBoardModalProps {
  orders: Order[];
  currencySymbol?: string;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onClose: () => void;
}

const RIDER_LIST = [
  'In-House Rider (Ramesh)',
  'In-House Rider (Amit)',
  'Swiggy Direct Fleet',
  'Zomato Direct Fleet',
  'Dunzo Partner',
  'Porter Express'
];

export const DispatchBoardModal: React.FC<DispatchBoardModalProps> = ({
  orders,
  currencySymbol = '₹',
  onUpdateOrderStatus,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'takeaway' | 'delivery'>('takeaway');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [localRiderMap, setLocalRiderMap] = useState<Record<string, string>>({});
  const [localRiderStatusMap, setLocalRiderStatusMap] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filter takeaway and delivery orders
  const takeawayOrders = orders.filter(
    o => o.type === 'takeaway' && o.status !== 'cancelled'
  );

  const deliveryOrders = orders.filter(
    o => o.type === 'delivery' && o.status !== 'cancelled'
  );

  const activeTakeawayCount = takeawayOrders.filter(o => o.status !== 'settled').length;
  const activeDeliveryCount = deliveryOrders.filter(o => o.status !== 'settled').length;

  // Filter delivery orders by aggregator/delivery partner
  const filteredDeliveryOrders = deliveryOrders.filter(o => {
    if (partnerFilter === 'all') return true;
    if (partnerFilter === 'direct') return !o.deliveryPartner || o.deliveryPartner === 'direct';
    return o.deliveryPartner === partnerFilter;
  });

  const zomatoCount = deliveryOrders.filter(o => o.deliveryPartner === 'zomato').length;
  const swiggyCount = deliveryOrders.filter(o => o.deliveryPartner === 'swiggy').length;
  const ondcCount = deliveryOrders.filter(o => o.deliveryPartner === 'ondc').length;
  const magicpinCount = deliveryOrders.filter(o => o.deliveryPartner === 'magicpin').length;
  const directCount = deliveryOrders.filter(o => !o.deliveryPartner || o.deliveryPartner === 'direct').length;

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await onUpdateOrderStatus(orderId, newStatus);
      setStatusMessage(`Order updated to ${newStatus}`);
      setTimeout(() => setStatusMessage(null), 2500);
    } catch {
      setStatusMessage('Failed to update status');
    }
  };

  const getElapsedTime = (createdAt: string) => {
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    return `${elapsedMinutes}m ago`;
  };

  const getOrderTotal = (order: Order) => {
    return order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Takeaway & Rider Dispatch Board</h2>
              <p className="text-xs text-slate-400">
                Track customer pickup tokens and dispatch in-house / third-party delivery riders
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Status Banner */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('takeaway')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'takeaway'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Takeaway Tokens</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/30 text-[11px]">
                {activeTakeawayCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('delivery')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'delivery'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>Rider Deliveries</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/30 text-[11px]">
                {activeDeliveryCount}
              </span>
            </button>
          </div>

          {statusMessage && (
            <div className="text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-700/50 px-3 py-1 rounded-lg">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Tab 1: Takeaway Tokens View */}
        {activeTab === 'takeaway' && (
          <div className="p-6 overflow-y-auto flex-1">
            {takeawayOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 text-slate-600 stroke-1" />
                <p className="text-sm font-semibold text-slate-400">No active takeaway orders</p>
                <p className="text-xs text-slate-500 mt-1">
                  Place a Takeaway order from the POS header to see customer tokens here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {takeawayOrders.map(order => {
                  const token = order.takeawayToken || `TK-${order.orderNumber.replace('ORD-', '')}`;
                  const isReady = order.status === 'ready';
                  const isSettled = order.status === 'settled';

                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl border-2 p-4 flex flex-col justify-between transition-all ${
                        isSettled
                          ? 'bg-slate-900/40 border-slate-800 opacity-60'
                          : isReady
                          ? 'bg-emerald-950/30 border-emerald-500/70 shadow-lg shadow-emerald-950/30'
                          : 'bg-amber-950/20 border-amber-600/40'
                      }`}
                    >
                      <div>
                        {/* Token Banner */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                              #{token}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              ({order.orderNumber})
                            </span>
                          </div>

                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              isSettled
                                ? 'bg-slate-800 text-slate-400'
                                : isReady
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="mt-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">
                              {order.customerName || 'Walk-in Guest'}
                            </span>
                            <span className="text-slate-400 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{getElapsedTime(order.createdAt)}</span>
                            </span>
                          </div>

                          {order.customerPhone && (
                            <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-brand-400" />
                              <span>{order.customerPhone}</span>
                            </div>
                          )}
                        </div>

                        {/* Items List */}
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between text-slate-300">
                              <span>
                                {item.quantity}x {item.name}
                              </span>
                              <span className="text-slate-400 font-mono">
                                {currencySymbol}{(item.quantity * item.unitPrice).toFixed(0)}
                              </span>
                            </div>
                          ))}
                          <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-white text-[11px]">
                            <span>Total</span>
                            <span className="font-mono text-brand-400">
                              {currencySymbol}{getOrderTotal(order).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center space-x-2">
                        {!isReady && !isSettled && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'ready')}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-sm transition-all"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Mark Ready</span>
                          </button>
                        )}

                        {isReady && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'settled')}
                            className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-sm transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Hand Over</span>
                          </button>
                        )}

                        {order.customerPhone && (
                          <a
                            href={`https://wa.me/91${order.customerPhone}?text=${encodeURIComponent(
                              `Hello! Your RestoPulse Takeaway Order #${token} is packed & ready for pickup! 🥡`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/40"
                            title="Ping customer on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Delivery & Rider Dispatch View */}
        {activeTab === 'delivery' && (
          <div className="p-6 overflow-y-auto flex-1 flex flex-col space-y-4">
            {/* Delivery Partner Filter Bar */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs shrink-0">
              <span className="text-slate-400 font-semibold mr-1">Filter Partner:</span>
              <button
                onClick={() => setPartnerFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  partnerFilter === 'all'
                    ? 'bg-slate-200 text-slate-900 shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Deliveries ({deliveryOrders.length})
              </button>
              <button
                onClick={() => setPartnerFilter('zomato')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                  partnerFilter === 'zomato'
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-900/40'
                }`}
              >
                <span>🔴 Zomato</span>
                <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{zomatoCount}</span>
              </button>
              <button
                onClick={() => setPartnerFilter('swiggy')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                  partnerFilter === 'swiggy'
                    ? 'bg-orange-600 text-white shadow'
                    : 'bg-orange-950/40 text-orange-400 border border-orange-800/40 hover:bg-orange-900/40'
                }`}
              >
                <span>🟠 Swiggy</span>
                <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{swiggyCount}</span>
              </button>
              <button
                onClick={() => setPartnerFilter('ondc')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                  partnerFilter === 'ondc'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-blue-950/40 text-blue-400 border border-blue-800/40 hover:bg-blue-900/40'
                }`}
              >
                <span>🔵 ONDC</span>
                <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{ondcCount}</span>
              </button>
              <button
                onClick={() => setPartnerFilter('magicpin')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                  partnerFilter === 'magicpin'
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-purple-950/40 text-purple-400 border border-purple-800/40 hover:bg-purple-900/40'
                }`}
              >
                <span>🟣 Magicpin</span>
                <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{magicpinCount}</span>
              </button>
              <button
                onClick={() => setPartnerFilter('direct')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                  partnerFilter === 'direct'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/40'
                }`}
              >
                <span>🟢 In-House</span>
                <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{directCount}</span>
              </button>
            </div>

            {filteredDeliveryOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Bike className="w-12 h-12 mx-auto mb-2 text-slate-600 stroke-1" />
                <p className="text-sm font-semibold text-slate-400">No matching delivery orders</p>
                <p className="text-xs text-slate-500 mt-1">
                  {partnerFilter === 'all'
                    ? 'Place a Delivery order or simulate an aggregator inbound order from CRM'
                    : `No active orders found for ${partnerFilter.toUpperCase()}`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDeliveryOrders.map(order => {
                  const isPartnerOrder = Boolean(order.deliveryPartner && order.deliveryPartner !== 'direct');
                  const partnerName = order.deliveryPartner ? order.deliveryPartner.toUpperCase() : 'PARTNER';
                  const assignedRider = localRiderMap[order.id] || order.riderName || (isPartnerOrder ? `${partnerName} Fleet Rider` : 'In-House Rider (Ramesh)');
                  const riderStatus = localRiderStatusMap[order.id] || order.riderStatus || 'assigned';
                  const isDelivered = order.status === 'settled' || riderStatus === 'delivered';
                  const total = getOrderTotal(order);

                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl border-2 p-5 flex flex-col justify-between transition-all ${
                        isDelivered
                          ? 'bg-slate-900/40 border-slate-800 opacity-60'
                          : riderStatus === 'out_for_delivery'
                          ? 'bg-blue-950/30 border-blue-500/70 shadow-lg shadow-blue-950/30'
                          : isPartnerOrder
                          ? 'bg-slate-850 border-amber-500/30 shadow-md'
                          : 'bg-slate-850 border-slate-700/80'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header with Order Code and Partner Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/80">
                          <div className="flex items-center space-x-2">
                            <div>
                              <span className="text-base font-extrabold text-white">
                                {order.orderNumber}
                              </span>
                              <span className="text-xs text-slate-400 ml-2">
                                {getElapsedTime(order.createdAt)}
                              </span>
                            </div>
                            <DeliveryPartnerBadge
                              partner={order.deliveryPartner}
                              partnerOrderId={order.partnerOrderId}
                              partnerPickupCode={order.partnerPickupCode}
                              size="sm"
                            />
                          </div>

                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              riderStatus === 'out_for_delivery'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                : riderStatus === 'delivered'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {riderStatus.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Customer & Address Details */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">
                              {order.customerName || 'Direct Customer'}
                            </span>
                            {order.customerPhone && (
                              <span className="text-slate-400 flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-brand-400" />
                                <span>{order.customerPhone}</span>
                              </span>
                            )}
                          </div>

                          {order.deliveryAddress && (
                            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-start space-x-1.5">
                              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">{order.deliveryAddress}</span>
                            </div>
                          )}
                        </div>

                        {/* Aggregator Net Payout Breakdown */}
                        {isPartnerOrder && (
                          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                            <div className="flex items-center space-x-1 text-slate-400">
                              <span>Fee ({order.partnerCommissionPercent || 18}%):</span>
                              <span className="text-amber-400 font-bold font-mono">
                                -{currencySymbol}{(order.partnerCommissionAmount || (total * 0.18)).toFixed(0)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">Net Payout:</span>
                              <span className="text-emerald-400 font-bold font-mono">
                                {currencySymbol}{(order.partnerNetPayout || (total * 0.82)).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Items Preview */}
                        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between text-slate-300">
                              <span>
                                {item.quantity}x {item.name}
                              </span>
                              <span className="text-slate-400 font-mono">
                                {currencySymbol}{(item.quantity * item.unitPrice).toFixed(0)}
                              </span>
                            </div>
                          ))}
                          <div className="pt-1 border-t border-slate-800 flex justify-between font-bold text-white text-[11px]">
                            <span>Gross Bill</span>
                            <span className="font-mono text-brand-400">{currencySymbol}{total.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Rider Assignment Selector */}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                          <label className="text-slate-400 text-[11px] font-semibold flex items-center space-x-1">
                            <Bike className="w-3.5 h-3.5 text-blue-400" />
                            <span>Rider:</span>
                          </label>
                          <select
                            value={assignedRider}
                            onChange={e =>
                              setLocalRiderMap({
                                ...localRiderMap,
                                [order.id]: e.target.value
                              })
                            }
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400"
                          >
                            {isPartnerOrder && (
                              <option value={`${partnerName} Fleet Rider`}>
                                {partnerName} Fleet Rider ({order.partnerPickupCode ? `OTP ${order.partnerPickupCode}` : 'Auto-Assigned'})
                              </option>
                            )}
                            {RIDER_LIST.map(r => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Dispatch Progression Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center space-x-2">
                        {riderStatus !== 'out_for_delivery' && riderStatus !== 'delivered' && (
                          <button
                            onClick={() => {
                              setLocalRiderStatusMap({
                                ...localRiderStatusMap,
                                [order.id]: 'out_for_delivery'
                              });
                              handleStatusChange(order.id, 'preparing');
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-sm transition-all"
                          >
                            <Bike className="w-3.5 h-3.5" />
                            <span>
                              {isPartnerOrder
                                ? `Verify OTP & Hand Over (${order.partnerPickupCode ? `OTP: ${order.partnerPickupCode}` : 'Partner Rider'})`
                                : 'Out for Delivery'}
                            </span>
                          </button>
                        )}

                        {riderStatus === 'out_for_delivery' && (
                          <button
                            onClick={() => {
                              setLocalRiderStatusMap({
                                ...localRiderStatusMap,
                                [order.id]: 'delivered'
                              });
                              handleStatusChange(order.id, 'settled');
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-sm transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Delivered</span>
                          </button>
                        )}

                        {order.customerPhone && (
                          <a
                            href={`https://wa.me/91${order.customerPhone}?text=${encodeURIComponent(
                              `Hi ${order.customerName || 'there'}! Your RestoPulse order #${order.orderNumber} is on its way with rider ${assignedRider}. 🛵💨`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/40"
                            title="Send dispatch WhatsApp alert"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
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
