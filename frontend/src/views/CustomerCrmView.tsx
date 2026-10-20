import React, { useState, useEffect } from 'react';
import { CustomerProfile, DeliveryPartnerConfig, DeliveryPartner } from '../types';
import { ApiService } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
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
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  Copy,
  Check,
  Users,
  X
} from 'lucide-react';

interface CustomerCrmViewProps {
  currencySymbol: string;
  onSelectCustomer?: (customer: CustomerProfile) => void;
  onOrderSimulated?: () => void;
}

export const CustomerCrmView: React.FC<CustomerCrmViewProps> = ({
  currencySymbol,
  onSelectCustomer,
  onOrderSimulated
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'partners'>('directory');
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartnerConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [manualPoints, setManualPoints] = useState<number>(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [simulationAlert, setSimulationAlert] = useState<string | null>(null);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newPoints, setNewPoints] = useState(25); // Welcome bonus

  useEffect(() => {
    loadCustomers();
    loadDeliveryPartners();
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

  const loadDeliveryPartners = async () => {
    try {
      const data = await ApiService.getDeliveryPartners();
      setDeliveryPartners(data);
    } catch (err) {
      console.error('Failed to load delivery partners:', err);
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

  const handleTogglePartner = async (partner: DeliveryPartner, enabled: boolean) => {
    try {
      const updated = await ApiService.updateDeliveryPartner(partner, { enabled });
      setDeliveryPartners(prev => prev.map(p => (p.partner === partner ? updated : p)));
    } catch (err) {
      console.error('Failed to toggle partner:', err);
    }
  };

  const handleUpdatePartnerField = async (partner: DeliveryPartner, field: keyof DeliveryPartnerConfig, value: any) => {
    try {
      const updated = await ApiService.updateDeliveryPartner(partner, { [field]: value });
      setDeliveryPartners(prev => prev.map(p => (p.partner === partner ? updated : p)));
    } catch (err) {
      console.error('Failed to update partner config:', err);
    }
  };

  const handleSimulateInboundOrder = async (partner: DeliveryPartner) => {
    try {
      const res = await ApiService.simulatePartnerOrder(partner);
      if (res.success) {
        setSimulationAlert(
          `⚡ Simulated ${partner.toUpperCase()} order #${res.order?.orderNumber || 'ORD'} injected into KDS & Dispatch!`
        );
        if (onOrderSimulated) {
          onOrderSimulated();
        }
        await loadCustomers();
        setTimeout(() => setSimulationAlert(null), 5000);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
      alert('Order simulation failed. Ensure backend server is running on port 5000.');
    }
  };

  const handleCopyWebhook = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Calculations & Filtering
  const vipCount = customers.filter(c => c.tier === 'VIP Platinum' || c.tier === 'Gold').length;
  const totalPointsSum = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
  const totalSpendSum = customers.reduce((sum, c) => sum + c.totalSpend, 0);

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(q) || c.phone.includes(q);
    const matchesTier = selectedTierFilter === 'all' || c.tier === selectedTierFilter;
    const matchesChannel =
      selectedChannelFilter === 'all' ||
      (selectedChannelFilter === 'direct' && (!c.channel || c.channel === 'direct')) ||
      c.channel === selectedChannelFilter;
    return matchesSearch && matchesTier && matchesChannel;
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'VIP Platinum':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Crown className="w-3 h-3 mr-1 text-purple-600" />
            VIP Platinum
          </span>
        );
      case 'Gold':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Award className="w-3 h-3 mr-1 text-amber-600" />
            Gold Member
          </span>
        );
      case 'Silver':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
            Silver
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Bronze
          </span>
        );
    }
  };

  const getChannelBadge = (channel?: DeliveryPartner) => {
    switch (channel) {
      case 'zomato':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">🔴 Zomato</span>;
      case 'swiggy':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">🟠 Swiggy</span>;
      case 'ondc':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">🔵 ONDC</span>;
      case 'magicpin':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">🟣 Magicpin</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-50 text-sage-800 border border-sage-200">🟢 In-House</span>;
    }
  };

  const activePartnersCount = deliveryPartners.filter(p => p.enabled).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Simulation Banner Notification */}
      {simulationAlert && (
        <div className="bg-sage-50 border border-sage-300 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-sage-800 shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <Zap className="w-4 h-4 text-sage-600 animate-bounce" />
            <span className="font-bold">{simulationAlert}</span>
          </div>
          <button
            onClick={() => setSimulationAlert(null)}
            className="text-sage-600 hover:text-sage-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-canvas-border shadow-sm">
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'directory'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Guest CRM Directory</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'directory' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {customers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'partners'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Delivery Partner Channels</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'partners' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {activePartnersCount} Active
            </span>
          </button>
        </div>

        {activeTab === 'directory' && (
          <Button
            variant="primary"
            onClick={() => {
              setIsAddingNew(true);
              setSelectedCustomer(null);
            }}
            className="flex items-center space-x-1.5 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Guest</span>
          </Button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GUEST CRM DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Analytics KPI Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-canvas-200 text-stone-800 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Registered Diners
                </span>
                <span className="text-xl font-black text-stone-900 font-mono">
                  {customers.length} Guests
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  VIP & Gold Patrons
                </span>
                <span className="text-xl font-black text-purple-700 font-mono">
                  {vipCount} Members
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Loyalty Points Pool
                </span>
                <span className="text-xl font-black text-amber-700 font-mono">
                  {totalPointsSum.toLocaleString()} Pts
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sage-50 text-sage-700 border border-sage-200 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Lifetime Diner Spend
                </span>
                <span className="text-xl font-black text-stone-900 font-mono">
                  {currencySymbol}{totalSpendSum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </Card>
          </div>

          {/* Two-Column Master-Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Search & Customer Directory (5 cols) */}
            <Card className="lg:col-span-5 space-y-4 !p-4 flex flex-col max-h-[800px]">
              {/* Search & Filters */}
              <div className="space-y-3 pb-3 border-b border-canvas-border">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search guest by name or mobile..."
                    className="w-full bg-canvas-100 border border-canvas-border rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
                  />
                </div>

                {/* Channel Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] pb-1">
                  {[
                    { key: 'all', label: 'All Channels' },
                    { key: 'direct', label: '🟢 Dine-In' },
                    { key: 'zomato', label: '🔴 Zomato' },
                    { key: 'swiggy', label: '🟠 Swiggy' },
                    { key: 'ondc', label: '🔵 ONDC' }
                  ].map(ch => (
                    <button
                      key={ch.key}
                      onClick={() => setSelectedChannelFilter(ch.key)}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                        selectedChannelFilter === ch.key
                          ? 'bg-stone-900 text-white'
                          : 'bg-canvas-100 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>

                {/* Loyalty Tier Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px]">
                  {[
                    { key: 'all', label: 'All Tiers' },
                    { key: 'VIP Platinum', label: '👑 Platinum' },
                    { key: 'Gold', label: '🥇 Gold' },
                    { key: 'Silver', label: '🥈 Silver' },
                    { key: 'Bronze', label: '🥉 Bronze' }
                  ].map(tier => (
                    <button
                      key={tier.key}
                      onClick={() => setSelectedTierFilter(tier.key)}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                        selectedTierFilter === tier.key
                          ? 'bg-amber-600 text-white'
                          : 'bg-canvas-100 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer List */}
              <div className="overflow-y-auto flex-1 divide-y divide-canvas-border space-y-1">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-xs">
                    No matching customer profiles found.
                  </div>
                ) : (
                  filtered.map(c => {
                    const isSelected = selectedCustomer?.phone === c.phone && !isAddingNew;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between ${
                          isSelected
                            ? 'bg-stone-900 text-white shadow-sm'
                            : 'hover:bg-canvas-50 text-stone-900'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-xs font-bold truncate">{c.name}</h4>
                            {getChannelBadge(c.channel)}
                          </div>
                          <div
                            className={`flex items-center space-x-2 text-[11px] mt-1 ${
                              isSelected ? 'text-stone-300' : 'text-stone-500'
                            }`}
                          >
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 opacity-70" />
                              <span className="font-mono">{c.phone}</span>
                            </span>
                            <span>•</span>
                            <span>{c.visitsCount} visits</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-bold font-mono block ${
                              isSelected ? 'text-amber-300' : 'text-amber-700'
                            }`}
                          >
                            {c.loyaltyPoints} Pts
                          </span>
                          <span
                            className={`text-[10px] font-mono ${
                              isSelected ? 'text-stone-300' : 'text-stone-400'
                            }`}
                          >
                            {currencySymbol}{c.totalSpend.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Right Column: Profile Detail or Enrollment Form (7 cols) */}
            <div className="lg:col-span-7">
              {isAddingNew ? (
                <Card className="space-y-5">
                  <div className="border-b border-canvas-border pb-3">
                    <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                      <UserPlus className="w-5 h-5 text-terracotta-600" />
                      <span>Enroll New Guest in CRM</span>
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Create customer loyalty profile for automatic digital receipts and visit rewards.
                    </p>
                  </div>

                  <form onSubmit={handleCreateNewCustomer} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Guest Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          placeholder="e.g. Ramesh Patel"
                          className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Mobile Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={newPhone}
                          onChange={e => setNewPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          placeholder="ramesh@gmail.com"
                          className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Welcome Bonus Points
                        </label>
                        <input
                          type="number"
                          value={newPoints}
                          onChange={e => setNewPoints(Number(e.target.value))}
                          className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">
                        Preferences & Dietary Notes
                      </label>
                      <textarea
                        rows={3}
                        value={newNotes}
                        onChange={e => setNewNotes(e.target.value)}
                        placeholder="e.g. Prefers window table, allergic to peanuts, oat milk preference..."
                        className="w-full bg-canvas-100 border border-canvas-border rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400 resize-none"
                      />
                    </div>

                    <div className="flex items-center space-x-3 pt-2">
                      <Button variant="primary" type="submit" className="flex items-center space-x-1.5">
                        <Save className="w-4 h-4" />
                        <span>Save & Enroll Guest</span>
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setIsAddingNew(false);
                          if (customers.length > 0) setSelectedCustomer(customers[0]);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : selectedCustomer ? (
                <Card className="space-y-6">
                  {/* Header Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-canvas-50 border border-canvas-border">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-black text-lg shrink-0">
                        {selectedCustomer.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-stone-900">{selectedCustomer.name}</h3>
                          {getTierBadge(selectedCustomer.tier)}
                          {getChannelBadge(selectedCustomer.channel)}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1">
                          <span className="flex items-center space-x-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-stone-400" />
                            <span>{selectedCustomer.phone}</span>
                          </span>
                          {selectedCustomer.email && (
                            <>
                              <span>•</span>
                              <span className="flex items-center space-x-1">
                                <Mail className="w-3.5 h-3.5 text-stone-400" />
                                <span>{selectedCustomer.email}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {onSelectCustomer && (
                      <Button
                        variant="secondary"
                        onClick={() => onSelectCustomer(selectedCustomer)}
                        className="self-start sm:self-auto text-xs"
                      >
                        Use for Order
                      </Button>
                    )}
                  </div>

                  {/* 3 Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-canvas-50 border border-canvas-border rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-stone-500 flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>Loyalty Wallet</span>
                      </span>
                      <span className="text-2xl font-black text-amber-700 font-mono block">
                        {selectedCustomer.loyaltyPoints} Pts
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono block">
                        Cash Value: {currencySymbol}{selectedCustomer.loyaltyPoints.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-canvas-50 border border-canvas-border rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-stone-500 flex items-center space-x-1">
                        <DollarSign className="w-3.5 h-3.5 text-sage-600" />
                        <span>Lifetime Spend</span>
                      </span>
                      <span className="text-2xl font-black text-stone-900 font-mono block">
                        {currencySymbol}{selectedCustomer.totalSpend.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono block">
                        Avg: {currencySymbol}{(selectedCustomer.totalSpend / Math.max(1, selectedCustomer.visitsCount)).toFixed(0)} / visit
                      </span>
                    </div>

                    <div className="bg-canvas-50 border border-canvas-border rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-stone-500 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>Visits & Frequency</span>
                      </span>
                      <span className="text-2xl font-black text-stone-900 font-mono block">
                        {selectedCustomer.visitsCount} Visits
                      </span>
                      <span className="text-[10px] text-stone-400 truncate block">
                        Last visit: {new Date(selectedCustomer.lastVisit).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Frequently Ordered Dishes */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span>Favorite & Frequently Ordered Dishes</span>
                    </h4>
                    {selectedCustomer.favoriteItems && selectedCustomer.favoriteItems.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomer.favoriteItems.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-canvas-100 text-stone-800 border border-canvas-border rounded-xl text-xs font-medium"
                          >
                            🍲 {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 italic">
                        Ordered dishes are automatically logged when orders are settled.
                      </p>
                    )}
                  </div>

                  {/* Profile Notes & Points Override */}
                  <div className="space-y-3 pt-3 border-t border-canvas-border">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-terracotta-600" />
                        <span>Guest Notes & Points Adjustment</span>
                      </h4>
                      {saveSuccess && (
                        <span className="text-xs text-sage-700 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
                          <span>Changes saved successfully</span>
                        </span>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="Special instructions, dietary needs, VIP preferences..."
                      className="w-full bg-canvas-100 border border-canvas-border rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400 resize-none"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-stone-500 font-medium">Manual Points Override:</span>
                        <input
                          type="number"
                          value={manualPoints}
                          onChange={e => setManualPoints(Number(e.target.value))}
                          className="w-24 bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-1.5 text-xs text-stone-900 font-mono text-center focus:outline-none focus:border-stone-400"
                        />
                      </div>

                      <Button
                        variant="primary"
                        onClick={handleSaveCustomerUpdates}
                        className="flex items-center justify-center space-x-1.5 !py-2 !text-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Updates</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="py-16 text-center text-stone-400 text-xs">
                  Select a guest from the left directory to view full profile details.
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DELIVERY PARTNERS INTEGRATION */}
      {/* ========================================================================= */}
      {activeTab === 'partners' && (
        <div className="space-y-6">
          <Card className="!p-4 bg-gradient-to-r from-canvas-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-terracotta-600" />
                  <span>Food Delivery Aggregators & Webhook Endpoints</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Connect direct webhook feeds from Zomato, Swiggy, ONDC, and Magicpin for automatic KDS injection and order tagging.
                </p>
              </div>
              <Badge variant="terracotta">4 Supported Aggregators</Badge>
            </div>
          </Card>

          {/* Aggregator Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deliveryPartners.map(p => {
              const webhookUrl = `${window.location.origin}/api/webhooks/aggregators/${p.partner}`;
              const isCopied = copiedKey === p.partner;

              return (
                <Card
                  key={p.partner}
                  className={`space-y-4 transition-all ${
                    p.enabled
                      ? 'border-canvas-border'
                      : 'opacity-65 bg-canvas-50'
                  }`}
                >
                  {/* Header Row: Logo, Name & Enable Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {p.partner === 'zomato' ? '🔴' : p.partner === 'swiggy' ? '🟠' : p.partner === 'ondc' ? '🔵' : '🟣'}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{p.name}</h4>
                        <span className={`text-[10px] font-bold ${p.enabled ? 'text-sage-700' : 'text-stone-400'}`}>
                          {p.enabled ? '● Channel Active & Listening' : '○ Channel Paused'}
                        </span>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={e => handleTogglePartner(p.partner, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900"></div>
                    </label>
                  </div>

                  {/* Partner Configuration Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                        Merchant Store ID
                      </label>
                      <input
                        type="text"
                        value={p.storeId}
                        onChange={e => handleUpdatePartnerField(p.partner, 'storeId', e.target.value)}
                        className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                        Aggregator Commission % Rate
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={p.commissionPercent}
                          onChange={e => handleUpdatePartnerField(p.partner, 'commissionPercent', Number(e.target.value))}
                          className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Inbound Webhook URL */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                      Inbound Webhook Endpoint
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={webhookUrl}
                        className="flex-1 bg-canvas-100 border border-canvas-border rounded-xl px-3 py-1.5 text-[11px] text-stone-600 font-mono select-all focus:outline-none"
                      />
                      <Button
                        variant="secondary"
                        onClick={() => handleCopyWebhook(webhookUrl, p.partner)}
                        className="!p-2 shrink-0"
                        title="Copy Webhook URL"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-sage-600" /> : <Copy className="w-3.5 h-3.5 text-stone-600" />}
                      </Button>
                    </div>
                  </div>

                  {/* Auto-Accept & Simulation Button Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-canvas-border">
                    <label className="flex items-center space-x-2 cursor-pointer text-xs text-stone-700">
                      <input
                        type="checkbox"
                        checked={p.autoAcceptOrders}
                        onChange={e => handleUpdatePartnerField(p.partner, 'autoAcceptOrders', e.target.checked)}
                        className="rounded bg-canvas-100 border-canvas-border text-stone-900 focus:ring-0"
                      />
                      <span className="text-xs font-semibold">Auto-Accept Inbound Orders</span>
                    </label>

                    <Button
                      variant="primary"
                      onClick={() => handleSimulateInboundOrder(p.partner)}
                      className="flex items-center justify-center space-x-1.5 !py-1.5 !text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-terracotta-200" />
                      <span>Simulate Inbound Order</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
