import React, { useState } from 'react';
import { X, ShieldCheck, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import { StaffUser } from '../../types';

interface StaffSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffUser[];
  currentStaff?: StaffUser;
  onSelectStaff: (user: StaffUser) => void;
}

export const StaffSwitchModal: React.FC<StaffSwitchModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentStaff,
  onSelectStaff
}) => {
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(currentStaff || staffList[0] || null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleQuickSwitch = async (_userToSwitch: StaffUser, enteredPin: string) => {
    if (enteredPin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin })
      });

      const data = await response.json();

      if (data.success && data.user) {
        onSelectStaff(data.user);
        onClose();
      } else {
        setError(data.error || 'Incorrect security PIN. Please try again.');
      }
    } catch {
      setError('Connection failure while verifying staff PIN.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'cashier':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'waiter':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'kitchen':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'inventory':
        return 'bg-stone-100 text-stone-800 border-stone-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-canvas-border overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-terracotta-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Switch Staff Profile</h3>
              <p className="text-xs text-stone-400">Select staff member and enter 4-digit PIN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Staff Selector List */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5 block">
              1. Select Staff Member
            </label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {staffList.map(user => {
                const isSelected = selectedUser?.id === user.id;
                const isCurrent = currentStaff?.id === user.id;

                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setPin('');
                      setError('');
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-terracotta-500 bg-terracotta-50/50 shadow-sm'
                        : 'border-canvas-border hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-stone-900">{user.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </div>
                      <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </div>

                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-terracotta-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Helper Badge */}
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
              <span className="font-bold">Default Seed PINs:</span><br />
              Owner: <code>1111</code> | Mgr: <code>2222</code> | Cashier: <code>3333</code><br />
              Waiter: <code>4444</code> | Chef: <code>5555</code> | Store: <code>6666</code>
            </div>
          </div>

          {/* Right: PIN Keypad */}
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5 block">
              2. Enter Security PIN
            </label>

            {/* PIN Dots */}
            <div className="mb-4 py-3 bg-stone-50 rounded-xl border border-canvas-border flex items-center justify-center gap-3">
              {[0, 1, 2, 3].map(index => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    pin.length > index
                      ? 'bg-terracotta-600 border-terracotta-600 scale-110'
                      : 'border-stone-300 bg-white'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Numeric Keypad Grid */}
            <div className="grid grid-cols-3 gap-2 flex-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  onClick={() => handleKeyPress(digit)}
                  className="py-3 text-lg font-bold text-stone-800 bg-white hover:bg-stone-100 active:bg-stone-200 border border-canvas-border rounded-xl transition-colors shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="py-3 text-xs font-bold text-stone-600 bg-stone-50 hover:bg-stone-100 border border-canvas-border rounded-xl transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                className="py-3 text-lg font-bold text-stone-800 bg-white hover:bg-stone-100 active:bg-stone-200 border border-canvas-border rounded-xl transition-colors shadow-sm"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="py-3 text-xs font-bold text-stone-600 bg-stone-50 hover:bg-stone-100 border border-canvas-border rounded-xl transition-colors"
              >
                Del
              </button>
            </div>

            {/* Confirm Switch Button */}
            <button
              onClick={() => selectedUser && handleQuickSwitch(selectedUser, pin)}
              disabled={pin.length !== 4 || isVerifying || !selectedUser}
              className="mt-4 w-full py-3 px-4 bg-terracotta-600 hover:bg-terracotta-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Authenticate & Switch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
