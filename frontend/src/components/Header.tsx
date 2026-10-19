import React from 'react';
import { RestaurantProfile, OrderType } from '../types';
import { Store, MessageCircle, Settings, Clock, UtensilsCrossed, Smartphone, BookOpen, LayoutGrid, ChefHat, BarChart3, Bike, Boxes, Wallet, Crown, Calendar } from 'lucide-react';

interface HeaderProps {
  profile: RestaurantProfile;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  selectedTableNumber?: string;
  onOpenTableModal: () => void;
  openwaOnline: boolean;
  activeOrderCount?: number;
  activeDispatchCount?: number;
  lowStockCount?: number;
  onOpenKds: () => void;
  onOpenDispatchBoard?: () => void;
  onOpenInventory?: () => void;
  onOpenCashRegister?: () => void;
  onOpenCrm?: () => void;
  onOpenReservations?: () => void;
  waitingGuestsCount?: number;
  onOpenSettings: () => void;
  onOpenBills: () => void;
  onOpenMenuManager: () => void;
  onOpenTableManager: () => void;
  onSwitchToCustomerView: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  orderType,
  setOrderType,
  selectedTableNumber,
  onOpenTableModal,
  openwaOnline,
  activeOrderCount = 0,
  activeDispatchCount = 0,
  lowStockCount = 0,
  onOpenKds,
  onOpenDispatchBoard,
  onOpenInventory,
  onOpenCashRegister,
  onOpenCrm,
  onOpenReservations,
  waitingGuestsCount = 0,
  onOpenSettings,
  onOpenBills,
  onOpenMenuManager,
  onOpenTableManager,
  onSwitchToCustomerView
}) => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { featureFlags } = profile;

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between shadow-md">
      {/* Brand & Store Name */}
      <div className="flex items-center space-x-3">
        <div className="bg-gradient-to-tr from-brand-600 to-amber-500 text-white p-2.5 rounded-xl shadow-lg flex items-center justify-center">
          <UtensilsCrossed className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-white tracking-tight">{profile.name}</h1>
            <span className="text-[11px] font-semibold bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full border border-brand-500/30">
              STAFF POS TERMINAL
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center space-x-2">
            <span>{profile.address}</span>
            <span>•</span>
            <span className="text-slate-300 font-mono">GSTIN: {profile.gstin}</span>
          </p>
        </div>
      </div>

      {/* Order Mode (Configured dynamically by Admin Feature Flags) */}
      <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700/80">
        {featureFlags.enableDineIn && (
          <button
            onClick={() => {
              setOrderType('dine_in');
              onOpenTableModal();
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              orderType === 'dine_in'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Dine-In</span>
            {selectedTableNumber && (
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded ml-1 font-bold">
                {selectedTableNumber}
              </span>
            )}
          </button>
        )}

        {featureFlags.enableTakeaway && (
          <button
            onClick={() => setOrderType('takeaway')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              orderType === 'takeaway'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Takeaway</span>
          </button>
        )}

        {featureFlags.enableDelivery && (
          <button
            onClick={() => setOrderType('delivery')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              orderType === 'delivery'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Delivery</span>
          </button>
        )}
      </div>

      {/* Right Tools: Table QRs, Customer View Switcher, OpenWA Status, History, Settings */}
      <div className="flex items-center space-x-2.5">
        {/* Live KDS Screen Button */}
        <button
          onClick={onOpenKds}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
          title="Open Kitchen Display System (KDS)"
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Kitchen KDS</span>
          {activeOrderCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-white text-amber-700 text-[10px] font-black flex items-center justify-center font-mono ml-0.5">
              {activeOrderCount}
            </span>
          )}
        </button>

        {/* Takeaway & Rider Dispatch Board */}
        {onOpenDispatchBoard && (
          <button
            onClick={onOpenDispatchBoard}
            className="flex items-center space-x-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-600 transition-colors"
            title="Open Takeaway Tokens & Rider Dispatch Board"
          >
            <Bike className="w-3.5 h-3.5 text-blue-400" />
            <span>Dispatch</span>
            {activeDispatchCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center font-mono ml-0.5">
                {activeDispatchCount}
              </span>
            )}
          </button>
        )}

        {/* Menu Management */}
        <button
          onClick={onOpenMenuManager}
          className="flex items-center space-x-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-600 transition-colors"
          title="Manage Menu Dishes & Pictures"
        >
          <BookOpen className="w-3.5 h-3.5 text-brand-400" />
          <span>Menu</span>
        </button>

        {/* Table Management */}
        <button
          onClick={onOpenTableManager}
          className="flex items-center space-x-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-600 transition-colors"
          title="Manage Tables & Secure QR Tokens"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-brand-400" />
          <span>Tables & QRs</span>
        </button>

        {/* Inventory Management */}
        {onOpenInventory && (
          <button
            onClick={onOpenInventory}
            className="flex items-center space-x-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-600 transition-colors"
            title="Manage Raw Materials, Stock Inward & Recipe Costing"
          >
            <Boxes className="w-3.5 h-3.5 text-amber-400" />
            <span>Inventory</span>
            {lowStockCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center font-mono ml-0.5 animate-pulse">
                {lowStockCount}
              </span>
            )}
          </button>
        )}

        {/* Cash Drawer Register */}
        {onOpenCashRegister && (
          <button
            onClick={onOpenCashRegister}
            className="flex items-center space-x-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-600 transition-colors"
            title="Cash Drawer Register & Shift Management"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cash Drawer</span>
          </button>
        )}

        {/* Customer CRM & Loyalty */}
        {onOpenCrm && (
          <button
            onClick={onOpenCrm}
            className="flex items-center space-x-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-600 transition-colors"
            title="Customer CRM, VIP Profiles & Loyalty Wallet"
          >
            <Crown className="w-3.5 h-3.5 text-purple-400" />
            <span>CRM</span>
          </button>
        )}

        {/* Table Reservations & Waitlist */}
        {onOpenReservations && (
          <button
            onClick={onOpenReservations}
            className="flex items-center space-x-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-600 transition-colors"
            title="Table Reservations & Live Walk-in Waitlist"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Bookings</span>
            {waitingGuestsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center font-mono ml-0.5">
                {waitingGuestsCount}
              </span>
            )}
          </button>
        )}

        {/* Customer View Switcher */}
        <button
          onClick={onSwitchToCustomerView}
          className="flex items-center space-x-1.5 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
          title="Switch to Customer Mobile View"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Customer View</span>
        </button>

        {/* OpenWA Status Indicator */}
        <div 
          onClick={onOpenSettings}
          title={openwaOnline ? 'OpenWA Gateway: Connected (Port 2785)' : 'OpenWA Gateway: Offline (Run U:\\auto-wa\\OpenWA)'}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${
            openwaOnline
              ? 'bg-emerald-950/60 border-emerald-700/70 text-emerald-300'
              : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
          }`}
        >
          <MessageCircle className={`w-3.5 h-3.5 ${openwaOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="font-medium text-[11px]">
            OpenWA: {openwaOnline ? 'Ready' : 'Offline'}
          </span>
          <span className={`w-2 h-2 rounded-full ${openwaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </div>

        {/* Live Clock */}
        <div className="hidden xl:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-slate-300">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Reports & EOD Button */}
        <button
          onClick={onOpenBills}
          className="flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600 transition-colors"
          title="Open Day-End Reports & Invoices"
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          <span>Reports & EOD</span>
        </button>

        {/* Admin Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-lg border border-slate-600/70 transition-colors"
          title="Admin Settings & Feature Flags"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
