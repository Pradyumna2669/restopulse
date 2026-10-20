import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DeliveryPartnerBadge } from '../components/DeliveryPartnerBadge';
import {
  Bike,
  ShoppingBag,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  MessageCircle,
  ChefHat,
  Check
} from 'lucide-react';

interface DispatchRidersViewProps {
  orders: Order[];
  currencySymbol?: string;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

const RIDER_LIST = [
  'In-House Rider (Ramesh)',
  'In-House Rider (Amit)',
  'Swiggy Direct Fleet',
  'Zomato Direct Fleet',
  'Dunzo Partner',
  'Porter Express'
];

export const DispatchRidersView: React.FC<DispatchRidersViewProps> = ({
  orders,
  currencySymbol = '₹',
  onUpdateOrderStatus
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-canvas-border shadow-sm">
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('takeaway')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'takeaway'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Takeaway Tokens</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'takeaway' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {activeTakeawayCount} Active
            </span>
          </button>

          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'delivery'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Rider Deliveries</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'delivery' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {activeDeliveryCount} Active
            </span>
          </button>
        </div>

        {statusMessage && (
          <div className="text-xs text-sage-800 bg-sage-50 border border-sage-300 px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-1.5">
            <Check className="w-3.5 h-3.5 text-sage-600" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TAKEAWAY TOKENS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'takeaway' && (
        <div className="space-y-4">
          {takeawayOrders.length === 0 ? (
            <Card className="py-16 text-center text-stone-400 text-xs">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 text-stone-300" />
              <p className="font-bold text-stone-800 text-sm">No active takeaway orders</p>
              <p className="text-stone-400 mt-1">
                Place a Takeaway order from the POS terminal to generate pickup tokens.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {takeawayOrders.map(order => {
                const token = order.takeawayToken || `TK-${order.orderNumber.replace('ORD-', '')}`;
                const isReady = order.status === 'ready';
                const isSettled = order.status === 'settled';

                return (
                  <Card
                    key={order.id}
                    className={`flex flex-col justify-between transition-all ${
                      isSettled
                        ? 'opacity-65 bg-canvas-50'
                        : isReady
                        ? 'border-sage-400 bg-sage-50/20'
                        : 'border-canvas-border'
                    }`}
                  >
                    <div>
                      {/* Token Banner */}
                      <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-black text-terracotta-600 font-mono tracking-tight">
                            #{token}
                          </span>
                          <span className="text-[11px] font-mono text-stone-400">
                            ({order.orderNumber})
                          </span>
                        </div>

                        <Badge
                          variant={
                            isSettled
                              ? 'neutral'
                              : isReady
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      {/* Customer Info */}
                      <div className="mt-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">
                            {order.customerName || 'Walk-in Guest'}
                          </span>
                          <span className="text-stone-400 flex items-center space-x-1 text-[11px]">
                            <Clock className="w-3 h-3" />
                            <span>{getElapsedTime(order.createdAt)}</span>
                          </span>
                        </div>

                        {order.customerPhone && (
                          <div className="flex items-center space-x-1 text-stone-500 text-[11px]">
                            <Phone className="w-3 h-3 text-terracotta-500" />
                            <span className="font-mono">{order.customerPhone}</span>
                          </div>
                        )}
                      </div>

                      {/* Items List */}
                      <div className="mt-3 p-3 rounded-xl bg-canvas-50 border border-canvas-border text-xs space-y-1.5">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between text-stone-700">
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-stone-500 font-mono font-medium">
                              {currencySymbol}{(item.quantity * item.unitPrice).toFixed(0)}
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-canvas-border flex justify-between font-bold text-stone-900 text-xs">
                          <span>Order Total</span>
                          <span className="font-mono text-terracotta-600">
                            {currencySymbol}{getOrderTotal(order).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-canvas-border flex items-center space-x-2">
                      {!isReady && !isSettled && (
                        <Button
                          variant="primary"
                          onClick={() => handleStatusChange(order.id, 'ready')}
                          className="flex-1 !py-1.5 !text-xs font-bold flex items-center justify-center space-x-1.5"
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          <span>Mark Ready</span>
                        </Button>
                      )}

                      {isReady && (
                        <Button
                          variant="dark"
                          onClick={() => handleStatusChange(order.id, 'settled')}
                          className="flex-1 !py-1.5 !text-xs font-bold flex items-center justify-center space-x-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Hand Over</span>
                        </Button>
                      )}

                      {order.customerPhone && (
                        <a
                          href={`https://wa.me/91${order.customerPhone}?text=${encodeURIComponent(
                            `Hello! Your RestroPlus Takeaway Order #${token} is packed & ready for pickup! 🥡`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-sage-50 text-sage-700 hover:bg-sage-100 border border-sage-200 transition-colors"
                          title="Ping customer on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RIDER DELIVERIES & AGGREGATORS */}
      {/* ========================================================================= */}
      {activeTab === 'delivery' && (
        <div className="space-y-4">
          {/* Delivery Partner Filter Chips */}
          <Card className="flex items-center space-x-2 overflow-x-auto text-xs !p-3">
            <span className="text-stone-400 font-bold mr-1 shrink-0">Filter Channel:</span>
            <button
              onClick={() => setPartnerFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                partnerFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-canvas-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              All Deliveries ({deliveryOrders.length})
            </button>
            <button
              onClick={() => setPartnerFilter('zomato')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                partnerFilter === 'zomato'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span>🔴 Zomato</span>
              <span className="bg-black/10 px-1.5 py-0.2 rounded-full text-[10px] font-mono">{zomatoCount}</span>
            </button>
            <button
              onClick={() => setPartnerFilter('swiggy')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                partnerFilter === 'swiggy'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
              }`}
            >
              <span>🟠 Swiggy</span>
              <span className="bg-black/10 px-1.5 py-0.2 rounded-full text-[10px] font-mono">{swiggyCount}</span>
            </button>
            <button
              onClick={() => setPartnerFilter('ondc')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                partnerFilter === 'ondc'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              <span>🔵 ONDC</span>
              <span className="bg-black/10 px-1.5 py-0.2 rounded-full text-[10px] font-mono">{ondcCount}</span>
            </button>
            <button
              onClick={() => setPartnerFilter('magicpin')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                partnerFilter === 'magicpin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <span>🟣 Magicpin</span>
              <span className="bg-black/10 px-1.5 py-0.2 rounded-full text-[10px] font-mono">{magicpinCount}</span>
            </button>
            <button
              onClick={() => setPartnerFilter('direct')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                partnerFilter === 'direct'
                  ? 'bg-sage-700 text-white shadow-sm'
                  : 'bg-sage-50 text-sage-800 border border-sage-200 hover:bg-sage-100'
              }`}
            >
              <span>🟢 In-House</span>
              <span className="bg-black/10 px-1.5 py-0.2 rounded-full text-[10px] font-mono">{directCount}</span>
            </button>
          </Card>

          {/* Delivery Orders Grid */}
          {filteredDeliveryOrders.length === 0 ? (
            <Card className="py-16 text-center text-stone-400 text-xs">
              <Bike className="w-12 h-12 mx-auto mb-2 text-stone-300" />
              <p className="font-bold text-stone-800 text-sm">No matching delivery orders</p>
              <p className="text-stone-400 mt-1">
                {partnerFilter === 'all'
                  ? 'Place a Delivery order or simulate an aggregator order from CRM.'
                  : `No active orders found for ${partnerFilter.toUpperCase()}.`}
              </p>
            </Card>
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
                  <Card
                    key={order.id}
                    className={`flex flex-col justify-between transition-all ${
                      isDelivered
                        ? 'opacity-65 bg-canvas-50'
                        : riderStatus === 'out_for_delivery'
                        ? 'border-amber-400 bg-amber-50/15'
                        : isPartnerOrder
                        ? 'border-canvas-border shadow-sm'
                        : 'border-canvas-border'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header with Order Code and Partner Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-canvas-border">
                        <div className="flex items-center space-x-2">
                          <div>
                            <span className="text-base font-black text-stone-900">
                              {order.orderNumber}
                            </span>
                            <span className="text-xs text-stone-400 ml-2 font-mono">
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

                        <Badge
                          variant={
                            riderStatus === 'out_for_delivery'
                              ? 'warning'
                              : riderStatus === 'delivered'
                              ? 'success'
                              : 'info'
                          }
                        >
                          {riderStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      {/* Customer & Address Details */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">
                            {order.customerName || 'Direct Customer'}
                          </span>
                          {order.customerPhone && (
                            <span className="text-stone-500 flex items-center space-x-1 font-mono">
                              <Phone className="w-3 h-3 text-terracotta-500" />
                              <span>{order.customerPhone}</span>
                            </span>
                          )}
                        </div>

                        {order.deliveryAddress && (
                          <div className="p-2.5 rounded-xl bg-canvas-50 border border-canvas-border text-[11px] text-stone-700 flex items-start space-x-2">
                            <MapPin className="w-3.5 h-3.5 text-terracotta-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{order.deliveryAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Aggregator Net Payout Breakdown */}
                      {isPartnerOrder && (
                        <div className="p-2.5 rounded-xl bg-canvas-50 border border-canvas-border text-xs flex items-center justify-between">
                          <div className="flex items-center space-x-1 text-stone-500">
                            <span>Fee ({order.partnerCommissionPercent || 18}%):</span>
                            <span className="text-terracotta-700 font-bold font-mono">
                              -{currencySymbol}{(order.partnerCommissionAmount || (total * 0.18)).toFixed(0)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-stone-500">Net Payout:</span>
                            <span className="text-sage-700 font-bold font-mono">
                              {currencySymbol}{(order.partnerNetPayout || (total * 0.82)).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Items Preview */}
                      <div className="p-2.5 rounded-xl bg-canvas-50 border border-canvas-border text-xs space-y-1">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between text-stone-700">
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-stone-500 font-mono">
                              {currencySymbol}{(item.quantity * item.unitPrice).toFixed(0)}
                            </span>
                          </div>
                        ))}
                        <div className="pt-1.5 border-t border-canvas-border flex justify-between font-bold text-stone-900 text-[11px]">
                          <span>Gross Bill</span>
                          <span className="font-mono text-terracotta-600">{currencySymbol}{total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Rider Assignment Selector */}
                      <div className="pt-2 border-t border-canvas-border flex items-center justify-between gap-2 text-xs">
                        <label className="text-stone-500 text-[11px] font-bold flex items-center space-x-1 shrink-0">
                          <Bike className="w-3.5 h-3.5 text-blue-600" />
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
                          className="flex-1 bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
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
                    <div className="mt-4 pt-3 border-t border-canvas-border flex items-center space-x-2">
                      {riderStatus !== 'out_for_delivery' && riderStatus !== 'delivered' && (
                        <Button
                          variant="primary"
                          onClick={() => {
                            setLocalRiderStatusMap({
                              ...localRiderStatusMap,
                              [order.id]: 'out_for_delivery'
                            });
                            handleStatusChange(order.id, 'preparing');
                          }}
                          className="flex-1 !py-1.5 !text-xs font-bold flex items-center justify-center space-x-1"
                        >
                          <Bike className="w-3.5 h-3.5" />
                          <span>
                            {isPartnerOrder
                              ? `Verify OTP & Hand Over (${order.partnerPickupCode ? `OTP: ${order.partnerPickupCode}` : 'Partner Rider'})`
                              : 'Out for Delivery'}
                          </span>
                        </Button>
                      )}

                      {riderStatus === 'out_for_delivery' && (
                        <Button
                          variant="dark"
                          onClick={() => {
                            setLocalRiderStatusMap({
                              ...localRiderStatusMap,
                              [order.id]: 'delivered'
                            });
                            handleStatusChange(order.id, 'settled');
                          }}
                          className="flex-1 !py-1.5 !text-xs font-bold flex items-center justify-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Delivered</span>
                        </Button>
                      )}

                      {order.customerPhone && (
                        <a
                          href={`https://wa.me/91${order.customerPhone}?text=${encodeURIComponent(
                            `Hi ${order.customerName || 'there'}! Your RestoPulse order #${order.orderNumber} is on its way with rider ${assignedRider}. 🛵💨`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-sage-50 text-sage-700 hover:bg-sage-100 border border-sage-200 transition-colors"
                          title="Send dispatch WhatsApp alert"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
