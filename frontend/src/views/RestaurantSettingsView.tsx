import React, { useState } from 'react';
import {
  Save,
  MessageCircle
} from 'lucide-react';
import { RestaurantProfile, BusinessType, FeatureFlags } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';

interface RestaurantSettingsViewProps {
  profile: RestaurantProfile;
  onUpdateProfile: (updated: Partial<RestaurantProfile>) => Promise<void>;
  openwaOnline?: boolean;
}

const BUSINESS_CONCEPTS: Array<{
  id: BusinessType;
  title: string;
  desc: string;
  icon: string;
}> = [
  { id: 'cafe', title: 'Café & Coffee Shop', desc: 'Espresso bar, breakfast, light bites & counter pickup', icon: '☕' },
  { id: 'bakery', title: 'Bakery & Patisserie', desc: 'Pastries, breads, sweets & takeaway boxes', icon: '🥐' },
  { id: 'restaurant', title: 'Casual Dining', desc: 'Multi-course dining, table service & family seating', icon: '🍽️' },
  { id: 'fine_dining', title: 'Fine Dining Restaurant', desc: 'Premium courses, reservations & wine pairings', icon: '🍷' },
  { id: 'fast_food', title: 'Fast Food / QSR', desc: 'High-speed counter token queue & delivery', icon: '🍔' },
  { id: 'bar', title: 'Bar & Lounge', desc: 'Cocktails, beverages & evening floor service', icon: '🍸' }
];

export const RestaurantSettingsView: React.FC<RestaurantSettingsViewProps> = ({
  profile,
  onUpdateProfile,
  openwaOnline = false
}) => {
  const [businessType, setBusinessType] = useState<BusinessType>(profile.businessType || 'cafe');
  const [name, setName] = useState(profile.name || 'The Daily Grind');
  const [tagline, setTagline] = useState(profile.tagline || 'Good coffee. Slow mornings.');
  const [openingHours, setOpeningHours] = useState(profile.openingHours || '09:00 – 22:00');
  const [address, setAddress] = useState(profile.address || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [gstin, setGstin] = useState(profile.gstin || '');
  const [fssai, setFssai] = useState(profile.fssai || '');
  const [currencySymbol, setCurrencySymbol] = useState(profile.currencySymbol || '₹');
  const [googlePlaceReviewUrl, setGooglePlaceReviewUrl] = useState(profile.googlePlaceReviewUrl || '');

  // Feature Flags
  const [flags, setFlags] = useState<FeatureFlags>(profile.featureFlags);

  // OpenWA config
  const [openwaApiUrl, setOpenwaApiUrl] = useState(profile.openwaConfig?.apiUrl || 'http://localhost:2785');
  const [openwaSessionId, setOpenwaSessionId] = useState(profile.openwaConfig?.sessionId || 'default');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onUpdateProfile({
        name,
        tagline,
        businessType,
        openingHours,
        address,
        phone,
        gstin,
        fssai,
        currencySymbol,
        googlePlaceReviewUrl,
        featureFlags: flags,
        openwaConfig: {
          ...profile.openwaConfig,
          apiUrl: openwaApiUrl,
          sessionId: openwaSessionId
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Platform Configuration & Concept</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure your business model, store operating hours, billing feature flags and WhatsApp gateway.
          </p>
        </div>

        {saveSuccess && (
          <div className="text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-3.5 py-1.5 rounded-full animate-fadeIn">
            ✓ Settings saved successfully
          </div>
        )}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* 1. Business Concept Selection (Café vs Restaurant vs Fine Dining) */}
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-stone-900 border-b border-canvas-border pb-2.5">
            Business Concept & Operating Model
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {BUSINESS_CONCEPTS.map(concept => {
              const isSelected = businessType === concept.id;
              return (
                <div
                  key={concept.id}
                  onClick={() => setBusinessType(concept.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-terracotta-500 bg-terracotta-50/30 shadow-sm'
                      : 'border-canvas-border hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="text-2xl mb-1.5">{concept.icon}</div>
                  <h4 className="text-xs font-bold text-stone-900">{concept.title}</h4>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">{concept.desc}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 2. Store Profile & Operating Hours */}
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-stone-900 border-b border-canvas-border pb-2.5">
            Store Profile & Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Business Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="The Daily Grind"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Tagline / Location</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="Good coffee. Slow mornings."
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Operating Hours</label>
              <input
                type="text"
                value={openingHours}
                onChange={e => setOpeningHours(e.target.value)}
                placeholder="09:00 – 22:00"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Currency Symbol</label>
              <input
                type="text"
                value={currencySymbol}
                onChange={e => setCurrencySymbol(e.target.value)}
                placeholder="₹, $, €, £"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Google Review URL</label>
              <input
                type="url"
                value={googlePlaceReviewUrl}
                onChange={e => setGooglePlaceReviewUrl(e.target.value)}
                placeholder="https://search.google.com/local/writereview?placeid=..."
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-stone-700 block mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Shop 14-16, Food District, City Center"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">GSTIN</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                placeholder="24AAAAA0000A1Z5"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">FSSAI License #</label>
              <input
                type="text"
                value={fssai}
                onChange={e => setFssai(e.target.value)}
                placeholder="10019021000456"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
              />
            </div>
          </div>
        </Card>

        {/* 3. Feature Flags & Operational Modes */}
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-stone-900 border-b border-canvas-border pb-2.5">
            Order Modes & Automation
          </h3>

          <div className="divide-y divide-canvas-border">
            <ToggleSwitch
              checked={flags.enableDineIn}
              onChange={val => setFlags({ ...flags, enableDineIn: val })}
              label="Dine-In Floor Service"
              description="Enable table selector and running floor orders in POS terminal."
            />

            <ToggleSwitch
              checked={flags.enableTakeaway}
              onChange={val => setFlags({ ...flags, enableTakeaway: val })}
              label="Takeaway Pickup Tokens"
              description="Issue sequential pickup tokens (#TK-01) for counter guests."
            />

            <ToggleSwitch
              checked={flags.enableDelivery}
              onChange={val => setFlags({ ...flags, enableDelivery: val })}
              label="Rider Delivery Fleet"
              description="Enable dispatch board and driver assignment for home deliveries."
            />

            <ToggleSwitch
              checked={flags.enableQrOrdering}
              onChange={val => setFlags({ ...flags, enableQrOrdering: val })}
              label="Contactless QR Table Ordering"
              description="Allow diners to scan table QR code and fire orders directly to kitchen."
            />

            <ToggleSwitch
              checked={flags.enableWhatsAppInvoice}
              onChange={val => setFlags({ ...flags, enableWhatsAppInvoice: val })}
              label="Automated WhatsApp Invoicing"
              description="Send digital GST tax invoice PDF/text via self-hosted OpenWA gateway."
            />
          </div>
        </Card>

        {/* 4. OpenWA Gateway Configuration */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-canvas-border pb-2.5">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>OpenWA WhatsApp Self-Hosted Gateway</span>
            </h3>

            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              openwaOnline ? 'bg-sage-50 text-sage-700 border-sage-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${openwaOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{openwaOnline ? 'Gateway Connected' : 'Offline (Port 2785)'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-stone-700 block mb-1">OpenWA Server URL</label>
              <input
                type="text"
                value={openwaApiUrl}
                onChange={e => setOpenwaApiUrl(e.target.value)}
                placeholder="http://localhost:2785"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Session Identifier</label>
              <input
                type="text"
                value={openwaSessionId}
                onChange={e => setOpenwaSessionId(e.target.value)}
                placeholder="default"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 font-mono"
              />
            </div>
          </div>
        </Card>

        {/* Submit Bar */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
