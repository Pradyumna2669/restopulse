import React from 'react';
import { MenuItem, Variation, Addon } from '../types';
import { X, Plus, Check } from 'lucide-react';

interface VariationModalProps {
  item: MenuItem;
  currencySymbol: string;
  onConfirm: (item: MenuItem, variation?: Variation, addons?: Addon[]) => void;
  onClose: () => void;
}

export const VariationModal: React.FC<VariationModalProps> = ({
  item,
  currencySymbol,
  onConfirm,
  onClose
}) => {
  const [selectedVariation, setSelectedVariation] = React.useState<Variation | undefined>(
    item.variations && item.variations.length > 0 ? item.variations[0] : undefined
  );
  const [selectedAddons, setSelectedAddons] = React.useState<Addon[]>([]);

  const toggleAddon = (addon: Addon) => {
    if (selectedAddons.some(a => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const calculateTotal = () => {
    let price = selectedVariation ? selectedVariation.price : item.basePrice;
    selectedAddons.forEach(a => {
      price += a.price;
    });
    return price;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/90">
          <div>
            <h3 className="text-base font-bold text-white">{item.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Variations (Sizes / Portions) */}
          {item.variations && item.variations.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Choose Portion / Size
              </label>
              <div className="space-y-2">
                {item.variations.map(v => {
                  const isChecked = selectedVariation?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVariation(v)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-brand-500/15 border-brand-500 text-white'
                          : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isChecked ? 'border-brand-500 bg-brand-500' : 'border-slate-500'
                          }`}
                        >
                          {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="font-medium text-sm">{v.name}</span>
                      </div>
                      <span className="font-bold text-brand-400 text-sm">
                        {currencySymbol}{v.price}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {item.addons && item.addons.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Optional Add-ons
              </label>
              <div className="space-y-2">
                {item.addons.map(addon => {
                  const isSelected = selectedAddons.some(a => a.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white'
                          : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-500'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                        <span className="font-medium text-sm">{addon.name}</span>
                      </div>
                      <span className="font-semibold text-slate-300 text-sm">
                        +{currencySymbol}{addon.price}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Total Item Price</span>
            <span className="text-lg font-black text-white">
              {currencySymbol}{calculateTotal()}
            </span>
          </div>

          <button
            onClick={() => {
              onConfirm(item, selectedVariation, selectedAddons);
              onClose();
            }}
            className="flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
