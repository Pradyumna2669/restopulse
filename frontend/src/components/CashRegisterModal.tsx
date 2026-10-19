import React, { useState, useEffect } from 'react';
import { CashRegisterShift, RestaurantProfile } from '../types';
import { ApiService } from '../services/api';
import {
  X,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Printer,
  CheckCircle2
} from 'lucide-react';

interface CashRegisterModalProps {
  profile: RestaurantProfile;
  currencySymbol?: string;
  onClose: () => void;
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

export const CashRegisterModal: React.FC<CashRegisterModalProps> = ({
  profile,
  currencySymbol = '₹',
  onClose
}) => {
  const [register, setRegister] = useState<CashRegisterShift | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals inside Register
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
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl text-center text-slate-300">
          Loading cash drawer register...
        </div>
      </div>
    );
  }

  const totalExpenses = register.pettyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const isOpen = register.status === 'open';

  // Live Discrepancy Calculation for Close Modal
  const inputActual = Number(countedCash || 0);
  const diff = Number((inputActual - register.expectedCash).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Cash Register & Shift Drawer</h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isOpen
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                      : 'bg-slate-700 text-slate-300 border border-slate-600'
                  }`}
                >
                  {register.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Shift opened at: {new Date(register.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {profile.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Drawer Balance Strip */}
        <div className="p-6 bg-slate-950/60 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-semibold">Opening Float</span>
            <span className="text-lg font-extrabold text-white font-mono mt-0.5 block">
              {currencySymbol}{register.openingFloat.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500">Day start base cash</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-emerald-400 block font-semibold flex items-center space-x-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Cash Sales</span>
            </span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5 block">
              +{currencySymbol}{register.cashSales.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500">From settled cash bills</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-rose-400 block font-semibold flex items-center space-x-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Petty Cash Out</span>
            </span>
            <span className="text-lg font-extrabold text-rose-400 font-mono mt-0.5 block">
              -{currencySymbol}{totalExpenses.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500">{register.pettyExpenses.length} expense entries</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/50 shadow-lg shadow-emerald-950/40">
            <span className="text-[11px] text-emerald-300 block font-bold uppercase tracking-wider">
              Expected Cash in Drawer
            </span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">
              {currencySymbol}{register.expectedCash.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-400/80">Net calculated balance</span>
          </div>
        </div>

        {/* Drawer Action Bar */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isOpen ? (
              <>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold transition-all"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Record Petty Expense</span>
                </button>

                <button
                  onClick={() => setShowFloatModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg text-xs font-bold transition-all"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Add Float (Cash In)</span>
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Drawer shift closed. Start a new shift to accept and disburse drawer cash.
              </span>
            )}
          </div>

          <div>
            {isOpen ? (
              <button
                onClick={() => {
                  setCountedCash(String(register.expectedCash));
                  setShowCloseModal(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Reconcile & Close Shift</span>
              </button>
            ) : (
              <button
                onClick={() => setShowOpenModal(true)}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Open New Day Shift</span>
              </button>
            )}
          </div>
        </div>

        {/* Petty Expenses List */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Shift Petty Cash Expenses & Disbursals
            </h3>
            <span className="text-xs text-slate-500">
              Total Spent: <strong className="text-slate-300">{currencySymbol}{totalExpenses.toFixed(2)}</strong>
            </span>
          </div>

          {register.pettyExpenses.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-500 text-xs">
              No petty cash expenses recorded during this shift.
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-right">Amount Disbursed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {register.pettyExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-white">
                        {exp.category}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">{exp.description || 'General expenditure'}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-rose-400 font-bold">
                        -{currencySymbol}{exp.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Shift Closed Summary Card (If Closed) */}
          {!isOpen && register.actualCashCounted !== undefined && (
            <div className="mt-6 p-4 rounded-xl bg-slate-850 border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 block">
                  Last Closed Shift Discrepancy
                </span>
                <div className="flex items-center space-x-3 mt-1 text-xs">
                  <span>Counted Cash: <strong>{currencySymbol}{register.actualCashCounted}</strong></span>
                  <span>•</span>
                  <span>Expected: <strong>{currencySymbol}{register.expectedCash}</strong></span>
                  <span>•</span>
                  <span
                    className={`font-bold ${
                      register.discrepancy === 0
                        ? 'text-emerald-400'
                        : register.discrepancy! < 0
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    Diff: {register.discrepancy! >= 0 ? '+' : ''}{currencySymbol}{register.discrepancy}
                  </span>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Shift Z-Slip</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Record Petty Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Record Petty Cash Disbursal</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="py-4 space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Expense Category</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Amount Taken from Drawer ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-base font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Description / Purpose
                </label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  placeholder="e.g. 2 kg Tomatoes bought from local vendor"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg transition-all"
                >
                  Disburse & Deduct Cash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Float Modal */}
      {showFloatModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add Cash Float to Drawer</h3>
              <button onClick={() => setShowFloatModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFloat} className="py-4 space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Cash Amount Added ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={floatAmount}
                  onChange={e => setFloatAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-base font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Reason / Source
                </label>
                <input
                  type="text"
                  value={floatDesc}
                  onChange={e => setFloatDesc(e.target.value)}
                  placeholder="e.g. Change replenishment from bank"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFloatModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg transition-all"
                >
                  Add to Drawer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reconcile & Close Shift Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Reconcile & Close Shift</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="py-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-700 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>System Expected Cash:</span>
                  <span className="font-mono font-bold text-white">
                    {currencySymbol}{register.expectedCash.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Actual Physical Cash Counted in Drawer ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={countedCash}
                  onChange={e => setCountedCash(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-lg font-black focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Difference Badge */}
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                  diff === 0
                    ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-300'
                    : diff < 0
                    ? 'bg-rose-950/40 border border-rose-500/50 text-rose-300'
                    : 'bg-amber-950/40 border border-amber-500/50 text-amber-300'
                }`}
              >
                <span>Discrepancy (Over / Short):</span>
                <span className="font-mono">
                  {diff >= 0 ? '+' : ''}{currencySymbol}{diff.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Closing Notes & Remarks
                </label>
                <textarea
                  rows={2}
                  value={closeNotes}
                  onChange={e => setCloseNotes(e.target.value)}
                  placeholder="e.g. Shift balanced, evening cashier Ramesh handed over keys..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg transition-all"
                >
                  Confirm & Lock Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open New Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Open New Shift Register</h3>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="py-4 space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Opening Cash Float in Drawer ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={newOpeningFloat}
                  onChange={e => setNewOpeningFloat(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-base font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg transition-all"
                >
                  Start Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
