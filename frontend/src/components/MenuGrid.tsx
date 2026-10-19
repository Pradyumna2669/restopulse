import React from 'react';
import { Category, MenuItem } from '../types';
import { Search, Flame, Plus } from 'lucide-react';

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
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Top Search & Filter Bar */}
      <div className="p-3 bg-slate-800/60 border-b border-slate-700/60 flex items-center space-x-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search dish or beverage..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Veg / Non-Veg Quick Toggles */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setFoodFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              foodFilter === 'all'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFoodFilter('veg')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              foodFilter === 'veg'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>Veg</span>
          </button>
          <button
            onClick={() => setFoodFilter('non-veg')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              foodFilter === 'non-veg'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            <span>Non-Veg</span>
          </button>
        </div>
      </div>

      {/* Category Tabs Carousel */}
      <div className="px-3 py-2 bg-slate-800/40 border-b border-slate-700/40 flex items-center space-x-2 overflow-x-auto scrollbar-none">
        {/* All Categories Pill */}
        <button
          onClick={() => {
            setSearchQuery('');
            setActiveCategoryId('all');
          }}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeCategoryId === 'all'
              ? 'bg-gradient-to-r from-brand-600 to-amber-600 text-white shadow-md shadow-brand-900/30 ring-1 ring-white/20'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
          }`}
        >
          <span>🍽️</span>
          <span>All Categories</span>
        </button>

        {/* Individual Categories */}
        {categories.map(cat => {
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSearchQuery('');
                setActiveCategoryId(cat.id);
              }}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-amber-600 text-white shadow-md shadow-brand-900/30 ring-1 ring-white/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              <span>{cat.icon}</span>
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
              <div className="flex items-center space-x-2 pb-1.5 border-b border-slate-800">
                <span className="text-base">{cat.icon}</span>
                <h3 className="text-sm font-bold text-white tracking-wide">{cat.name}</h3>
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
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
                      className={`group relative bg-slate-800/90 border rounded-2xl p-3 flex flex-col justify-between transition-all duration-150 ${
                        item.inStock
                          ? 'hover:bg-slate-750 border-slate-700 hover:border-brand-500/80 cursor-pointer hover:shadow-xl hover:shadow-brand-950/20 active:scale-[0.98]'
                          : 'border-slate-800 opacity-50 cursor-not-allowed bg-slate-900/50'
                      }`}
                    >
                      <div>
                        {/* Dish Thumbnail & Type */}
                        <div className="relative w-full h-24 rounded-xl overflow-hidden mb-2 bg-slate-950">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={e => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : null}

                          {/* Food Type Badge */}
                          <span
                            className={`absolute top-1.5 left-1.5 w-4 h-4 rounded border flex items-center justify-center p-0.5 bg-slate-900/90 shadow ${
                              item.foodType === 'veg'
                                ? 'border-emerald-500'
                                : item.foodType === 'egg'
                                ? 'border-amber-500'
                                : 'border-rose-500'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.foodType === 'veg'
                                  ? 'bg-emerald-500'
                                  : item.foodType === 'egg'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                          </span>

                          {/* Out of Stock Ribbon */}
                          {!item.inStock && (
                            <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                              <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 bg-rose-950/90 px-2 py-0.5 rounded border border-rose-700">
                                Out of Stock
                              </span>
                            </div>
                          )}

                          <span className="absolute bottom-1.5 right-1.5 text-[9px] font-semibold text-slate-300 uppercase tracking-wider bg-slate-900/80 px-1.5 py-0.5 rounded backdrop-blur-sm border border-slate-700/60">
                            {item.station}
                          </span>
                        </div>

                        {/* Name & Description */}
                        <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Price & Action */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-700/60">
                        <div>
                          <span className="text-[10px] text-slate-500 block">
                            {hasOptions ? 'From' : 'Price'}
                          </span>
                          <span className="text-sm font-extrabold text-white">
                            {currencySymbol}{item.basePrice}
                          </span>
                        </div>

                        {item.inStock ? (
                          <button className="flex items-center space-x-1 bg-brand-600/20 group-hover:bg-brand-600 text-brand-300 group-hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-brand-500/40 group-hover:border-transparent transition-all">
                            <Plus className="w-3.5 h-3.5" />
                            <span>{hasOptions ? 'Custom' : 'Add'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-semibold">Sold Out</span>
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
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Flame className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-medium">No dishes found matching your query</p>
            <p className="text-xs text-slate-600 mt-1">Try another category or clear your search</p>
          </div>
        )}
      </div>
    </div>
  );
};
