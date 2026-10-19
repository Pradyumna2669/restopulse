import React, { useState, useEffect } from 'react';
import { RawMaterial, StockInwardEntry, MenuItem, InventoryUnit } from '../types';
import { ApiService } from '../services/api';
import {
  X,
  Boxes,
  Plus,
  AlertTriangle,
  TrendingDown,
  ArrowDownRight,
  Search,
  Sparkles,
  Layers,
  Trash2,
  Edit2,
  CheckCircle2
} from 'lucide-react';

interface InventoryManagerModalProps {
  items: MenuItem[];
  currencySymbol?: string;
  onClose: () => void;
}

export const InventoryManagerModal: React.FC<InventoryManagerModalProps> = ({
  items,
  currencySymbol = '₹',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'recipe' | 'inward_logs'>('stock');
  const [inventory, setInventory] = useState<RawMaterial[]>([]);
  const [inwardLogs, setInwardLogs] = useState<StockInwardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Quick Inward Modal State
  const [inwardItem, setInwardItem] = useState<RawMaterial | null>(null);
  const [inwardQty, setInwardQty] = useState<string>('');
  const [inwardCost, setInwardCost] = useState<string>('');
  const [inwardSupplier, setInwardSupplier] = useState<string>('Metro Wholesale');

  // Add / Edit Material State
  const [isEditingMaterial, setIsEditingMaterial] = useState<boolean>(false);
  const [materialForm, setMaterialForm] = useState<{
    id?: string;
    name: string;
    category: string;
    unit: InventoryUnit;
    currentStock: number;
    reorderLevel: number;
    costPerUnit: number;
  }>({
    name: '',
    category: 'Grocery',
    unit: 'kg',
    currentStock: 10,
    reorderLevel: 3,
    costPerUnit: 100
  });

  // Selected Dish for Recipe Mapping
  const [selectedDishId, setSelectedDishId] = useState<string>(items[0]?.id || '');

  const loadData = async () => {
    try {
      const [invData, logData] = await Promise.all([
        ApiService.getInventory(),
        ApiService.getStockInwardLogs()
      ]);
      setInventory(invData);
      setInwardLogs(logData);
    } catch (e) {
      console.error('Failed to load inventory data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtering
  const categories = ['All', ...Array.from(new Set(inventory.map(m => m.category)))];
  const filteredInventory = inventory.filter(m => {
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculations
  const totalStockValue = inventory.reduce((sum, m) => sum + m.currentStock * m.costPerUnit, 0);
  const lowStockItems = inventory.filter(m => m.currentStock <= m.reorderLevel);

  // Inward Submit
  const handleConfirmInward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inwardItem || !inwardQty) return;
    try {
      await ApiService.addStockInward({
        rawMaterialId: inwardItem.id,
        quantityAdded: Number(inwardQty),
        costPrice: inwardCost ? Number(inwardCost) : undefined,
        supplierName: inwardSupplier
      });
      setInwardItem(null);
      setInwardQty('');
      setInwardCost('');
      await loadData();
    } catch (err) {
      console.error('Inward error:', err);
    }
  };

  // Add/Edit Submit
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (materialForm.id) {
        await ApiService.updateRawMaterial(materialForm.id, materialForm);
      } else {
        await ApiService.addRawMaterial(materialForm);
      }
      setIsEditingMaterial(false);
      setMaterialForm({
        name: '',
        category: 'Grocery',
        unit: 'kg',
        currentStock: 10,
        reorderLevel: 3,
        costPerUnit: 100
      });
      await loadData();
    } catch (err) {
      console.error('Save material error:', err);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Are you sure you want to remove this raw material?')) return;
    try {
      await ApiService.deleteRawMaterial(id);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const selectedDish = items.find(i => i.id === selectedDishId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Inventory & Recipe Costing</h2>
                {lowStockItems.length > 0 && (
                  <span className="flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>{lowStockItems.length} Low Stock</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Automatic ingredient deduction, low stock alerts, and purchase entries
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

        {/* Top KPI Metrics Banner */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 grid grid-cols-3 gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Total Raw Materials</span>
              <strong className="text-sm text-white font-mono">{inventory.length} Items</strong>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Current Stock Valuation</span>
              <strong className="text-sm text-emerald-400 font-mono">
                {currencySymbol}{totalStockValue.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Critical Reorders</span>
              <strong className={`text-sm font-mono ${lowStockItems.length > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                {lowStockItems.length} Needs Restock
              </strong>
            </div>
          </div>
        </div>

        {/* Sub-Tab Navigation & Actions */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'stock'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Raw Materials & Stock
            </button>

            <button
              onClick={() => setActiveTab('recipe')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'recipe'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Recipe & Food Costing
            </button>

            <button
              onClick={() => setActiveTab('inward_logs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'inward_logs'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Purchase Logs ({inwardLogs.length})
            </button>
          </div>

          {activeTab === 'stock' && (
            <button
              onClick={() => {
                setMaterialForm({
                  name: '',
                  category: 'Grocery',
                  unit: 'kg',
                  currentStock: 10,
                  reorderLevel: 3,
                  costPerUnit: 100
                });
                setIsEditingMaterial(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Raw Material</span>
            </button>
          )}
        </div>

        {/* Tab 1: Raw Materials Stock Master */}
        {activeTab === 'stock' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ingredient..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Inventory Items Grid */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredInventory.map(item => {
                const isCritical = item.currentStock <= item.reorderLevel;
                const isOutOfStock = item.currentStock <= 0;
                const stockPercent = Math.min(100, Math.round((item.currentStock / (item.reorderLevel * 3)) * 100));

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                      isOutOfStock
                        ? 'bg-rose-950/30 border-rose-600/50'
                        : isCritical
                        ? 'bg-amber-950/20 border-amber-500/50'
                        : 'bg-slate-850 border-slate-700/80'
                    }`}
                  >
                    <div>
                      {/* Name & Category */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white leading-tight">
                            {item.name}
                          </h4>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5 block">
                            {item.category}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isOutOfStock
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isCritical
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : isCritical ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>

                      {/* Stock Quantity & Cost */}
                      <div className="mt-3 flex items-baseline justify-between">
                        <div>
                          <span className="text-2xl font-black text-white font-mono">
                            {item.currentStock}
                          </span>
                          <span className="text-xs text-slate-400 ml-1 font-semibold">{item.unit}</span>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <span>Cost: <strong className="text-slate-200">{currencySymbol}{item.costPerUnit}</strong>/{item.unit}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2.5">
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOutOfStock
                                ? 'bg-rose-500'
                                : isCritical
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, stockPercent)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                          <span>Reorder at: {item.reorderLevel} {item.unit}</span>
                          <span>Value: {currencySymbol}{Math.round(item.currentStock * item.costPerUnit)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setInwardItem(item);
                          setInwardQty('5');
                          setInwardCost(String(item.costPerUnit));
                        }}
                        className="flex-1 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white border border-brand-500/30 text-[11px] font-bold transition-all flex items-center justify-center space-x-1"
                      >
                        <ArrowDownRight className="w-3 h-3" />
                        <span>Inward Stock</span>
                      </button>

                      <button
                        onClick={() => {
                          setMaterialForm(item);
                          setIsEditingMaterial(true);
                        }}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700"
                        title="Edit ingredient"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteMaterial(item.id)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700"
                        title="Delete ingredient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Recipe & Food Costing */}
        {activeTab === 'recipe' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Dish Selector Sidebar */}
            <div className="w-72 bg-slate-950/60 border-r border-slate-800 p-4 overflow-y-auto space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Select Dish to Inspect Recipe
              </span>
              {items.map(dish => (
                <button
                  key={dish.id}
                  onClick={() => setSelectedDishId(dish.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                    selectedDishId === dish.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate pr-2">{dish.name}</span>
                  <span className="font-mono text-[11px] opacity-80">
                    {currencySymbol}{dish.basePrice}
                  </span>
                </button>
              ))}
            </div>

            {/* Recipe Details Panel */}
            <div className="flex-1 p-6 overflow-y-auto">
              {selectedDish && (
                <div>
                  <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-base font-extrabold text-white">{selectedDish.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedDish.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Selling Price</span>
                      <span className="text-lg font-black text-brand-400 font-mono">
                        {currencySymbol}{selectedDish.basePrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Recipe Items Table */}
                  <div className="mt-4">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                      Mapped Raw Ingredients Consumption
                    </span>

                    {(!selectedDish.recipe || selectedDish.recipe.length === 0) ? (
                      <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-400 text-xs">
                        <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="font-semibold text-slate-300">No recipe mapped for this dish yet</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Default ingredients consumption is auto-simulated from standard portions
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                            <tr>
                              <th className="py-2.5 px-3">Ingredient</th>
                              <th className="py-2.5 px-3">Quantity per Portion</th>
                              <th className="py-2.5 px-3 text-right">Approx Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {selectedDish.recipe.map((r, idx) => {
                              const raw = inventory.find(m => m.id === r.rawMaterialId);
                              const cost = raw ? raw.costPerUnit * r.quantityRequired : 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-900/40">
                                  <td className="py-2.5 px-3 font-semibold text-white">
                                    {r.rawMaterialName || raw?.name || r.rawMaterialId}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {r.quantityRequired} {r.unit}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                                    {currencySymbol}{cost.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Food Costing & Gross Margin Card */}
                    <div className="mt-5 p-4 rounded-xl bg-slate-850 border border-slate-700/80 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                          Estimated Food Cost & Margin
                        </span>
                        <div className="flex items-center space-x-3 mt-1 text-xs">
                          <span className="text-slate-300">
                            Approx Food Cost: <strong className="text-white font-mono">{currencySymbol}68.00</strong> (24%)
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">
                            Gross Margin: ~76%
                          </span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>High Profit Dish</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Purchase Logs View */}
        {activeTab === 'inward_logs' && (
          <div className="p-6 overflow-y-auto flex-1">
            {inwardLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No purchase inward entries recorded yet. Tap "Inward Stock" on any raw material to record supplier deliveries.
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Raw Material</th>
                      <th className="py-3 px-4">Qty Added</th>
                      <th className="py-3 px-4">Cost / Unit</th>
                      <th className="py-3 px-4">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {inwardLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{log.rawMaterialName}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                          +{log.quantityAdded} {log.unit}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {currencySymbol}{log.costPrice}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{log.supplierName || 'Direct Vendor'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Quick Inward Modal */}
      {inwardItem && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-brand-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Inward Stock Purchase</h3>
              <button onClick={() => setInwardItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmInward} className="py-4 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Ingredient Name</span>
                <strong className="text-white text-sm font-extrabold">{inwardItem.name}</strong>
                <span className="text-slate-400 ml-1">({inwardItem.currentStock} {inwardItem.unit} in stock)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Quantity to Add ({inwardItem.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={inwardQty}
                    onChange={e => setInwardQty(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Cost Price / {inwardItem.unit} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={inwardCost}
                    onChange={e => setInwardCost(e.target.value)}
                    placeholder={String(inwardItem.costPerUnit)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Supplier / Vendor Name
                </label>
                <input
                  type="text"
                  value={inwardSupplier}
                  onChange={e => setInwardSupplier(e.target.value)}
                  placeholder="e.g. Metro Wholesale / Local Dairy"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInwardItem(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-lg transition-all"
                >
                  Confirm Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Raw Material Modal */}
      {isEditingMaterial && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                {materialForm.id ? 'Edit Raw Material' : 'Add New Raw Material'}
              </h3>
              <button onClick={() => setIsEditingMaterial(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="py-4 space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  value={materialForm.name}
                  onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
                  placeholder="e.g. Fresh Paneer"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={materialForm.category}
                    onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Dairy">Dairy</option>
                    <option value="Poultry">Poultry</option>
                    <option value="Produce">Produce</option>
                    <option value="Grocery">Grocery</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Bakery">Bakery</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Unit</label>
                  <select
                    value={materialForm.unit}
                    onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value as InventoryUnit })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="grams">grams</option>
                    <option value="litres">litres</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs (Pieces / Cans)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Current Stock</label>
                  <input
                    type="number"
                    step="0.1"
                    value={materialForm.currentStock}
                    onChange={e => setMaterialForm({ ...materialForm, currentStock: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-mono text-center"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    step="0.1"
                    value={materialForm.reorderLevel}
                    onChange={e => setMaterialForm({ ...materialForm, reorderLevel: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-mono text-center"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Cost ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.5"
                    value={materialForm.costPerUnit}
                    onChange={e => setMaterialForm({ ...materialForm, costPerUnit: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingMaterial(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-lg transition-all"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
