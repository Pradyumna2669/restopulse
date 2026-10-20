import React from 'react';
import { Category, MenuItem } from '../types';
import { Search, Plus, UtensilsCrossed } from 'lucide-react';

interface MenuGridProps {
  categories: Category[];
  items: MenuItem[];
  currencySymbol: string;
  onSelectItem: (item: MenuItem) => void;
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  categories,
  items,
  currencySymbol,
  onSelectItem
}) => {
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [foodFilter, setFoodFilter] = React.useState<'all' | 'veg' | 'non-veg'>('all');

  // Filter items by search & food type
  const matchingItems = items.filter(item => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    if (foodFilter !== 'all' && item.foodType !== foodFilter) {
      return false;
    }
    return true;
  });

  // Group matching items category by category
  const categoriesToDisplay = activeCategoryId === 'all'
    ? categories
    : categories.filter(c => c.id === activeCategoryId);

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-100 overflow-hidden">
      {/* Top Search & Filter Bar */}
      <div className="p-3 bg-white border-b border-canvas-border flex items-center space-x-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search dish or beverage..."
            className="w-full bg-canvas-100 border border-canvas-border rounded-xl pl-9 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Veg / Non-Veg Quick Toggles */}
        <div className="flex items-center bg-canvas-100 p-1 rounded-xl border border-canvas-border">
          <button
            onClick={() => setFoodFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              foodFilter === 'all'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFoodFilter('veg')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              foodFilter === 'veg'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-500 hover:text-emerald-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>Veg</span>
          </button>
          <button
            onClick={() => setFoodFilter('non-veg')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              foodFilter === 'non-veg'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-stone-500 hover:text-rose-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            <span>Non-Veg</span>
          </button>
        </div>
      </div>

      {/* Category Tabs Carousel */}
      <div className="px-3 py-2 bg-white/60 border-b border-canvas-border flex items-center space-x-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            setSearchQuery('');
            setActiveCategoryId('all');
          }}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeCategoryId === 'all'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-canvas-200 border border-canvas-border'
          }`}
        >
          <span>🍽️</span>
          <span>All Categories</span>
        </button>

        {categories.map(cat => {
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSearchQuery('');
                setActiveCategoryId(cat.id);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-600 hover:bg-canvas-200 border border-canvas-border'
              }`}
            >
              <span>{cat.icon || '☕'}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Menu Items Grid: GROUPED BY CATEGORY BY DEFAULT */}
      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        {categoriesToDisplay.map(cat => {
          const catItems = matchingItems.filter(i => i.categoryId === cat.id);
          if (catItems.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center space-x-2 pb-1.5 border-b border-canvas-border">
                <span className="text-base">{cat.icon || '☕'}</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">{cat.name}</h3>
                <span className="text-[11px] font-semibold text-stone-400 font-mono">
                  ({catItems.length})
                </span>
              </div>

              {/* Category Dishes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {catItems.map(item => {
                  const hasOptions = (item.variations && item.variations.length > 0) || (item.addons && item.addons.length > 0);

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.inStock) onSelectItem(item);
                      }}
                      className={`group relative bg-white border rounded-2xl p-3 flex flex-col justify-between transition-all duration-150 shadow-card ${
                        item.inStock
                          ? 'hover:border-terracotta-400 hover:shadow-card-hover cursor-pointer active:scale-[0.98]'
                          : 'border-canvas-border opacity-50 cursor-not-allowed bg-canvas-100'
                      }`}
                    >
                      <div>
                        {/* Dish Thumbnail & Type */}
                        <div className="relative w-full h-24 rounded-xl overflow-hidden mb-2 bg-canvas-200 border border-canvas-border flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={e => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <UtensilsCrossed className="w-8 h-8 text-stone-300" />
                          )}

                          {/* Food Type Indicator */}
                          <div className="absolute top-1.5 left-1.5">
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center p-0.5 bg-white/95 shadow-sm ${
                                item.foodType === 'veg' ? 'border-emerald-600' : 'border-rose-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.foodType === 'veg' ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}
                              />
                            </span>
                          </div>

                          {!item.inStock && (
                            <div className="absolute inset-0 bg-stone-900/75 flex items-center justify-center text-xs font-bold text-white">
                              Out of Stock
                            </div>
                          )}
                        </div>

                        {/* Dish Details */}
                        <h4 className="text-xs font-bold text-stone-900 line-clamp-1 group-hover:text-terracotta-600 transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1 leading-snug">
                          {item.description || `${item.station} station`}
                        </p>
                      </div>

                      {/* Pricing and Action */}
                      <div className="mt-2.5 pt-2 border-t border-canvas-border flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-stone-900 font-mono">
                            {currencySymbol}{item.basePrice.toFixed(0)}
                          </span>
                          {hasOptions && (
                            <span className="text-[9px] text-stone-400 block font-sans -mt-0.5">
                              + options
                            </span>
                          )}
                        </div>

                        {item.inStock && (
                          <button
                            type="button"
                            className="w-6 h-6 rounded-lg bg-terracotta-50 hover:bg-terracotta-500 text-terracotta-600 hover:text-white border border-terracotta-200 hover:border-terracotta-500 flex items-center justify-center transition-all shadow-sm active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {matchingItems.length === 0 && (
          <div className="text-center py-16 text-stone-400 text-xs">
            No dishes matching your current filter.
          </div>
        )}
      </div>
    </div>
  );
};
