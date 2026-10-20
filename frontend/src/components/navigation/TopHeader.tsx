import React, { useState, useEffect } from 'react';
import { Menu, User, Clock, ShoppingBag } from 'lucide-react';
import { RestaurantProfile } from '../../types';
import { ActiveNavView } from './Sidebar';

interface TopHeaderProps {
  profile: RestaurantProfile;
  activeView: ActiveNavView;
  onOpenMobileMenu: () => void;
  onQuickPos: () => void;
  onOpenSettings: () => void;
  isAcceptingOrders?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  profile,
  activeView,
  onOpenMobileMenu,
  onQuickPos,
  onOpenSettings,
  isAcceptingOrders = true
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isCafe = !profile.businessType || profile.businessType === 'cafe' || profile.businessType === 'bakery';
  const prefix = isCafe ? 'CAFÉ MANAGEMENT' : 'RESTAURANT MANAGEMENT';

  const viewTitles: Record<ActiveNavView, { breadcrumb: string; title: string; subtitle: string }> = {
    overview: {
      breadcrumb: `${prefix} / OVERVIEW`,
      title: isCafe ? 'Your café, at a glance' : 'Your restaurant, at a glance',
      subtitle: 'Everything you need to run a smoother service.'
    },
    menu: {
      breadcrumb: `${prefix} / MENU & PRICING`,
      title: 'Menu management & pricing',
      subtitle: 'Manage categories, item variations, prices and live item stock.'
    },
    pos: {
      breadcrumb: `${prefix} / ORDERS & BILLING`,
      title: 'Staff POS & Live Billing Terminal',
      subtitle: 'High-speed order taking, live running cart, KOT dispatch and split payments.'
    },
    tables: {
      breadcrumb: `${prefix} / TABLES & QR CODES`,
      title: 'Floor plan & QR table codes',
      subtitle: 'Manage floor sections, monitor real-time occupancy and download secure table QRs.'
    },
    inventory: {
      breadcrumb: `${prefix} / INVENTORY & RECIPES`,
      title: 'Inventory & recipe costing',
      subtitle: 'Track raw ingredient levels, inward purchase logs and food cost gross margins.'
    },
    customers: {
      breadcrumb: `${prefix} / CRM & CHANNELS`,
      title: 'Customer CRM & delivery channels',
      subtitle: 'Track guest lifetime value, loyalty points tiers and Zomato/Swiggy feeds.'
    },
    reports: {
      breadcrumb: `${prefix} / REPORTS & TAX`,
      title: 'Sales analytics & tax reports',
      subtitle: 'Daily gross revenue, channel distributions, top sellers and GSTR-1 summaries.'
    },
    kds: {
      breadcrumb: `${prefix} / KITCHEN PRODUCTION`,
      title: 'Kitchen Display System (KDS)',
      subtitle: 'Live ticket timers, prep station routing and kitchen-to-counter dispatch.'
    },
    dispatch: {
      breadcrumb: `${prefix} / DISPATCH BOARD`,
      title: 'Takeaway tokens & rider dispatch',
      subtitle: 'Customer pickup tokens, rider assignment and delivery OTP verification.'
    },
    reservations: {
      breadcrumb: `${prefix} / BOOKINGS & QUEUE`,
      title: 'Table reservations & waitlist',
      subtitle: 'Advance table bookings, walk-in live waitlist and WhatsApp table-ready pings.'
    },
    'cash-register': {
      breadcrumb: `${prefix} / CASH DRAWER`,
      title: 'Cash register & shift management',
      subtitle: 'Opening float, mid-day petty expenses, live cash sales and end-of-shift discrepancy audits.'
    },
    settings: {
      breadcrumb: `${prefix} / CONFIGURATION`,
      title: isCafe ? 'Café settings & integrations' : 'Restaurant settings & integrations',
      subtitle: 'Business concept, opening hours, WhatsApp OpenWA gateway and billing feature flags.'
    }
  };

  const current = viewTitles[activeView] || viewTitles.overview;

  return (
    <header className="px-6 py-5 border-b border-canvas-border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Left: Breadcrumbs & Page Titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl border border-canvas-border text-stone-600 hover:bg-canvas-200"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <span className="text-[11px] font-bold text-stone-400 tracking-wider uppercase block">
            {current.breadcrumb}
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight mt-0.5">
            {current.title}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5 hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Actions: Status Pill & Avatar */}
      <div className="flex items-center gap-2.5 self-end md:self-auto">
        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas-100 border border-canvas-border text-xs text-stone-600 font-mono">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>

        {/* Store Open Status Pill matching screenshot */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            isAcceptingOrders
              ? 'bg-sage-50 text-sage-700 border-sage-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title={isAcceptingOrders ? 'Store is open and accepting orders' : 'Ordering is paused'}
        >
          <span className={`w-2 h-2 rounded-full ${isAcceptingOrders ? 'bg-sage-500' : 'bg-amber-500'}`} />
          <span>{isAcceptingOrders ? 'Open' : 'Paused'}</span>
        </div>

        {/* Quick POS launch */}
        {activeView !== 'pos' && (
          <button
            onClick={onQuickPos}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-terracotta-50 hover:bg-terracotta-100 text-terracotta-700 border border-terracotta-200 text-xs font-bold transition-all shadow-sm"
            title="Launch Staff POS Terminal"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Take Order</span>
          </button>
        )}

        {/* Profile Avatar Button */}
        <button
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 border border-canvas-border text-stone-700 flex items-center justify-center transition-colors"
          title="Profile & Settings"
        >
          <User className="w-4 h-4 text-stone-600" />
        </button>
      </div>
    </header>
  );
};
