import React, { useState, useEffect } from 'react';
import { CashRegisterShift, RestaurantProfile } from '../types';
import { ApiService } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  CheckCircle2,
  Clock,
  Receipt
} from 'lucide-react';

interface CashRegisterViewProps {
  profile: RestaurantProfile;
  currencySymbol?: string;
}

const EXPENSE_CATEGORIES = [
  'Dairy & Fresh Milk',
  'Produce & Ice Blocks',
  'Gas Cylinder Refill',
  'Staff Refreshment / Meal',
  'Store Cleaning Supplies',
  'Packaging / Carry Bags',
  'Emergency Kitchen Purchase',
  'Other Operational Expense'
];

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({
  profile,
  currencySymbol = '₹'
}) => {
  const [register, setRegister] = useState<CashRegisterShift | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sub-action dialogs
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [showFloatModal, setShowFloatModal] = useState<boolean>(false);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [showOpenModal, setShowOpenModal] = useState<boolean>(false);

  // Form states
  const [expenseCategory, setExpenseCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDesc, setExpenseDesc] = useState<string>('');

  const [floatAmount, setFloatAmount] = useState<string>('');
  const [floatDesc, setFloatDesc] = useState<string>('Cash float replenishment');

  const [countedCash, setCountedCash] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');

  const [newOpeningFloat, setNewOpeningFloat] = useState<string>('2000');

  const loadRegister = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getCashRegister();
      setRegister(data);
    } catch (e) {
      console.error('Failed to load cash register:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegister();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount) return;
    try {
      const updated = await ApiService.addPettyExpense({
        category: expenseCategory,
        amount: Number(expenseAmount),
        description: expenseDesc
      });
      setRegister(updated);
      setShowExpenseModal(false);
      setExpenseAmount('');
      setExpenseDesc('');
    } catch (err) {
      console.error('Expense error:', err);
    }
  };

  const handleAddFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floatAmount) return;
    try {
      const updated = await ApiService.addCashFloat({
        amount: Number(floatAmount),
        description: floatDesc
      });
      setRegister(updated);
      setShowFloatModal(false);
      setFloatAmount('');
    } catch (err) {
      console.error('Float error:', err);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await ApiService.closeCashRegister({
        actualCashCounted: Number(countedCash || 0),
        notes: closeNotes
      });
      setRegister(updated);
      setShowCloseModal(false);
    } catch (err) {
      console.error('Close shift error:', err);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await ApiService.openCashRegister(Number(newOpeningFloat || 0));
      setRegister(updated);
      setShowOpenModal(false);
    } catch (err) {
      console.error('Open shift error:', err);
    }
  };

  if (loading || !register) {
    return (
      <div className="p-8 text-center text-stone-400 text-xs">
        Loading cash drawer register...
      </div>
    );
  }

  const totalExpenses = register.pettyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const isOpen = register.status === 'open';

  // Live Discrepancy Calculation for Close Modal
  const inputActual = Number(countedCash || 0);
  const diff = Number((inputActual - register.expectedCash).toFixed(2));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Shift Status Banner Card */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 !p-4 bg-gradient-to-r from-canvas-50 to-white">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-canvas-200 text-stone-800 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-stone-900">
                {profile.name} — Cash Drawer Register
              </h3>
              <Badge variant={isOpen ? 'success' : 'neutral'}>
                {register.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-stone-500 mt-0.5 flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>
                Shift opened at {new Date(register.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isOpen ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center space-x-1.5 text-xs"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-terracotta-600" />
                <span>Petty Expense</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowFloatModal(true)}
                className="flex items-center space-x-1.5 text-xs"
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-sage-600" />
                <span>Add Float</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => {
                  setCountedCash(String(register.expectedCash));
                  setShowCloseModal(true);
                }}
                className="flex items-center space-x-1.5 text-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Reconcile & Close</span>
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={() => setShowOpenModal(true)}
              className="flex items-center space-x-1.5 text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Open New Shift</span>
            </Button>
          )}
        </div>
      </Card>

      {/* 2. Four Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Float */}
        <Card className="space-y-1">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Opening Float
          </span>
          <span className="text-2xl font-black text-stone-900 font-mono block">
            {currencySymbol}{register.openingFloat.toFixed(2)}
          </span>
          <span className="text-[10px] text-stone-400 block">
            Initial base cash in drawer
          </span>
        </Card>

        {/* Cash Sales In */}
        <Card className="space-y-1">
          <span className="text-[11px] font-semibold text-sage-700 uppercase tracking-wider block flex items-center space-x-1">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Cash Sales Tenders</span>
          </span>
          <span className="text-2xl font-black text-sage-700 font-mono block">
            +{currencySymbol}{register.cashSales.toFixed(2)}
          </span>
          <span className="text-[10px] text-stone-400 block">
            From settled cash bills
          </span>
        </Card>

        {/* Petty Cash Out */}
        <Card className="space-y-1">
          <span className="text-[11px] font-semibold text-terracotta-700 uppercase tracking-wider block flex items-center space-x-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Petty Cash Out</span>
          </span>
          <span className="text-2xl font-black text-terracotta-700 font-mono block">
            -{currencySymbol}{totalExpenses.toFixed(2)}
          </span>
          <span className="text-[10px] text-stone-400 block">
            {register.pettyExpenses.length} expense disbursals
          </span>
        </Card>

        {/* Expected Cash */}
        <Card className="space-y-1 bg-sage-50/50 border-sage-300">
          <span className="text-[11px] font-bold text-sage-800 uppercase tracking-wider block">
            Expected Cash in Drawer
          </span>
          <span className="text-2xl font-black text-stone-900 font-mono block">
            {currencySymbol}{register.expectedCash.toFixed(2)}
          </span>
          <span className="text-[10px] text-sage-700 font-semibold block">
            Calculated net physical cash
          </span>
        </Card>
      </div>

      {/* 3. Shift Petty Cash Expenses & Disbursals Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-canvas-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Shift Petty Cash Expenses & Disbursals
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Mid-day operational payments logged from the active cash drawer.
            </p>
          </div>
          <span className="text-xs font-bold font-mono text-stone-600 bg-canvas-100 px-3 py-1 rounded-full border border-canvas-border">
            Total Spent: {currencySymbol}{totalExpenses.toFixed(2)}
          </span>
        </div>

        {register.pettyExpenses.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs space-y-1">
            <Receipt className="w-8 h-8 mx-auto text-stone-300" />
            <p className="font-semibold text-stone-700">No petty cash expenses recorded</p>
            <p className="text-stone-400">
              When milk, ice, gas, or emergency supplies are purchased, click "Petty Expense" to log them.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-canvas-border text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-border">
                {register.pettyExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-canvas-50/80 transition-colors">
                    <td className="py-3 px-3 text-stone-500 font-mono text-[11px]">
                      {new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-stone-900 px-2 py-0.5 rounded-lg bg-canvas-100 border border-canvas-border text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-600">
                      {exp.description || 'Operational purchase'}
                    </td>
                    <td className="py-3 px-3 text-stone-500 text-[11px]">
                      Store Cashier
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-terracotta-600">
                      -{currencySymbol}{exp.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: RECORD PETTY EXPENSE */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowExpenseModal(false)}
          title="Record Petty Cash Expense"
          subtitle="Log mid-day cash disbursement from the register"
          maxWidth="md"
        >
          <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Expense Category *
              </label>
              <select
                value={expenseCategory}
                onChange={e => setExpenseCategory(e.target.value)}
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Amount ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
                placeholder="e.g. 250"
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono text-base font-bold focus:outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Notes / Vendor / Bill #
              </label>
              <input
                type="text"
                value={expenseDesc}
                onChange={e => setExpenseDesc(e.target.value)}
                placeholder="e.g. 5 Litres full-cream milk from dairy"
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-canvas-border">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowExpenseModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Confirm Disbursement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: ADD CASH FLOAT (CASH IN) */}
      {/* ========================================================================= */}
      {showFloatModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowFloatModal(false)}
          title="Add Cash Float (Drawer Inward)"
          subtitle="Add extra cash change or replenishment to active drawer"
          maxWidth="md"
        >
          <form onSubmit={handleAddFloat} className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Float Amount ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="10"
                min="10"
                required
                value={floatAmount}
                onChange={e => setFloatAmount(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono text-base font-bold focus:outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Replenishment Reason
              </label>
              <input
                type="text"
                value={floatDesc}
                onChange={e => setFloatDesc(e.target.value)}
                placeholder="Cash float replenishment / extra small change"
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-canvas-border">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowFloatModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Deposit to Drawer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 3: RECONCILE & CLOSE SHIFT */}
      {/* ========================================================================= */}
      {showCloseModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCloseModal(false)}
          title="Reconcile & Close Cash Shift"
          subtitle="Count physical cash in the drawer and audit discrepancy"
          maxWidth="md"
        >
          <form onSubmit={handleCloseShift} className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-canvas-50 border border-canvas-border space-y-1">
              <span className="text-[11px] text-stone-500 block">Expected System Cash</span>
              <strong className="text-xl font-black text-stone-900 font-mono block">
                {currencySymbol}{register.expectedCash.toFixed(2)}
              </strong>
              <p className="text-[10px] text-stone-400">
                Opening Float ({currencySymbol}{register.openingFloat}) + Cash Sales ({currencySymbol}{register.cashSales}) - Petty Cash ({currencySymbol}{totalExpenses})
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Actual Physical Cash Counted ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={countedCash}
                onChange={e => setCountedCash(e.target.value)}
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono text-lg font-black focus:outline-none focus:border-stone-400"
              />
            </div>

            {/* Discrepancy Alert */}
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                diff === 0
                  ? 'bg-sage-50 text-sage-800 border-sage-200'
                  : diff > 0
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span>
                {diff === 0
                  ? '✓ Perfect Match (Zero Discrepancy)'
                  : diff > 0
                  ? `▲ Cash Surplus (+${currencySymbol}${diff})`
                  : `▼ Cash Shortage (-${currencySymbol}${Math.abs(diff)})`}
              </span>
              <span className="font-mono font-bold">
                {diff >= 0 ? `+${currencySymbol}${diff.toFixed(2)}` : `-${currencySymbol}${Math.abs(diff).toFixed(2)}`}
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Shift Closing Audit Notes
              </label>
              <textarea
                rows={2}
                value={closeNotes}
                onChange={e => setCloseNotes(e.target.value)}
                placeholder="e.g. Verified by Store Manager, shift handover smooth..."
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl p-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-canvas-border">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowCloseModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Sign Off & Close Shift
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 4: OPEN NEW DAY SHIFT */}
      {/* ========================================================================= */}
      {showOpenModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowOpenModal(false)}
          title="Open New Day Cash Shift"
          subtitle="Deposit opening cash float to initialize cashier drawer"
          maxWidth="md"
        >
          <form onSubmit={handleOpenShift} className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Starting Cash Float ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="50"
                min="0"
                required
                value={newOpeningFloat}
                onChange={e => setNewOpeningFloat(e.target.value)}
                placeholder="2000"
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono text-lg font-black focus:outline-none focus:border-stone-400"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Standard opening float for change tender (suggested: {currencySymbol}2,000)
              </span>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-canvas-border">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowOpenModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Initialize Shift Drawer
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
