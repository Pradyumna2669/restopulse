import React from 'react';
import { Bill, RestaurantProfile } from '../types';
import { X, Search, ReceiptText, MessageCircle, Star, Eye } from 'lucide-react';
import { ApiService } from '../services/api';

interface PastBillsModalProps {
  profile: RestaurantProfile;
  onSelectBillForView: (bill: Bill) => void;
  onClose: () => void;
}

export const PastBillsModal: React.FC<PastBillsModalProps> = ({
  profile,
  onSelectBillForView,
  onClose
}) => {
  const [bills, setBills] = React.useState<Bill[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    ApiService.getBills().then(data => {
      setBills(data);
      setLoading(false);
    });
  }, []);

  const filteredBills = bills.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.invoiceNumber.toLowerCase().includes(q) ||
      (b.customerName && b.customerName.toLowerCase().includes(q)) ||
      (b.customerPhone && b.customerPhone.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-850">
          <div className="flex items-center space-x-2">
            <ReceiptText className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-white">Invoice History & WhatsApp Logs</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-700/80 bg-slate-900/60">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by invoice number, customer name or phone..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Bills List Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading invoices...</div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No invoices generated yet</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Invoice</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">WhatsApp</th>
                  <th className="py-2.5 px-3">Review Link</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filteredBills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-750 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-white">{b.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-200 block">{b.customerName || 'Walk-in'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{b.customerPhone || '—'}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="uppercase font-semibold text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                        {b.orderType}
                      </span>
                    </td>
                    <td className="py-3 px-3 uppercase font-medium text-slate-300">{b.paymentMode}</td>
                    <td className="py-3 px-3 font-bold font-mono text-white">
                      {profile.currencySymbol}{b.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.whatsappInvoiceSent
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>{b.whatsappInvoiceSent ? 'Sent' : 'None'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.whatsappReviewSent
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <Star className="w-3 h-3" />
                        <span>{b.whatsappReviewSent ? 'Requested' : 'None'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          onSelectBillForView(b);
                          onClose();
                        }}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        title="View Thermal Receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
