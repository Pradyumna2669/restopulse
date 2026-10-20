import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  UtensilsCrossed
} from 'lucide-react';
import { MenuItem, Category, FoodType, KitchenStation } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ApiService } from '../services/api';

interface MenuPricingViewProps {
  categories: Category[];
  items: MenuItem[];
  currencySymbol: string;
  onRefreshMenu: () => Promise<void>;
}

export const MenuPricingView: React.FC<MenuPricingViewProps> = ({
  categories,
  items,
  currencySymbol,
  onRefreshMenu
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState<string>('all');

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [foodType, setFoodType] = useState<FoodType>('veg');
  const [station, setStation] = useState<KitchenStation>('kitchen');
  const [image, setImage] = useState('');
  const [inStock, setInStock] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('☕');

  const filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFood = foodTypeFilter === 'all' || item.foodType === foodTypeFilter;
    return matchesCat && matchesSearch && matchesFood;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setBasePrice(120);
    setFoodType('veg');
    setStation('kitchen');
    setImage('');
    setInStock(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategoryId(item.categoryId);
    setDescription(item.description);
    setBasePrice(item.basePrice);
    setFoodType(item.foodType);
    setStation(item.station);
    setImage(item.image || '');
    setInStock(item.inStock);
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;

    try {
      setIsSaving(true);
      const payload = {
        name,
        categoryId,
        description,
        basePrice: Number(basePrice),
        foodType,
        station,
        image,
        inStock,
        gstRate: 5
      };

      if (editingItem) {
        await ApiService.updateMenuItem(editingItem.id, payload);
        setStatusMessage('Item updated successfully');
      } else {
        await ApiService.addMenuItem(payload);
        setStatusMessage('New dish added to menu');
      }

      await onRefreshMenu();
      setIsModalOpen(false);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this menu dish?')) return;
    try {
      await ApiService.deleteMenuItem(id);
      await onRefreshMenu();
      setStatusMessage('Item deleted');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Failed to delete item');
    }
  };

  const handleToggleStock = async (id: string) => {
    try {
      await ApiService.toggleItemStock(id);
      await onRefreshMenu();
    } catch {
      setStatusMessage('Failed to toggle stock');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await ApiService.addCategory(newCatName, newCatIcon);
      await onRefreshMenu();
      setNewCatName('');
      setIsCategoryModalOpen(false);
      setStatusMessage('Category added');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Failed to add category');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAdd}
          >
            Add New Item
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsCategoryModalOpen(true)}
          >
            Manage Categories
          </Button>
        </div>

        {statusMessage && (
          <div className="text-xs text-sage-700 bg-sage-50 border border-sage-200 px-3 py-1.5 rounded-full font-medium animate-fadeIn">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Category Filter Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 border border-canvas-border hover:bg-canvas-200'
          }`}
        >
          All Categories ({items.length})
        </button>

        {categories.map(cat => {
          const count = items.filter(i => i.categoryId === cat.id).length;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-canvas-border hover:bg-canvas-200'
              }`}
            >
              <span>{cat.icon || '☕'}</span>
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-stone-700 text-white' : 'bg-canvas-200 text-stone-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Food Type Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search items by name or keywords..."
            className="w-full pl-9 pr-4 py-2 bg-canvas-100 border border-canvas-border rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 text-xs">
          <span className="text-stone-400 text-[11px] font-semibold mr-1">Diet:</span>
          {['all', 'veg', 'non-veg', 'egg'].map(type => (
            <button
              key={type}
              onClick={() => setFoodTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                foodTypeFilter === type
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-canvas-100 text-stone-600 border border-canvas-border hover:bg-canvas-200'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
      </Card>

      {/* Menu Dishes Grid */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <UtensilsCrossed className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-stone-700">No menu items found</h4>
          <p className="text-xs text-stone-400 mt-1">Try adjusting your category or search filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const category = categories.find(c => c.id === item.categoryId);
            return (
              <Card key={item.id} hoverEffect className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-canvas-200 border border-canvas-border flex items-center justify-center text-stone-700 overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">{category?.icon || '☕'}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{item.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-2 h-2 rounded-full ${
                            item.foodType === 'veg' ? 'bg-emerald-500' : item.foodType === 'egg' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          <span className="text-xs text-stone-500 capitalize">{item.foodType}</span>
                          <span className="text-stone-300">•</span>
                          <span className="text-xs text-stone-400">{category?.name}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStock(item.id)}
                      title="Click to toggle availability"
                      className="shrink-0"
                    >
                      {item.inStock ? (
                        <Badge variant="success" size="xs">
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="xs">
                          Sold out
                        </Badge>
                      )}
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-xs text-stone-500 mt-3 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-canvas-border flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-400 block font-medium">Base Price</span>
                    <span className="text-base font-bold font-mono text-stone-900">
                      {currencySymbol}{item.basePrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg border border-canvas-border text-stone-500 hover:text-stone-900 hover:bg-canvas-200 transition-colors"
                      title="Edit dish"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg border border-canvas-border text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete dish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit / Add Dish Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Menu Dish' : 'Add New Menu Dish'}
        subtitle="Configure dish details, category station and live pricing."
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Dish Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spanish Latte, Butter Chicken, Avocado Toast"
              className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Category *</label>
              <select
                required
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Base Price ({currencySymbol}) *</label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={basePrice}
                onChange={e => setBasePrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Dietary Type</label>
              <select
                value={foodType}
                onChange={e => setFoodType(e.target.value as FoodType)}
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
              >
                <option value="veg">🟢 Vegetarian</option>
                <option value="non-veg">🔴 Non-Vegetarian</option>
                <option value="egg">🟡 Egg</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Kitchen Station</label>
              <select
                value={station}
                onChange={e => setStation(e.target.value as KitchenStation)}
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white capitalize"
              >
                <option value="kitchen">Main Kitchen</option>
                <option value="bar">Bar & Beverages</option>
                <option value="tandoor">Tandoor / Grill</option>
                <option value="dessert">Bakery & Dessert</option>
                <option value="counter">Counter Pickup</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Image URL (Optional)</label>
            <input
              type="url"
              value={image}
              onChange={e => setImage(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description of ingredients or tasting notes..."
              className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-canvas-100 border border-canvas-border">
            <span className="text-xs font-bold text-stone-900">Available for Order</span>
            <input
              type="checkbox"
              checked={inStock}
              onChange={e => setInStock(e.target.checked)}
              className="w-4 h-4 rounded text-terracotta-500"
            />
          </div>

          <div className="pt-3 border-t border-canvas-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
            >
              {editingItem ? 'Update Dish' : 'Save Dish'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Manager Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Manage Categories"
        subtitle="Add and organize dish categories."
        maxWidth="md"
      >
        <div className="space-y-4">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              value={newCatIcon}
              onChange={e => setNewCatIcon(e.target.value)}
              className="w-12 text-center px-2 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-base"
              title="Emoji icon"
            />
            <input
              type="text"
              required
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="New Category Name (e.g. Specialty Coffee)"
              className="flex-1 px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
            />
            <Button type="submit" variant="primary" size="sm">
              Add
            </Button>
          </form>

          <div className="divide-y divide-canvas-border max-h-60 overflow-y-auto">
            {categories.map(c => (
              <div key={c.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.icon || '☕'}</span>
                  <span className="text-xs font-semibold text-stone-800">{c.name}</span>
                </div>
                <span className="text-[10px] text-stone-400">
                  {items.filter(i => i.categoryId === c.id).length} items
                </span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
