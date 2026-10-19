import React, { useState } from 'react';
import { CartItem, OrderType } from '../types';
import {
  Trash2,
  Plus,
  Minus,
  ChefHat,
  CheckCircle,
  Store,
  Tag,
  ChevronDown,
  ChevronUp,
  Percent,
  X
} from 'lucide-react';

interface CartProps {
  items: CartItem[];
  orderType: OrderType;
  tableNumber?: string;
  currencySymbol: string;
  discount: number;
  setDiscount: (val: number) => void;
  discountReason?: string;
  setDiscountReason?: (val: string) => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onPrintKOT: () => void;
  onOpenCheckout: () => void;
}

const DISCOUNT_REASONS = [
  'Zomato Gold',
  'Corporate / Staff',
  'Manager Discretion',
  'Happy Hours',
  'VIP Guest',
  'Promotional Campaign',
  'Customer Goodwill'
];

export const Cart: React.FC<CartProps> = ({
  items,
  orderType,
  tableNumber,
  currencySymbol,
  discount,
  setDiscount,
  discountReason = '',
  setDiscountReason,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onPrintKOT,
  onOpenCheckout
}) => {
  const [showDiscountPanel, setShowDiscountPanel] = useState<boolean>(false);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const cgst = Number((taxableAmount * 0.025).toFixed(2));
  const sgst = Number((taxableAmount * 0.025).toFixed(2));
  const rawTotal = taxableAmount + cgst + sgst;
  const grandTotal = Math.round(rawTotal);
  const roundOff = Number((grandTotal - rawTotal).toFixed(2));

  // Quick percent applicator
  const applyPercentDiscount = (percent: number) => {
    const calculated = Math.round((subtotal * percent) / 100);
    setDiscount(calculated);
    if (!discountReason && setDiscountReason) {
      setDiscountReason(`${percent}% Promotional Discount`);
    }
  };

  const applyFlatDiscount = (amount: number) => {
    const calculated = Math.min(subtotal, amount);
    setDiscount(calculated);
    if (!discountReason && setDiscountReason) {
      setDiscountReason(`Flat ${currencySymbol}${amount} Off`);
    }
  };

  const handleClearDiscount = () => {
    setDiscount(0);
    if (setDiscountReason) setDiscountReason('');
  };

  return (
    <div className="w-96 bg-slate-850 border-l border-slate-700/80 flex flex-col h-full shadow-2xl bg-slate-800/95">
      {/* Cart Header */}
      <div className="p-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-850">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                {orderType === 'dine_in' ? 'Dine-In' : orderType.toUpperCase()}
              </span>
              {tableNumber && (
                <span className="text-xs font-black bg-brand-500/30 text-brand-300 px-2 py-0.5 rounded-full border border-brand-500/40">
                  {tableNumber}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {items.length} {items.length === 1 ? 'item' : 'items'} in order
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearCart}
            title="Reset Cart"
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {items.map(item => {
          const itemTotal = item.quantity * item.unitPrice;
          return (
            <div
              key={item.cartItemId}
              className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <h4 className="text-sm font-semibold text-white leading-tight">
                    {item.name}
                  </h4>
                  {item.selectedVariation && (
                    <span className="text-[11px] font-medium text-brand-400 block mt-0.5">
                      • {item.selectedVariation.name}
                    </span>
                  )}
                  {item.selectedAddons && item.selectedAddons.length > 0 && (
                    <span className="text-[11px] text-slate-400 block">
                      + {item.selectedAddons.map(a => a.name).join(', ')}
                    </span>
                  )}
                </div>

                <span className="text-sm font-bold text-white whitespace-nowrap">
                  {currencySymbol}{itemTotal.toFixed(2)}
                </span>
              </div>

              {/* Quantity Controls & Delete */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400">
                  {currencySymbol}{item.unitPrice} each
                </span>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                    <button
                      onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.cartItemId)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center px-4">
            <Store className="w-12 h-12 text-slate-600 mb-2 stroke-1" />
            <p className="text-sm font-semibold text-slate-400">Your order is empty</p>
            <p className="text-xs text-slate-500 mt-1">Tap any dish from the menu to add it to this bill</p>
          </div>
        )}
      </div>

      {/* Cart Summary & Actions */}
      {items.length > 0 && (
        <div className="p-4 bg-slate-900 border-t border-slate-700/80 space-y-3">
          
          {/* Discount Trigger Header */}
          <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-2.5">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowDiscountPanel(!showDiscountPanel)}
                className="flex items-center space-x-1.5 text-slate-300 hover:text-amber-300 font-semibold transition-colors"
              >
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Discount & Offers</span>
                {showDiscountPanel ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              <div className="flex items-center space-x-2">
                {discount > 0 && (
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    -{currencySymbol}{discount}
                  </span>
                )}
                {discount > 0 && (
                  <button
                    onClick={handleClearDiscount}
                    title="Remove Discount"
                    className="text-slate-400 hover:text-rose-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Discount Preset Drawer */}
            {showDiscountPanel && (
              <div className="mt-3 pt-2.5 border-t border-slate-700/60 space-y-2.5">
                {/* 1-Tap Percentage Chips */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                    Quick Discounts
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyPercentDiscount(pct)}
                        className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 border border-slate-700 text-[11px] font-bold transition-all text-center flex items-center justify-center space-x-0.5"
                      >
                        <Percent className="w-2.5 h-2.5" />
                        <span>{pct}%</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    {[50, 100].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => applyFlatDiscount(amt)}
                        className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 border border-slate-700 text-[11px] font-semibold transition-all text-center"
                      >
                        Flat {currencySymbol}{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount Input & Reason */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Custom Amt ({currencySymbol})</label>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      value={discount || ''}
                      onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400 text-right"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Discount Reason</label>
                    <select
                      value={discountReason}
                      onChange={e => setDiscountReason && setDiscountReason(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      <option value="">Select Reason...</option>
                      {DISCOUNT_REASONS.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Subtotal, GST Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-slate-200 font-mono">{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span className="truncate pr-2">
                  Discount {discountReason ? `(${discountReason})` : ''}
                </span>
                <span className="font-mono">-{currencySymbol}{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>CGST (2.5%)</span>
              <span className="text-slate-200 font-mono">{currencySymbol}{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST (2.5%)</span>
              <span className="text-slate-200 font-mono">{currencySymbol}{sgst.toFixed(2)}</span>
            </div>
            {roundOff !== 0 && (
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Round Off</span>
                <span className="font-mono">{currencySymbol}{roundOff.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700">
            <span className="text-sm font-extrabold text-white">Grand Total</span>
            <span className="text-xl font-black text-brand-400 font-mono">
              {currencySymbol}{grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onPrintKOT}
              className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span>Print KOT</span>
            </button>

            <button
              onClick={onOpenCheckout}
              className="flex items-center justify-center space-x-1.5 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-500 hover:to-amber-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-950/40 transition-all active:scale-[0.98]"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Settle & Bill</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
