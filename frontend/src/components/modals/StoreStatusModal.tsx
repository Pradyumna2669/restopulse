import React, { useState } from 'react';
import {
  Store,
  Clock,
  CheckCircle2,
  X,
  Play,
  Pause,
  Coffee,
  Zap,
  Package,
  Moon,
  QrCode,
  ShoppingBag
} from 'lucide-react';
import { RestaurantProfile } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ToggleSwitch } from '../ui/ToggleSwitch';

interface StoreStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RestaurantProfile;
  onUpdateProfile: (updated: Partial<RestaurantProfile>) => Promise<void>;
}

export const StoreStatusModal: React.FC<StoreStatusModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile
}) => {
  const [isAccepting, setIsAccepting] = useState<boolean>(
    profile.isAcceptingOrders !== undefined ? profile.isAcceptingOrders : true
  );
  const [qrEnabled, setQrEnabled] = useState<boolean>(
    profile.featureFlags?.enableQrOrdering ?? true
  );
  const [pauseDuration, setPauseDuration] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleStore = async (newStatus: boolean, durationLabel?: string) => {
    setIsAccepting(newStatus);
    setPauseDuration(newStatus ? null : (durationLabel || 'Manually Paused'));
    setIsSaving(true);
    try {
      await onUpdateProfile({
        isAcceptingOrders: newStatus
      });
      setSaveMessage(newStatus ? '🟢 Store is now OPEN & accepting orders!' : `⏸️ Store paused: ${durationLabel || 'Ordering paused'}`);
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    } catch {
      alert('Failed to update store status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleQr = async (checked: boolean) => {
    setQrEnabled(checked);
    setIsSaving(true);
    try {
      await onUpdateProfile({
        featureFlags: {
          ...profile.featureFlags,
          enableQrOrdering: checked
        }
      });
      setSaveMessage(checked ? 'QR Ordering enabled' : 'QR Ordering paused');
      setTimeout(() => setSaveMessage(null), 2500);
    } catch {
      alert('Failed to update QR ordering');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <Card className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-5 border border-canvas-border">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isAccepting ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900">Store Ordering Status</h3>
              <p className="text-xs text-stone-500">Manage accepting orders or pause service instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Alert */}
        {saveMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* Primary Status Banner */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isAccepting
            ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-50 border-emerald-200'
            : 'bg-gradient-to-r from-amber-500/10 via-amber-50 to-rose-50 border-amber-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isAccepting ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={`text-sm font-extrabold uppercase tracking-wider ${
                  isAccepting ? 'text-emerald-800' : 'text-amber-900'
                }`}>
                  {isAccepting ? 'Store is OPEN' : 'Store is PAUSED'}
                </span>
              </div>
              <p className="text-xs text-stone-600">
                {isAccepting
                  ? 'All order channels are active. Guests & aggregators can place orders.'
                  : pauseDuration ? `Service paused: ${pauseDuration}. Incoming orders temporarily stopped.` : 'Ordering is paused across customer channels.'}
              </p>
            </div>

            <Button
              variant={isAccepting ? 'outline' : 'primary'}
              size="md"
              disabled={isSaving}
              onClick={() => handleToggleStore(!isAccepting)}
              className={`shrink-0 font-bold ${
                isAccepting
                  ? 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
              }`}
            >
              {isAccepting ? (
                <>
                  <Pause className="w-4 h-4 mr-1.5 text-amber-600" />
                  Pause Store
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1.5" />
                  Open Store Now
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Pause Presets */}
        <div>
          <label className="text-xs font-bold text-stone-700 block mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>Quick Pause Presets (Temporary Hold)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleToggleStore(false, '15m Kitchen Rush')}
              disabled={isSaving}
              className="p-3 rounded-xl border border-canvas-border hover:border-amber-400 hover:bg-amber-50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>15 Mins</span>
              </div>
              <p className="text-[10px] text-stone-500 group-hover:text-amber-800">Kitchen Rush Hold</p>
            </button>

            <button
              onClick={() => handleToggleStore(false, '30m Staff Break')}
              disabled={isSaving}
              className="p-3 rounded-xl border border-canvas-border hover:border-amber-400 hover:bg-amber-50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs mb-1">
                <Coffee className="w-3.5 h-3.5" />
                <span>30 Mins</span>
              </div>
              <p className="text-[10px] text-stone-500 group-hover:text-amber-800">Staff Meal Break</p>
            </button>

            <button
              onClick={() => handleToggleStore(false, '1 Hour Restock')}
              disabled={isSaving}
              className="p-3 rounded-xl border border-canvas-border hover:border-amber-400 hover:bg-amber-50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs mb-1">
                <Package className="w-3.5 h-3.5" />
                <span>1 Hour</span>
              </div>
              <p className="text-[10px] text-stone-500 group-hover:text-amber-800">Stock & Inwarding</p>
            </button>

            <button
              onClick={() => handleToggleStore(false, 'Closed for Today')}
              disabled={isSaving}
              className="p-3 rounded-xl border border-canvas-border hover:border-rose-400 hover:bg-rose-50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs mb-1">
                <Moon className="w-3.5 h-3.5" />
                <span>End of Day</span>
              </div>
              <p className="text-[10px] text-stone-500 group-hover:text-rose-800">Close Till Tomorrow</p>
            </button>
          </div>
        </div>

        {/* Channel Ordering Controls */}
        <div className="border-t border-canvas-border pt-4 space-y-3">
          <label className="text-xs font-bold text-stone-700 block">
            Channel Specific Controls
          </label>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-canvas-50 border border-canvas-border">
              <div className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4 text-purple-600" />
                <div>
                  <h4 className="text-xs font-bold text-stone-800">QR Code Table Self-Ordering</h4>
                  <p className="text-[10px] text-stone-500">Allow dining guests to order from their phones</p>
                </div>
              </div>
              <ToggleSwitch
                checked={qrEnabled}
                onChange={handleToggleQr}
                label=""
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-canvas-50 border border-canvas-border opacity-90">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <div>
                  <h4 className="text-xs font-bold text-stone-800">In-Store Staff POS Terminal</h4>
                  <p className="text-[10px] text-stone-500">Direct counter and table-side punch register</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Always Available
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-canvas-border">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
          >
            Close Window
          </Button>
          {!isAccepting && (
            <Button
              variant="primary"
              size="md"
              onClick={() => handleToggleStore(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Resume Store Now
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
