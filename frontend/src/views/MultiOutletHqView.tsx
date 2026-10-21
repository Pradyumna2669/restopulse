import React, { useState, useEffect } from 'react';
import {
  Building2,
  Store,
  ArrowRightLeft,
  TrendingUp,
  Layers,
  CheckCircle2,
  Truck,
  Plus,
  RefreshCw,
  Search,
  Check,
  AlertTriangle,
  Sliders,
  ChevronRight,
  Download
} from 'lucide-react';
import {
  Outlet,
  Organization,
  EffectiveMenuItem,
  InterStoreTransfer,
  MaterialStockMatrixEntry,
  ConsolidatedHqReport
} from '../types';
import { ApiService, getActiveOutletId, setActiveOutletId } from '../services/api';

interface MultiOutletHqViewProps {
  currencySymbol?: string;
  onOutletSwitched?: (outlet: Outlet) => void;
}

type TabType = 'outlets' | 'menu-overrides' | 'transfers' | 'royalty-analytics' | 'inventory-matrix';

export const MultiOutletHqView: React.FC<MultiOutletHqViewProps> = ({
  currencySymbol = '₹',
  onOutletSwitched
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('outlets');
  const [currentOutletId, setCurrentOutletId] = useState<string>(getActiveOutletId());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Core Data States
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletForOverrides, setSelectedOutletForOverrides] = useState<string>('outlet_blr_01');
  const [effectiveMenu, setEffectiveMenu] = useState<EffectiveMenuItem[]>([]);
  const [transfers, setTransfers] = useState<InterStoreTransfer[]>([]);
  const [inventoryMatrix, setInventoryMatrix] = useState<MaterialStockMatrixEntry[]>([]);
  const [hqReport, setHqReport] = useState<ConsolidatedHqReport | null>(null);

  // Filters
  const [outletFilter, setOutletFilter] = useState<'all' | 'flagship' | 'franchise' | 'company_owned'>('all');
  const [transferStatusFilter, setTransferStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddOutletOpen, setIsAddOutletOpen] = useState<boolean>(false);
  const [isNewTransferOpen, setIsNewTransferOpen] = useState<boolean>(false);

  // New Outlet Form State
  const [newOutletForm, setNewOutletForm] = useState({
    code: '',
    name: '',
    tier: 'franchise' as Outlet['tier'],
    isFranchise: true,
    franchiseOwnerName: '',
    franchiseContactPhone: '',
    franchiseRoyaltyPercent: 5.0,
    marketingLevyPercent: 2.0,
    gstin: '',
    fssaiNumber: '',
    phone: '',
    email: '',
    city: '',
    street: '',
    state: 'Karnataka',
    pincode: '',
    stateCode: '29',
    posTerminalCount: 2
  });

  // New Transfer Form State
  const [newTransferForm, setNewTransferForm] = useState({
    sourceOutletId: 'outlet_delhi_01',
    destinationOutletId: 'outlet_blr_01',
    rawMaterialId: '',
    quantityRequested: 10,
    notes: ''
  });

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [org, outletList, transferList, matrix, report] = await Promise.all([
        ApiService.getOrganization().catch(() => null),
        ApiService.getOutlets().catch(() => []),
        ApiService.getTransfers().catch(() => []),
        ApiService.getInventoryMatrix().catch(() => []),
        ApiService.getConsolidatedHqReport().catch(() => null)
      ]);

      if (org) setOrganization(org);
      if (outletList) setOutlets(outletList);
      if (transferList) setTransfers(transferList);
      if (matrix) setInventoryMatrix(matrix);
      if (report) setHqReport(report);

      if (selectedOutletForOverrides) {
        const menu = await ApiService.getEffectiveMenu(selectedOutletForOverrides).catch(() => []);
        setEffectiveMenu(menu);
      }
    } catch (err) {
      console.warn('Failed to load multi-outlet data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSwitchOutletContext = (outlet: Outlet) => {
    setActiveOutletId(outlet.id);
    setCurrentOutletId(outlet.id);
    showToast(`Active POS store switched to: ${outlet.name} (${outlet.code})`, 'success');
    if (onOutletSwitched) {
      onOutletSwitched(outlet);
    }
  };

  const handleSelectOutletForMenu = async (outletId: string) => {
    setSelectedOutletForOverrides(outletId);
    try {
      const menu = await ApiService.getEffectiveMenu(outletId);
      setEffectiveMenu(menu);
    } catch {
      showToast('Failed to load menu for selected outlet', 'error');
    }
  };

  const handleSaveMenuOverride = async (item: EffectiveMenuItem, price?: number, inStock?: boolean) => {
    try {
      await ApiService.setOutletMenuOverride(selectedOutletForOverrides, item.id, {
        priceOverride: price !== undefined ? price : (item.hasPriceOverride ? item.effectivePrice : undefined),
        inStockOverride: inStock !== undefined ? inStock : item.inStock,
        updatedBy: 'HQ Master Administrator'
      });
      const updatedMenu = await ApiService.getEffectiveMenu(selectedOutletForOverrides);
      setEffectiveMenu(updatedMenu);
      showToast(`Updated override for ${item.name}`, 'success');
    } catch {
      showToast('Failed to update override', 'error');
    }
  };

  const handleResetMenuOverride = async (menuItemId: string, itemName: string) => {
    try {
      await ApiService.removeOutletMenuOverride(selectedOutletForOverrides, menuItemId);
      const updatedMenu = await ApiService.getEffectiveMenu(selectedOutletForOverrides);
      setEffectiveMenu(updatedMenu);
      showToast(`Reverted ${itemName} to central master pricing`, 'info');
    } catch {
      showToast('Failed to revert override', 'error');
    }
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await ApiService.createOutlet({
        code: newOutletForm.code,
        name: newOutletForm.name,
        tier: newOutletForm.tier,
        isFranchise: newOutletForm.isFranchise,
        franchiseOwnerName: newOutletForm.franchiseOwnerName,
        franchiseContactPhone: newOutletForm.franchiseContactPhone,
        franchiseRoyaltyPercent: Number(newOutletForm.franchiseRoyaltyPercent),
        marketingLevyPercent: Number(newOutletForm.marketingLevyPercent),
        gstin: newOutletForm.gstin,
        fssaiNumber: newOutletForm.fssaiNumber,
        phone: newOutletForm.phone,
        email: newOutletForm.email,
        address: {
          street: newOutletForm.street,
          city: newOutletForm.city,
          state: newOutletForm.state,
          pincode: newOutletForm.pincode,
          stateCode: newOutletForm.stateCode
        },
        posTerminalCount: Number(newOutletForm.posTerminalCount)
      });
      setOutlets(prev => [...prev, created]);
      setIsAddOutletOpen(false);
      showToast(`New store node initialized: ${created.name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize outlet', 'error');
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransferForm.rawMaterialId) {
      showToast('Please select an ingredient to transfer', 'error');
      return;
    }
    try {
      const created = await ApiService.createTransfer({
        sourceOutletId: newTransferForm.sourceOutletId,
        destinationOutletId: newTransferForm.destinationOutletId,
        items: [{ rawMaterialId: newTransferForm.rawMaterialId, quantityRequested: Number(newTransferForm.quantityRequested) }],
        notes: newTransferForm.notes,
        requestedBy: {
          userId: 'usr_hq_admin',
          userName: 'HQ Supply Officer',
          role: 'administrator'
        }
      });
      setTransfers(prev => [created, ...prev]);
      setIsNewTransferOpen(false);
      showToast(`Stock transfer requested: ${created.transferNumber}`, 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create transfer', 'error');
    }
  };

  const handleApproveTransfer = async (transferId: string) => {
    try {
      const updated = await ApiService.approveTransfer(transferId, {
        userId: 'usr_hq_mgr',
        userName: 'Vikram Malhotra',
        role: 'Central Ops Head'
      });
      setTransfers(prev => prev.map(t => t.id === transferId ? updated : t));
      showToast(`Transfer approved: ${updated.transferNumber}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  const handleDispatchTransfer = async (transferId: string) => {
    try {
      const updated = await ApiService.dispatchTransfer(transferId, {
        userId: 'usr_central_wh',
        userName: 'Ramesh Verma',
        role: 'Warehouse Keeper'
      }, {
        carrierName: 'Blue Dart Cold Express',
        trackingReference: `BD-EXP-${Math.floor(100000 + Math.random() * 900000)}`,
        vehicleNumber: 'DL-01-EXP-8899'
      });
      setTransfers(prev => prev.map(t => t.id === transferId ? updated : t));
      showToast(`Stock dispatched! Deducted from source inventory: ${updated.transferNumber}`, 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Dispatch failed', 'error');
    }
  };

  const handleReceiveTransfer = async (transferId: string) => {
    try {
      const updated = await ApiService.receiveTransfer(transferId, {
        userId: 'usr_dest_staff',
        userName: 'Receiving Storekeeper',
        role: 'inventory'
      });
      setTransfers(prev => prev.map(t => t.id === transferId ? updated : t));
      showToast(`Transfer delivery accepted! Stock inwarded to destination: ${updated.transferNumber}`, 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Receipt failed', 'error');
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    try {
      const updated = await ApiService.cancelTransfer(transferId, {
        userId: 'usr_hq_mgr',
        userName: 'Vikram Malhotra',
        role: 'Central Ops Head',
        reason: 'Shipment cancelled by store administration'
      });
      setTransfers(prev => prev.map(t => t.id === transferId ? updated : t));
      showToast(`Transfer cancelled: ${updated.transferNumber}`, 'info');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Cancellation failed', 'error');
    }
  };

  const filteredOutlets = outlets.filter(o => {
    if (outletFilter === 'flagship' && o.tier !== 'flagship') return false;
    if (outletFilter === 'franchise' && !o.isFranchise) return false;
    if (outletFilter === 'company_owned' && (o.isFranchise || o.tier === 'flagship')) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q) || o.address.city.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredTransfers = transfers.filter(t => {
    if (transferStatusFilter !== 'all' && t.status !== transferStatusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-full bg-stone-950 text-stone-100 p-6 flex flex-col gap-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border animate-in slide-in-from-top-2 text-sm font-medium ${
          notification.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60'
            : notification.type === 'info'
            ? 'bg-blue-950/90 text-blue-200 border-blue-700/60'
            : 'bg-rose-950/90 text-rose-200 border-rose-700/60'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-terracotta-400 text-xs font-bold tracking-wider uppercase mb-1">
            <Building2 className="w-4 h-4" />
            <span>Enterprise Multi-Store Architecture & Master Governance</span>
          </div>
          <h1 className="text-2xl font-black text-stone-100 tracking-tight">
            {organization?.name || 'RestoPulse Hospitality Group'}
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Corporate GSTIN: <span className="font-mono text-stone-300">{organization?.corporateGstin || '07AAAAA0000A1Z5'}</span> • Active Nodes: <span className="font-bold text-emerald-400">{outlets.filter(o => o.active).length} stores</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Network</span>
          </button>
          <button
            onClick={() => setIsAddOutletOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Outlet</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('outlets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'outlets'
              ? 'bg-terracotta-500/20 text-terracotta-400 border border-terracotta-500/40 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Outlets Directory ({outlets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('menu-overrides')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'menu-overrides'
              ? 'bg-terracotta-500/20 text-terracotta-400 border border-terracotta-500/40 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Central Menu Overrides</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'transfers'
              ? 'bg-terracotta-500/20 text-terracotta-400 border border-terracotta-500/40 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Inter-Store Transfers (IST)</span>
        </button>

        <button
          onClick={() => setActiveTab('royalty-analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'royalty-analytics'
              ? 'bg-terracotta-500/20 text-terracotta-400 border border-terracotta-500/40 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>HQ & Royalty Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory-matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'inventory-matrix'
              ? 'bg-terracotta-500/20 text-terracotta-400 border border-terracotta-500/40 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Multi-Store Stock Matrix</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OUTLETS DIRECTORY & STORE SWITCHER */}
      {/* ========================================================================= */}
      {activeTab === 'outlets' && (
        <div className="flex flex-col gap-5">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/60 p-3 rounded-xl border border-stone-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
              <input
                type="text"
                placeholder="Search by name, code or city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-terracotta-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(['all', 'flagship', 'franchise', 'company_owned'] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setOutletFilter(tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    outletFilter === tier
                      ? 'bg-stone-800 text-stone-100 border border-stone-700'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {tier === 'all' ? 'All Outlets' : tier.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Outlets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOutlets.map(outlet => {
              const isCurrent = outlet.id === currentOutletId;
              return (
                <div
                  key={outlet.id}
                  className={`bg-stone-900/90 rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${
                    isCurrent
                      ? 'border-terracotta-500 shadow-md shadow-terracotta-900/20'
                      : 'border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2.5 right-4 bg-terracotta-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                      Current POS Context
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-terracotta-400 bg-terracotta-950/60 px-2 py-0.5 rounded border border-terracotta-800/40">
                        {outlet.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        outlet.tier === 'flagship'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                          : outlet.isFranchise
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-600/40'
                          : 'bg-stone-800 text-stone-300 border border-stone-700'
                      }`}>
                        {outlet.tier.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-stone-100 mb-1">{outlet.name}</h3>
                    <p className="text-stone-400 text-xs mb-3 flex items-center gap-1.5">
                      <span>{outlet.address.street}, {outlet.address.city}</span>
                    </p>

                    <div className="bg-stone-950/60 rounded-xl p-3 border border-stone-800/80 text-xs flex flex-col gap-1.5 mb-4">
                      <div className="flex justify-between text-stone-400">
                        <span>GSTIN:</span>
                        <span className="font-mono text-stone-200">{outlet.gstin}</span>
                      </div>
                      <div className="flex justify-between text-stone-400">
                        <span>FSSAI:</span>
                        <span className="font-mono text-stone-200">{outlet.fssaiNumber}</span>
                      </div>
                      {outlet.isFranchise && (
                        <>
                          <div className="flex justify-between text-stone-400 border-t border-stone-800/60 pt-1">
                            <span>Franchise Partner:</span>
                            <span className="text-stone-200 font-semibold">{outlet.franchiseOwnerName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-stone-400">
                            <span>Brand Royalty / Marketing:</span>
                            <span className="text-blue-400 font-bold">{outlet.franchiseRoyaltyPercent}% / {outlet.marketingLevyPercent}%</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-stone-400 border-t border-stone-800/60 pt-1">
                        <span>Active POS Terminals:</span>
                        <span className="text-stone-200 font-bold">{outlet.posTerminalCount} terminals</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleSwitchOutletContext(outlet)}
                      disabled={isCurrent}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isCurrent
                          ? 'bg-stone-800 text-stone-500 cursor-default'
                          : 'bg-terracotta-500/10 hover:bg-terracotta-500/20 text-terracotta-400 border border-terracotta-500/40'
                      }`}
                    >
                      {isCurrent ? <Check className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                      <span>{isCurrent ? 'Current Store Context' : 'Switch POS to this Store'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CENTRAL MENU MASTER & OVERRIDES */}
      {/* ========================================================================= */}
      {activeTab === 'menu-overrides' && (
        <div className="flex flex-col gap-5">
          {/* Store Selector Bar */}
          <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-terracotta-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Target Store Catalog</h3>
                <p className="text-sm font-bold text-stone-100">Configure regional pricing and live stock for this outlet</p>
              </div>
            </div>

            <select
              value={selectedOutletForOverrides}
              onChange={e => handleSelectOutletForMenu(e.target.value)}
              className="bg-stone-950 border border-stone-700 text-stone-200 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-terracotta-500"
            >
              {outlets.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code}) {o.isFranchise ? `— ${o.franchiseRoyaltyPercent}% Royalty` : '— Flagship'}
                </option>
              ))}
            </select>
          </div>

          {/* Overrides Table */}
          <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300">
                Menu Items Catalog ({effectiveMenu.length} items inherited from Central Master)
              </span>
              <span className="text-xs text-stone-400">
                Active Overrides on this Store: <span className="font-bold text-amber-400">{effectiveMenu.filter(m => m.hasPriceOverride || m.hasStockOverride).length} items</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950/80 text-stone-400 border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Station</th>
                    <th className="py-3 px-4">Global Master Price</th>
                    <th className="py-3 px-4">Store Override Price</th>
                    <th className="py-3 px-4">Store Stock Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {effectiveMenu.map(item => {
                    return (
                      <tr key={item.id} className="hover:bg-stone-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-stone-200">
                          {item.name}
                          {item.hasPriceOverride && (
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50 font-bold">
                              Price Override
                            </span>
                          )}
                          {item.hasStockOverride && (
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/50 font-bold">
                              Stock Override
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 capitalize text-stone-400">{item.station}</td>
                        <td className="py-3 px-4 font-mono text-stone-300">{currencySymbol}{item.originalBasePrice}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-stone-400">{currencySymbol}</span>
                            <input
                              type="number"
                              defaultValue={item.effectivePrice}
                              onBlur={e => {
                                const val = Number(e.target.value);
                                if (val !== item.effectivePrice) {
                                  handleSaveMenuOverride(item, val);
                                }
                              }}
                              className="w-20 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-100 font-mono focus:border-terracotta-500 focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleSaveMenuOverride(item, undefined, !item.inStock)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all ${
                              item.inStock
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                                : 'bg-rose-950/60 text-rose-300 border-rose-700/50'
                            }`}
                          >
                            {item.inStock ? 'Available' : 'Out of Stock (86)'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(item.hasPriceOverride || item.hasStockOverride) && (
                            <button
                              onClick={() => handleResetMenuOverride(item.id, item.name)}
                              className="text-stone-400 hover:text-stone-200 text-[11px] font-semibold underline underline-offset-2"
                            >
                              Reset to Master
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INTER-STORE STOCK TRANSFERS (IST) */}
      {/* ========================================================================= */}
      {activeTab === 'transfers' && (
        <div className="flex flex-col gap-5">
          {/* Header & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/60 p-4 rounded-xl border border-stone-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Status:</span>
              <div className="flex items-center gap-1">
                {(['all', 'requested', 'approved', 'dispatched', 'received', 'cancelled'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setTransferStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                      transferStatusFilter === st
                        ? 'bg-stone-800 text-stone-100 border border-stone-700'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsNewTransferOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Initiate Stock Transfer</span>
            </button>
          </div>

          {/* Transfers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTransfers.map(transfer => {
              return (
                <div key={transfer.id} className="bg-stone-900 rounded-2xl border border-stone-800 p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-stone-300 bg-stone-950 px-2 py-1 rounded border border-stone-800">
                        {transfer.transferNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        transfer.status === 'received'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          : transfer.status === 'dispatched'
                          ? 'bg-purple-950 text-purple-300 border border-purple-700/60'
                          : transfer.status === 'approved'
                          ? 'bg-blue-950 text-blue-300 border border-blue-700/60'
                          : transfer.status === 'requested'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                          : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                      }`}>
                        {transfer.status}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex items-center justify-between gap-2 mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-stone-500 font-semibold uppercase">Source (Deduction)</span>
                        <span className="text-xs font-bold text-stone-200">{transfer.sourceOutletName}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-terracotta-400 shrink-0" />
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-stone-500 font-semibold uppercase">Destination (Inward)</span>
                        <span className="text-xs font-bold text-stone-200">{transfer.destinationOutletName}</span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-stone-400 mb-1.5 uppercase">Items Included:</div>
                      <div className="flex flex-col gap-1">
                        {transfer.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-stone-800/40">
                            <span className="text-stone-300 font-medium">{item.rawMaterialName}</span>
                            <span className="font-mono text-stone-400">
                              {item.quantityDispatched ?? item.quantityRequested} {item.unit} • {currencySymbol}{item.totalCost}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Carrier Info if dispatched */}
                    {transfer.carrierName && (
                      <div className="bg-purple-950/30 border border-purple-900/50 rounded-lg p-2.5 text-xs text-purple-300 flex items-center gap-2 mb-3">
                        <Truck className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>Carrier: <strong>{transfer.carrierName}</strong> ({transfer.trackingReference || 'Tracking in transit'})</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons based on status */}
                  <div className="pt-3 border-t border-stone-800/80 flex items-center justify-end gap-2">
                    {transfer.status === 'requested' && (
                      <button
                        onClick={() => handleApproveTransfer(transfer.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        Approve Transfer
                      </button>
                    )}

                    {(transfer.status === 'approved' || transfer.status === 'requested') && (
                      <button
                        onClick={() => handleDispatchTransfer(transfer.id)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        Dispatch & Deduct Stock
                      </button>
                    )}

                    {transfer.status === 'dispatched' && (
                      <button
                        onClick={() => handleReceiveTransfer(transfer.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        Accept & Inward Stock
                      </button>
                    )}

                    {transfer.status !== 'received' && transfer.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancelTransfer(transfer.id)}
                        className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONSOLIDATED HEADQUARTERS & ROYALTY ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'royalty-analytics' && hqReport && (
        <div className="flex flex-col gap-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Network Gross Sales</span>
              <span className="text-xl font-black text-stone-100 font-mono">{currencySymbol}{hqReport.networkSummary.totalGrossRevenue.toLocaleString()}</span>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Total Orders</span>
              <span className="text-xl font-black text-stone-100 font-mono">{hqReport.networkSummary.totalOrdersCount}</span>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Network AOV</span>
              <span className="text-xl font-black text-stone-100 font-mono">{currencySymbol}{hqReport.networkSummary.averageOrderValue}</span>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Gross Margin</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{hqReport.networkSummary.networkGrossMarginPercent}%</span>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Franchise Royalties</span>
              <span className="text-xl font-black text-blue-400 font-mono">{currencySymbol}{hqReport.networkSummary.totalFranchiseRoyaltiesEarned.toLocaleString()}</span>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Marketing Pool (2%)</span>
              <span className="text-xl font-black text-purple-400 font-mono">{currencySymbol}{hqReport.networkSummary.totalMarketingLevyCollected.toLocaleString()}</span>
            </div>
          </div>

          {/* Franchise Royalty Settlement Ledger */}
          <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-100">Franchise Royalty & Brand Fee Distribution</h3>
                <p className="text-xs text-stone-400">Statutory franchise fee calculation based on net sales</p>
              </div>
              <button
                onClick={() => showToast('Franchise royalty settlement ledger exported', 'info')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Ledger</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950/80 text-stone-400 border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Outlet Code & Name</th>
                    <th className="py-3 px-4">Tier / Type</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4 text-right">Orders</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                    <th className="py-3 px-4 text-right">Gross Margin</th>
                    <th className="py-3 px-4 text-right">Royalty Fee</th>
                    <th className="py-3 px-4 text-right">Marketing Levy</th>
                    <th className="py-3 px-4 text-right font-bold text-stone-200">Total Franchise Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {hqReport.outletBreakdown.map(summary => {
                    return (
                      <tr key={summary.outletId} className="hover:bg-stone-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-terracotta-400 font-bold mr-2">{summary.outletCode}</span>
                          <span className="font-semibold text-stone-200">{summary.outletName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            summary.isFranchise
                              ? 'bg-blue-950 text-blue-300 border border-blue-700/40'
                              : 'bg-stone-800 text-stone-300'
                          }`}>
                            {summary.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-300">{summary.city}</td>
                        <td className="py-3 px-4 text-right font-mono text-stone-300">{summary.orderCount}</td>
                        <td className="py-3 px-4 text-right font-mono text-stone-200">{currencySymbol}{summary.netSales.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">{summary.grossMarginPercent}%</td>
                        <td className="py-3 px-4 text-right font-mono text-stone-300">
                          {summary.royaltyFee > 0 ? `${currencySymbol}${summary.royaltyFee.toLocaleString()} (${summary.royaltyPercent}%)` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-stone-300">
                          {summary.marketingLevyFee > 0 ? `${currencySymbol}${summary.marketingLevyFee.toLocaleString()} (${summary.marketingLevyPercent}%)` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-terracotta-400">
                          {summary.totalFranchisePayable > 0 ? `${currencySymbol}${summary.totalFranchisePayable.toLocaleString()}` : '₹0 (Flagship)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MULTI-STORE INVENTORY MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'inventory-matrix' && (
        <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-100">Live Multi-Store Inventory Matrix</h3>
              <p className="text-xs text-stone-400">Network-wide ingredient levels with low-stock warnings</p>
            </div>
            <button
              onClick={() => setIsNewTransferOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-terracotta-500 hover:bg-terracotta-600 text-white text-xs font-bold"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Balance Stocks via Transfer</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/80 text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4">Ingredient Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 font-bold text-terracotta-400">Network Total</th>
                  {outlets.map(o => (
                    <th key={o.id} className="py-3 px-4 text-center font-mono">
                      {o.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {inventoryMatrix.map(row => {
                  return (
                    <tr key={row.rawMaterialId} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-stone-200">{row.rawMaterialName}</td>
                      <td className="py-3 px-4 text-stone-400">{row.category}</td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-100">
                        {row.totalNetworkStock} {row.unit}
                      </td>
                      {outlets.map(o => {
                        const level = row.outlets.find(lvl => lvl.outletId === o.id);
                        const isLow = level ? level.currentStock <= level.reorderLevel : false;
                        return (
                          <td key={o.id} className="py-3 px-4 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isLow
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                                : 'bg-stone-950 text-stone-300'
                            }`}>
                              {level ? level.currentStock : 0} {row.unit}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW OUTLET */}
      {/* ========================================================================= */}
      {isAddOutletOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <h3 className="text-base font-bold text-stone-100">Initialize New Store Node</h3>
              <button
                onClick={() => setIsAddOutletOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOutlet} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Store Code (e.g. TDG-PUN-01)</label>
                  <input
                    type="text"
                    required
                    value={newOutletForm.code}
                    onChange={e => setNewOutletForm({ ...newOutletForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 font-mono focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Store Name</label>
                  <input
                    type="text"
                    required
                    value={newOutletForm.name}
                    onChange={e => setNewOutletForm({ ...newOutletForm, name: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Store Tier</label>
                  <select
                    value={newOutletForm.tier}
                    onChange={e => setNewOutletForm({
                      ...newOutletForm,
                      tier: e.target.value as Outlet['tier'],
                      isFranchise: e.target.value === 'franchise'
                    })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 focus:border-terracotta-500 focus:outline-none"
                  >
                    <option value="franchise">Franchise Store</option>
                    <option value="company_owned">Company Owned Store</option>
                    <option value="cloud_kitchen">Cloud Kitchen Delivery Node</option>
                    <option value="kiosk">Express Kiosk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">POS Terminals</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newOutletForm.posTerminalCount}
                    onChange={e => setNewOutletForm({ ...newOutletForm, posTerminalCount: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 font-mono focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              {newOutletForm.isFranchise && (
                <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 font-semibold mb-1">Franchise Owner Name</label>
                      <input
                        type="text"
                        value={newOutletForm.franchiseOwnerName}
                        onChange={e => setNewOutletForm({ ...newOutletForm, franchiseOwnerName: e.target.value })}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-100 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 font-semibold mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={newOutletForm.franchiseContactPhone}
                        onChange={e => setNewOutletForm({ ...newOutletForm, franchiseContactPhone: e.target.value })}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 font-semibold mb-1">Royalty % (Net Sales)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={newOutletForm.franchiseRoyaltyPercent}
                        onChange={e => setNewOutletForm({ ...newOutletForm, franchiseRoyaltyPercent: Number(e.target.value) })}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 font-semibold mb-1">Marketing Pool %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={newOutletForm.marketingLevyPercent}
                        onChange={e => setNewOutletForm({ ...newOutletForm, marketingLevyPercent: Number(e.target.value) })}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">GSTIN</label>
                  <input
                    type="text"
                    required
                    value={newOutletForm.gstin}
                    onChange={e => setNewOutletForm({ ...newOutletForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 font-mono focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">FSSAI Number</label>
                  <input
                    type="text"
                    required
                    value={newOutletForm.fssaiNumber}
                    onChange={e => setNewOutletForm({ ...newOutletForm, fssaiNumber: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 font-mono focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newOutletForm.city}
                    onChange={e => setNewOutletForm({ ...newOutletForm, city: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={newOutletForm.street}
                    onChange={e => setNewOutletForm({ ...newOutletForm, street: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 focus:border-terracotta-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddOutletOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold"
                >
                  Initialize Store Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INITIATE STOCK TRANSFER (IST) */}
      {/* ========================================================================= */}
      {isNewTransferOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <h3 className="text-base font-bold text-stone-100">Initiate Inter-Store Transfer (IST)</h3>
              <button
                onClick={() => setIsNewTransferOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Source Outlet (Deduct)</label>
                  <select
                    value={newTransferForm.sourceOutletId}
                    onChange={e => setNewTransferForm({ ...newTransferForm, sourceOutletId: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 font-semibold focus:border-terracotta-500 focus:outline-none"
                  >
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Destination Outlet (Inward)</label>
                  <select
                    value={newTransferForm.destinationOutletId}
                    onChange={e => setNewTransferForm({ ...newTransferForm, destinationOutletId: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 font-semibold focus:border-terracotta-500 focus:outline-none"
                  >
                    {outlets.filter(o => o.id !== newTransferForm.sourceOutletId).map(o => (
                      <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-400 font-semibold mb-1">Select Ingredient / Raw Material</label>
                <select
                  required
                  value={newTransferForm.rawMaterialId}
                  onChange={e => setNewTransferForm({ ...newTransferForm, rawMaterialId: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 font-semibold focus:border-terracotta-500 focus:outline-none"
                >
                  <option value="">-- Choose Raw Material to Move --</option>
                  {inventoryMatrix.map(m => (
                    <option key={m.rawMaterialId} value={m.rawMaterialId}>
                      {m.rawMaterialName} ({m.category} • Total Network Stock: {m.totalNetworkStock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-400 font-semibold mb-1">Quantity to Transfer</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newTransferForm.quantityRequested}
                  onChange={e => setNewTransferForm({ ...newTransferForm, quantityRequested: Number(e.target.value) })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 font-mono font-bold focus:border-terracotta-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-400 font-semibold mb-1">Logistics / Urgent Notes</label>
                <textarea
                  rows={2}
                  value={newTransferForm.notes}
                  onChange={e => setNewTransferForm({ ...newTransferForm, notes: e.target.value })}
                  placeholder="e.g. Urgent weekend stock replenishment for peak evening service..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-stone-100 focus:border-terracotta-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsNewTransferOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold"
                >
                  Submit Transfer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
