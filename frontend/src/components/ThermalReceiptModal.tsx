import React from 'react';
import { Bill, RestaurantProfile } from '../types';
import { X, Printer, MessageCircle, Star, CheckCircle, RefreshCw } from 'lucide-react';
import { ApiService } from '../services/api';

interface ThermalReceiptModalProps {
  bill: Bill;
  profile: RestaurantProfile;
  onClose: () => void;
  onRefreshBill: (updatedBill: Bill) => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  bill,
  profile,
  onClose,
  onRefreshBill
}) => {
  const [resendingWA, setResendingWA] = React.useState(false);
  const [resendingReview, setResendingReview] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleResendWhatsApp = async () => {
    setResendingWA(true);
    try {
      const res = await ApiService.resendWhatsApp(bill.id);
      if (res.bill) onRefreshBill(res.bill);
    } catch (e) {
      console.error(e);
    } finally {
      setResendingWA(false);
    }
  };

  const handleResendReview = async () => {
    setResendingReview(true);
    try {
      const res = await ApiService.resendReview(bill.id);
      if (res.bill) onRefreshBill(res.bill);
    } catch (e) {
      console.error(e);
    } finally {
      setResendingReview(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-850">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Bill Generated Successfully</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Thermal Preview + WhatsApp Status Panel */}
        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Thermal Receipt Print Paper (80mm styling) */}
          <div className="printable-area bg-white text-black p-5 rounded-lg shadow-lg font-mono text-[12px] leading-tight select-text border border-slate-300">
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-gray-400">
              <h3 className="font-bold text-sm tracking-wider uppercase">{profile.name}</h3>
              <p className="text-[10px] text-gray-700">{profile.address}</p>
              <p className="text-[10px] text-gray-700">Phone: {profile.phone}</p>
              <p className="text-[10px] font-bold mt-1">GSTIN: {profile.gstin}</p>
              <p className="text-[9px] text-gray-600">FSSAI: {profile.fssai}</p>
            </div>

            {/* Bill Details */}
            <div className="py-2 text-[11px] border-b border-dashed border-gray-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Inv: {bill.invoiceNumber}</span>
                <span>{new Date(bill.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Type: {bill.orderType.toUpperCase()}</span>
                {bill.tableNumber && <span>Table: {bill.tableNumber}</span>}
              </div>
              {bill.customerName && (
                <div className="text-[10px] text-gray-800">
                  Customer: {bill.customerName} ({bill.customerPhone})
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-2 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-bold text-[10px] border-b border-gray-300 pb-1 mb-1">
                <span className="w-1/2">ITEM</span>
                <span className="w-1/4 text-center">QTY</span>
                <span className="w-1/4 text-right">AMT</span>
              </div>
              {bill.items.map((item, idx) => {
                const itemTotal = item.quantity * item.unitPrice;
                return (
                  <div key={idx} className="py-0.5">
                    <div className="flex justify-between">
                      <span className="w-1/2 font-semibold truncate">{item.name}</span>
                      <span className="w-1/4 text-center">x{item.quantity}</span>
                      <span className="w-1/4 text-right">{itemTotal.toFixed(2)}</span>
                    </div>
                    {item.selectedVariation && (
                      <div className="text-[9px] text-gray-600 pl-2">
                        {item.selectedVariation.name}
                      </div>
                    )}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="text-[9px] text-gray-600 pl-2">
                        +{item.selectedAddons.map(a => a.name).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totals & Tax */}
            <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-gray-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{profile.currencySymbol}{bill.subtotal.toFixed(2)}</span>
              </div>
              {bill.discountAmount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Discount:</span>
                  <span>-{profile.currencySymbol}{bill.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>CGST (2.5%):</span>
                <span>{profile.currencySymbol}{bill.cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>SGST (2.5%):</span>
                <span>{profile.currencySymbol}{bill.sgstAmount.toFixed(2)}</span>
              </div>
              {bill.roundOff !== 0 && (
                <div className="flex justify-between text-[9px] text-gray-500">
                  <span>Round Off:</span>
                  <span>{profile.currencySymbol}{bill.roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-400">
                <span>TOTAL:</span>
                <span>{profile.currencySymbol}{bill.total.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-gray-700 text-right">
                Paid via {bill.paymentMode.toUpperCase()}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-gray-600 space-y-0.5">
              <p className="font-semibold">Thank you for dining with us!</p>
              <p>Please visit again ✨</p>
              <p className="text-[8px] text-gray-400 pt-1">Powered by RestoPulse POS</p>
            </div>
          </div>

          {/* Right Action & WhatsApp Dashboard */}
          <div className="space-y-4">
            {/* Quick Print Button */}
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl border border-slate-600 transition-all shadow-md"
            >
              <Printer className="w-5 h-5 text-brand-400" />
              <span>Print Physical Receipt (80mm)</span>
            </button>

            {/* WhatsApp Invoice Status Card */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">WhatsApp Invoice</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    bill.whatsappInvoiceSent
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {bill.whatsappInvoiceSent ? 'Dispatched' : 'Pending / Retrying'}
                </span>
              </div>

              <p className="text-xs text-slate-400">
                {bill.customerPhone
                  ? `Target: ${bill.customerPhone}`
                  : 'No phone number provided'}
              </p>

              {bill.whatsappError && (
                <div className="text-[11px] text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-900/50">
                  {bill.whatsappError}
                </div>
              )}

              {bill.customerPhone && (
                <button
                  disabled={resendingWA}
                  onClick={handleResendWhatsApp}
                  className="w-full flex items-center justify-center space-x-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendingWA ? 'animate-spin' : ''}`} />
                  <span>{resendingWA ? 'Sending via OpenWA...' : 'Re-send WhatsApp Bill'}</span>
                </button>
              )}
            </div>

            {/* Google Review Follow-up Card */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-white">Google 5★ Review Request</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    bill.whatsappReviewSent
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {bill.whatsappReviewSent ? 'Dispatched' : 'Queued'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Sends a polite message to the customer with your Google Review link.
              </p>

              {bill.customerPhone && (
                <button
                  disabled={resendingReview}
                  onClick={handleResendReview}
                  className="w-full flex items-center justify-center space-x-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>{resendingReview ? 'Dispatching Review Link...' : 'Send Review Request Now'}</span>
                </button>
              )}
            </div>

            {/* New Order Button */}
            <button
              onClick={onClose}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
            >
              Start Next Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
