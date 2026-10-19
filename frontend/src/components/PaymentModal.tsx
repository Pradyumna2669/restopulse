import React, { useState, useEffect } from 'react';
import { PaymentMode, OrderType, SplitPaymentEntry, CustomerProfile } from '../types';
import { ApiService } from '../services/api';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  MessageCircle,
  Star,
  Phone,
  User,
  CheckCircle,
  MapPin,
  Bike,
  Ticket,
  Crown,
  Split,
  Gift
} from 'lucide-react';

interface PaymentModalProps {
  total: number;
  currencySymbol: string;
  openwaOnline: boolean;
  orderType?: OrderType;
  tableNumber?: string;
  takeawayToken?: string;
  discountReason?: string;
  onConfirm: (data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress?: string;
    riderName?: string;
    takeawayToken?: string;
    paymentMode: PaymentMode;
    splitPayments?: SplitPaymentEntry[];
    pointsRedeemed?: number;
    sendWhatsApp: boolean;
    sendReviewPrompt: boolean;
  }) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  total,
  currencySymbol,
  openwaOnline,
  orderType = 'dine_in',
  tableNumber,
  takeawayToken: initialTakeawayToken,
  discountReason,
  onConfirm,
  onClose
}) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [riderName, setRiderName] = useState<string>('In-House Rider');
  const [customTakeawayToken, setCustomTakeawayToken] = useState<string>(initialTakeawayToken || '');
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [sendReviewPrompt, setSendReviewPrompt] = useState<boolean>(true);

  // CRM & Loyalty Points
  const [matchedCustomer, setMatchedCustomer] = useState<CustomerProfile | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [pointsRedeemed, setPointsRedeemed] = useState<number>(0);
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);

  // Split Tender State
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);

  // Cash Tendered for Single Cash Mode
  const effectiveTotal = Math.max(0, total - pointsRedeemed);
  const [tenderedCash, setTenderedCash] = useState<string>(String(effectiveTotal));

  // Auto lookup customer on phone number entry
  useEffect(() => {
    const clean = customerPhone.replace(/\D/g, '').slice(-10);
    if (clean.length === 10) {
      setIsSearchingCustomer(true);
      ApiService.getCustomerByPhone(clean)
        .then(profile => {
          if (profile) {
            setMatchedCustomer(profile);
            if (!customerName) {
              setCustomerName(profile.name);
            }
          } else {
            setMatchedCustomer(null);
            setIsRedeemingPoints(false);
            setPointsRedeemed(0);
          }
        })
        .finally(() => setIsSearchingCustomer(false));
    } else {
      setMatchedCustomer(null);
      setIsRedeemingPoints(false);
      setPointsRedeemed(0);
    }
  }, [customerPhone]);

  // Update tendered cash default if total changes
  useEffect(() => {
    setTenderedCash(String(effectiveTotal));
    if (isSplitMode) {
      // Default initial split to cash
      setSplitCash(effectiveTotal);
      setSplitUpi(0);
      setSplitCard(0);
    }
  }, [effectiveTotal, isSplitMode]);

  const changeDue = Math.max(0, Number(tenderedCash || 0) - effectiveTotal);

  // Split Calculation
  const totalSplitTendered = Number((splitCash + splitUpi + splitCard).toFixed(2));
  const splitRemaining = Number((effectiveTotal - totalSplitTendered).toFixed(2));

  const handleToggleRedeemPoints = () => {
    if (!matchedCustomer || matchedCustomer.loyaltyPoints <= 0) return;
    if (isRedeemingPoints) {
      setIsRedeemingPoints(false);
      setPointsRedeemed(0);
    } else {
      // Max redeemable is the customer's points, but capped at the total amount
      const maxRedeem = Math.min(matchedCustomer.loyaltyPoints, Math.floor(total));
      setIsRedeemingPoints(true);
      setPointsRedeemed(maxRedeem);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSplitMode) {
      if (Math.abs(splitRemaining) > 0.5) {
        alert(`Split Tender Incomplete! Please allocate the remaining ${currencySymbol}${Math.abs(splitRemaining).toFixed(2)}.`);
        return;
      }

      const splitEntries: SplitPaymentEntry[] = [];
      if (splitCash > 0) splitEntries.push({ mode: 'cash', amount: splitCash });
      if (splitUpi > 0) splitEntries.push({ mode: 'upi', amount: splitUpi });
      if (splitCard > 0) splitEntries.push({ mode: 'card', amount: splitCard });

      onConfirm({
        customerName,
        customerPhone,
        deliveryAddress,
        riderName: orderType === 'delivery' ? riderName : undefined,
        takeawayToken: orderType === 'takeaway' ? customTakeawayToken : undefined,
        paymentMode: 'split',
        splitPayments: splitEntries,
        pointsRedeemed,
        sendWhatsApp,
        sendReviewPrompt
      });
    } else {
      onConfirm({
        customerName,
        customerPhone,
        deliveryAddress,
        riderName: orderType === 'delivery' ? riderName : undefined,
        takeawayToken: orderType === 'takeaway' ? customTakeawayToken : undefined,
        paymentMode,
        pointsRedeemed,
        sendWhatsApp,
        sendReviewPrompt
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-850">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Settle & Generate Invoice</span>
            </h2>
            <p className="text-xs text-slate-400">
              {tableNumber
                ? `Table ${tableNumber}`
                : orderType === 'takeaway'
                ? `Takeaway ${customTakeawayToken ? `#${customTakeawayToken}` : ''}`
                : 'Direct Delivery'} • Digital Invoice & Instant Points
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Total Payable Banner */}
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 block">Total Amount Payable</span>
              {discountReason && (
                <span className="text-[11px] text-amber-400 font-medium">Discount: {discountReason}</span>
              )}
              {pointsRedeemed > 0 && (
                <span className="text-[11px] text-purple-400 font-semibold block">
                  Loyalty Points Redeemed: -{currencySymbol}{pointsRedeemed.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-brand-400 font-mono">
                {currencySymbol}{effectiveTotal.toFixed(2)}
              </span>
              {pointsRedeemed > 0 && (
                <span className="text-xs text-slate-500 line-through block">
                  {currencySymbol}{total.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Customer CRM Phone Lookup */}
          <div className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-3.5 space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Customer Identification & Loyalty Lookup
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="WhatsApp Mobile #"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Guest Name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Matched Loyalty Member Banner */}
            {isSearchingCustomer && (
              <p className="text-[11px] text-slate-400 animate-pulse">Searching CRM records...</p>
            )}

            {matchedCustomer && (
              <div className="bg-purple-950/40 border border-purple-600/50 rounded-xl p-2.5 flex items-center justify-between animate-fadeIn">
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-purple-400" />
                  <div>
                    <span className="text-xs font-bold text-white">
                      {matchedCustomer.tier} Member ({matchedCustomer.loyaltyPoints} Pts)
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {matchedCustomer.visitsCount} visits • {currencySymbol}{matchedCustomer.totalSpend} lifetime spend
                    </span>
                  </div>
                </div>

                {matchedCustomer.loyaltyPoints > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleRedeemPoints}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      isRedeemingPoints
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-purple-900/60 hover:bg-purple-900 text-purple-200 border border-purple-500/40'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>{isRedeemingPoints ? 'Redeeming' : 'Redeem Pts'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Selector & Split Tender Switch */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Payment Tender Method
              </label>

              <button
                type="button"
                onClick={() => setIsSplitMode(!isSplitMode)}
                className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                  isSplitMode
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Split className="w-3 h-3" />
                <span>{isSplitMode ? 'Split Tender Active' : 'Enable Split Bill'}</span>
              </button>
            </div>

            {/* Standard Tender Buttons */}
            {!isSplitMode ? (
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMode('cash')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                    paymentMode === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Banknote className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('upi')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                    paymentMode === 'upi'
                      ? 'bg-violet-600 text-white border-violet-500 shadow-md'
                      : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <QrCode className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('card')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                    paymentMode === 'card'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Card</span>
                </button>
              </div>
            ) : (
              /* Multi-Mode Split Tender Inputs */
              <div className="bg-slate-900 border border-amber-600/50 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                  <span className="text-slate-400">Total Due: <strong className="text-white">{currencySymbol}{effectiveTotal.toFixed(2)}</strong></span>
                  <span className={splitRemaining === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {splitRemaining === 0 ? '✓ Balanced' : `Remaining: ${currencySymbol}${splitRemaining.toFixed(2)}`}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Cash Split Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 flex items-center space-x-1 font-medium">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>Cash Tender:</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={splitCash}
                        onChange={e => setSplitCash(Number(e.target.value))}
                        className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setSplitCash(Number((splitCash + splitRemaining).toFixed(2)))}
                        className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700"
                      >
                        Balance
                      </button>
                    </div>
                  </div>

                  {/* UPI Split Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 flex items-center space-x-1 font-medium">
                      <QrCode className="w-4 h-4 text-violet-400" />
                      <span>UPI Tender:</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={splitUpi}
                        onChange={e => setSplitUpi(Number(e.target.value))}
                        className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setSplitUpi(Number((splitUpi + splitRemaining).toFixed(2)))}
                        className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700"
                      >
                        Balance
                      </button>
                    </div>
                  </div>

                  {/* Card Split Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 flex items-center space-x-1 font-medium">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span>Card Tender:</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        value={splitCard}
                        onChange={e => setSplitCard(Number(e.target.value))}
                        className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setSplitCard(Number((splitCard + splitRemaining).toFixed(2)))}
                        className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700"
                      >
                        Balance
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cash Tendered Calculator (if single cash mode) */}
          {!isSplitMode && paymentMode === 'cash' && (
            <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Cash Tendered ({currencySymbol})</span>
                <input
                  type="number"
                  value={tenderedCash}
                  onChange={e => setTenderedCash(e.target.value)}
                  className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white font-mono mt-1 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Change Return</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {currencySymbol}{changeDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Takeaway Token Input (If Takeaway) */}
          {orderType === 'takeaway' && (
            <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
                <Ticket className="w-4 h-4" />
                <span>Takeaway Token #</span>
              </div>
              <input
                type="text"
                value={customTakeawayToken}
                onChange={e => setCustomTakeawayToken(e.target.value)}
                placeholder="TK-01"
                className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white uppercase font-mono font-bold text-center focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {/* Delivery Destination Address & Rider Assignment (If Delivery Order) */}
          {orderType === 'delivery' && (
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-[11px] font-bold uppercase text-amber-400 flex items-center space-x-1 mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Delivery Destination Address *</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Flat/House No, Building, Landmark, Street / Sector..."
                  className="w-full bg-slate-900 border border-amber-500/40 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 flex items-center space-x-1 mb-1">
                  <Bike className="w-3.5 h-3.5 text-blue-400" />
                  <span>Assign Delivery Partner / Rider</span>
                </label>
                <select
                  value={riderName}
                  onChange={e => setRiderName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="In-House Rider (Ramesh)">In-House Rider (Ramesh)</option>
                  <option value="In-House Rider (Amit)">In-House Rider (Amit)</option>
                  <option value="Swiggy Direct Fleet">Swiggy Direct Fleet</option>
                  <option value="Zomato Direct Fleet">Zomato Direct Fleet</option>
                  <option value="Dunzo Partner">Dunzo Partner</option>
                  <option value="Porter Express">Porter Express</option>
                </select>
              </div>
            </div>
          )}

          {/* OpenWA Automation Toggles */}
          <div className="bg-slate-900/90 border border-emerald-900/50 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Send WhatsApp Bill</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={e => setSendWhatsApp(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold text-slate-200">Request Google 5-Star Review</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendReviewPrompt}
                  onChange={e => setSendReviewPrompt(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Note on OpenWA status */}
            <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
              <span>Service: <strong className="text-slate-300">OpenWA Gateway</strong></span>
              <span className={openwaOnline ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {openwaOnline ? '● Gateway Active' : '○ Standby / Offline'}
              </span>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-500 hover:to-amber-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-[0.99]"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Confirm & Print Bill</span>
          </button>
        </form>
      </div>
    </div>
  );
};
