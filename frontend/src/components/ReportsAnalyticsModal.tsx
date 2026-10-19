import React, { useState, useMemo } from 'react';
import { Bill, RestaurantProfile } from '../types';
import {
  X,
  Search,
  ReceiptText,
  TrendingUp,
  BarChart3,
  PieChart,
  Printer,
  Eye,
  MessageCircle,
  Star,
  CheckCircle2,
  DollarSign,
  Utensils,
  Percent,
  Layers,
  CreditCard,
  Banknote,
  QrCode
} from 'lucide-react';
import { ApiService } from '../services/api';

interface ReportsAnalyticsModalProps {
  profile: RestaurantProfile;
  currencySymbol: string;
  onSelectBillForView: (bill: Bill) => void;
  onClose: () => void;
}

export const ReportsAnalyticsModal: React.FC<ReportsAnalyticsModalProps> = ({
  profile,
  currencySymbol,
  onSelectBillForView,
  onClose
}) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'eod' | 'invoices' | 'top_dishes' | 'tax_payment'>('eod');
  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isPrintingZReport, setIsPrintingZReport] = useState(false);

  React.useEffect(() => {
    ApiService.getBills().then(data => {
      setBills(data);
      setLoading(false);
    });
  }, []);

  // Filter bills
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      if (filterPayment !== 'all' && b.paymentMode !== filterPayment) return false;
      if (filterType !== 'all' && b.orderType !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          b.invoiceNumber.toLowerCase().includes(q) ||
          (b.customerName && b.customerName.toLowerCase().includes(q)) ||
          (b.customerPhone && b.customerPhone.includes(q)) ||
          (b.tableNumber && b.tableNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [bills, search, filterPayment, filterType]);

  // Calculations for EOD Analytics
  const analytics = useMemo(() => {
    const totalOrders = bills.length;
    const grossSales = bills.reduce((sum, b) => sum + (b.subtotal || 0), 0);
    const totalDiscounts = bills.reduce((sum, b) => sum + (b.discountAmount || 0), 0);
    const totalCgst = bills.reduce((sum, b) => sum + (b.cgstAmount || 0), 0);
    const totalSgst = bills.reduce((sum, b) => sum + (b.sgstAmount || 0), 0);
    const totalTax = totalCgst + totalSgst;
    const netRevenue = bills.reduce((sum, b) => sum + (b.total || 0), 0);
    const aov = totalOrders > 0 ? Math.round(netRevenue / totalOrders) : 0;

    // Payment Mode distribution
    const upiBills = bills.filter(b => b.paymentMode === 'upi');
    const cashBills = bills.filter(b => b.paymentMode === 'cash');
    const cardBills = bills.filter(b => b.paymentMode === 'card');

    const upiTotal = upiBills.reduce((s, b) => s + b.total, 0);
    const cashTotal = cashBills.reduce((s, b) => s + b.total, 0);
    const cardTotal = cardBills.reduce((s, b) => s + b.total, 0);

    const upiPercent = netRevenue > 0 ? Math.round((upiTotal / netRevenue) * 100) : 0;
    const cashPercent = netRevenue > 0 ? Math.round((cashTotal / netRevenue) * 100) : 0;
    const cardPercent = netRevenue > 0 ? Math.round((cardTotal / netRevenue) * 100) : 0;

    // Dining Mode distribution
    const dineInTotal = bills.filter(b => b.orderType === 'dine_in').reduce((s, b) => s + b.total, 0);
    const takeawayTotal = bills.filter(b => b.orderType === 'takeaway').reduce((s, b) => s + b.total, 0);
    const deliveryTotal = bills.filter(b => b.orderType === 'delivery').reduce((s, b) => s + b.total, 0);

    // Top Selling Dishes Aggregator
    const dishMap = new Map<string, { name: string; quantity: number; revenue: number; station: string }>();
    bills.forEach(b => {
      b.items?.forEach(item => {
        const key = item.name;
        const existing = dishMap.get(key) || { name: item.name, quantity: 0, revenue: 0, station: item.station || 'kitchen' };
        existing.quantity += item.quantity;
        existing.revenue += item.quantity * item.unitPrice;
        dishMap.set(key, existing);
      });
    });

    const topDishes = Array.from(dishMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    return {
      totalOrders,
      grossSales,
      totalDiscounts,
      totalCgst,
      totalSgst,
      totalTax,
      netRevenue,
      aov,
      upiTotal,
      cashTotal,
      cardTotal,
      upiPercent,
      cashPercent,
      cardPercent,
      dineInTotal,
      takeawayTotal,
      deliveryTotal,
      topDishes
    };
  }, [bills]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Reports & Sales Analytics (EOD)</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  Petpooja Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Day-End Summary, GST breakdown, payment distribution, and best-selling items
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPrintingZReport(true)}
              className="flex items-center space-x-1.5 bg-slate-750 hover:bg-slate-750 border border-slate-600 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Day-End Z-Report</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border-b border-slate-700/80 px-6 pt-2">
          <button
            onClick={() => setActiveTab('eod')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'eod'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-brand-400" />
            <span>Day-End Summary (EOD)</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'invoices'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ReceiptText className="w-4 h-4 text-amber-400" />
            <span>All Invoices & WhatsApp Logs ({bills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('top_dishes')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'top_dishes'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Utensils className="w-4 h-4 text-emerald-400" />
            <span>Top Selling Dishes</span>
          </button>

          <button
            onClick={() => setActiveTab('tax_payment')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'tax_payment'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart className="w-4 h-4 text-purple-400" />
            <span>GST & Payment Reconciliation</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          {loading ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              Loading sales reports and transaction ledger...
            </div>
          ) : (
            <>
              {/* TAB 1: DAY-END SUMMARY (EOD) */}
              {activeTab === 'eod' && (
                <div className="space-y-6">
                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-md">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>Net Revenue</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
                        {currencySymbol}{analytics.netRevenue.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                        <span>Total Paid Bills:</span>
                        <strong className="text-white font-mono">{analytics.totalOrders}</strong>
                      </div>
                    </div>

                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-md">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>Gross Food Sales</span>
                        <Utensils className="w-4 h-4 text-brand-400" />
                      </div>
                      <div className="mt-2 text-2xl font-black font-mono text-white">
                        {currencySymbol}{analytics.grossSales.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                        <span>Discounts:</span>
                        <strong className="text-amber-400 font-mono">-{currencySymbol}{analytics.totalDiscounts}</strong>
                      </div>
                    </div>

                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-md">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>Taxes Collected</span>
                        <Percent className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="mt-2 text-2xl font-black font-mono text-purple-300">
                        {currencySymbol}{analytics.totalTax.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        CGST ({currencySymbol}{analytics.totalCgst.toFixed(2)}) + SGST ({currencySymbol}{analytics.totalSgst.toFixed(2)})
                      </div>
                    </div>

                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-md">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>Average Order Value</span>
                        <DollarSign className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="mt-2 text-2xl font-black font-mono text-amber-400">
                        {currencySymbol}{analytics.aov}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Average spend per guest table
                      </div>
                    </div>
                  </div>

                  {/* Payment Breakdown & Order Channels Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Payment Mode Distribution */}
                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-md space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 text-brand-400" />
                          <span>Collections by Payment Mode</span>
                        </h3>
                        <span className="text-xs font-mono text-slate-400">100% Reconciled</span>
                      </div>

                      <div className="space-y-3">
                        {/* UPI */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="flex items-center space-x-1.5 text-emerald-300">
                              <QrCode className="w-3.5 h-3.5" />
                              <span>UPI QR / Online ({analytics.upiPercent}%)</span>
                            </span>
                            <span className="font-mono text-white">
                              {currencySymbol}{analytics.upiTotal.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${analytics.upiPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Cash */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="flex items-center space-x-1.5 text-amber-300">
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Cash Counter ({analytics.cashPercent}%)</span>
                            </span>
                            <span className="font-mono text-white">
                              {currencySymbol}{analytics.cashTotal.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${analytics.cashPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Card */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="flex items-center space-x-1.5 text-blue-300">
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Debit / Credit Card ({analytics.cardPercent}%)</span>
                            </span>
                            <span className="font-mono text-white">
                              {currencySymbol}{analytics.cardTotal.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${analytics.cardPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dining Channels Distribution */}
                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-md space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                          <Layers className="w-4 h-4 text-amber-400" />
                          <span>Revenue by Order Channel</span>
                        </h3>
                        <span className="text-xs font-mono text-slate-400">Dine-in vs Parcel</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Dine-In Tables</span>
                          <span className="text-base font-black font-mono text-brand-400 mt-1 block">
                            {currencySymbol}{analytics.dineInTotal.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Takeaway / Parcel</span>
                          <span className="text-base font-black font-mono text-amber-400 mt-1 block">
                            {currencySymbol}{analytics.takeawayTotal.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Home Delivery</span>
                          <span className="text-base font-black font-mono text-purple-400 mt-1 block">
                            {currencySymbol}{analytics.deliveryTotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <span>WhatsApp Invoices Sent:</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          {bills.filter(b => b.whatsappInvoiceSent).length} / {bills.length} Delivered
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ALL INVOICES & WHATSAPP LOGS */}
              {activeTab === 'invoices' && (
                <div className="space-y-4">
                  {/* Filters Bar */}
                  <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search invoice #, customer name, phone, or table..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <select
                      value={filterPayment}
                      onChange={e => setFilterPayment(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
                    >
                      <option value="all">All Payment Modes</option>
                      <option value="upi">UPI / Online</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>

                    <select
                      value={filterType}
                      onChange={e => setFilterType(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
                    >
                      <option value="all">All Order Types</option>
                      <option value="dine_in">Dine-In</option>
                      <option value="takeaway">Takeaway</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-800/90 shadow-md">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400 font-semibold uppercase tracking-wider text-[11px] bg-slate-850">
                          <th className="py-3 px-3.5">Invoice #</th>
                          <th className="py-3 px-3.5">Date & Time</th>
                          <th className="py-3 px-3.5">Customer</th>
                          <th className="py-3 px-3.5">Type & Table</th>
                          <th className="py-3 px-3.5">Payment</th>
                          <th className="py-3 px-3.5 text-right">Amount</th>
                          <th className="py-3 px-3.5 text-center">WhatsApp</th>
                          <th className="py-3 px-3.5 text-center">Review</th>
                          <th className="py-3 px-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/60 font-medium">
                        {filteredBills.map(b => (
                          <tr key={b.id} className="hover:bg-slate-750 transition-colors">
                            <td className="py-3 px-3.5 font-mono font-bold text-white">{b.invoiceNumber}</td>
                            <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px]">
                              {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="font-semibold text-slate-200 block">{b.customerName || 'Walk-in'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{b.customerPhone || '—'}</span>
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="uppercase text-[10px] font-bold text-brand-300 bg-brand-500/20 px-2 py-0.5 rounded">
                                {b.orderType}
                              </span>
                              {b.tableNumber && (
                                <span className="text-[11px] text-slate-300 ml-1.5 font-bold">
                                  T-{b.tableNumber}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 uppercase font-mono font-bold text-slate-300">
                              {b.paymentMode}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-400">
                              {currencySymbol}{b.total}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              {b.whatsappInvoiceSent ? (
                                <span className="inline-flex items-center space-x-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Sent</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">Not Sent</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              {b.whatsappReviewSent ? (
                                <span className="inline-flex items-center space-x-1 text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  <span>Sent</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <button
                                onClick={() => onSelectBillForView(b)}
                                className="inline-flex items-center space-x-1 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors"
                              >
                                <Eye className="w-3 h-3 text-brand-400" />
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredBills.length === 0 && (
                          <tr>
                            <td colSpan={9} className="text-center py-10 text-slate-500">
                              No invoices match your search or filter criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: TOP SELLING DISHES */}
              {activeTab === 'top_dishes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Top Performing Dishes & Items</h3>
                      <p className="text-xs text-slate-400">Ranked by volume ordered and revenue contribution</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.topDishes.map((dish, idx) => (
                      <div
                        key={dish.name}
                        className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between shadow-md"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400 font-mono">
                            #{idx + 1}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">{dish.name}</h4>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              Station: {dish.station}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black font-mono text-emerald-400 block">
                            {currencySymbol}{dish.revenue.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono font-medium">
                            {dish.quantity} sold
                          </span>
                        </div>
                      </div>
                    ))}
                    {analytics.topDishes.length === 0 && (
                      <div className="col-span-2 text-center py-12 text-slate-500 text-xs">
                        No orders recorded yet to calculate best-sellers.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: GST & TAX RECONCILIATION */}
              {activeTab === 'tax_payment' && (
                <div className="space-y-6">
                  <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-md space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Percent className="w-4 h-4 text-purple-400" />
                      <span>GST Collection Ledger (GSTR-1 Ready)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Standard Indian Restaurant 5% GST split (2.5% CGST + 2.5% SGST) for FSSAI / GST returns
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60">
                        <span className="text-xs text-slate-400 block">Taxable Food Amount</span>
                        <span className="text-xl font-black font-mono text-white mt-1 block">
                          {currencySymbol}{analytics.grossSales.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60">
                        <span className="text-xs text-slate-400 block">Central GST (CGST @ 2.5%)</span>
                        <span className="text-xl font-black font-mono text-purple-300 mt-1 block">
                          {currencySymbol}{analytics.totalCgst.toFixed(2)}
                        </span>
                      </div>

                      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60">
                        <span className="text-xs text-slate-400 block">State GST (SGST @ 2.5%)</span>
                        <span className="text-xl font-black font-mono text-purple-300 mt-1 block">
                          {currencySymbol}{analytics.totalSgst.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl p-3 text-xs text-purple-300 flex items-center justify-between">
                      <span>Restaurant GSTIN: <strong>{profile.gstin}</strong></span>
                      <span>Total GST Collected: <strong>{currencySymbol}{analytics.totalTax.toFixed(2)}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Printable Z-Report Thermal Slip Modal */}
      {isPrintingZReport && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 font-mono text-xs space-y-4">
            <div className="text-center border-b pb-3 border-dashed border-gray-400">
              <h2 className="text-base font-black uppercase tracking-wider">{profile.name}</h2>
              <p className="text-[10px] text-gray-700">{profile.address}</p>
              <div className="text-sm font-black mt-2 bg-gray-100 py-1 rounded uppercase">
                DAY-END CLOSING (Z-REPORT)
              </div>
              <p className="text-[10px] text-gray-600 mt-1">
                Generated: {new Date().toLocaleString()}
              </p>
            </div>

            <div className="space-y-1.5 border-b pb-3 border-dashed border-gray-400 text-[11px]">
              <div className="flex justify-between">
                <span>Total Bills Settled:</span>
                <strong className="font-bold">{analytics.totalOrders}</strong>
              </div>
              <div className="flex justify-between">
                <span>Gross Food Sales:</span>
                <span>{currencySymbol}{analytics.grossSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Discounts:</span>
                <span>-{currencySymbol}{analytics.totalDiscounts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST (2.5%):</span>
                <span>{currencySymbol}{analytics.totalCgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (2.5%):</span>
                <span>{currencySymbol}{analytics.totalSgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-300">
                <span>NET REVENUE:</span>
                <span>{currencySymbol}{analytics.netRevenue.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="space-y-1 border-b pb-3 border-dashed border-gray-400 text-[11px]">
              <p className="font-bold uppercase text-[10px] text-gray-700">Cash Drawer Breakdown:</p>
              <div className="flex justify-between">
                <span>UPI / QR:</span>
                <strong>{currencySymbol}{analytics.upiTotal.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Cash in Drawer:</span>
                <strong>{currencySymbol}{analytics.cashTotal.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Card Machine:</span>
                <strong>{currencySymbol}{analytics.cardTotal.toFixed(2)}</strong>
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-500">
              Shift Closed • Manager Sign: _____________
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-black text-white py-2 rounded-lg font-bold flex items-center justify-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Slip</span>
              </button>
              <button
                onClick={() => setIsPrintingZReport(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
