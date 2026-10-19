import React, { useState, useEffect } from 'react';
import { CustomerProfile } from '../types';
import { ApiService } from '../services/api';
import {
  X,
  Search,
  UserPlus,
  Crown,
  Award,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Heart,
  FileText,
  Save,
  CheckCircle2
} from 'lucide-react';

interface CustomerCrmModalProps {
  currencySymbol: string;
  onClose: () => void;
  onSelectCustomer?: (customer: CustomerProfile) => void;
}

export const CustomerCrmModal: React.FC<CustomerCrmModalProps> = ({
  currencySymbol,
  onClose,
  onSelectCustomer
}) => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [manualPoints, setManualPoints] = useState<number>(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newPoints, setNewPoints] = useState(25); // Welcome bonus

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await ApiService.getCustomers();
      setCustomers(data);
      if (data.length > 0 && !selectedCustomer) {
        setSelectedCustomer(data[0]);
        setEditNotes(data[0].notes || '');
        setManualPoints(data[0].loyaltyPoints);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const handleSelectCustomer = (c: CustomerProfile) => {
    setSelectedCustomer(c);
    setEditNotes(c.notes || '');
    setManualPoints(c.loyaltyPoints);
    setIsAddingNew(false);
  };

  const handleSaveCustomerUpdates = async () => {
    if (!selectedCustomer) return;
    try {
      const updated = await ApiService.upsertCustomer({
        phone: selectedCustomer.phone,
        notes: editNotes,
        loyaltyPoints: manualPoints
      });
      setCustomers(prev => prev.map(c => (c.phone === updated.phone ? updated : c)));
      setSelectedCustomer(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update customer:', err);
    }
  };

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone) return;
    try {
      const created = await ApiService.upsertCustomer({
        phone: newPhone,
        name: newName || 'Valued Guest',
        email: newEmail,
        notes: newNotes,
        loyaltyPoints: Number(newPoints) || 0
      });
      setCustomers(prev => [created, ...prev.filter(c => c.phone !== created.phone)]);
      setSelectedCustomer(created);
      setEditNotes(created.notes || '');
      setManualPoints(created.loyaltyPoints);
      setIsAddingNew(false);
      // Reset form
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewNotes('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to create customer:', err);
    }
  };

  // Filtered customer list
  const filtered = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(query) || c.phone.includes(query) || (c.email && c.email.toLowerCase().includes(query));
    const matchesTier = selectedTierFilter === 'all' || c.tier === selectedTierFilter;
    return matchesSearch && matchesTier;
  });

  // Aggregated CRM Metrics
  const totalSpendSum = customers.reduce((acc, c) => acc + c.totalSpend, 0);
  const totalPointsSum = customers.reduce((acc, c) => acc + c.loyaltyPoints, 0);
  const vipCount = customers.filter(c => c.tier === 'VIP Platinum' || c.tier === 'Gold').length;

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'VIP Platinum':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/80 text-purple-200 border border-purple-500/50">
            <Crown className="w-3 h-3 mr-1 text-purple-300" />
            VIP Platinum
          </span>
        );
      case 'Gold':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/80 text-amber-200 border border-amber-500/50">
            <Award className="w-3 h-3 mr-1 text-amber-300" />
            Gold Member
          </span>
        );
      case 'Silver':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-200 border border-slate-500">
            Silver
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-600 border border-amber-800">
            Bronze
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[88vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
              <Crown className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Guest CRM & Loyalty Wallet</span>
                <span className="px-2 py-0.5 bg-purple-900/60 text-purple-300 text-xs font-semibold rounded-full border border-purple-700/60">
                  {customers.length} Profiles
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Reward returning diners • Track visit cadence & favorite dishes • 1 Pt per ₹100 spent
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setIsAddingNew(true);
                setSelectedCustomer(null);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll Diner</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Analytics KPI Ribbon */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-slate-400 text-[11px] block">Total Registered Diners</span>
            <span className="text-lg font-bold text-white font-mono">{customers.length} Guests</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-slate-400 text-[11px] block">VIP & Gold Patrons</span>
            <span className="text-lg font-bold text-purple-400 font-mono">{vipCount} Members</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-slate-400 text-[11px] block">Active Loyalty Points</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{totalPointsSum.toLocaleString()} Pts</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-slate-400 text-[11px] block">Lifetime Revenue Contribution</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {currencySymbol}{totalSpendSum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Main Content Split: Left List vs Right Detail */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Search & Customer List */}
          <div className="w-2/5 border-r border-slate-800 flex flex-col bg-slate-900/40">
            {/* Search & Tier Filters */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone or email..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Tier Filter Pills */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
                {['all', 'VIP Platinum', 'Gold', 'Silver', 'Bronze'].map(tier => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTierFilter(tier)}
                    className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                      selectedTierFilter === tier
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tier === 'all' ? 'All Tiers' : tier}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No customer profiles found matching "{searchQuery}".
                </div>
              ) : (
                filtered.map(c => {
                  const isSelected = selectedCustomer?.phone === c.phone && !isAddingNew;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className={`p-3 cursor-pointer transition-colors flex items-start justify-between ${
                        isSelected
                          ? 'bg-purple-950/40 border-l-4 border-purple-500'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-white truncate">{c.name}</h4>
                          {getTierBadge(c.tier)}
                        </div>
                        <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{c.phone}</span>
                          </span>
                          <span>•</span>
                          <span>{c.visitsCount} visits</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-amber-400 font-mono block">
                          {c.loyaltyPoints} Pts
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {currencySymbol}{c.totalSpend.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Detail View or New Form */}
          <div className="w-3/5 flex flex-col bg-slate-900/90 overflow-y-auto p-6">
            {isAddingNew ? (
              /* New Customer Enrollment Form */
              <form onSubmit={handleCreateNewCustomer} className="space-y-4 max-w-lg">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 text-purple-400" />
                    <span>Enroll New Guest in CRM</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Instantly create profile and assign welcome loyalty points.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Guest Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="ramesh@gmail.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Welcome Bonus Points
                    </label>
                    <input
                      type="number"
                      value={newPoints}
                      onChange={e => setNewPoints(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Special Preferences / Allergies / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    placeholder="Prefers window booth, vegetarian, celebrations..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save & Enroll Guest</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      if (customers.length > 0) setSelectedCustomer(customers[0]);
                    }}
                    className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : selectedCustomer ? (
              /* Selected Customer Detail Card */
              <div className="space-y-5">
                {/* Header Banner */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-200 font-bold text-lg">
                      {selectedCustomer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-white">{selectedCustomer.name}</h3>
                        {getTierBadge(selectedCustomer.tier)}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{selectedCustomer.phone}</span>
                        </span>
                        {selectedCustomer.email && (
                          <>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Mail className="w-3.5 h-3.5 text-slate-500" />
                              <span>{selectedCustomer.email}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {onSelectCustomer && (
                    <button
                      onClick={() => onSelectCustomer(selectedCustomer)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition-all"
                    >
                      Use for Current Order
                    </button>
                  )}
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Loyalty Wallet</span>
                    </span>
                    <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">
                      {selectedCustomer.loyaltyPoints} Pts
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Value: {currencySymbol}{selectedCustomer.loyaltyPoints.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Lifetime Spend</span>
                    </span>
                    <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                      {currencySymbol}{selectedCustomer.totalSpend.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Avg: {currencySymbol}{(selectedCustomer.totalSpend / Math.max(1, selectedCustomer.visitsCount)).toFixed(0)} / visit
                    </span>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>Visits & Recency</span>
                    </span>
                    <span className="text-xl font-bold text-white font-mono mt-1 block">
                      {selectedCustomer.visitsCount} Visits
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      Last: {new Date(selectedCustomer.lastVisit).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Favorite Items */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 mb-2">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    <span>Frequently Ordered Items</span>
                  </h4>
                  {selectedCustomer.favoriteItems && selectedCustomer.favoriteItems.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCustomer.favoriteItems.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs"
                        >
                          🍲 {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Dishes will automatically be logged as this diner settles bills.
                    </p>
                  )}
                </div>

                {/* Edit Notes & Adjust Points */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span>Guest Profile Notes & Points Adjustment</span>
                    </h4>
                    {saveSuccess && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Changes Saved</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Dietary preferences, table preferences, VIP notes:
                    </label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="e.g. Likes extra spicy, prefers corner booth..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400">Manual Points Override:</span>
                      <input
                        type="number"
                        value={manualPoints}
                        onChange={e => setManualPoints(Number(e.target.value))}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveCustomerUpdates}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Updates</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                Select a diner from the directory or enroll a new guest.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
