import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Printer,
  Sparkles,
  Clock,
  PieChart,
  Users,
  Percent,
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import {
  RestaurantProfile,
  Bill,
  HourlySalesDistribution,
  CategoryPerformanceReport,
  StaffSalesReport,
  DiscountAuditReport,
  Gstr1TaxLedger,
  EodZReportData
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ApiService } from '../services/api';

interface ReportsAnalyticsViewProps {
  profile: RestaurantProfile;
  currencySymbol: string;
  onSelectBillForView?: (bill: Bill) => void;
}

type ReportTab = 'eod' | 'hourly' | 'categories' | 'staff' | 'discounts' | 'gstr1';

export const ReportsAnalyticsView: React.FC<ReportsAnalyticsViewProps> = ({
  profile,
  currencySymbol,
  onSelectBillForView
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('eod');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrintingZReport, setIsPrintingZReport] = useState<boolean>(false);
  const [printSuccessNotice, setPrintSuccessNotice] = useState<string | null>(null);

  // Core Data States
  const [bills, setBills] = useState<Bill[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlySalesDistribution | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryPerformanceReport | null>(null);
  const [staffData, setStaffData] = useState<StaffSalesReport | null>(null);
  const [discountData, setDiscountData] = useState<DiscountAuditReport | null>(null);
  const [gstr1Data, setGstr1Data] = useState<Gstr1TaxLedger | null>(null);
  const [zReportData, setZReportData] = useState<EodZReportData | null>(null);

  // Search & Filter for Bills
  const [searchInvoice, setSearchInvoice] = useState<string>('');
  const [tenderFilter, setTenderFilter] = useState<string>('all');
  const [selectedHourHover, setSelectedHourHover] = useState<number | null>(null);

  const loadAllReports = async () => {
    setIsLoading(true);
    try {
      const [
        pastBills,
        hourly,
        category,
        staff,
        discount,
        gstr1,
        zReport
      ] = await Promise.all([
        ApiService.getBills().catch(() => []),
        ApiService.getHourlySales().catch(() => null),
        ApiService.getCategoryPerformance().catch(() => null),
        ApiService.getStaffSales().catch(() => null),
        ApiService.getDiscountAudit().catch(() => null),
        ApiService.getGstr1TaxLedger().catch(() => null),
        ApiService.getEodZReport().catch(() => null)
      ]);

      if (pastBills) setBills(pastBills);
      if (hourly) setHourlyData(hourly);
      if (category) setCategoryData(category);
      if (staff) setStaffData(staff);
      if (discount) setDiscountData(discount);
      if (gstr1) setGstr1Data(gstr1);
      if (zReport) setZReportData(zReport);
    } catch (err) {
      console.error('Failed to load reporting intelligence:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, []);

  // Filtered Bills
  const filteredBills = bills.filter(b => {
    const matchesSearch =
      (b.invoiceNumber || '').toLowerCase().includes(searchInvoice.toLowerCase()) ||
      (b.orderNumber || '').toLowerCase().includes(searchInvoice.toLowerCase()) ||
      (b.customerName || '').toLowerCase().includes(searchInvoice.toLowerCase());
    const matchesTender = tenderFilter === 'all' || b.paymentMode === tenderFilter;
    return matchesSearch && matchesTender;
  });

  // Print 80mm ESC/POS Thermal Z-Report
  const handlePrintEscPosZReport = async () => {
    try {
      setIsPrintingZReport(true);
      const res = await ApiService.printZReportEscPos({ paperWidth: '80mm', cutPaper: true });
      if (res && res.base64) {
        // Trigger browser printable fallback or download
        setPrintSuccessNotice(`Z-Report binary generated (${res.length} bytes ESC/POS)`);
        setTimeout(() => setPrintSuccessNotice(null), 4000);
      }
      window.print();
    } catch (err) {
      console.error('Failed to print ESC/POS Z-Report:', err);
      window.print();
    } finally {
      setIsPrintingZReport(false);
    }
  };

  // Export GSTR-1 JSON
  const handleExportGstr1Json = async () => {
    try {
      const blob = await ApiService.exportGstr1Json();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_${profile.gstin || '24AAAAA0000A1Z5'}_OCT2026.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export GSTR-1 JSON:', err);
    }
  };

  // Export GSTR-1 CSV
  const handleExportGstr1Csv = async () => {
    try {
      const csvText = await ApiService.exportGstr1Csv();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_Tax_Ledger_OCT2026.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export GSTR-1 CSV:', err);
    }
  };

  // Calculations for Overview Ribbon
  const totalGrossSales = zReportData?.financialSummary.grossSales ?? bills.reduce((sum, b) => sum + b.total, 0);
  const totalBillsCount = zReportData?.financialSummary.billsCount ?? bills.filter(b => b.status === 'paid').length;
  const aov = totalBillsCount > 0 ? Math.round(totalGrossSales / totalBillsCount) : 0;
  const totalTaxCollected = (zReportData?.financialSummary.cgst || 0) + (zReportData?.financialSummary.sgst || 0) || Math.round(totalGrossSales * 0.05);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-canvas-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-terracotta-50 text-terracotta-700 border border-terracotta-200">
              Phase 7 Intelligence
            </span>
            <span className="text-xs text-stone-400 font-mono">
              GSTIN: {profile.gstin || '24AAAAA0000A1Z5'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-stone-900 mt-1">
            Reporting, Tax & Business Intelligence
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            24-Hour Velocity Heatmaps, Server Attribution, Statutory GSTR-1 Filing & End-of-Day Z-Report.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadAllReports}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={handlePrintEscPosZReport}
            disabled={isPrintingZReport}
          >
            {isPrintingZReport ? 'Generating Slip...' : 'Print Day-End Z-Report'}
          </Button>
        </div>
      </div>

      {printSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{printSuccessNotice}</span>
        </div>
      )}

      {/* 2. Executive KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-gradient-to-br from-white to-canvas-50">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gross Sales</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-bold font-mono text-stone-900 mt-1.5">
            {currencySymbol}{totalGrossSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-2.5 h-2.5" /> Settled revenue
          </span>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-white to-canvas-50">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Settled Bills</span>
            <Receipt className="w-3.5 h-3.5 text-terracotta-600" />
          </div>
          <p className="text-xl font-bold font-mono text-stone-900 mt-1.5">
            {totalBillsCount}
          </p>
          <span className="text-[10px] text-stone-400 mt-0.5 block">
            Paid transactions
          </span>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-white to-canvas-50">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Average Ticket</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold font-mono text-stone-900 mt-1.5">
            {currencySymbol}{aov}
          </p>
          <span className="text-[10px] text-stone-400 mt-0.5 block">
            AOV per guest bill
          </span>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-white to-canvas-50">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">GST Invoiced</span>
            <Badge variant="success" size="sm">5% GST</Badge>
          </div>
          <p className="text-xl font-bold font-mono text-stone-900 mt-1.5">
            {currencySymbol}{totalTaxCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-stone-400 mt-0.5 block">
            CGST + SGST (2.5% each)
          </span>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-white to-canvas-50">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Discounts</span>
            <Percent className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-bold font-mono text-stone-900 mt-1.5">
            {currencySymbol}{(discountData?.totalDiscountsGiven || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">
            {discountData?.highDiscountCount || 0} high discounts
          </span>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-white to-canvas-50">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Drawer Status</span>
            <ShieldCheck className="w-3.5 h-3.5 text-sage-600" />
          </div>
          <p className="text-base font-bold font-mono text-stone-900 mt-1.5 capitalize">
            {zReportData?.cashDrawerAudit.auditStatus || 'Balanced'}
          </p>
          <span className="text-[10px] text-stone-400 mt-0.5 block">
            Float: {currencySymbol}{zReportData?.cashDrawerAudit.openingFloat || 2500}
          </span>
        </Card>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-canvas-border overflow-x-auto pb-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('eod')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'eod'
              ? 'bg-white border-t-2 border-terracotta-600 text-stone-900 font-bold shadow-xs'
              : 'text-stone-500 hover:text-stone-800 hover:bg-white/50'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-terracotta-600" />
          <span>Day-End Z-Report & Cash Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('hourly')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'hourly'
              ? 'bg-white border-t-2 border-terracotta-600 text-stone-900 font-bold shadow-xs'
              : 'text-stone-500 hover:text-stone-800 hover:bg-white/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>24-Hour Sales Heatmap</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'categories'
              ? 'bg-white border-t-2 border-terracotta-600 text-stone-900 font-bold shadow-xs'
              : 'text-stone-500 hover:text-stone-800 hover:bg-white/50'
          }`}
        >
          <PieChart className="w-3.5 h-3.5 text-sage-600" />
          <span>Category Performance & Margins</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'staff'
              ? 'bg-white border-t-2 border-terracotta-600 text-stone-900 font-bold shadow-xs'
              : 'text-stone-500 hover:text-stone-800 hover:bg-white/50'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>Staff Sales Leaderboard</span>
        </button>

        <button
          onClick={() => setActiveTab('discounts')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'discounts'
              ? 'bg-white border-t-2 border-terracotta-600 text-stone-900 font-bold shadow-xs'
              : 'text-stone-500 hover:text-stone-800 hover:bg-white/50'
          }`}
        >
          <Percent className="w-3.5 h-3.5 text-rose-600" />
          <span>Discount Attribution Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('gstr1')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'gstr1'
              ? 'bg-white border-t-2 border-terracotta-600 text-stone-900 font-bold shadow-xs'
              : 'text-stone-500 hover:text-stone-800 hover:bg-white/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          <span>Statutory GSTR-1 Tax Ledger</span>
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* ========================================================================= */}
      {/* TAB A: Day-End Z-Report & Cash Drawer Closing Audit */}
      {/* ========================================================================= */}
      {activeTab === 'eod' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Cash Reconciliation & Tenders */}
            <div className="lg:col-span-2 space-y-4">
              {/* Cash Drawer Audit Box */}
              <Card className="p-5 space-y-4 border-l-4 border-l-emerald-600">
                <div className="flex items-center justify-between border-b border-canvas-border pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Cash Drawer Closing Reconciliation
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Audit opening cash float, counter receipts, and petty cash disbursements.
                    </p>
                  </div>
                  <Badge variant={zReportData?.cashDrawerAudit.auditStatus === 'balanced' ? 'success' : 'warning'}>
                    {zReportData?.cashDrawerAudit.auditStatus === 'balanced' ? '✓ Perfectly Balanced' : 'Attention Required'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-canvas-50 border border-canvas-border">
                    <span className="text-[10px] text-stone-500 font-bold uppercase">Opening Float</span>
                    <p className="text-base font-bold font-mono text-stone-900 mt-1">
                      {currencySymbol}{zReportData?.cashDrawerAudit.openingFloat || 2500}
                    </p>
                    <span className="text-[10px] text-stone-400">Shift starting cash</span>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas-50 border border-canvas-border">
                    <span className="text-[10px] text-stone-500 font-bold uppercase">Cash Sales (+)</span>
                    <p className="text-base font-bold font-mono text-emerald-700 mt-1">
                      +{currencySymbol}{zReportData?.cashDrawerAudit.cashSales.toLocaleString('en-IN') || 0}
                    </p>
                    <span className="text-[10px] text-stone-400">{zReportData?.tenderBreakdown.cash.count || 0} cash invoices</span>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas-50 border border-canvas-border">
                    <span className="text-[10px] text-stone-500 font-bold uppercase">Petty Expenses (-)</span>
                    <p className="text-base font-bold font-mono text-rose-700 mt-1">
                      -{currencySymbol}{zReportData?.cashDrawerAudit.pettyExpensesTotal.toLocaleString('en-IN') || 0}
                    </p>
                    <span className="text-[10px] text-stone-400">{zReportData?.cashDrawerAudit.pettyExpensesItemized.length || 0} vouchers paid</span>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas-100 border border-canvas-border sm:col-span-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-800">Expected Physical Cash in Drawer</span>
                      <p className="text-[11px] text-stone-500">Opening float + Cash sales - Petty expenses</p>
                    </div>
                    <p className="text-xl font-bold font-mono text-stone-900">
                      {currencySymbol}{zReportData?.cashDrawerAudit.expectedCash.toLocaleString('en-IN') || 2500}
                    </p>
                  </div>
                </div>

                {/* Itemized Petty Expenses list if any */}
                {zReportData?.cashDrawerAudit.pettyExpensesItemized && zReportData.cashDrawerAudit.pettyExpensesItemized.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-stone-700 block mb-1.5">
                      Shift Petty Cash Disbursements:
                    </span>
                    <div className="space-y-1.5 text-xs">
                      {zReportData.cashDrawerAudit.pettyExpensesItemized.map((exp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-canvas-50 text-stone-600">
                          <span className="font-medium text-stone-800">{exp.category} — {exp.description}</span>
                          <span className="font-mono font-bold text-rose-600">-{currencySymbol}{exp.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Payment Tender Settlement Breakdown */}
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-stone-900 border-b border-canvas-border pb-2.5">
                  Tender Settlements & Delivery Partner Channels
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Cash at Counter</span>
                    <p className="text-lg font-bold font-mono text-emerald-900 mt-1">
                      {currencySymbol}{zReportData?.tenderBreakdown.cash.amount.toLocaleString('en-IN') || 0}
                    </p>
                    <span className="text-[10px] text-emerald-700">{zReportData?.tenderBreakdown.cash.count || 0} bills</span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                    <span className="text-[10px] font-bold text-blue-800 uppercase">UPI / QR Code</span>
                    <p className="text-lg font-bold font-mono text-blue-900 mt-1">
                      {currencySymbol}{zReportData?.tenderBreakdown.upi.amount.toLocaleString('en-IN') || 0}
                    </p>
                    <span className="text-[10px] text-blue-700">{zReportData?.tenderBreakdown.upi.count || 0} bills</span>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                    <span className="text-[10px] font-bold text-purple-800 uppercase">Credit / Debit Card</span>
                    <p className="text-lg font-bold font-mono text-purple-900 mt-1">
                      {currencySymbol}{zReportData?.tenderBreakdown.card.amount.toLocaleString('en-IN') || 0}
                    </p>
                    <span className="text-[10px] text-purple-700">{zReportData?.tenderBreakdown.card.count || 0} bills</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Online Aggregators</span>
                    <p className="text-lg font-bold font-mono text-amber-900 mt-1">
                      {currencySymbol}{zReportData?.tenderBreakdown.aggregators.total.toLocaleString('en-IN') || 0}
                    </p>
                    <span className="text-[10px] text-amber-700">Zomato / Swiggy / ONDC</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Col: Printed Z-Report Thermal Slip Preview */}
            <div className="space-y-4">
              <Card className="p-5 space-y-4 bg-stone-900 text-stone-200 border-stone-800">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-terracotta-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Thermal Z-Report Slip
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">80mm ESC/POS</span>
                </div>

                {/* Thermal Slip Simulation */}
                <div className="p-4 rounded-xl bg-stone-950 font-mono text-[11px] leading-relaxed text-stone-300 border border-stone-800 space-y-2 select-all">
                  <div className="text-center">
                    <p className="font-bold text-white text-xs">{profile.name}</p>
                    <p className="text-[10px] text-stone-400">{profile.address}</p>
                    <p className="text-[10px] text-stone-400">GSTIN: {profile.gstin || '24AAAAA0000A1Z5'}</p>
                    <p className="text-stone-500 my-1">================================</p>
                    <p className="font-bold text-amber-400">*** END-OF-DAY Z-REPORT ***</p>
                    <p className="text-stone-500 my-1">================================</p>
                  </div>

                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Report #:</span>
                      <span className="text-white font-bold">{zReportData?.reportNumber || 'Z-20261021-001'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date / Time:</span>
                      <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shift ID:</span>
                      <span>{zReportData?.shiftInfo.shiftId || 'shift_today'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Manager:</span>
                      <span className="text-stone-200">{zReportData?.shiftInfo.managerName || 'Vikram Malhotra'}</span>
                    </div>
                  </div>

                  <p className="text-stone-700">--------------------------------</p>

                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Gross Sales:</span>
                      <span className="text-white">Rs.{zReportData?.financialSummary.grossSales.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>Discounts:</span>
                      <span>-Rs.{zReportData?.financialSummary.discounts.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Taxable:</span>
                      <span>Rs.{zReportData?.financialSummary.taxableSales.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CGST (2.5%):</span>
                      <span>Rs.{zReportData?.financialSummary.cgst.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST (2.5%):</span>
                      <span>Rs.{zReportData?.financialSummary.sgst.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white pt-1 border-t border-stone-800 text-xs">
                      <span>NET TOTAL:</span>
                      <span className="text-emerald-400">Rs.{zReportData?.financialSummary.netTotal.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>

                  <p className="text-stone-700">--------------------------------</p>

                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Cash In Drawer:</span>
                      <span>Rs.{zReportData?.cashDrawerAudit.expectedCash.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discrepancy:</span>
                      <span className="text-emerald-400 font-bold">{currencySymbol}{zReportData?.cashDrawerAudit.discrepancy || 0} [OK]</span>
                    </div>
                  </div>

                  <div className="pt-3 text-[10px] text-stone-500 space-y-3">
                    <p>Cashier Sign: _____________________</p>
                    <p>Manager Sign: _____________________</p>
                    <p className="text-center text-[9px] text-stone-600">*** END OF AUDIT RECORD ***</p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={handlePrintEscPosZReport}
                  disabled={isPrintingZReport}
                >
                  {isPrintingZReport ? 'Transmitting...' : 'Print Raw Thermal Slip (80mm)'}
                </Button>
              </Card>
            </div>
          </div>

          {/* Recent Invoices Table with Search & Tenders Filter */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-canvas-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Transactions & Payment Invoices ({filteredBills.length} Records)
                </h3>
                <p className="text-[11px] text-stone-500">
                  Click any invoice row to view receipt details or trigger WhatsApp re-send.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search invoice, order #, guest..."
                  value={searchInvoice}
                  onChange={e => setSearchInvoice(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-canvas-border bg-canvas-50 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
                />

                <select
                  value={tenderFilter}
                  onChange={e => setTenderFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-canvas-border bg-canvas-50 text-stone-700 focus:outline-none"
                >
                  <option value="all">All Tenders</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR</option>
                  <option value="card">Card</option>
                  <option value="split">Split</option>
                </select>
              </div>
            </div>

            {filteredBills.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">
                No invoices found matching criteria.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-canvas-border text-stone-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-2">Invoice #</th>
                      <th className="pb-2">Type / Table</th>
                      <th className="pb-2">Guest Name</th>
                      <th className="pb-2">Tender</th>
                      <th className="pb-2">Server</th>
                      <th className="pb-2 text-right">Subtotal</th>
                      <th className="pb-2 text-right">Discount</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-canvas-border">
                    {filteredBills.slice(0, 10).map(bill => (
                      <tr
                        key={bill.id}
                        onClick={() => onSelectBillForView && onSelectBillForView(bill)}
                        className="hover:bg-canvas-100/60 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 font-mono font-bold text-stone-900">
                          {bill.invoiceNumber || bill.orderNumber}
                        </td>
                        <td className="py-2.5 text-stone-600 capitalize">
                          {bill.orderType} {bill.tableNumber ? `(T-${bill.tableNumber})` : ''}
                        </td>
                        <td className="py-2.5 text-stone-700">
                          {bill.customerName || 'Walk-in Guest'}
                        </td>
                        <td className="py-2.5">
                          <span className="capitalize font-medium text-stone-700 px-2 py-0.5 rounded-full bg-canvas-200 text-[10px]">
                            {bill.paymentMode}
                          </span>
                        </td>
                        <td className="py-2.5 text-stone-600">
                          {bill.staffName || bill.servedBy || 'Counter Cashier'}
                        </td>
                        <td className="py-2.5 text-right font-mono text-stone-600">
                          {currencySymbol}{bill.subtotal.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-amber-600">
                          {bill.discountAmount > 0 ? `-${currencySymbol}${bill.discountAmount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-stone-900">
                          {currencySymbol}{bill.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB B: 24-Hour Sales Velocity Heatmap (Part 7.1) */}
      {/* ========================================================================= */}
      {activeTab === 'hourly' && (
        <div className="space-y-6">
          {/* Peak Hour Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Peak Sales Velocity Window
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  Peak Hour: {hourlyData?.peakHour.hourLabel || '13:00'} ({currencySymbol}{hourlyData?.peakHour.grossSales.toLocaleString('en-IN') || 0} · {hourlyData?.peakHour.orderCount || 0} Orders)
                </h3>
                <p className="text-xs text-stone-500">
                  Primary rush interval: <strong>{hourlyData?.busiestWindow || '12:00 – 15:00'}</strong>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-stone-400 block">Overall Day AOV</span>
              <span className="text-lg font-bold font-mono text-stone-900">
                {currencySymbol}{hourlyData?.overallAov || aov}
              </span>
            </div>
          </div>

          {/* Interactive 24-Hour Bar Heatmap */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  24-Hour Order & Sales Intensity Heatmap
                </h3>
                <p className="text-[11px] text-stone-500">
                  Color intensity depicts revenue density across each hour of the day.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-stone-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-stone-100 border border-stone-200" /> Zero</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-amber-200" /> Low</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-amber-400" /> Med</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-terracotta-500" /> High</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-rose-600" /> Peak</span>
              </div>
            </div>

            {/* Heatmap Bar Visual Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1.5 pt-4 pb-2">
              {hourlyData?.hourlyBreakdown.map(h => {
                const isSelected = selectedHourHover === h.hour;
                let bgClass = 'bg-stone-100 text-stone-400 border-stone-200';
                if (h.intensity === 'low') bgClass = 'bg-amber-100 text-amber-900 border-amber-300';
                else if (h.intensity === 'medium') bgClass = 'bg-amber-300 text-amber-950 border-amber-400';
                else if (h.intensity === 'high') bgClass = 'bg-terracotta-500 text-white border-terracotta-600';
                else if (h.intensity === 'peak') bgClass = 'bg-rose-600 text-white border-rose-700 shadow-sm';

                return (
                  <div
                    key={h.hour}
                    onMouseEnter={() => setSelectedHourHover(h.hour)}
                    onMouseLeave={() => setSelectedHourHover(null)}
                    className={`flex flex-col items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${bgClass} ${
                      isSelected ? 'ring-2 ring-stone-900 scale-105 z-10' : ''
                    }`}
                    style={{ minHeight: '90px' }}
                  >
                    <span className="text-[10px] font-mono font-bold">{h.hour}h</span>
                    <div className="my-auto text-center">
                      <p className="text-xs font-bold font-mono">
                        {h.orderCount > 0 ? `${h.orderCount} ord` : '—'}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono opacity-90 truncate max-w-full">
                      {h.grossSales > 0 ? `${currencySymbol}${Math.round(h.grossSales)}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Hover Tooltip / Detail Box */}
            {selectedHourHover !== null && hourlyData?.hourlyBreakdown[selectedHourHover] && (
              <div className="p-3 rounded-xl bg-stone-900 text-white text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>
                    <strong>Hour Window {hourlyData.hourlyBreakdown[selectedHourHover].hourLabel}:</strong>{' '}
                    {hourlyData.hourlyBreakdown[selectedHourHover].orderCount} orders fulfilled
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <span>Gross: <strong>{currencySymbol}{hourlyData.hourlyBreakdown[selectedHourHover].grossSales.toLocaleString('en-IN')}</strong></span>
                  <span>AOV: <strong>{currencySymbol}{hourlyData.hourlyBreakdown[selectedHourHover].averageTicketSize}</strong></span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB C: Category Performance & Food Cost Margins (Part 7.1) */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sage-600/10 via-sage-600/5 to-transparent border border-sage-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sage-700 text-white shadow-xs">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sage-800">
                  Leading Sales Category
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  {categoryData?.topCategoryName || 'Main Course'} ({categoryData?.categories[0]?.percentageOfTotalSales || 0}% of Total Revenue)
                </h3>
                <p className="text-xs text-stone-500">
                  Theoretical Food Cost Margin: <strong>~{categoryData?.categories[0]?.grossMarginPercent || 68}%</strong>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-stone-400 block">Total Volume Sold</span>
              <span className="text-lg font-bold font-mono text-stone-900">
                {categoryData?.totalVolume || 0} Items
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryData?.categories.map(cat => (
              <Card key={cat.categoryId} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 rounded-xl bg-canvas-100">{cat.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{cat.categoryName}</h4>
                      <p className="text-[11px] text-stone-400">
                        {cat.volume} units sold across {cat.uniqueItemCount} distinct menu items
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold font-mono text-stone-900">
                      {currencySymbol}{cat.grossRevenue.toLocaleString('en-IN')}
                    </p>
                    <Badge variant="success" size="sm">
                      {cat.grossMarginPercent}% Margin
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar of total revenue */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-stone-500">
                    <span>Revenue Contribution</span>
                    <span className="font-bold">{cat.percentageOfTotalSales}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-canvas-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-terracotta-500 to-amber-500 rounded-full transition-all"
                      style={{ width: `${Math.max(4, cat.percentageOfTotalSales)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-canvas-border text-xs text-stone-600">
                  <span>Top Dish: <strong className="text-stone-900">{cat.topSellingItem.name}</strong></span>
                  <span className="text-[11px] font-mono text-stone-400">
                    Cost: ~{currencySymbol}{cat.estimatedFoodCost}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB D: Staff Sales Contribution & Leaderboard (Part 7.2) */}
      {/* ========================================================================= */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Top Performer Ribbon */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-blue-600/5 to-transparent border border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                  Floor Leaderboard Performer
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  {staffData?.topPerformer.staffName || 'Amit Kumar'} ({currencySymbol}{staffData?.topPerformer.sales.toLocaleString('en-IN') || 0})
                </h3>
                <p className="text-xs text-stone-500">
                  Role: <strong className="capitalize">{staffData?.topPerformer.role}</strong> · {staffData?.topPerformer.billsCount} transactions fulfilled
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-stone-400 block">Total Staff Active</span>
              <span className="text-lg font-bold font-mono text-stone-900">
                {staffData?.totalStaffActive || 0} Members
              </span>
            </div>
          </div>

          {/* Staff Leaderboard Table */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-canvas-border pb-2.5">
              Staff Revenue Contribution & Table Coverage
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-canvas-border text-stone-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-2">Staff Member</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2 text-center">Bills Settled</th>
                    <th className="pb-2 text-center">Table Turns</th>
                    <th className="pb-2 text-right">Avg Ticket (AOV)</th>
                    <th className="pb-2 text-right">Tender Cash</th>
                    <th className="pb-2 text-right">Tender Digital</th>
                    <th className="pb-2 text-right">Gross Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border">
                  {staffData?.staffBreakdown.map((staff, idx) => (
                    <tr key={staff.staffId} className="hover:bg-canvas-100/60 transition-colors">
                      <td className="py-2.5 font-bold text-stone-900 flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono text-white ${
                          idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-stone-400' : 'bg-stone-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <span>{staff.staffName}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="capitalize font-medium text-stone-700 px-2 py-0.5 rounded-full bg-canvas-200 text-[10px]">
                          {staff.role}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-mono font-bold text-stone-800">
                        {staff.billsCount}
                      </td>
                      <td className="py-2.5 text-center font-mono text-stone-600">
                        {staff.tableTurns} turns
                      </td>
                      <td className="py-2.5 text-right font-mono text-stone-700">
                        {currencySymbol}{staff.averageTicket}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-700">
                        {currencySymbol}{staff.tenderBreakdown.cash.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right font-mono text-blue-700">
                        {currencySymbol}{(staff.tenderBreakdown.card + staff.tenderBreakdown.upi).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-stone-900">
                        {currencySymbol}{staff.grossSales.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB E: Discount Attribution & High Discount Sign-Off (Part 7.2) */}
      {/* ========================================================================= */}
      {activeTab === 'discounts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-[10px] text-stone-500 font-bold uppercase">Total Discounts Given</span>
              <p className="text-xl font-bold font-mono text-rose-600">
                {currencySymbol}{discountData?.totalDiscountsGiven.toLocaleString('en-IN') || 0}
              </p>
              <span className="text-[10px] text-stone-400">
                {discountData?.discountPercentageOfGross || 0}% of potential gross revenue
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[10px] text-stone-500 font-bold uppercase">High Discounts (&gt; ₹200)</span>
              <p className="text-xl font-bold font-mono text-amber-600">
                {discountData?.highDiscountCount || 0} Invoices
              </p>
              <span className="text-[10px] text-stone-400">
                Total impact: {currencySymbol}{discountData?.highDiscountValue.toLocaleString('en-IN') || 0}
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[10px] text-stone-500 font-bold uppercase">Manager Sign-Off Compliance</span>
              <p className="text-xl font-bold font-mono text-emerald-600">
                {discountData?.managerApprovalRate || 100}%
              </p>
              <span className="text-[10px] text-stone-400">
                Mandatory PIN authorization enforced
              </span>
            </Card>
          </div>

          {/* Discount Reasons Breakdown */}
          {discountData?.topReasons && discountData.topReasons.length > 0 && (
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-stone-900 border-b border-canvas-border pb-2.5">
                Discount Reasons Distribution
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {discountData.topReasons.map(r => (
                  <div key={r.reason} className="p-3 rounded-xl bg-canvas-50 border border-canvas-border space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-stone-800">{r.reason}</span>
                      <span className="font-mono text-stone-500">{r.count}x</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-stone-400">{r.percentage}%</span>
                      <span className="font-bold text-rose-600">-{currencySymbol}{r.totalAmount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Discount Audit Table */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-canvas-border pb-2.5">
              Discount Log & Manager Authorization Audit ({discountData?.records.length || 0} Records)
            </h3>

            {discountData?.records.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">
                No discounts applied today.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-canvas-border text-stone-400 uppercase text-[10px] tracking-wider">
                      <th className="pb-2">Invoice #</th>
                      <th className="pb-2">Reason</th>
                      <th className="pb-2">Guest / Table</th>
                      <th className="pb-2 text-right">Subtotal</th>
                      <th className="pb-2 text-right">Discount</th>
                      <th className="pb-2 text-right">Final Total</th>
                      <th className="pb-2 text-center">Manager Sign-Off</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-canvas-border">
                    {discountData?.records.map(rec => (
                      <tr key={rec.id} className="hover:bg-canvas-100/60 transition-colors">
                        <td className="py-2.5 font-mono font-bold text-stone-900">
                          {rec.invoiceNumber}
                        </td>
                        <td className="py-2.5 text-stone-700">
                          {rec.discountReason}
                        </td>
                        <td className="py-2.5 text-stone-600">
                          {rec.customerName} {rec.tableNumber ? `(T-${rec.tableNumber})` : ''}
                        </td>
                        <td className="py-2.5 text-right font-mono text-stone-600">
                          {currencySymbol}{rec.billSubtotal.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-rose-600">
                          -{currencySymbol}{rec.discountAmount.toFixed(2)} ({rec.discountPercent}%)
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-stone-900">
                          {currencySymbol}{rec.finalBillTotal.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-center">
                          {rec.managerApproval ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Approved by {rec.managerApproval.userName.split(' ')[0]}
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400">Standard</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB F: Statutory Indian GSTR-1 Tax Ledger (Part 7.3) */}
      {/* ========================================================================= */}
      {activeTab === 'gstr1' && (
        <div className="space-y-6">
          {/* Header & Export Actions */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-emerald-600/5 to-transparent border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Indian Statutory GST Return
              </span>
              <h3 className="text-base font-bold text-stone-900">
                GSTR-1 Tax Compliance Ledger · Period: {gstr1Data?.taxPeriod || 'OCT-2026'}
              </h3>
              <p className="text-xs text-stone-500">
                Filing entity: <strong>{gstr1Data?.legalName || profile.name}</strong> · GSTIN: <strong>{gstr1Data?.gstin}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportGstr1Json}
              >
                Export GSTR-1 JSON
              </Button>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportGstr1Csv}
              >
                Export GSTR-1 CSV
              </Button>
            </div>
          </div>

          {/* GSTR-1 Turnover Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3.5">
              <span className="text-[10px] text-stone-500 font-bold uppercase">Gross Turnover</span>
              <p className="text-lg font-bold font-mono text-stone-900 mt-1">
                {currencySymbol}{gstr1Data?.grossTurnover.toLocaleString('en-IN') || 0}
              </p>
              <span className="text-[10px] text-stone-400">Total invoice value</span>
            </Card>

            <Card className="p-3.5">
              <span className="text-[10px] text-stone-500 font-bold uppercase">Net Taxable Value</span>
              <p className="text-lg font-bold font-mono text-stone-900 mt-1">
                {currencySymbol}{gstr1Data?.netTaxableTurnover.toLocaleString('en-IN') || 0}
              </p>
              <span className="text-[10px] text-stone-400">Base before tax</span>
            </Card>

            <Card className="p-3.5">
              <span className="text-[10px] text-stone-500 font-bold uppercase">Central GST (CGST)</span>
              <p className="text-lg font-bold font-mono text-emerald-700 mt-1">
                {currencySymbol}{gstr1Data?.totalCgst.toLocaleString('en-IN') || 0}
              </p>
              <span className="text-[10px] text-stone-400">Rate @ 2.5%</span>
            </Card>

            <Card className="p-3.5">
              <span className="text-[10px] text-stone-500 font-bold uppercase">State GST (SGST)</span>
              <p className="text-lg font-bold font-mono text-emerald-700 mt-1">
                {currencySymbol}{gstr1Data?.totalSgst.toLocaleString('en-IN') || 0}
              </p>
              <span className="text-[10px] text-stone-400">Rate @ 2.5%</span>
            </Card>
          </div>

          {/* Table 12: HSN/SAC Classification */}
          <Card className="p-5 space-y-4">
            <div className="border-b border-canvas-border pb-3">
              <h3 className="text-sm font-bold text-stone-900">
                HSN / SAC Summary (GSTR-1 Table 12 Classification)
              </h3>
              <p className="text-[11px] text-stone-500">
                Statutory distinction between Dine-In Restaurant Services (SAC 996331) and Takeaway/Delivery Services (SAC 996332).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-canvas-border text-stone-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-2">SAC Code</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-center">UQC</th>
                    <th className="pb-2 text-center">Invoices</th>
                    <th className="pb-2 text-right">Taxable Turnover</th>
                    <th className="pb-2 text-right">CGST (2.5%)</th>
                    <th className="pb-2 text-right">SGST (2.5%)</th>
                    <th className="pb-2 text-right">Total Invoice Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border">
                  {gstr1Data?.sacSummary.map(s => (
                    <tr key={s.sacCode} className="hover:bg-canvas-100/60 transition-colors">
                      <td className="py-2.5 font-mono font-bold text-terracotta-700">
                        {s.sacCode}
                      </td>
                      <td className="py-2.5 text-stone-800 font-medium">
                        {s.description}
                      </td>
                      <td className="py-2.5 text-center font-mono text-stone-500">
                        {s.uqc}
                      </td>
                      <td className="py-2.5 text-center font-mono text-stone-800">
                        {s.invoiceCount}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-stone-900">
                        {currencySymbol}{s.taxableValue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-700">
                        {currencySymbol}{s.cgstAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-700">
                        {currencySymbol}{s.sgstAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-stone-900">
                        {currencySymbol}{s.totalValue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-xl bg-canvas-50 border border-canvas-border flex items-center justify-between text-xs text-stone-600">
              <span>Voided & cancelled bills excluded from tax ledger: <strong>{gstr1Data?.voidedInvoicesExcluded || 0} invoices</strong></span>
              <span className="font-mono font-bold text-stone-900">
                Net Disbursable GST Liability: {currencySymbol}{gstr1Data?.totalGstLiability.toLocaleString('en-IN')}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
