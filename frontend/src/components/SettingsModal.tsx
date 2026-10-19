import React from 'react';
import { RestaurantProfile } from '../types';
import { X, Save, MessageCircle, Store, Star, CheckCircle, AlertCircle, RefreshCw, ToggleLeft, ToggleRight, Sliders } from 'lucide-react';
import { ApiService } from '../services/api';

interface SettingsModalProps {
  profile: RestaurantProfile;
  onUpdateProfile: (profile: RestaurantProfile) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  profile,
  onUpdateProfile,
  onClose
}) => {
  const [formData, setFormData] = React.useState<RestaurantProfile>(profile);
  const [openwaStatus, setOpenwaStatus] = React.useState<{ online: boolean; error?: string } | null>(null);
  const [testingWA, setTestingWA] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const testOpenWA = async () => {
    setTestingWA(true);
    try {
      const res = await ApiService.getOpenWAStatus();
      setOpenwaStatus(res);
    } catch (e: any) {
      setOpenwaStatus({ online: false, error: e.message });
    } finally {
      setTestingWA(false);
    }
  };

  React.useEffect(() => {
    testOpenWA();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await ApiService.updateProfile(formData);
    onUpdateProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const toggleFeature = (key: keyof RestaurantProfile['featureFlags']) => {
    setFormData({
      ...formData,
      featureFlags: {
        ...formData.featureFlags,
        [key]: !formData.featureFlags[key]
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-850">
          <div className="flex items-center space-x-2">
            <Store className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-bold text-white">Admin System & Feature Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto">
          {/* FEATURE FLAGS SECTION */}
          <div className="space-y-3 bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Feature Flags & Module Activation
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Enable or disable specific restaurant modules. Disabled modules will be hidden from staff and customer interfaces.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Takeaway */}
              <div
                onClick={() => toggleFeature('enableTakeaway')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  formData.featureFlags.enableTakeaway
                    ? 'bg-brand-500/15 border-brand-500 text-white'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Takeaway / Counter Orders</span>
                  <span className="text-[10px] text-slate-400">Quick parcel billing</span>
                </div>
                {formData.featureFlags.enableTakeaway ? (
                  <ToggleRight className="w-6 h-6 text-brand-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-600" />
                )}
              </div>

              {/* Delivery */}
              <div
                onClick={() => toggleFeature('enableDelivery')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  formData.featureFlags.enableDelivery
                    ? 'bg-brand-500/15 border-brand-500 text-white'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Home Delivery</span>
                  <span className="text-[10px] text-slate-400">Customer address & dispatch</span>
                </div>
                {formData.featureFlags.enableDelivery ? (
                  <ToggleRight className="w-6 h-6 text-brand-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-600" />
                )}
              </div>

              {/* QR Ordering */}
              <div
                onClick={() => toggleFeature('enableQrOrdering')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  formData.featureFlags.enableQrOrdering
                    ? 'bg-brand-500/15 border-brand-500 text-white'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Customer QR Table Ordering</span>
                  <span className="text-[10px] text-slate-400">Locked table scan & order</span>
                </div>
                {formData.featureFlags.enableQrOrdering ? (
                  <ToggleRight className="w-6 h-6 text-brand-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-600" />
                )}
              </div>

              {/* WhatsApp Invoice */}
              <div
                onClick={() => toggleFeature('enableWhatsAppInvoice')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  formData.featureFlags.enableWhatsAppInvoice
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">WhatsApp Invoice via OpenWA</span>
                  <span className="text-[10px] text-slate-400">Automatic PDF & text bill</span>
                </div>
                {formData.featureFlags.enableWhatsAppInvoice ? (
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-600" />
                )}
              </div>

              {/* Google Review Prompt */}
              <div
                onClick={() => toggleFeature('enableGoogleReviewPrompt')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  formData.featureFlags.enableGoogleReviewPrompt
                    ? 'bg-amber-500/15 border-amber-500 text-white'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Google 5★ Review Automation</span>
                  <span className="text-[10px] text-slate-400">Dispatches link via WhatsApp</span>
                </div>
                {formData.featureFlags.enableGoogleReviewPrompt ? (
                  <ToggleRight className="w-6 h-6 text-amber-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-600" />
                )}
              </div>

              {/* KDS */}
              <div
                onClick={() => toggleFeature('enableKds')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  formData.featureFlags.enableKds
                    ? 'bg-blue-500/15 border-blue-500 text-white'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Kitchen Display System (KDS)</span>
                  <span className="text-[10px] text-slate-400">Digital screen for chefs</span>
                </div>
                {formData.featureFlags.enableKds ? (
                  <ToggleRight className="w-6 h-6 text-blue-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-600" />
                )}
              </div>
            </div>
          </div>

          {/* Restaurant Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <span>Restaurant & Tax Details</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Restaurant Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Store Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Google Review URL */}
          <div className="space-y-3 border-t border-slate-700 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>Google Review Automation URL</span>
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Direct Google Place Review Link
              </label>
              <input
                type="url"
                value={formData.googlePlaceReviewUrl}
                onChange={e => setFormData({ ...formData, googlePlaceReviewUrl: e.target.value })}
                placeholder="https://search.google.com/local/writereview?placeid=..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* OpenWA Gateway Configuration */}
          <div className="space-y-3 border-t border-slate-700 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <MessageCircle className="w-4 h-4" />
                <span>OpenWA Gateway (U:\auto-wa\OpenWA)</span>
              </h3>

              <button
                type="button"
                onClick={testOpenWA}
                disabled={testingWA}
                className="flex items-center space-x-1 text-[11px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${testingWA ? 'animate-spin' : ''}`} />
                <span>Test Gateway</span>
              </button>
            </div>

            {openwaStatus && (
              <div
                className={`p-3 rounded-xl border flex items-start space-x-2 text-xs ${
                  openwaStatus.online
                    ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-700 text-amber-300'
                }`}
              >
                {openwaStatus.online ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {openwaStatus.online ? 'OpenWA Gateway Connected' : 'OpenWA Gateway is Offline'}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {openwaStatus.online
                      ? `Session '${formData.openwaConfig.sessionId}' is active on ${formData.openwaConfig.apiUrl}`
                      : 'To send real WhatsApp messages, run: cd U:\\auto-wa\\OpenWA && npm run dev'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">OpenWA API URL</label>
                <input
                  type="text"
                  value={formData.openwaConfig.apiUrl}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      openwaConfig: { ...formData.openwaConfig, apiUrl: e.target.value }
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Session ID</label>
                <input
                  type="text"
                  value={formData.openwaConfig.sessionId}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      openwaConfig: { ...formData.openwaConfig, sessionId: e.target.value }
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>Configuration Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
