import React, { useState } from 'react';
import {
  RestaurantProfile,
  Category,
  MenuItem,
  RestaurantTable,
  CartItem,
  Variation,
  Addon,
  Bill,
  PaymentMode
} from '../types';
import {
  UtensilsCrossed,
  Search,
  Plus,
  Minus,
  Lock,
  ShoppingBag,
  CheckCircle2,
  Star,
  MessageCircle,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Sparkles,
  ChefHat
} from 'lucide-react';
import { VariationModal } from './VariationModal';
import { ApiService } from '../services/api';

interface CustomerOrderViewProps {
  profile: RestaurantProfile;
  table: RestaurantTable;
  categories: Category[];
  items: MenuItem[];
  onExitToAdmin?: () => void;
}

export const CustomerOrderView: React.FC<CustomerOrderViewProps> = ({
  profile,
  table,
  categories,
  items,
  onExitToAdmin
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Customer Checkout Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Placed Order State
  const [confirmedBill, setConfirmedBill] = useState<Bill | null>(null);

  // Filter items
  const filteredItems = items.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) {
        return false;
      }
    } else {
      if (activeCategoryId && activeCategoryId !== 'all' && item.categoryId !== activeCategoryId) {
        return false;
      }
    }
    if (foodFilter !== 'all' && item.foodType !== foodFilter) return false;
    return true;
  });

  // Cart operations
  const handleItemClick = (item: MenuItem) => {
    const hasOptions = (item.variations && item.variations.length > 0) || (item.addons && item.addons.length > 0);
    if (hasOptions) {
      setCustomizingItem(item);
    } else {
      addToCart(item);
    }
  };

  const addToCart = (item: MenuItem, variation?: Variation, addons?: Addon[]) => {
    const varKey = variation ? variation.id : 'base';
    const addonKey = addons ? addons.map(a => a.id).sort().join(',') : '';
    const cartItemId = `${item.id}_${varKey}_${addonKey}`;

    let unitPrice = variation ? variation.price : item.basePrice;
    if (addons) {
      addons.forEach(a => { unitPrice += a.price; });
    }

    setCart(prev => {
      const existing = prev.find(i => i.cartItemId === cartItemId);
      if (existing) {
        return prev.map(i =>
          i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          unitPrice,
          selectedVariation: variation,
          selectedAddons: addons,
          station: item.station
        }
      ];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => {
          if (i.cartItemId === cartItemId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Calculations
  const subtotal = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const cgst = Number((subtotal * 0.025).toFixed(2));
  const sgst = Number((subtotal * 0.025).toFixed(2));
  const grandTotal = Math.round(subtotal + cgst + sgst);
  const totalItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone.trim()) {
      alert('Please enter your WhatsApp mobile number to receive your digital bill & invoice.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await ApiService.placeCustomerOrder({
        tableId: table.id,
        customerName: customerName.trim() || 'Guest',
        customerPhone: customerPhone.trim(),
        items: cart,
        paymentMode,
        specialNotes
      });

      setConfirmedBill(res.bill);
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order Confirmed Screen
  if (confirmedBill) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-black tracking-widest uppercase bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
              ORDER CONFIRMED & KOT PRINTED
            </span>
            <h2 className="text-2xl font-black text-white mt-3">Thank you, {confirmedBill.customerName}!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your order <strong className="text-brand-400">#{confirmedBill.orderNumber}</strong> has been sent to the kitchen for <strong className="text-white">Table {table.tableNumber}</strong>.
            </p>
          </div>

          {/* Kitchen Tracker */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center space-x-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">1</div>
              <span className="text-slate-200 font-medium">Order Received by Chef</span>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold animate-pulse">2</div>
              <span className="text-amber-300 font-bold">Preparing fresh at Kitchen Station</span>
            </div>
            <div className="flex items-center space-x-3 text-xs opacity-60">
              <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center font-bold">3</div>
              <span className="text-slate-400">Serving hot at Table {table.tableNumber}</span>
            </div>
          </div>

          {/* WhatsApp Invoicing Notice */}
          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-4 flex items-center space-x-3 text-left">
            <MessageCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-emerald-300">Digital Tax Invoice Sent</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Sent to <strong className="text-slate-200">{confirmedBill.customerPhone}</strong> via OpenWA.
              </p>
            </div>
          </div>

          {/* Google 5-Star Review Call To Action */}
          <div className="bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-amber-700/50 rounded-2xl p-4 text-center space-y-2">
            <div className="flex justify-center space-x-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-xs font-bold text-white">How is your dining experience?</p>
            <p className="text-[11px] text-slate-300">
              Support our chefs with a quick 5-star review on Google!
            </p>
            <a
              href={profile.googlePlaceReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Leave a 5-Star Google Review</span>
            </a>
          </div>

          <button
            onClick={() => setConfirmedBill(null)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-3 rounded-xl transition-colors"
          >
            Order Additional Items
          </button>
        </div>
      </div>
    );
  }

  const renderCustomerDishCard = (item: MenuItem) => {
    const hasOptions = (item.variations && item.variations.length > 0) || (item.addons && item.addons.length > 0);
    const inCartCount = cart
      .filter(c => c.menuItemId === item.id)
      .reduce((sum, c) => sum + c.quantity, 0);

    return (
      <div
        key={item.id}
        onClick={() => {
          if (item.inStock) handleItemClick(item);
        }}
        className={`bg-slate-900/90 border rounded-2xl p-3 flex items-start space-x-3.5 transition-all ${
          item.inStock
            ? 'border-slate-800/80 hover:border-slate-700 cursor-pointer active:scale-[0.99]'
            : 'border-slate-850 opacity-50 cursor-not-allowed'
        }`}
      >
        {/* Dish Photo */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 relative">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700 text-[10px]">
              No Photo
            </div>
          )}

          {/* Food Type Badge */}
          <span
            className={`absolute top-1 left-1 w-3.5 h-3.5 rounded border flex items-center justify-center p-0.5 bg-slate-900/80 ${
              item.foodType === 'veg' ? 'border-emerald-500' : 'border-rose-500'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                item.foodType === 'veg' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </span>

          {!item.inStock && (
            <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-[9px] font-bold text-rose-300">
              Sold Out
            </div>
          )}
        </div>

        {/* Details & Action */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="pr-2">
              <h3 className="text-xs font-bold text-white line-clamp-1">{item.name}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Add Button */}
            <div className="shrink-0">
              {inCartCount > 0 ? (
                <div className="flex items-center bg-brand-600 text-white rounded-xl px-2 py-1 text-xs font-bold shadow-md">
                  <span>{inCartCount} in cart</span>
                </div>
              ) : item.inStock ? (
                <button className="flex items-center space-x-1 bg-brand-600/20 text-brand-300 border border-brand-500/40 px-2.5 py-1 rounded-xl text-xs font-bold hover:bg-brand-600 hover:text-white transition-all">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{hasOptions ? 'Custom' : 'Add'}</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="text-xs font-black text-brand-400 mt-2 font-mono flex items-center justify-between">
            <span>
              {profile.currencySymbol}{item.basePrice}
              {hasOptions && <span className="text-[9px] text-slate-500 ml-1 font-normal font-sans">onwards</span>}
            </span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold font-sans">
              {item.station}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-lg mx-auto shadow-2xl pb-24 relative select-none">
      {/* Customer Header (LOCKED to Table) */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-brand-600 text-white p-2 rounded-xl">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-tight">{profile.name}</h1>
            <p className="text-[10px] text-slate-400">{profile.tagline}</p>
          </div>
        </div>

        {/* LOCKED TABLE BADGE (User cannot select other tables!) */}
        <div className="flex items-center space-x-1.5 bg-brand-500/15 border border-brand-500/40 text-brand-300 px-2.5 py-1 rounded-full text-xs font-bold shadow-inner">
          <Lock className="w-3 h-3 text-brand-400" />
          <span>Table: {table.tableNumber}</span>
        </div>
      </header>

      {/* Top Banner Notice */}
      <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center space-x-1">
          <ChefHat className="w-3.5 h-3.5 text-amber-400" />
          <span>Contactless Dining • Section: <strong>{table.section}</strong></span>
        </span>
        {onExitToAdmin && (
          <button
            onClick={onExitToAdmin}
            className="text-[10px] text-slate-500 hover:text-slate-300 underline"
          >
            Switch to Staff POS
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-slate-900/60 border-b border-slate-800/60 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search menu items..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Veg / Non-Veg Quick Switch */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFoodFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              foodFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFoodFilter('veg')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold ${
              foodFilter === 'veg' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Pure Veg</span>
          </button>
          <button
            onClick={() => setFoodFilter('non-veg')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold ${
              foodFilter === 'non-veg' ? 'bg-rose-600 text-white' : 'text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Non-Veg</span>
          </button>
        </div>
      </div>

      {/* Categories Carousel */}
      <div className="px-3 py-2 bg-slate-900/40 border-b border-slate-800/60 flex items-center space-x-2 overflow-x-auto scrollbar-none">
        {/* All Dishes Tab */}
        <button
          onClick={() => {
            setSearchQuery('');
            setActiveCategoryId('all');
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            !searchQuery && activeCategoryId === 'all'
              ? 'bg-brand-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>🍽️</span>
          <span>All Dishes</span>
        </button>

        {/* Individual Category Tabs */}
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setSearchQuery('');
              setActiveCategoryId(cat.id);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              !searchQuery && activeCategoryId === cat.id
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Menu Item Cards: GROUPED BY CATEGORY BY DEFAULT */}
      <div className="p-3 space-y-4">
        {activeCategoryId === 'all' && !searchQuery.trim() ? (
          // Category-wise grouped view by default
          categories.map(cat => {
            const catItems = filteredItems.filter(item => item.categoryId === cat.id);
            if (catItems.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-2.5">
                {/* Category Header */}
                <div className="flex items-center space-x-2 pt-2 pb-1.5 border-b border-slate-800/80 sticky top-[48px] bg-slate-950/95 backdrop-blur z-10">
                  <span className="text-base">{cat.icon}</span>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-200">{cat.name}</h2>
                  <span className="text-[10px] font-semibold text-slate-500 font-mono">
                    ({catItems.length})
                  </span>
                </div>

                {/* Category Dishes List */}
                <div className="space-y-3">
                  {catItems.map(item => renderCustomerDishCard(item))}
                </div>
              </div>
            );
          })
        ) : (
          // Filtered by specific category or search query
          <div className="space-y-3">
            {searchQuery.trim() && (
              <div className="text-xs text-slate-400 py-1">
                Found <strong>{filteredItems.length}</strong> matching "{searchQuery}"
              </div>
            )}
            {filteredItems.map(item => renderCustomerDishCard(item))}
            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No dishes found matching your selection.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Pill */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-500 hover:to-amber-500 text-white py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between font-bold text-sm transition-all transform active:scale-95 ring-2 ring-white/20"
          >
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5" />
              <span>{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in your order</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-base font-black">
                {profile.currencySymbol}{grandTotal}
              </span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Item Customization Modal */}
      {customizingItem && (
        <VariationModal
          item={customizingItem}
          currencySymbol={profile.currencySymbol}
          onConfirm={(item, variation, addons) => addToCart(item, variation, addons)}
          onClose={() => setCustomizingItem(null)}
        />
      )}

      {/* Checkout Drawer / Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-brand-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Review Order & Pay</h3>
                  <span className="text-[11px] text-brand-300 font-semibold">Table {table.tableNumber}</span>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                Close
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 max-h-56">
              {cart.map(item => (
                <div key={item.cartItemId} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/80 pb-2">
                  <div className="flex-1 pr-2">
                    <p className="font-semibold text-white">{item.name}</p>
                    {item.selectedVariation && (
                      <span className="text-[10px] text-brand-400 font-medium">({item.selectedVariation.name})</span>
                    )}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <span className="text-[10px] text-slate-400 block">+{item.selectedAddons.map(a => a.name).join(', ')}</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                      <button
                        onClick={() => updateQuantity(item.cartItemId, -1)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-white text-[11px]">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, 1)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-mono font-bold text-white w-14 text-right">
                      {profile.currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Form & Payment Selector */}
            <form onSubmit={handlePlaceOrder} className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
              {/* Customer WhatsApp Mobile */}
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  Your WhatsApp Number (For Digital Invoice) *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <MessageCircle className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Your itemized tax invoice will be sent via WhatsApp right after ordering.
                </p>
              </div>

              {/* Customer Name */}
              <div>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Your Name (Optional)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Special Instructions */}
              <div>
                <input
                  type="text"
                  value={specialNotes}
                  onChange={e => setSpecialNotes(e.target.value)}
                  placeholder="Special instructions (e.g. Less spicy, extra napkins)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  How will you pay?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('upi')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold ${
                      paymentMode === 'upi'
                        ? 'bg-violet-600 text-white border-violet-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mb-0.5" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold ${
                      paymentMode === 'cash'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mb-0.5" />
                    <span>Cash to Waiter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('card')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold ${
                      paymentMode === 'card'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-0.5" />
                    <span>Card</span>
                  </button>
                </div>
              </div>

              {/* Grand Total Breakdown */}
              <div className="pt-2 border-t border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Subtotal + 5% GST (CGST+SGST):</span>
                  <span className="font-mono text-slate-300">{profile.currencySymbol}{grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-extrabold text-sm pt-1">
                  <span>Grand Total</span>
                  <span className="text-brand-400 font-mono text-base">{profile.currencySymbol}{grandTotal}</span>
                </div>
              </div>

              {/* Submit Order Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-500 hover:to-amber-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Sending to Kitchen...</span>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4" />
                    <span>Place Order & Generate Bill</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
