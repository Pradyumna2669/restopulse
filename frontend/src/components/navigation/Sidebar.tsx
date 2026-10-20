import React from 'react';
import {
  LayoutGrid,
  Coffee,
  UtensilsCrossed,
  ShoppingBag,
  QrCode,
  Boxes,
  Users,
  BarChart3,
  ChefHat,
  Bike,
  Calendar,
  Wallet,
  Settings,
  Smartphone,
  X,
  MessageCircle,
  Tv
} from 'lucide-react';
import { RestaurantProfile } from '../../types';

export type ActiveNavView =
  | 'overview'
  | 'menu'
  | 'pos'
  | 'tables'
  | 'inventory'
  | 'customers'
  | 'reports'
  | 'kds'
  | 'dispatch'
  | 'reservations'
  | 'cash-register'
  | 'waiter'
  | 'settings';

interface SidebarProps {
  profile: RestaurantProfile;
  activeView: ActiveNavView;
  onNavigate: (view: ActiveNavView) => void;
  onOpenCustomerView: () => void;
  activeOrderCount?: number;
  activeDispatchCount?: number;
  lowStockCount?: number;
  waitingGuestsCount?: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  openwaOnline?: boolean;
  onOpenTokenDisplay?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  profile,
  activeView,
  onNavigate,
  onOpenCustomerView,
  activeOrderCount = 0,
  activeDispatchCount = 0,
  lowStockCount = 0,
  waitingGuestsCount = 0,
  isOpenMobile,
  onCloseMobile,
  openwaOnline = false,
  onOpenTokenDisplay
}) => {
  const isCafe = !profile.businessType || profile.businessType === 'cafe' || profile.businessType === 'bakery';
  const osLabel = isCafe ? 'CAFÉ OS' : 'RESTAURANT OS';

  const manageNavItems: Array<{
    id: ActiveNavView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'menu', label: 'Menu & pricing', icon: isCafe ? Coffee : UtensilsCrossed },
    { id: 'pos', label: 'Orders & POS', icon: ShoppingBag, badge: activeOrderCount, badgeColor: 'bg-terracotta-500 text-white' },
    { id: 'tables', label: 'Tables & QR', icon: QrCode },
    { id: 'inventory', label: 'Inventory', icon: Boxes, badge: lowStockCount, badgeColor: 'bg-amber-500 text-stone-900' },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 }
  ];

  const operationsNavItems: Array<{
    id: ActiveNavView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    { id: 'kds', label: 'Kitchen KDS', icon: ChefHat, badge: activeOrderCount, badgeColor: 'bg-sage-500 text-white' },
    { id: 'waiter', label: 'Waiter Companion', icon: Smartphone },
    { id: 'dispatch', label: 'Dispatch & Riders', icon: Bike, badge: activeDispatchCount, badgeColor: 'bg-blue-500 text-white' },
    { id: 'reservations', label: 'Reservations', icon: Calendar, badge: waitingGuestsCount, badgeColor: 'bg-purple-500 text-white' },
    { id: 'cash-register', label: 'Cash Register', icon: Wallet }
  ];

  const handleNavClick = (view: ActiveNavView) => {
    onNavigate(view);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-olive-900 text-stone-200 border-r border-olive-800 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-olive-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8C5B0] flex items-center justify-center shadow-sm shrink-0">
              {isCafe ? (
                <Coffee className="w-5 h-5 text-stone-900" />
              ) : (
                <UtensilsCrossed className="w-5 h-5 text-stone-900" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-base">RestoPulse</span>
              </div>
              <span className="text-[10px] font-semibold text-olive-400 tracking-wider block">
                {osLabel}
              </span>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-olive-400 hover:text-white rounded-lg hover:bg-olive-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Business Selector Card */}
        <div className="px-3 pt-3">
          <div className="bg-olive-850 border border-olive-750/80 rounded-xl p-3 shadow-inner">
            <span className="text-[10px] font-bold text-olive-400 uppercase tracking-widest block mb-1">
              YOUR BUSINESS
            </span>
            <p className="font-bold text-sm text-white truncate">{profile.name || 'The Daily Grind'}</p>
            <p className="text-xs text-olive-400 truncate mt-0.5">{profile.tagline || 'Main Location'}</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {/* MANAGE */}
          <div>
            <span className="px-2 text-[10px] font-bold text-olive-400 uppercase tracking-widest block mb-1.5">
              MANAGE
            </span>
            <nav className="space-y-0.5">
              {manageNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-olive-750 text-white font-semibold shadow-sm'
                        : 'text-stone-300 hover:text-white hover:bg-olive-850'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-olive-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${item.badgeColor || 'bg-stone-700 text-stone-200'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* OPERATIONS */}
          <div>
            <span className="px-2 text-[10px] font-bold text-olive-400 uppercase tracking-widest block mb-1.5">
              OPERATIONS
            </span>
            <nav className="space-y-0.5">
              {operationsNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-olive-750 text-white font-semibold shadow-sm'
                        : 'text-stone-300 hover:text-white hover:bg-olive-850'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-olive-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${item.badgeColor || 'bg-stone-700 text-stone-200'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* CONFIGURATION */}
          <div>
            <span className="px-2 text-[10px] font-bold text-olive-400 uppercase tracking-widest block mb-1.5">
              CONFIGURATION
            </span>
            <nav className="space-y-0.5">
              <button
                onClick={() => handleNavClick('settings')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeView === 'settings'
                    ? 'bg-olive-750 text-white font-semibold'
                    : 'text-stone-300 hover:text-white hover:bg-olive-850'
                }`}
              >
                <Settings className={`w-4 h-4 ${activeView === 'settings' ? 'text-white' : 'text-olive-400'}`} />
                <span>{isCafe ? 'Café settings' : 'Restaurant settings'}</span>
              </button>

              <button
                onClick={onOpenCustomerView}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-olive-200 hover:text-white hover:bg-olive-850 transition-colors"
                title="Open customer digital menu in mobile mode"
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-terracotta-400" />
                  <span>Customer QR Menu</span>
                </div>
                <span className="text-[10px] bg-terracotta-500/20 text-terracotta-300 px-1.5 py-0.5 rounded font-mono">
                  Live
                </span>
              </button>

              {onOpenTokenDisplay && (
                <button
                  onClick={onOpenTokenDisplay}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-olive-200 hover:text-white hover:bg-olive-850 transition-colors"
                  title="Open Wall TV Order Pickup Token Display"
                >
                  <div className="flex items-center gap-2.5">
                    <Tv className="w-4 h-4 text-amber-400" />
                    <span>Pickup TV Screen</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                    TV
                  </span>
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Footer Gateway Status */}
        <div className="p-3 border-t border-olive-850 bg-olive-950/60 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${openwaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-stone-400 font-mono text-[10px]">
              OpenWA: {openwaOnline ? 'Ready' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => handleNavClick('settings')}
            className="text-stone-400 hover:text-white"
            title="Configure OpenWA"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
};
