import React, { useState } from 'react';
import {
  Coffee,
  UtensilsCrossed,
  Clock,
  TrendingUp,
  Receipt,
  QrCode,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { RestaurantProfile, MenuItem, RestaurantTable, Order } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { ActiveNavView } from '../components/navigation/Sidebar';

interface OverviewDashboardViewProps {
  profile: RestaurantProfile;
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  orders: Order[];
  onNavigate: (view: ActiveNavView) => void;
  onUpdateProfile: (updated: Partial<RestaurantProfile>) => Promise<void>;
  onToggleItemStock: (itemId: string) => Promise<void>;
  onOpenSettings: () => void;
}

export const OverviewDashboardView: React.FC<OverviewDashboardViewProps> = ({
  profile,
  menuItems,
  tables,
  orders,
  onNavigate,
  onUpdateProfile,
  onToggleItemStock,
  onOpenSettings
}) => {
  const isCafe = !profile.businessType || profile.businessType === 'cafe' || profile.businessType === 'bakery';
  const businessConceptLabel = isCafe ? 'Café' : 'Restaurant';

  // Live Metrics Calculation
  const todayCompletedCount = orders.filter(o => o.status === 'settled' || o.status === 'ready').length;

  const realSalesTotal = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, order) => {
      const orderTotal = order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      return sum + orderTotal;
    }, 0);

  // If newly initialized demo, display handsome benchmark
  const displaySales = realSalesTotal > 0 ? realSalesTotal : 12480;
  const displayOrdersServed = todayCompletedCount > 0 ? todayCompletedCount : (orders.length || 38);

  const availableProductsCount = menuItems.filter(i => i.inStock).length;
  const totalProductsCount = menuItems.length;

  // Quick Controls local toggle states synced with profile
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(
    profile.isAcceptingOrders !== undefined ? profile.isAcceptingOrders : true
  );
  const [isQrOrderingEnabled, setIsQrOrderingEnabled] = useState(
    profile.featureFlags.enableQrOrdering
  );
  const [isPromotionsEnabled, setIsPromotionsEnabled] = useState(
    profile.enablePromotions !== undefined ? profile.enablePromotions : true
  );

  const handleToggleAcceptingOrders = async (checked: boolean) => {
    setIsAcceptingOrders(checked);
    await onUpdateProfile({ isAcceptingOrders: checked });
  };

  const handleToggleQrOrdering = async (checked: boolean) => {
    setIsQrOrderingEnabled(checked);
    await onUpdateProfile({
      featureFlags: { ...profile.featureFlags, enableQrOrdering: checked }
    });
  };

  const handleTogglePromotions = async (checked: boolean) => {
    setIsPromotionsEnabled(checked);
    await onUpdateProfile({ enablePromotions: checked });
  };

  // Preview Dishes for Menu Preview Card
  const previewItems = menuItems.slice(0, 6);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* 1. Hero Business Banner matching screenshot */}
      <div className="bg-olive-850 border border-olive-750/80 rounded-2xl p-5 md:p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-olive-750 flex items-center justify-center text-white shrink-0 shadow-inner">
              {isCafe ? (
                <Coffee className="w-6 h-6 text-amber-200" />
              ) : (
                <UtensilsCrossed className="w-6 h-6 text-amber-200" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {profile.name || 'The Daily Grind'}
              </h2>
              <p className="text-xs text-olive-300 mt-0.5">
                {profile.tagline || 'Good coffee. Slow mornings.'}
              </p>
            </div>
          </div>

          <Button
            variant="dark"
            size="sm"
            pill
            onClick={onOpenSettings}
            className="self-start sm:self-auto bg-stone-900 hover:bg-stone-800 border-olive-700 text-xs px-4"
          >
            Edit details
          </Button>
        </div>

        {/* Banner Footer Info */}
        <div className="border-t border-olive-750/70 pt-3.5 mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-olive-300">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-olive-400" />
            <span className="font-mono text-stone-200">
              Today's hours: {profile.openingHours || '09:00 – 22:00'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isAcceptingOrders ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-medium text-stone-200">
              {isAcceptingOrders ? 'Accepting orders' : 'Ordering paused'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid (4 White Cards matching screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's sales */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-[#A86749]">
                {profile.currencySymbol || '₹'}
              </span>
              <span className="text-emerald-600 flex items-center text-xs font-bold">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-3">Today's sales</p>
            <p className="text-2xl font-bold text-stone-900 font-mono tracking-tight mt-1">
              {profile.currencySymbol || '₹'}
              {displaySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <p className="text-[11px] text-stone-400 mt-3">
            {realSalesTotal > 0 ? 'Live billing tally' : 'Illustrative demo metric'}
          </p>
        </Card>

        {/* Metric 2: Orders served */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <Receipt className="w-4 h-4 text-stone-400" />
              <Badge variant="success" size="xs">
                Today
              </Badge>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-3">Orders served</p>
            <p className="text-2xl font-bold text-stone-900 font-mono tracking-tight mt-1">
              {displayOrdersServed}
            </p>
          </div>
          <p className="text-[11px] text-stone-400 mt-3">
            {todayCompletedCount > 0 ? 'Orders fulfilled' : 'Demo orders'}
          </p>
        </Card>

        {/* Metric 3: Available products */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              {isCafe ? (
                <Coffee className="w-4 h-4 text-stone-400" />
              ) : (
                <UtensilsCrossed className="w-4 h-4 text-stone-400" />
              )}
              <button
                onClick={() => onNavigate('menu')}
                className="text-xs font-semibold text-sage-700 hover:text-sage-800 hover:underline"
              >
                Live menu
              </button>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-3">Available products</p>
            <p className="text-2xl font-bold text-stone-900 font-mono tracking-tight mt-1">
              {availableProductsCount} / {totalProductsCount}
            </p>
          </div>
          <p className="text-[11px] text-stone-400 mt-3">Manage availability below</p>
        </Card>

        {/* Metric 4: Registered tables */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <QrCode className="w-4 h-4 text-stone-400" />
              <button
                onClick={() => onNavigate('tables')}
                className="text-xs font-semibold text-sage-700 hover:text-sage-800 hover:underline"
              >
                Table service
              </button>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-3">Registered tables</p>
            <p className="text-2xl font-bold text-stone-900 font-mono tracking-tight mt-1">
              {tables.length}
            </p>
          </div>
          <p className="text-[11px] text-stone-400 mt-3">QR table records in service</p>
        </Card>
      </div>

      {/* 3. Quick Controls Card matching screenshot */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span>Quick controls</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Change a setting and see it reflected immediately across your platform.
            </p>
          </div>
          <div className="p-2 rounded-xl bg-canvas-100 text-stone-500 border border-canvas-border">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
        </div>

        <div className="divide-y divide-canvas-border">
          <ToggleSwitch
            checked={isAcceptingOrders}
            onChange={handleToggleAcceptingOrders}
            label={`${businessConceptLabel} accepting orders`}
            description="Pause customer ordering during breaks or inventory restock."
          />

          <ToggleSwitch
            checked={isQrOrderingEnabled}
            onChange={handleToggleQrOrdering}
            label="QR table ordering"
            description="Guests order directly by scanning their encrypted table QR."
          />

          <ToggleSwitch
            checked={isPromotionsEnabled}
            onChange={handleTogglePromotions}
            label="Promotional messages"
            description="Configure automated WhatsApp invoice prompts and loyalty offers."
          />
        </div>
      </Card>

      {/* 4. Your Menu Preview Card matching screenshot */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
          <div>
            <h3 className="text-base font-bold text-stone-900">Your menu preview</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Quick view of catalog items with live availability toggling.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            pill
            onClick={() => onNavigate('menu')}
          >
            Manage menu
          </Button>
        </div>

        <div className="divide-y divide-canvas-border">
          {previewItems.map(item => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-4 group hover:bg-canvas-100/50 -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-canvas-200 border border-canvas-border flex items-center justify-center text-stone-700 overflow-hidden shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : isCafe ? (
                    <Coffee className="w-4 h-4 text-stone-500" />
                  ) : (
                    <UtensilsCrossed className="w-4 h-4 text-stone-500" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-stone-400 capitalize">
                      {item.foodType}
                    </span>
                    <span className="text-[10px] text-stone-300">•</span>
                    <span className="text-xs text-stone-500">
                      {item.station} station
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-bold font-mono text-stone-900">
                  {profile.currencySymbol || '₹'}{item.basePrice}
                </span>

                <button
                  onClick={() => onToggleItemStock(item.id)}
                  title="Click to toggle item stock"
                  className="transition-transform active:scale-95"
                >
                  {item.inStock ? (
                    <Badge variant="success" size="xs">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="xs">
                      Sold out
                    </Badge>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {menuItems.length > 6 && (
          <div className="pt-2 text-center">
            <button
              onClick={() => onNavigate('menu')}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors inline-flex items-center gap-1"
            >
              <span>View all {menuItems.length} menu items</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
