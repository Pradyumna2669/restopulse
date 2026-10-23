import React, { useState, useEffect } from 'react';
import { Menu, User, Clock, ShoppingBag, FileText } from 'lucide-react';
import { RestaurantProfile, StaffUser } from '../../types';
import { ActiveNavView } from './Sidebar';

interface TopHeaderProps {
  profile: RestaurantProfile;
  activeView: ActiveNavView;
  onOpenMobileMenu: () => void;
  onQuickPos: () => void;
  onOpenSettings: () => void;
  onOpenStoreStatusModal?: () => void;
  isAcceptingOrders?: boolean;
  currentStaff?: StaffUser;
  onSwitchStaff?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  profile,
  activeView,
  onOpenMobileMenu,
  onQuickPos,
  onOpenSettings,
  onOpenStoreStatusModal,
  isAcceptingOrders = true,
  currentStaff,
  onSwitchStaff
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
    'multi-outlet': {
      breadcrumb: `${prefix} / MULTI-OUTLET HQ`,
      title: 'Multi-Outlet & Franchise Master',
      subtitle: 'Enterprise store network, central menu overrides, inter-store stock transfers and brand royalty analytics.'
    },
    hardware: {
      breadcrumb: `${prefix} / HARDWARE PERIPHERALS`,
      title: 'Digital Scales, Barcode Scanners & VFD Displays',
      subtitle: 'RS-232 serial weighing scales, global barcode listener, and customer-facing 2x20 pole displays.'
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
    waiter: {
      breadcrumb: `${prefix} / WAITER COMPANION`,
      title: 'Handheld Waiter Companion & Service',
      subtitle: 'Table-side order taking, seat allocation, course hold/fire and guest call assistance.'
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

        {/* Store Open Status Clickable Button */}
        <button
          onClick={onOpenStoreStatusModal}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs active:scale-95 ${
            isAcceptingOrders
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/10'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-500/10 animate-pulse'
          }`}
          title="Click to manage store open/paused status & channels"
        >
          <span className={`w-2 h-2 rounded-full ${isAcceptingOrders ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="font-bold">{isAcceptingOrders ? 'Store: Open' : 'Store: Paused'}</span>
        </button>

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

        {/* Staff Role & Context Switcher (Phase 1 RBAC) */}
        <button
          onClick={onSwitchStaff}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-50 hover:bg-stone-100 border border-canvas-border text-xs font-semibold text-stone-800 transition-all shadow-sm"
          title="Click to switch active staff role / identity"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="max-w-[120px] truncate">{currentStaff ? currentStaff.name.split(' ')[0] : 'Staff'}</span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
            {currentStaff?.role || 'Staff'}
          </span>
        </button>

        {/* Profile Avatar Button */}
        <a
          href="/RestroPlus_Staff_How_To_Use_Manual.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas-100 hover:bg-canvas-200 border border-canvas-border text-xs font-semibold text-stone-700 transition-all shadow-xs"
          title="Open & Download Staff How-To Manual (PDF)"
        >
          <FileText className="w-3.5 h-3.5 text-stone-500" />
          <span className="hidden lg:inline">Staff Manual</span>
        </a>

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
