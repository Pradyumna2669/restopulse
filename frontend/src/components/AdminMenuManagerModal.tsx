import React, { useState } from 'react';
import { Category, MenuItem, FoodType, KitchenStation } from '../types';
import { X, Plus, Search, Edit3, Trash2, Image, ToggleLeft, ToggleRight, Sparkles, FolderPlus, Layers, Utensils } from 'lucide-react';
import { ApiService } from '../services/api';

interface AdminMenuManagerModalProps {
  categories: Category[];
  items: MenuItem[];
  currencySymbol: string;
  onRefreshMenu: () => void;
  onClose: () => void;
}

const PRESET_EMOJIS = ['🍽️', '🍕', '🍲', '🥗', '🍛', '🍗', '🥪', '🍹', '☕', '🍨', '🍰', '🍷', '🍱', '🍜', '🍔', '🌮', '🥟', '🍤', '🥞', '🥤'];

export const AdminMenuManagerModal: React.FC<AdminMenuManagerModalProps> = ({
  categories,
  items,
  currencySymbol,
  onRefreshMenu,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'dishes' | 'categories'>('dishes');
  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  
  // Edit / Add Dish Modal State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dish Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [foodType, setFoodType] = useState<FoodType>('veg');
  const [station, setStation] = useState<KitchenStation>('kitchen');
  const [image, setImage] = useState('');
  const [inStock, setInStock] = useState(true);

  // Edit / Add Category Modal State
  const [isCatFormOpen, setIsCatFormOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('🍲');
  const [savingCat, setSavingCat] = useState(false);

  // ==================== Dish Handlers ====================
  const openAddForm = () => {
    setEditingItem(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setBasePrice(150);
    setFoodType('veg');
    setStation('kitchen');
    setImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80');
    setInStock(true);
    setIsFormOpen(true);
  };

  const openEditForm = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategoryId(item.categoryId);
    setDescription(item.description);
    setBasePrice(item.basePrice);
    setFoodType(item.foodType);
    setStation(item.station);
    setImage(item.image || '');
    setInStock(item.inStock);
    setIsFormOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId || basePrice <= 0) {
      alert('Please fill in dish name, category, and valid price');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await ApiService.updateMenuItem(editingItem.id, {
          name,
          categoryId,
          description,
          basePrice,
          foodType,
          station,
          image,
          inStock
        });
      } else {
        await ApiService.addMenuItem({
          name,
          categoryId,
          description,
          basePrice,
          foodType,
          station,
          gstRate: 5,
          image,
          inStock,
          variations: [],
          addons: []
        });
      }
      onRefreshMenu();
      setIsFormOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}" from the menu?`)) return;
    try {
      await ApiService.deleteMenuItem(id);
      onRefreshMenu();
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
  };

  const handleToggleStock = async (id: string) => {
    try {
      await ApiService.toggleItemStock(id);
      onRefreshMenu();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle stock');
    }
  };

  // ==================== Category Handlers ====================
  const openAddCategoryModal = () => {
    setEditingCat(null);
    setCatName('');
    setCatIcon('🍲');
    setIsCatFormOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon || '🍲');
    setIsCatFormOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert('Please enter category name');
      return;
    }

    setSavingCat(true);
    try {
      if (editingCat) {
        await ApiService.updateCategory(editingCat.id, catName.trim(), catIcon);
      } else {
        await ApiService.addCategory(catName.trim(), catIcon);
      }
      onRefreshMenu();
      setIsCatFormOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    const linkedItems = items.filter(i => i.categoryId === cat.id);
    let msg = `Are you sure you want to delete category "${cat.name}"?`;
    if (linkedItems.length > 0) {
      msg = `Warning: "${cat.name}" has ${linkedItems.length} dishes assigned to it. Deleting this category will leave these items unassigned. Proceed?`;
    }

    if (!confirm(msg)) return;

    try {
      await ApiService.deleteCategory(cat.id);
      onRefreshMenu();
    } catch (e: any) {
      alert(e.message || 'Failed to delete category');
    }
  };

  const filteredItems = items.filter(item => {
    if (selectedCatId !== 'all' && item.categoryId !== selectedCatId) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-850">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-brand-400" />
              <span>Menu & Catalog Master</span>
            </h2>
            <p className="text-xs text-slate-400">Manage dishes, prices, photos, stock status, and menu categories</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {activeTab === 'dishes' ? (
              <button
                onClick={openAddForm}
                className="flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Dish</span>
              </button>
            ) : (
              <button
                onClick={openAddCategoryModal}
                className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher (Dishes vs Categories) */}
        <div className="flex items-center bg-slate-900 border-b border-slate-700/80 px-6 pt-2">
          <button
            onClick={() => setActiveTab('dishes')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'dishes'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Dishes & Items ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'categories'
                ? 'border-amber-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories ({categories.length})</span>
          </button>
        </div>

        {/* TAB 1: DISHES MANAGEMENT */}
        {activeTab === 'dishes' && (
          <>
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-700/80 bg-slate-900/60 flex items-center space-x-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search dishes by name or description..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <select
                value={selectedCatId}
                onChange={e => setSelectedCatId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Categories ({items.length})</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dishes List (Grouped Category by Category when 'all' is selected and no search) */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-900/40 space-y-6">
              {selectedCatId === 'all' && !search.trim() ? (
                // Grouped by Category View
                categories.map(cat => {
                  const catItems = items.filter(i => i.categoryId === cat.id);
                  if (catItems.length === 0) return null;

                  return (
                    <div key={cat.id} className="space-y-3">
                      <div className="flex items-center space-x-2 pb-1.5 border-b border-slate-800">
                        <span className="text-base">{cat.icon}</span>
                        <h3 className="text-sm font-bold text-white tracking-wide">{cat.name}</h3>
                        <span className="text-[11px] font-semibold text-slate-500 font-mono">
                          ({catItems.length} dishes)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {catItems.map(item => (
                          <DishCard
                            key={item.id}
                            item={item}
                            category={cat}
                            currencySymbol={currencySymbol}
                            onToggleStock={handleToggleStock}
                            onEdit={openEditForm}
                            onDelete={handleDeleteItem}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Filtered List View
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredItems.map(item => {
                    const cat = categories.find(c => c.id === item.categoryId);
                    return (
                      <DishCard
                        key={item.id}
                        item={item}
                        category={cat}
                        currencySymbol={currencySymbol}
                        onToggleStock={handleToggleStock}
                        onEdit={openEditForm}
                        onDelete={handleDeleteItem}
                      />
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-slate-500 text-xs">
                      No dishes match the selected category or search filter.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Menu Categories</h3>
                <p className="text-xs text-slate-400">Organize your menu into logical dining sections and courses</p>
              </div>
              <button
                onClick={openAddCategoryModal}
                className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow"
              >
                <Plus className="w-4 h-4" />
                <span>New Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map(cat => {
                const dishCount = items.filter(i => i.categoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-600 transition-all shadow-md group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                        {cat.icon || '🍲'}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditCategoryModal(cat)}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit Category"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        {cat.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5 font-mono">
                        <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                        <span>{dishCount} {dishCount === 1 ? 'Dish' : 'Dishes'} Listed</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add / Edit Dish Sub-Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700 bg-slate-850">
                <h3 className="text-sm font-bold text-white">
                  {editingItem ? 'Edit Dish Details' : 'Add New Dish to Menu'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-5 space-y-4 overflow-y-auto">
                {/* Dish Name */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Crispy Corn Pepper Fry"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Category & Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                      Category *
                    </label>
                    <select
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                      Price ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={basePrice || ''}
                      onChange={e => setBasePrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Food Type & Kitchen Station */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                      Food Type
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setFoodType('veg')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          foodType === 'veg' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'
                        }`}
                      >
                        Veg
                      </button>
                      <button
                        type="button"
                        onClick={() => setFoodType('non-veg')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          foodType === 'non-veg' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'
                        }`}
                      >
                        Non-Veg
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                      Kitchen Station
                    </label>
                    <select
                      value={station}
                      onChange={e => setStation(e.target.value as KitchenStation)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 uppercase"
                    >
                      <option value="kitchen">Kitchen</option>
                      <option value="tandoor">Tandoor</option>
                      <option value="bar">Bar</option>
                      <option value="dessert">Dessert</option>
                      <option value="counter">Counter</option>
                    </select>
                  </div>
                </div>

                {/* Picture / Image URL */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Picture / Image URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={image}
                      onChange={e => setImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                    />
                    {image && (
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-600 shrink-0">
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    High-resolution dish photos appear in customer QR menus and POS item cards.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Ingredients & Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Short description of taste, ingredients, or preparation style..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>

                {/* In-Stock Toggle */}
                <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-700">
                  <span className="text-xs font-bold text-slate-200">Available in Stock</span>
                  <button
                    type="button"
                    onClick={() => setInStock(!inStock)}
                    className="text-xs font-bold flex items-center space-x-1.5"
                  >
                    {inStock ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all active:scale-98"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update Dish' : 'Add Dish to Menu'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add / Edit Category Sub-Modal */}
        {isCatFormOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700 bg-slate-850">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>{editingCat ? 'Edit Category' : 'Create New Category'}</span>
                </h3>
                <button
                  onClick={() => setIsCatFormOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
                {/* Category Name */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={e => setCatName(e.target.value)}
                    placeholder="e.g. Starters, Biryani & Rice, Desserts"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Emoji / Icon Selector */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Icon / Emoji
                  </label>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                      {catIcon}
                    </div>
                    <input
                      type="text"
                      value={catIcon}
                      onChange={e => setCatIcon(e.target.value)}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white text-center focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 mb-2">Quick Pick Icon:</p>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/80 rounded-xl border border-slate-700/60 max-h-28 overflow-y-auto">
                    {PRESET_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCatIcon(emoji)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm hover:bg-slate-700 transition-colors ${
                          catIcon === emoji ? 'bg-amber-600/30 ring-1 ring-amber-400' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingCat}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all active:scale-98"
                >
                  {savingCat ? 'Saving...' : editingCat ? 'Update Category' : 'Create Category'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Dish Card Component for Admin
interface DishCardProps {
  item: MenuItem;
  category?: Category;
  currencySymbol: string;
  onToggleStock: (id: string) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string, name: string) => void;
}

const DishCard: React.FC<DishCardProps> = ({
  item,
  category,
  currencySymbol,
  onToggleStock,
  onEdit,
  onDelete
}) => {
  return (
    <div
      className={`p-3.5 rounded-2xl border flex items-start space-x-3.5 transition-all ${
        item.inStock
          ? 'bg-slate-800/90 border-slate-700/80 hover:border-slate-600'
          : 'bg-slate-800/40 border-slate-800 opacity-60'
      }`}
    >
      {/* Dish Picture Thumbnail */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0 relative">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
            <Image className="w-6 h-6" />
            <span className="text-[9px] mt-1">No Photo</span>
          </div>
        )}

        {/* Veg / Non-Veg Indicator Dot */}
        <span
          className={`absolute top-1 left-1 w-3.5 h-3.5 rounded border flex items-center justify-center p-0.5 bg-slate-950/80 ${
            item.foodType === 'veg' ? 'border-emerald-500' : 'border-rose-500'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.foodType === 'veg' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
          <span className="text-xs font-black text-brand-400 font-mono ml-2">
            {currencySymbol}{item.basePrice}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
          {item.description || 'No description provided.'}
        </p>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/60 text-[10px]">
          <span className="text-slate-400 truncate pr-2">
            {category?.icon} {category?.name} • <span className="uppercase">{item.station}</span>
          </span>

          {/* Quick Stock & Action Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onToggleStock(item.id)}
              className={`px-2 py-0.5 rounded-full font-bold transition-colors ${
                item.inStock
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {item.inStock ? 'In Stock' : 'Out of Stock'}
            </button>

            <button
              onClick={() => onEdit(item)}
              className="p-1 text-slate-400 hover:text-white bg-slate-700/60 rounded hover:bg-slate-700 transition-colors"
              title="Edit Dish"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onDelete(item.id, item.name)}
              className="p-1 text-slate-500 hover:text-rose-400 bg-slate-700/60 rounded hover:bg-slate-700 transition-colors"
              title="Delete Dish"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
