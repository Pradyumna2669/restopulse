import React, { useState, useEffect } from 'react';
import { RawMaterial, StockInwardEntry, MenuItem, InventoryUnit, Supplier, PurchaseOrder, WastageLog } from '../types';
import { ApiService } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Boxes,
  Plus,
  TrendingDown,
  ArrowDownRight,
  Search,
  Sparkles,
  Layers,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Truck,
  AlertOctagon,
  FileCheck,
  Building2,
  Package,
  XCircle,
  ShieldAlert
} from 'lucide-react';

interface InventoryRecipeViewProps {
  items: MenuItem[];
  currencySymbol?: string;
  onInventoryUpdated?: () => void;
}

export const InventoryRecipeView: React.FC<InventoryRecipeViewProps> = ({
  items,
  currencySymbol = '₹',
  onInventoryUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'recipe' | 'procurement' | 'wastage' | 'inward_logs'>('stock');
  const [inventory, setInventory] = useState<RawMaterial[]>([]);
  const [inwardLogs, setInwardLogs] = useState<StockInwardEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [wastageLogs, setWastageLogs] = useState<WastageLog[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [procurementStatusMsg, setProcurementStatusMsg] = useState<string | null>(null);

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

  // Purchase Order Creation Modal State
  const [isCreatingPo, setIsCreatingPo] = useState<boolean>(false);
  const [poSupplierId, setPoSupplierId] = useState<string>('');
  const [poNotes, setPoNotes] = useState<string>('');
  const [poDeliveryDate, setPoDeliveryDate] = useState<string>('');
  const [poItems, setPoItems] = useState<{
    rawMaterialId: string;
    quantity: number;
    unit: InventoryUnit;
    unitCost: number;
  }[]>([]);

  // Wastage Logging Modal State
  const [isLoggingWastage, setIsLoggingWastage] = useState<boolean>(false);
  const [wastageMaterialId, setWastageMaterialId] = useState<string>('');
  const [wastageQty, setWastageQty] = useState<number>(1);
  const [wastageReason, setWastageReason] = useState<'spoilage' | 'expired' | 'damaged' | 'prep_waste' | 'audit_discrepancy'>('spoilage');
  const [wastageNotes, setWastageNotes] = useState<string>('');
  const [wastageManagerPin, setWastageManagerPin] = useState<string>('');

  // Add Supplier Modal State
  const [isAddingSupplier, setIsAddingSupplier] = useState<boolean>(false);
  const [supplierForm, setSupplierForm] = useState<{
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    gstin: string;
    address: string;
    categoriesSupplied: string[];
    paymentTerms: 'immediate' | 'net_7' | 'net_15' | 'net_30';
  }>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    categoriesSupplied: ['Grocery'],
    paymentTerms: 'net_15'
  });

  // Selected Dish for Recipe Mapping
  const [selectedDishId, setSelectedDishId] = useState<string>(items[0]?.id || '');
  const [recipeSearch, setRecipeSearch] = useState<string>('');

  const loadData = async () => {
    try {
      const [invData, logData, supData, poData, wstData] = await Promise.all([
        ApiService.getInventory(),
        ApiService.getStockInwardLogs(),
        ApiService.getSuppliers(),
        ApiService.getPurchaseOrders(),
        ApiService.getWastageLogs()
      ]);
      setInventory(invData);
      setInwardLogs(logData);
      setSuppliers(supData);
      setPurchaseOrders(poData);
      setWastageLogs(wstData);
      if (supData.length > 0 && !poSupplierId) {
        setPoSupplierId(supData[0].id);
      }
      if (invData.length > 0 && !wastageMaterialId) {
        setWastageMaterialId(invData[0].id);
      }
      if (onInventoryUpdated) {
        onInventoryUpdated();
      }
    } catch (e) {
      console.error('Failed to load inventory data:', e);
    }
  };

  const handleReceivePo = async (poId: string) => {
    try {
      const res = await ApiService.receivePurchaseOrder(poId, 'Store Manager');
      if (res.success) {
        setProcurementStatusMsg(`✓ PO received! Goods inwarded to raw materials stock successfully.`);
        setTimeout(() => setProcurementStatusMsg(null), 4000);
        await loadData();
      } else {
        alert(res.error || 'Failed to receive PO');
      }
    } catch (err) {
      console.error('Receive PO error:', err);
      alert('Error communicating with backend');
    }
  };

  const handleCancelPo = async (poId: string) => {
    if (!confirm('Are you sure you want to cancel this Purchase Order?')) return;
    try {
      const res = await ApiService.cancelPurchaseOrder(poId);
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Cancel PO error:', err);
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId || poItems.length === 0) {
      alert('Please select a supplier and add at least one material item');
      return;
    }
    try {
      const formatted = poItems.map(item => {
        const mat = inventory.find(m => m.id === item.rawMaterialId);
        return {
          rawMaterialId: item.rawMaterialId,
          rawMaterialName: mat ? mat.name : 'Item',
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitCost
        };
      });

      await ApiService.createPurchaseOrder({
        supplierId: poSupplierId,
        items: formatted,
        notes: poNotes,
        expectedDeliveryDate: poDeliveryDate || undefined
      });

      setIsCreatingPo(false);
      setPoItems([]);
      setPoNotes('');
      setProcurementStatusMsg('✓ Purchase Order raised and sent to supplier successfully.');
      setTimeout(() => setProcurementStatusMsg(null), 4000);
      await loadData();
    } catch (err) {
      console.error('Create PO error:', err);
      alert('Failed to create purchase order');
    }
  };

  const handleLogWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wastageMaterialId || wastageQty <= 0) return;

    try {
      const res = await ApiService.logWastage({
        rawMaterialId: wastageMaterialId,
        quantity: wastageQty,
        reason: wastageReason,
        notes: wastageNotes,
        managerPin: wastageManagerPin || undefined,
        loggedBy: 'Floor Staff'
      });

      if (res.success) {
        setIsLoggingWastage(false);
        setWastageQty(1);
        setWastageNotes('');
        setWastageManagerPin('');
        await loadData();
      } else {
        alert(res.error || 'Failed to record wastage');
      }
    } catch (err) {
      console.error('Log wastage error:', err);
      alert('Error recording wastage log');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.phone) return;

    try {
      await ApiService.createSupplier(supplierForm);
      setIsAddingSupplier(false);
      setSupplierForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
        address: '',
        categoriesSupplied: ['Grocery'],
        paymentTerms: 'net_15'
      });
      await loadData();
    } catch (err) {
      console.error('Create supplier error:', err);
      alert('Failed to save supplier profile');
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

  const selectedDish = items.find(i => i.id === selectedDishId) || items[0];

  const filteredDishes = items.filter(d =>
    d.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Raw Materials */}
        <Card className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-canvas-200 text-stone-800 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
              Total Raw Materials
            </span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-2xl font-black text-stone-900 font-mono">
                {inventory.length}
              </span>
              <span className="text-xs text-stone-500">Tracked Items</span>
            </div>
          </div>
        </Card>

        {/* Stock Valuation */}
        <Card className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-sage-50 text-sage-700 flex items-center justify-center shrink-0 border border-sage-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
              Current Stock Valuation
            </span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-2xl font-black text-stone-900 font-mono">
                {currencySymbol}{totalStockValue.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-sage-600 font-semibold">At Cost</span>
            </div>
          </div>
        </Card>

        {/* Critical Reorders */}
        <Card className="flex items-center space-x-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              lowStockItems.length > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-canvas-200 text-stone-600 border-canvas-border'
            }`}
          >
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
              Critical Reorders
            </span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span
                className={`text-2xl font-black font-mono ${
                  lowStockItems.length > 0 ? 'text-terracotta-600' : 'text-stone-900'
                }`}
              >
                {lowStockItems.length}
              </span>
              <span className="text-xs text-stone-500">
                {lowStockItems.length > 0 ? 'Need Procurement' : 'Levels Optimal'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Full-Page Sub-Navigation & Primary Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-canvas-border shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'stock'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Raw Materials & Stock</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'stock' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {inventory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('recipe')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'recipe'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Recipe & Food Costing</span>
          </button>

          <button
            onClick={() => setActiveTab('procurement')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'procurement'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Procurement & POs</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'procurement' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {purchaseOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('wastage')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'wastage'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Wastage & Spoilage</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'wastage' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {wastageLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inward_logs')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'inward_logs'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Purchase Logs</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'inward_logs' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {inwardLogs.length}
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        {activeTab === 'stock' && (
          <Button
            variant="primary"
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
            className="flex items-center space-x-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Raw Material</span>
          </Button>
        )}

        {activeTab === 'procurement' && (
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsAddingSupplier(true)}
              className="flex items-center space-x-1.5 text-xs"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>+ Add Supplier</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (inventory.length > 0) {
                  setPoItems([
                    { rawMaterialId: inventory[0].id, quantity: 10, unit: inventory[0].unit, unitCost: inventory[0].costPerUnit }
                  ]);
                }
                setIsCreatingPo(true);
              }}
              className="flex items-center space-x-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Purchase Order</span>
            </Button>
          </div>
        )}

        {activeTab === 'wastage' && (
          <Button
            variant="primary"
            onClick={() => setIsLoggingWastage(true)}
            className="flex items-center space-x-1.5 shrink-0 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Stock Wastage</span>
          </Button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: RAW MATERIALS STOCK MASTER */}
      {/* ===================================================================== */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filter Bar & Search */}
          <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 !p-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-terracotta-50 text-terracotta-700 border border-terracotta-200'
                      : 'text-stone-600 hover:bg-canvas-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search raw material..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
              />
            </div>
          </Card>

          {/* Raw Materials Grid */}
          {filteredInventory.length === 0 ? (
            <Card className="py-12 text-center text-stone-500">
              <Boxes className="w-10 h-10 mx-auto mb-2 text-stone-300" />
              <p className="font-bold text-stone-800 text-sm">No raw materials found</p>
              <p className="text-xs text-stone-500 mt-1">
                {searchQuery ? 'Try adjusting your search query or filter.' : 'Click "Add Raw Material" above to add your first ingredient.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map(item => {
                const isCritical = item.currentStock <= item.reorderLevel;
                const isOutOfStock = item.currentStock <= 0;
                const stockPercent = Math.min(100, Math.round((item.currentStock / (item.reorderLevel * 3)) * 100));

                return (
                  <Card
                    key={item.id}
                    className={`flex flex-col justify-between hover:shadow-card-hover transition-all ${
                      isOutOfStock
                        ? 'border-rose-300 bg-rose-50/20'
                        : isCritical
                        ? 'border-amber-300 bg-amber-50/20'
                        : ''
                    }`}
                  >
                    <div>
                      {/* Name & Category */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-stone-900 leading-tight">
                            {item.name}
                          </h4>
                          <span className="text-[10px] uppercase font-bold text-stone-400 mt-0.5 block">
                            {item.category}
                          </span>
                        </div>

                        <Badge
                          variant={
                            isOutOfStock ? 'terracotta' : isCritical ? 'warning' : 'success'
                          }
                        >
                          {isOutOfStock ? 'Out of Stock' : isCritical ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </div>

                      {/* Stock Quantity & Unit Cost */}
                      <div className="mt-4 flex items-baseline justify-between">
                        <div>
                          <span className="text-3xl font-black text-stone-900 font-mono">
                            {item.currentStock}
                          </span>
                          <span className="text-xs text-stone-500 ml-1.5 font-bold uppercase">
                            {item.unit}
                          </span>
                        </div>
                        <div className="text-right text-xs text-stone-500">
                          <span>
                            Cost: <strong className="text-stone-900 font-mono">{currencySymbol}{item.costPerUnit}</strong>/{item.unit}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-canvas-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOutOfStock
                                ? 'bg-rose-500'
                                : isCritical
                                ? 'bg-amber-500'
                                : 'bg-sage-600'
                            }`}
                            style={{ width: `${Math.max(5, stockPercent)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-500 mt-1 font-mono">
                          <span>Reorder: {item.reorderLevel} {item.unit}</span>
                          <span>Value: {currencySymbol}{Math.round(item.currentStock * item.costPerUnit).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-4 pt-3 border-t border-canvas-border flex items-center justify-between gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setInwardItem(item);
                          setInwardQty('5');
                          setInwardCost(String(item.costPerUnit));
                        }}
                        className="flex-1 !py-1.5 !text-xs font-bold flex items-center justify-center space-x-1"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5 text-terracotta-600" />
                        <span>Inward Stock</span>
                      </Button>

                      <button
                        onClick={() => {
                          setMaterialForm(item);
                          setIsEditingMaterial(true);
                        }}
                        className="p-2 rounded-xl bg-canvas-100 hover:bg-canvas-200 text-stone-600 hover:text-stone-900 border border-canvas-border transition-colors"
                        title="Edit ingredient"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteMaterial(item.id)}
                        className="p-2 rounded-xl bg-canvas-100 hover:bg-rose-50 text-stone-500 hover:text-rose-600 border border-canvas-border transition-colors"
                        title="Delete ingredient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: RECIPE & FOOD COSTING */}
      {/* ===================================================================== */}
      {activeTab === 'recipe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dish Selection Sidebar (4 cols) */}
          <Card className="lg:col-span-4 space-y-3 !p-4 max-h-[720px] flex flex-col">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Select Dish to Inspect Recipe
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter dishes..."
                  value={recipeSearch}
                  onChange={e => setRecipeSearch(e.target.value)}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-1 divide-y divide-canvas-border pt-1">
              {filteredDishes.map(dish => (
                <button
                  key={dish.id}
                  onClick={() => setSelectedDishId(dish.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                    selectedDishId === dish.id
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'text-stone-700 hover:bg-canvas-100'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-bold truncate">{dish.name}</p>
                    <span
                      className={`text-[10px] block ${
                        selectedDishId === dish.id ? 'text-stone-300' : 'text-stone-400'
                      }`}
                    >
                      {dish.foodType.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold shrink-0">
                    {currencySymbol}{dish.basePrice}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Recipe Details & Food Cost Breakdown (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedDish ? (
              <Card className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-canvas-border">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">{selectedDish.name}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">{selectedDish.description}</p>
                  </div>
                  <div className="sm:text-right bg-canvas-100 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                    <span className="text-xs text-stone-500 block uppercase tracking-wider font-semibold">
                      Selling Price
                    </span>
                    <span className="text-2xl font-black text-terracotta-600 font-mono">
                      {currencySymbol}{selectedDish.basePrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Ingredients Consumption Table */}
                <div>
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-3">
                    Mapped Raw Ingredients Consumption
                  </h4>

                  {!selectedDish.recipe || selectedDish.recipe.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-canvas-50 border border-dashed border-canvas-border text-stone-500 text-xs space-y-1">
                      <Boxes className="w-8 h-8 mx-auto mb-2 text-stone-400" />
                      <p className="font-bold text-stone-700">No custom recipe ingredients linked yet</p>
                      <p className="text-[11px] text-stone-400">
                        Default food cost and gross margin are simulated using standard hospitality recipe ratios.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-canvas-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-canvas-100 border-b border-canvas-border text-[11px] text-stone-500 uppercase font-bold">
                          <tr>
                            <th className="py-2.5 px-3">Ingredient</th>
                            <th className="py-2.5 px-3">Portion Quantity</th>
                            <th className="py-2.5 px-3 text-right">Approx Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-canvas-border">
                          {selectedDish.recipe.map((r, idx) => {
                            const raw = inventory.find(m => m.id === r.rawMaterialId);
                            const cost = raw ? raw.costPerUnit * r.quantityRequired : 0;
                            return (
                              <tr key={idx} className="hover:bg-canvas-50">
                                <td className="py-2.5 px-3 font-bold text-stone-800">
                                  {r.rawMaterialName || raw?.name || r.rawMaterialId}
                                </td>
                                <td className="py-2.5 px-3 text-stone-600 font-mono">
                                  {r.quantityRequired} {r.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                                  {currencySymbol}{cost.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Food Costing & Gross Margin Analysis Card */}
                <div className="p-4 rounded-2xl bg-canvas-50 border border-canvas-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider text-stone-500 font-bold block">
                      Estimated Food Cost & Margin
                    </span>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-stone-700">
                        Approx Food Cost: <strong className="text-stone-900 font-mono">{currencySymbol}{(selectedDish.basePrice * 0.28).toFixed(2)}</strong> (28%)
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="text-sage-700 font-bold">
                        Gross Margin: ~72%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-sage-50 text-sage-800 border border-sage-200 text-xs font-bold self-start sm:self-auto">
                    <CheckCircle2 className="w-4 h-4 text-sage-600" />
                    <span>High Margin Dish</span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="py-12 text-center text-stone-400">
                Select a dish from the left list to inspect its recipe costing.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Status banner */}
      {procurementStatusMsg && (
        <div className="bg-sage-50 border border-sage-300 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-sage-800 shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-sage-600" />
            <span className="font-bold">{procurementStatusMsg}</span>
          </div>
          <button onClick={() => setProcurementStatusMsg(null)} className="text-sage-600 hover:text-sage-900">
            ×
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: PROCUREMENT & PURCHASE ORDERS (PHASE 4) */}
      {/* ===================================================================== */}
      {activeTab === 'procurement' && (
        <div className="space-y-6">
          {/* Procurement KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-canvas-200 text-stone-800 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Registered Suppliers
                </span>
                <span className="text-xl font-black text-stone-900 font-mono">
                  {suppliers.length} Vendors
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Open Purchase Orders
                </span>
                <span className="text-xl font-black text-amber-800 font-mono">
                  {purchaseOrders.filter(p => p.status === 'ordered').length} Pending Delivery
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sage-50 text-sage-700 border border-sage-200 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Completed Deliveries
                </span>
                <span className="text-xl font-black text-sage-800 font-mono">
                  {purchaseOrders.filter(p => p.status === 'received').length} Inwarded
                </span>
              </div>
            </Card>
          </div>

          {/* Suppliers Master Directory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Approved Vendor Directory</h3>
                <p className="text-xs text-stone-500">Master supplier directory with credit terms and GSTIN</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsAddingSupplier(true)}
                className="flex items-center space-x-1.5 !text-xs !py-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Supplier</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suppliers.map(sup => (
                <Card key={sup.id} className="space-y-2.5 hover:border-stone-400 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">{sup.name}</h4>
                      <span className="text-[11px] text-stone-500 block">{sup.contactPerson}</span>
                    </div>
                    <Badge variant={sup.paymentTerms === 'immediate' ? 'neutral' : 'terracotta'}>
                      {sup.paymentTerms.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-[11px] text-stone-600 font-mono">
                    <div>📞 {sup.phone}</div>
                    {sup.email && <div className="truncate">✉️ {sup.email}</div>}
                    {sup.gstin && <div className="text-stone-400 text-[10px]">GSTIN: {sup.gstin}</div>}
                  </div>
                  <div className="pt-2 border-t border-canvas-border flex flex-wrap gap-1">
                    {sup.categoriesSupplied.map(cat => (
                      <span key={cat} className="px-1.5 py-0.5 rounded bg-canvas-200 text-stone-700 text-[10px]">
                        {cat}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Purchase Orders Table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-canvas-border flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Purchase Orders Workflow</h4>
                <p className="text-xs text-stone-500">Draft, order and 1-click inward goods to physical stock</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  if (inventory.length > 0) {
                    setPoItems([
                      { rawMaterialId: inventory[0].id, quantity: 10, unit: inventory[0].unit, unitCost: inventory[0].costPerUnit }
                    ]);
                  }
                  setIsCreatingPo(true);
                }}
                className="flex items-center space-x-1.5 !text-xs !py-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Raise Purchase Order</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-100/60 text-stone-600 border-b border-canvas-border uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-3">Supplier</th>
                    <th className="py-3 px-3">Items Summary</th>
                    <th className="py-3 px-3 text-right">Total Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border">
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="hover:bg-canvas-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">
                        {po.poNumber}
                        <span className="block text-[10px] text-stone-400 font-normal">
                          {new Date(po.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-800">{po.supplierName}</td>
                      <td className="py-3 px-3 text-stone-600 text-[11px]">
                        {po.items.map(i => `${i.rawMaterialName} (${i.quantity} ${i.unit})`).join(', ')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                        {currencySymbol}{po.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {po.status === 'received' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-50 text-sage-700 border border-sage-200">
                            ✓ Inwarded
                          </span>
                        )}
                        {po.status === 'ordered' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ● In Transit
                          </span>
                        )}
                        {po.status === 'cancelled' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {po.status === 'ordered' && (
                          <div className="flex items-center justify-end space-x-1.5">
                            <Button
                              variant="primary"
                              onClick={() => handleReceivePo(po.id)}
                              className="!py-1 !px-2.5 !text-[11px] flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Receive to Stock</span>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleCancelPo(po.id)}
                              className="!py-1 !px-2 !text-[11px] text-rose-600 hover:bg-rose-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                        {po.status === 'received' && (
                          <span className="text-[10px] text-stone-400 font-mono">
                            Received {new Date(po.receivedAt || '').toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: SPOILAGE & WASTAGE LOGS (PHASE 4) */}
      {/* ===================================================================== */}
      {activeTab === 'wastage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Total Wastage Cost
                </span>
                <span className="text-xl font-black text-rose-800 font-mono">
                  {currencySymbol}
                  {wastageLogs.reduce((sum, w) => sum + w.cost, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-canvas-200 text-stone-800 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Wastage Incidents
                </span>
                <span className="text-xl font-black text-stone-900 font-mono">
                  {wastageLogs.length} Events Logged
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5 bg-amber-50/40 border-amber-200">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                  Manager Sign-off
                </span>
                <span className="text-xs text-amber-900 font-medium">
                  Enforces PIN guard on spoilage adjustments
                </span>
              </div>
            </Card>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-canvas-border flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Stock Wastage & Shrinkage Trail</h4>
                <p className="text-xs text-stone-500">Mandatory logging of kitchen spoilage and expired inventory</p>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsLoggingWastage(true)}
                className="flex items-center space-x-1.5 !text-xs !py-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Wastage</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-100/60 text-stone-600 border-b border-canvas-border uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-3">Raw Material</th>
                    <th className="py-3 px-3 text-right">Quantity Wasted</th>
                    <th className="py-3 px-3 text-right">Financial Cost</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Logged By</th>
                    <th className="py-3 px-4 text-right">Manager Sign-off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border font-mono text-[11px]">
                  {wastageLogs.length > 0 ? (
                    wastageLogs.map(log => (
                      <tr key={log.id} className="hover:bg-canvas-50/70 transition-colors">
                        <td className="py-3 px-4 text-stone-500 font-mono text-[10px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-sans font-bold text-stone-900">{log.rawMaterialName}</td>
                        <td className="py-3 px-3 text-right text-rose-600 font-bold">
                          -{log.quantity} {log.unit}
                        </td>
                        <td className="py-3 px-3 text-right text-stone-800 font-bold">
                          {currencySymbol}{log.cost.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-canvas-200 text-stone-800">
                            {log.reason.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans text-stone-600">{log.loggedBy}</td>
                        <td className="py-3 px-4 text-right font-sans">
                          {log.managerApproval ? (
                            <span className="text-sage-700 font-semibold text-[11px] inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{log.managerApproval.userName}</span>
                            </span>
                          ) : (
                            <span className="text-stone-400">Self-certified</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-stone-400 font-sans">
                        No wastage or shrinkage incidents logged for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: PURCHASE INWARD LOGS */}
      {/* ===================================================================== */}
      {activeTab === 'inward_logs' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-canvas-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Supplier Delivery & Purchase Inward Ledger
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Every procurement action logged automatically for audit and inventory reconciliation.
              </p>
            </div>
            <span className="text-xs font-bold font-mono text-stone-500 bg-canvas-100 px-3 py-1 rounded-full border border-canvas-border">
              {inwardLogs.length} Records
            </span>
          </div>

          {inwardLogs.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs space-y-1">
              <Boxes className="w-8 h-8 mx-auto text-stone-300" />
              <p className="font-semibold text-stone-700">No inward logs recorded yet</p>
              <p className="text-stone-400">
                Click "Inward Stock" on any raw material card in the Raw Materials tab to record a delivery.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-canvas-border text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Raw Material</th>
                    <th className="py-2.5 px-3">Quantity Added</th>
                    <th className="py-2.5 px-3">Unit Cost</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border">
                  {inwardLogs.map(log => (
                    <tr key={log.id} className="hover:bg-canvas-50/80 transition-colors">
                      <td className="py-3 px-3 text-stone-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-stone-900">
                        {log.rawMaterialName}
                      </td>
                      <td className="py-3 px-3 font-mono text-sage-700 font-bold">
                        +{log.quantityAdded} {log.unit}
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-700">
                        {currencySymbol}{log.costPrice}
                      </td>
                      <td className="py-3 px-3 text-stone-600 font-medium">
                        {log.supplierName || 'Direct Vendor'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Badge variant="success">Verified</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================== */}
      {/* SUB-MODAL 1: QUICK INWARD PURCHASE DIALOG */}
      {/* ===================================================================== */}
      {inwardItem && (
        <Modal
          isOpen={true}
          onClose={() => setInwardItem(null)}
          title="Inward Stock Purchase"
          subtitle={`Record supplier delivery for ${inwardItem.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmInward} className="space-y-4 text-xs">
            <div className="bg-canvas-100 p-3 rounded-2xl border border-canvas-border">
              <span className="text-[11px] text-stone-500 block">Selected Raw Material</span>
              <strong className="text-stone-900 text-sm font-extrabold">{inwardItem.name}</strong>
              <span className="text-stone-500 text-xs ml-1 font-mono">
                ({inwardItem.currentStock} {inwardItem.unit} currently in stock)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Quantity Added ({inwardItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={inwardQty}
                  onChange={e => setInwardQty(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Cost Price / {inwardItem.unit} ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={inwardCost}
                  onChange={e => setInwardCost(e.target.value)}
                  placeholder={String(inwardItem.costPerUnit)}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Supplier / Vendor Name
              </label>
              <input
                type="text"
                value={inwardSupplier}
                onChange={e => setInwardSupplier(e.target.value)}
                placeholder="e.g. Metro Wholesale / Local Dairy"
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-canvas-border">
              <Button
                variant="outline"
                type="button"
                onClick={() => setInwardItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Confirm Inward
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* SUB-MODAL 2: ADD / EDIT RAW MATERIAL DIALOG */}
      {/* ===================================================================== */}
      {isEditingMaterial && (
        <Modal
          isOpen={true}
          onClose={() => setIsEditingMaterial(false)}
          title={materialForm.id ? 'Edit Raw Material' : 'Add New Raw Material'}
          subtitle="Configure unit, baseline reorder threshold and standard cost price"
          maxWidth="md"
        >
          <form onSubmit={handleSaveMaterial} className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Material Name *
              </label>
              <input
                type="text"
                required
                value={materialForm.name}
                onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
                placeholder="e.g. Fresh Paneer, Coffee Beans"
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Category</label>
                <select
                  value={materialForm.category}
                  onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
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
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Unit</label>
                <select
                  value={materialForm.unit}
                  onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value as InventoryUnit })}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
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
                <label className="text-[10px] font-bold text-stone-500 block mb-1">Current Stock</label>
                <input
                  type="number"
                  step="0.1"
                  value={materialForm.currentStock}
                  onChange={e => setMaterialForm({ ...materialForm, currentStock: Number(e.target.value) })}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2 py-1.5 text-stone-900 font-mono text-center focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-500 block mb-1">Reorder Level</label>
                <input
                  type="number"
                  step="0.1"
                  value={materialForm.reorderLevel}
                  onChange={e => setMaterialForm({ ...materialForm, reorderLevel: Number(e.target.value) })}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2 py-1.5 text-stone-900 font-mono text-center focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-500 block mb-1">Cost ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.5"
                  value={materialForm.costPerUnit}
                  onChange={e => setMaterialForm({ ...materialForm, costPerUnit: Number(e.target.value) })}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2 py-1.5 text-stone-900 font-mono text-center focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-canvas-border">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsEditingMaterial(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Save Material
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* SUB-MODAL 3: RAISE PURCHASE ORDER DIALOG (PHASE 4) */}
      {/* ===================================================================== */}
      {isCreatingPo && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreatingPo(false)}
          title="Raise Purchase Order"
          subtitle="Generate formalized PO with itemized raw materials and supplier terms"
          maxWidth="lg"
        >
          <form onSubmit={handleCreatePo} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Select Supplier *</label>
                <select
                  required
                  value={poSupplierId}
                  onChange={e => setPoSupplierId(e.target.value)}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.paymentTerms.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={poDeliveryDate}
                  onChange={e => setPoDeliveryDate(e.target.value)}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
                >
                </input>
              </div>
            </div>

            {/* PO Line Items */}
            <div className="space-y-2 border-t border-b border-canvas-border py-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700 uppercase">Purchase Line Items</span>
                <button
                  type="button"
                  onClick={() => {
                    if (inventory.length > 0) {
                      setPoItems(prev => [
                        ...prev,
                        { rawMaterialId: inventory[0].id, quantity: 5, unit: inventory[0].unit, unitCost: inventory[0].costPerUnit }
                      ]);
                    }
                  }}
                  className="text-terracotta-600 font-bold hover:underline flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              {poItems.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-canvas-50 p-2 rounded-xl border border-canvas-border">
                  <select
                    value={item.rawMaterialId}
                    onChange={e => {
                      const mat = inventory.find(m => m.id === e.target.value);
                      if (mat) {
                        const copy = [...poItems];
                        copy[idx] = { ...copy[idx], rawMaterialId: mat.id, unit: mat.unit, unitCost: mat.costPerUnit };
                        setPoItems(copy);
                      }
                    }}
                    className="flex-1 bg-white border border-canvas-border rounded-lg px-2 py-1.5 text-xs text-stone-900"
                  >
                    {inventory.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={item.quantity}
                    onChange={e => {
                      const copy = [...poItems];
                      copy[idx].quantity = Number(e.target.value);
                      setPoItems(copy);
                    }}
                    placeholder="Qty"
                    className="w-16 bg-white border border-canvas-border rounded-lg px-2 py-1.5 text-xs font-mono text-center"
                  />

                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-[10px]">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={item.unitCost}
                      onChange={e => {
                        const copy = [...poItems];
                        copy[idx].unitCost = Number(e.target.value);
                        setPoItems(copy);
                      }}
                      placeholder="Rate"
                      className="w-full bg-white border border-canvas-border rounded-lg pl-5 pr-2 py-1.5 text-xs font-mono text-right"
                    />
                  </div>

                  <span className="font-mono text-stone-800 font-bold w-20 text-right text-xs">
                    {currencySymbol}{(item.quantity * item.unitCost).toFixed(1)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPoItems(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1 text-stone-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">Notes / Terms</label>
              <textarea
                rows={2}
                value={poNotes}
                onChange={e => setPoNotes(e.target.value)}
                placeholder="e.g. Deliver before 10 AM, pack in moisture-sealed cartons"
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-canvas-border">
              <div className="text-xs font-mono">
                Subtotal: <strong>{currencySymbol}{poItems.reduce((s, i) => s + i.quantity * i.unitCost, 0).toFixed(1)}</strong>
                <span className="text-stone-400 ml-2">(+5% GST applicable)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" type="button" onClick={() => setIsCreatingPo(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Generate Purchase Order
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* SUB-MODAL 4: RECORD STOCK WASTAGE (PHASE 4) */}
      {/* ===================================================================== */}
      {isLoggingWastage && (
        <Modal
          isOpen={true}
          onClose={() => setIsLoggingWastage(false)}
          title="Record Stock Wastage / Shrinkage"
          subtitle="Enforces stock decrement and optional Manager PIN authorization"
          maxWidth="md"
        >
          <form onSubmit={handleLogWastage} className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">Raw Material *</label>
              <select
                required
                value={wastageMaterialId}
                onChange={e => setWastageMaterialId(e.target.value)}
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
              >
                {inventory.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.currentStock} {m.unit} on hand @ {currencySymbol}{m.costPerUnit}/{m.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Quantity Wasted *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={wastageQty}
                  onChange={e => setWastageQty(Number(e.target.value))}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono text-center focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Reason Code *</label>
                <select
                  value={wastageReason}
                  onChange={e => setWastageReason(e.target.value as any)}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  <option value="spoilage">Spoilage / Rotten</option>
                  <option value="expired">Past Expiry Date</option>
                  <option value="damaged">Damaged Packaging / Broken</option>
                  <option value="prep_waste">Excess Prep Waste / Burnt</option>
                  <option value="audit_discrepancy">Physical Audit Discrepancy</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">Incident Notes / Cause</label>
              <input
                type="text"
                value={wastageNotes}
                onChange={e => setWastageNotes(e.target.value)}
                placeholder="e.g. Refrigerator #2 compressor tripped overnight"
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>

            {/* Manager PIN Authorization */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
              <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-[11px]">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>Manager Approval PIN (Optional / High-Value Audit)</span>
              </div>
              <input
                type="password"
                maxLength={4}
                value={wastageManagerPin}
                onChange={e => setWastageManagerPin(e.target.value)}
                placeholder="Enter 4-digit Manager PIN (e.g. 2222)"
                className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-stone-900 font-mono text-center tracking-widest focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-canvas-border">
              <Button variant="outline" type="button" onClick={() => setIsLoggingWastage(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Confirm & Deduct Stock
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* SUB-MODAL 5: ADD SUPPLIER DIALOG (PHASE 4) */}
      {/* ===================================================================== */}
      {isAddingSupplier && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddingSupplier(false)}
          title="Register New Vendor / Supplier"
          subtitle="Add vendor details to master procurement directory"
          maxWidth="md"
        >
          <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">Company / Supplier Name *</label>
              <input
                type="text"
                required
                value={supplierForm.name}
                onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder="e.g. Modern Dairy Distributors"
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={supplierForm.contactPerson}
                  onChange={e => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                  placeholder="e.g. Rajesh Shah"
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={supplierForm.phone}
                  onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={supplierForm.gstin}
                  onChange={e => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                  placeholder="27AAAAA0000A1Z5"
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono uppercase focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Payment Credit Terms</label>
                <select
                  value={supplierForm.paymentTerms}
                  onChange={e => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value as any })}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  <option value="immediate">Immediate / Cash On Delivery</option>
                  <option value="net_7">Net 7 Days</option>
                  <option value="net_15">Net 15 Days</option>
                  <option value="net_30">Net 30 Days</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-canvas-border">
              <Button variant="outline" type="button" onClick={() => setIsAddingSupplier(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Vendor Profile
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
