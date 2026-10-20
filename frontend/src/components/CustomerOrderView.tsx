import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Coffee,
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
  ChefHat,
  X
} from 'lucide-react';
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

  const isCafe = !profile.businessType || profile.businessType === 'cafe' || profile.businessType === 'bakery';

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
    setCart(prev => {
      return prev
        .map(i => {
          if (i.cartItemId === cartItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = Math.round(subtotal * 0.05); // 5% GST
  const grandTotal = subtotal + taxAmount;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit Order directly into Kitchen KDS & Billing
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerPhone.trim()) {
      alert('Please enter your mobile phone number for digital tax invoice & order tracking');
      return;
    }

    try {
      setIsSubmitting(true);

      // Place order through backend customer-order API which creates order + bill + triggers OpenWA
      const res = await ApiService.placeCustomerOrder({
        tableId: table.id,
        customerName: customerName.trim() || `Guest (Table ${table.tableNumber})`,
        customerPhone: customerPhone.trim(),
        items: cart,
        paymentMode,
        specialNotes: specialNotes.trim() || undefined
      });

      setConfirmedBill(res.bill);
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (err) {
      console.error('Order placement failed:', err);
      alert('Failed to send order to kitchen. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If order confirmed, show order success screen
  if (confirmedBill) {
    return (
      <div className="min-h-screen bg-canvas-100 flex items-center justify-center p-4">
        <div className="bg-white border border-canvas-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-card text-center space-y-6">
          <div className="w-16 h-16 bg-sage-50 text-sage-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-sage-100">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold tracking-widest uppercase bg-sage-50 text-sage-700 px-3 py-1 rounded-full border border-sage-200">
              ORDER CONFIRMED & FIRED TO KITCHEN
            </span>
            <h2 className="text-2xl font-bold text-stone-900 mt-3">Thank you, {confirmedBill.customerName}!</h2>
            <p className="text-xs text-stone-500 mt-1">
              Your order <strong className="text-terracotta-600">#{confirmedBill.orderNumber}</strong> has been sent to the kitchen for <strong className="text-stone-900">Table {table.tableNumber}</strong>.
            </p>
          </div>

          {/* Kitchen Tracker */}
          <div className="bg-canvas-100 border border-canvas-border rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center space-x-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-sage-500 text-white flex items-center justify-center font-bold">1</div>
              <span className="text-stone-800 font-medium">Order Received by Chef</span>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-terracotta-500 text-white flex items-center justify-center font-bold animate-pulse">2</div>
              <span className="text-terracotta-700 font-bold">Preparing fresh at Kitchen Station</span>
            </div>
            <div className="flex items-center space-x-3 text-xs opacity-60">
              <div className="w-6 h-6 rounded-full bg-stone-300 text-stone-700 flex items-center justify-center font-bold">3</div>
              <span className="text-stone-500">Serving hot at Table {table.tableNumber}</span>
            </div>
          </div>

          {/* WhatsApp Invoicing Notice */}
          <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 flex items-center space-x-3 text-left">
            <MessageCircle className="w-6 h-6 text-sage-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-sage-800">Digital Tax Invoice Dispatched</p>
              <p className="text-stone-600 text-[11px] mt-0.5">
                Sent to <strong className="text-stone-800">{confirmedBill.customerPhone}</strong> via OpenWA.
              </p>
            </div>
          </div>

          {/* Google 5-Star Review Call To Action */}
          <div className="bg-canvas-100 border border-canvas-border rounded-2xl p-4 text-center space-y-2">
            <div className="flex justify-center space-x-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-xs font-bold text-stone-900">How is your dining experience?</p>
            <p className="text-[11px] text-stone-500">
              Support our kitchen with a quick 5-star review on Google!
            </p>
            <a
              href={profile.googlePlaceReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm transition-transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Leave a 5-Star Google Review</span>
            </a>
          </div>

          <button
            onClick={() => setConfirmedBill(null)}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-3 rounded-full transition-colors"
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
        className={`bg-white border rounded-2xl p-3 flex items-start space-x-3.5 transition-all shadow-card ${
          item.inStock
            ? 'border-canvas-border hover:border-stone-300 cursor-pointer active:scale-[0.99]'
            : 'border-canvas-border opacity-50 cursor-not-allowed'
        }`}
      >
        {/* Dish Photo */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-canvas-200 border border-canvas-border shrink-0 relative">
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
            <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">
              {isCafe ? <Coffee className="w-6 h-6 text-stone-300" /> : <UtensilsCrossed className="w-6 h-6 text-stone-300" />}
            </div>
          )}

          {/* Food Type Badge */}
          <span
            className={`absolute top-1 left-1 w-3.5 h-3.5 rounded border flex items-center justify-center p-0.5 bg-white/90 shadow-sm ${
              item.foodType === 'veg' ? 'border-emerald-600' : 'border-rose-600'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                item.foodType === 'veg' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            />
          </span>

          {!item.inStock && (
            <div className="absolute inset-0 bg-stone-900/75 flex items-center justify-center text-[9px] font-bold text-white">
              Sold Out
            </div>
          )}
        </div>

        {/* Details & Action */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="pr-2">
              <h3 className="text-xs font-bold text-stone-900 line-clamp-1">{item.name}</h3>
              <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Add Button */}
            <div className="shrink-0">
              {inCartCount > 0 ? (
                <div className="flex items-center bg-terracotta-500 text-white rounded-xl px-2.5 py-1 text-xs font-bold shadow-sm">
                  <span>{inCartCount} added</span>
                </div>
              ) : item.inStock ? (
                <button className="flex items-center space-x-1 bg-terracotta-50 text-terracotta-600 border border-terracotta-200 px-3 py-1 rounded-xl text-xs font-bold hover:bg-terracotta-500 hover:text-white transition-all shadow-sm">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{hasOptions ? 'Custom' : 'Add'}</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="text-xs font-bold text-stone-900 mt-2 font-mono flex items-center justify-between">
            <span>
              {profile.currencySymbol}{item.basePrice}
              {hasOptions && <span className="text-[9px] text-stone-400 ml-1 font-normal font-sans">onwards</span>}
            </span>
            <span className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold font-sans">
              {item.station}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-canvas-100 text-stone-800 flex flex-col max-w-lg mx-auto shadow-xl pb-24 relative select-none">
      {/* Customer Header (LOCKED to Table) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-canvas-border px-4 py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center space-x-3">
          <div className="bg-[#E8C5B0] text-stone-900 p-2 rounded-xl">
            {isCafe ? <Coffee className="w-4 h-4" /> : <UtensilsCrossed className="w-4 h-4" />}
          </div>
          <div>
            <h1 className="text-sm font-bold text-stone-900 leading-tight">{profile.name}</h1>
            <p className="text-[10px] text-stone-500">{profile.tagline}</p>
          </div>
        </div>

        {/* LOCKED TABLE BADGE */}
        <div className="flex items-center space-x-1.5 bg-canvas-200 border border-canvas-border text-stone-700 px-3 py-1 rounded-full text-xs font-bold shadow-inner">
          <Lock className="w-3 h-3 text-stone-500" />
          <span>Table {table.tableNumber}</span>
        </div>
      </header>

      {/* Top Banner Notice */}
      <div className="bg-canvas-200/60 px-4 py-2 border-b border-canvas-border flex items-center justify-between text-[11px] text-stone-500">
        <span className="flex items-center space-x-1">
          <ChefHat className="w-3.5 h-3.5 text-stone-400" />
          <span>Section: <strong>{table.section}</strong> • Live Kitchen Connected</span>
        </span>
        {onExitToAdmin && (
          <button
            onClick={onExitToAdmin}
            className="text-[10px] text-terracotta-600 hover:text-terracotta-800 font-semibold"
          >
            Staff Admin
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-white border-b border-canvas-border space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search coffee, bowls, dishes..."
            className="w-full bg-canvas-100 border border-canvas-border rounded-xl pl-9 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white"
          />
        </div>

        {/* Veg / Non-Veg Quick Switch */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFoodFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              foodFilter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-canvas-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFoodFilter('veg')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold ${
              foodFilter === 'veg' ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:bg-canvas-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Pure Veg</span>
          </button>
          <button
            onClick={() => setFoodFilter('non-veg')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold ${
              foodFilter === 'non-veg' ? 'bg-rose-600 text-white' : 'text-stone-500 hover:bg-canvas-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Non-Veg</span>
          </button>
        </div>
      </div>

      {/* Categories Carousel */}
      <div className="px-3 py-2 bg-white/80 border-b border-canvas-border flex items-center space-x-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            setSearchQuery('');
            setActiveCategoryId('all');
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            !searchQuery && activeCategoryId === 'all'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-canvas-100 text-stone-600 border border-canvas-border hover:bg-canvas-200'
          }`}
        >
          <span>🍽️</span>
          <span>All Items</span>
        </button>

        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setSearchQuery('');
              setActiveCategoryId(cat.id);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              !searchQuery && activeCategoryId === cat.id
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-canvas-100 text-stone-600 border border-canvas-border hover:bg-canvas-200'
            }`}
          >
            <span>{cat.icon || '☕'}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Menu Item Cards: GROUPED BY CATEGORY BY DEFAULT */}
      <div className="p-3 space-y-4">
        {activeCategoryId === 'all' && !searchQuery.trim() ? (
          categories.map(cat => {
            const catItems = filteredItems.filter(item => item.categoryId === cat.id);
            if (catItems.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-2.5">
                <div className="flex items-center space-x-2 pt-2 pb-1 border-b border-canvas-border sticky top-[48px] bg-canvas-100/95 backdrop-blur z-10">
                  <span className="text-base">{cat.icon || '☕'}</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">{cat.name}</h2>
                  <span className="text-[10px] font-semibold text-stone-400 font-mono">
                    ({catItems.length})
                  </span>
                </div>

                <div className="space-y-2.5">
                  {catItems.map(item => renderCustomerDishCard(item))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-2.5">
            {searchQuery.trim() && (
              <div className="text-xs text-stone-500 py-1">
                Found <strong>{filteredItems.length}</strong> matching "{searchQuery}"
              </div>
            )}
            {filteredItems.map(item => renderCustomerDishCard(item))}
            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-stone-400 text-xs">
                No items found matching your filter.
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
            className="w-full bg-terracotta-500 hover:bg-terracotta-600 text-white py-3.5 px-5 rounded-2xl shadow-lg flex items-center justify-between font-bold text-sm transition-all transform active:scale-95 ring-2 ring-terracotta-300/40"
          >
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5" />
              <span>{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in your order</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-base font-bold">
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
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-canvas-border rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-modal">
            {/* Header */}
            <div className="p-4 border-b border-canvas-border flex items-center justify-between bg-canvas-50">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-terracotta-600" />
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Review Order & Pay</h3>
                  <span className="text-[11px] text-stone-500 font-semibold">Table {table.tableNumber}</span>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 max-h-56 divide-y divide-canvas-border">
              {cart.map(item => (
                <div key={item.cartItemId} className="flex items-center justify-between text-xs pt-2">
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-stone-900">{item.name}</p>
                    {item.selectedVariation && (
                      <span className="text-[10px] text-terracotta-600 font-medium">({item.selectedVariation.name})</span>
                    )}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <span className="text-[10px] text-stone-400 block">+{item.selectedAddons.map(a => a.name).join(', ')}</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center bg-canvas-100 rounded-lg p-0.5 border border-canvas-border">
                      <button
                        onClick={() => updateQuantity(item.cartItemId, -1)}
                        className="p-1 text-stone-500 hover:text-stone-900"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-stone-800 text-[11px]">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, 1)}
                        className="p-1 text-stone-500 hover:text-stone-900"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-mono font-bold text-stone-900 w-14 text-right">
                      {profile.currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="p-4 bg-canvas-50 border-t border-canvas-border text-xs space-y-1">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span className="font-mono">{profile.currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>GST (5%)</span>
                <span className="font-mono">{profile.currencySymbol}{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-canvas-border">
                <span>Total Payable</span>
                <span className="font-mono text-terracotta-600">{profile.currencySymbol}{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Customer Details Form */}
            <form onSubmit={handleSubmitOrder} className="p-4 border-t border-canvas-border space-y-3 bg-white">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Guest name"
                    className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-1">Phone Number (Required) *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400 font-mono"
                  />
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="text-[10px] font-bold text-stone-600 block mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('upi')}
                    className={`py-2 rounded-xl font-bold flex flex-col items-center justify-center border transition-all ${
                      paymentMode === 'upi'
                        ? 'bg-sage-50 border-sage-500 text-sage-800 shadow-sm'
                        : 'bg-canvas-100 border-canvas-border text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mb-0.5" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('card')}
                    className={`py-2 rounded-xl font-bold flex flex-col items-center justify-center border transition-all ${
                      paymentMode === 'card'
                        ? 'bg-sage-50 border-sage-500 text-sage-800 shadow-sm'
                        : 'bg-canvas-100 border-canvas-border text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-0.5" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className={`py-2 rounded-xl font-bold flex flex-col items-center justify-center border transition-all ${
                      paymentMode === 'cash'
                        ? 'bg-sage-50 border-sage-500 text-sage-800 shadow-sm'
                        : 'bg-canvas-100 border-canvas-border text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mb-0.5" />
                    <span>Cash</span>
                  </button>
                </div>
              </div>

              {/* Cooking / Preparation Notes */}
              <div>
                <label className="text-[10px] font-bold text-stone-600 block mb-1">Cooking / Special Notes (Optional)</label>
                <input
                  type="text"
                  value={specialNotes}
                  onChange={e => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Less spicy, oat milk, extra napkins"
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold py-3 rounded-full text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {isSubmitting ? 'Placing Order...' : `Confirm & Place Order (${profile.currencySymbol}${grandTotal})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
