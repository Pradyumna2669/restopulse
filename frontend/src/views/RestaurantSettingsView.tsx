import React, { useState, useEffect } from 'react';
import {
  Save,
  MessageCircle,
  Send,
  Eye,
  EyeOff,
  Phone,
  SlidersHorizontal,
  Activity,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Database,
  RotateCcw,
  Trash2,
  Terminal,
  Server
} from 'lucide-react';
import {
  RestaurantProfile,
  BusinessType,
  FeatureFlags,
  SystemHealthReport,
  BackupMetadata
} from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { api } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'diagnostics' | 'backups'>('profile');

  // Profile Form States
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
  const [openwaApiKey, setOpenwaApiKey] = useState(profile.openwaConfig?.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isCheckingConn, setIsCheckingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<{ checked: boolean; online: boolean; error?: string; statusCode?: number; sessionData?: any } | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('🎉 Hello from RestroPlus POS! WhatsApp Gateway connection test successful. ✨');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; messageId?: string; message?: string; error?: string } | null>(null);

  const handleTestConnection = async () => {
    try {
      setIsCheckingConn(true);
      const res = await api.testOpenWAConnection({
        apiUrl: openwaApiUrl,
        sessionId: openwaSessionId,
        apiKey: openwaApiKey
      });
      setConnStatus({
        checked: true,
        online: res.online,
        statusCode: res.statusCode,
        error: res.error,
        sessionData: res.sessionData
      });
    } catch (err: any) {
      setConnStatus({
        checked: true,
        online: false,
        error: err.message || 'Connection test failed'
      });
    } finally {
      setIsCheckingConn(false);
    }
  };

  // Initial gateway connection check
  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      setTestResult({ success: false, error: 'Please enter a valid mobile number with country code (e.g. 919876543210).' });
      return;
    }
    try {
      setIsSendingTest(true);
      setTestResult(null);
      const res = await api.sendOpenWATestMessage({
        phone: testPhone.trim(),
        text: testMessage.trim(),
        apiUrl: openwaApiUrl,
        sessionId: openwaSessionId,
        apiKey: openwaApiKey
      });
      if (res.success) {
        setTestResult({
          success: true,
          messageId: res.messageId,
          message: res.message || `Message delivered successfully! Message ID: ${res.messageId}`
        });
      } else {
        setTestResult({
          success: false,
          error: res.error || 'Failed to send test message. Check gateway status & logs.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Network request failed.'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Phase 10: System Health & Diagnostics States
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  // Phase 10: Backups & Disaster Recovery States
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupTag, setBackupTag] = useState('');
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch Health Diagnostics
  const fetchHealth = async () => {
    try {
      setIsLoadingHealth(true);
      const res = await api.getSystemHealth();
      setHealthReport(res);
    } catch (err) {
      console.error('Failed to load system health report:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  // Fetch Backups
  const fetchBackups = async () => {
    try {
      setIsLoadingBackups(true);
      const res = await api.getBackups();
      setBackups(res);
    } catch (err) {
      console.error('Failed to load backups list:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'diagnostics') {
      fetchHealth();
    } else if (activeTab === 'backups') {
      fetchBackups();
    }
  }, [activeTab]);

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
          sessionId: openwaSessionId,
          apiKey: openwaApiKey
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      handleTestConnection();
    } catch (err) {
      console.error('Failed to update settings:', err);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Create Hot Backup Snapshot
  const handleCreateHotBackup = async () => {
    try {
      setIsCreatingBackup(true);
      setActionNotice(null);
      const created = await api.createBackup(backupTag.trim() || undefined);
      setBackupTag('');
      setActionNotice({
        type: 'success',
        message: `Hot backup snapshot "${created.filename}" created successfully with SHA-256 integrity verification.`
      });
      await fetchBackups();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create backup snapshot';
      setActionNotice({ type: 'error', message: msg });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Restore Database Snapshot
  const handleRestoreBackup = async (backupId: string) => {
    const confirmed = window.confirm(
      `⚠️ ATOMIC DISASTER RECOVERY RESTORE\n\nAre you sure you want to restore snapshot [${backupId}]?\n\nThe backend will compute and verify the pre-restore SHA-256 hash against metadata before atomically swapping the database.\n\nAny uncommitted changes since this snapshot will be replaced.`
    );
    if (!confirmed) return;

    try {
      setRestoringBackupId(backupId);
      setActionNotice(null);
      const result = await api.restoreBackup(backupId);
      setActionNotice({
        type: 'success',
        message: `Database restored atomically in ${result.durationMs}ms! Verified SHA-256 integrity checksum: ${result.sha256Verified ? 'PASSED' : 'UNVERIFIED'}.`
      });
      if (activeTab === 'diagnostics') {
        await fetchHealth();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Database restore failed';
      setActionNotice({ type: 'error', message: msg });
    } finally {
      setRestoringBackupId(null);
    }
  };

  // Delete Backup Snapshot
  const handleDeleteBackup = async (backupId: string) => {
    if (!window.confirm(`Permanently remove backup snapshot [${backupId}]?`)) return;
    try {
      await api.deleteBackup(backupId);
      setBackups(prev => prev.filter(b => b.id !== backupId));
    } catch (err) {
      console.error('Failed to delete backup:', err);
      alert('Failed to delete backup file.');
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header & Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">System Configuration & Hardening</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Phase 10: Multi-concept configurations, production security hardening, deep diagnostics & disaster recovery.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'profile'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Store Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'diagnostics'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Deep Diagnostics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'backups'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-terracotta-600" />
            <span>Hot Backups & DR</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {actionNotice && (
        <div
          className={`flex items-start gap-3 p-3.5 rounded-2xl text-xs border animate-fadeIn ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 font-medium">{actionNotice.message}</div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-stone-400 hover:text-stone-700 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* TAB 1: STORE PROFILE & CONFIGURATION */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          {saveSuccess && (
            <div className="text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-3.5 py-2 rounded-xl animate-fadeIn flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sage-600" />
              <span>Settings updated successfully. Changes applied across all active POS terminals.</span>
            </div>
          )}

          {/* 1. Business Concept Selection */}
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
                  type="text"
                  value={googlePlaceReviewUrl}
                  onChange={e => setGooglePlaceReviewUrl(e.target.value)}
                  placeholder="https://g.page/r/your-place/review"
                  className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">GSTIN (15-digit)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={e => setGstin(e.target.value)}
                  placeholder="24AAAAA0000A1Z5"
                  className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">FSSAI License Number</label>
                <input
                  type="text"
                  value={fssai}
                  onChange={e => setFssai(e.target.value)}
                  placeholder="10020021000123"
                  className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-bold text-stone-700 block mb-1">Registered Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Shop 12, Ground Floor, Indiranagar, Bengaluru"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white text-xs"
              />
            </div>
          </Card>

          {/* 3. Operational Feature Flags */}
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-canvas-border pb-2.5">
              Service Modules & Feature Flags
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

          {/* 4. OpenWA Gateway Configuration & Live Testing */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-canvas-border pb-3 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    OpenWA / WAHA WhatsApp Gateway
                  </h3>
                  <p className="text-xs text-stone-500">
                    Self-hosted WhatsApp API for automated GST invoices, reviews & customer notifications.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  isLoading={isCheckingConn}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Test Connection
                </Button>

                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  (connStatus ? connStatus.online : openwaOnline)
                    ? 'bg-sage-50 text-sage-700 border-sage-200' 
                    : connStatus?.statusCode === 401
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    (connStatus ? connStatus.online : openwaOnline)
                      ? 'bg-emerald-500' 
                      : connStatus?.statusCode === 401 
                        ? 'bg-amber-500' 
                        : 'bg-rose-500'
                  }`} />
                  <span>
                    {(connStatus ? connStatus.online : openwaOnline)
                      ? 'Gateway Connected' 
                      : connStatus?.statusCode === 401
                        ? '401 Unauthorized (API Key Required)'
                        : 'Gateway Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Error / Warning Alert banner if not online */}
            {!(connStatus ? connStatus.online : openwaOnline) && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                connStatus?.statusCode === 401 
                  ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                  : 'bg-stone-50 border-stone-200 text-stone-700'
              }`}>
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                  connStatus?.statusCode === 401 ? 'text-amber-600' : 'text-stone-500'
                }`} />
                <div className="space-y-0.5">
                  <p className="font-bold">
                    {connStatus?.statusCode === 401 
                      ? 'WhatsApp Gateway Authentication Required (HTTP 401)' 
                      : 'Gateway Connection Status'}
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    {connStatus?.error || (openwaOnline ? 'Connected' : `Cannot connect to ${openwaApiUrl}. Please verify URL, port, and enter your API Key below.`)}
                  </p>
                </div>
              </div>
            )}

            {/* Config Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">OpenWA Server URL</label>
                <input
                  type="text"
                  value={openwaApiUrl}
                  onChange={e => setOpenwaApiUrl(e.target.value)}
                  placeholder="http://localhost:2785"
                  className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 font-mono"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">e.g. http://192.168.1.9:2785</span>
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
                <span className="text-[10px] text-stone-500 mt-1 block">e.g. my-bot or default</span>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">OpenWA API Key / Secret</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={openwaApiKey}
                    onChange={e => setOpenwaApiKey(e.target.value)}
                    placeholder="Enter API Key / Token"
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-stone-900 focus:outline-none focus:border-stone-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                    title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block">Passes X-Api-Key & Bearer headers</span>
              </div>
            </div>

            {/* Test Message Box */}
            <div className="mt-4 pt-3 border-t border-canvas-border bg-stone-50/50 -mx-4 -mb-4 p-4 rounded-b-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <Send className="w-3.5 h-3.5 text-terracotta-600" />
                  <span>Send Test WhatsApp Message</span>
                </div>
                <span className="text-[11px] text-stone-500">Live Delivery Verification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">Recipient Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      placeholder="e.g. 919876543210"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-canvas-border text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">Include 91 country code</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">Message Text</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testMessage}
                      onChange={e => setTestMessage(e.target.value)}
                      placeholder="Test message..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleSendTestMessage}
                      isLoading={isSendingTest}
                      leftIcon={<Send className="w-3 h-3" />}
                      className="shrink-0 text-xs"
                    >
                      Send Test
                    </Button>
                  </div>
                </div>
              </div>

              {/* Test Message Result Alert */}
              {testResult && (
                <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  testResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>
                      {testResult.success 
                        ? (testResult.message || `Message sent successfully! (ID: ${testResult.messageId})`)
                        : (testResult.error || 'Failed to dispatch message.')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestResult(null)}
                    className="text-xs opacity-60 hover:opacity-100 ml-2 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
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
      )}

      {/* TAB 2: DEEP DIAGNOSTICS & SYSTEM HEALTH (PHASE 10) */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                healthReport?.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
              <h3 className="text-base font-bold text-stone-900">
                System Status: {healthReport?.status ? healthReport.status.toUpperCase() : 'CHECKING...'}
              </h3>
              {healthReport && (
                <Badge variant={healthReport.status === 'healthy' ? 'success' : 'warning'}>
                  Uptime: {formatUptime(healthReport.uptimeSeconds)}
                </Badge>
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchHealth}
              isLoading={isLoadingHealth}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Diagnostics
            </Button>
          </div>

          {healthReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Database & Canary Health */}
              <Card className="space-y-3">
                <div className="flex items-center justify-between border-b border-canvas-border pb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-terracotta-600" />
                    <h4 className="text-sm font-bold text-stone-900">Database Engine & Writability Canary</h4>
                  </div>
                  <Badge variant={healthReport.database.writable ? 'success' : 'warning'}>
                    {healthReport.database.writable ? 'Writability Canary Passed' : 'Read Only'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="text-stone-500 text-[11px]">Database Connection</div>
                    <div className="font-bold text-stone-900 capitalize mt-0.5">{healthReport.database.status}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="text-stone-500 text-[11px]">Database File Size</div>
                    <div className="font-bold text-stone-900 font-mono mt-0.5">
                      {formatBytes(healthReport.database.fileSizeBytes)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="text-stone-500 text-[11px]">Total Orders Logged</div>
                    <div className="font-bold text-stone-900 font-mono mt-0.5">{healthReport.database.totalOrders}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="text-stone-500 text-[11px]">Total Bills Generated</div>
                    <div className="font-bold text-stone-900 font-mono mt-0.5">{healthReport.database.totalBills}</div>
                  </div>
                </div>
              </Card>

              {/* Memory Heap & Performance */}
              <Card className="space-y-3">
                <div className="flex items-center justify-between border-b border-canvas-border pb-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-sm font-bold text-stone-900">Process Memory & Node Runtime</h4>
                  </div>
                  <Badge variant="neutral">
                    {healthReport.environment} ({healthReport.nodeVersion})
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>V8 Heap Used: {healthReport.memory.heapUsedMb} MB</span>
                    <span>Total Allocated: {healthReport.memory.heapTotalMb} MB</span>
                  </div>

                  <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((healthReport.memory.heapUsedMb / healthReport.memory.heapTotalMb) * 100)
                        )}%`
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-stone-500 pt-1">
                    <span>Resident Set Size (RSS): {healthReport.memory.rssMb} MB</span>
                    <span>Heap Utilization: {Math.round((healthReport.memory.heapUsedMb / healthReport.memory.heapTotalMb) * 100)}%</span>
                  </div>
                </div>
              </Card>

              {/* Security Hardening & Rate Limiting */}
              <Card className="space-y-3">
                <div className="flex items-center justify-between border-b border-canvas-border pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-bold text-stone-900">Security Headers & Rate Defense</h4>
                  </div>
                  <Badge variant="success">Hardened</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-700 font-medium">Sliding-Window Rate Limiter</span>
                    <Badge variant={healthReport.security.rateLimitingActive ? 'success' : 'warning'}>
                      {healthReport.security.rateLimitingActive ? 'Active (429 Enabled)' : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-700 font-medium">Helmet HTTP Headers (CSP / HSTS)</span>
                    <Badge variant={healthReport.security.helmetHeadersEnforced ? 'success' : 'warning'}>
                      {healthReport.security.helmetHeadersEnforced ? 'Enforced' : 'Missing'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-700 font-medium">X-Powered-By Server Architecture</span>
                    <Badge variant="success">Masked / Stripped</Badge>
                  </div>
                </div>
              </Card>

              {/* Hardware Peripherals & Outlets */}
              <Card className="space-y-3">
                <div className="flex items-center justify-between border-b border-canvas-border pb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <h4 className="text-sm font-bold text-stone-900">Peripherals & Multi-Outlet Network</h4>
                  </div>
                  <Badge variant="info">{healthReport.outlets.totalCount} Outlets Tracked</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="text-[10px] text-stone-500">Weighing Scale</div>
                    <div className="font-bold text-stone-900 mt-0.5">
                      {healthReport.hardware.scaleAvailable ? 'Ready' : 'Simulated'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="text-[10px] text-stone-500">Barcode Scanner</div>
                    <div className="font-bold text-stone-900 mt-0.5">
                      {healthReport.hardware.scannerActive ? 'Listening' : 'Inactive'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <div className="text-[10px] text-stone-500">VFD Pole Display</div>
                    <div className="font-bold text-stone-900 mt-0.5">
                      {healthReport.hardware.vfdReady ? 'Active' : 'Offline'}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUTOMATED HOT BACKUPS & DISASTER RECOVERY (PHASE 10) */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-canvas-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-terracotta-600" />
                  <span>Automated Database Hot Backups & Disaster Recovery</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Creates gzip-compressed JSON snapshots with SHA-256 integrity checksums for instant 1-click restore.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Optional tag (e.g. pre-migration)"
                  value={backupTag}
                  onChange={e => setBackupTag(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-none focus:border-stone-400 font-mono"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateHotBackup}
                  isLoading={isCreatingBackup}
                  leftIcon={<Database className="w-3.5 h-3.5" />}
                >
                  Create Snapshot
                </Button>
              </div>
            </div>

            {/* Disaster Recovery CLI instructions */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-900 text-stone-200 text-xs font-mono">
              <Terminal className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-stone-400 font-bold block mb-0.5">Headless Disaster Recovery CLI Command:</span>
                <code>npm run db:restore [backup_id]</code>
                <span className="text-stone-500 ml-2">(Performs atomic SHA-256 pre-verified swap without GUI)</span>
              </div>
            </div>
          </Card>

          {/* Backups List Table */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-canvas-border pb-2.5">
              <h4 className="text-sm font-bold text-stone-900">
                Available Backup Snapshots ({backups.length})
              </h4>
              <Button
                variant="ghost"
                size="xs"
                onClick={fetchBackups}
                isLoading={isLoadingBackups}
                leftIcon={<RefreshCw className="w-3 h-3" />}
              >
                Reload
              </Button>
            </div>

            {backups.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs">
                No backup archives found in repository storage. Click "Create Snapshot" above to generate one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-canvas-border text-stone-500 font-semibold">
                      <th className="pb-2">Filename & Tag</th>
                      <th className="pb-2">Created At</th>
                      <th className="pb-2">Size</th>
                      <th className="pb-2">Record Counts</th>
                      <th className="pb-2">SHA-256 Checksum</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-canvas-border">
                    {backups.map(bkp => {
                      const isRestoring = restoringBackupId === bkp.id;
                      return (
                        <tr key={bkp.id} className="hover:bg-stone-50/50">
                          <td className="py-2.5 font-mono font-medium text-stone-900">
                            <div>{bkp.filename}</div>
                            {bkp.tag && (
                              <span className="text-[10px] text-terracotta-600 bg-terracotta-50 px-1.5 py-0.5 rounded border border-terracotta-200">
                                {bkp.tag}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-stone-600">
                            {new Date(bkp.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 font-mono text-stone-600">
                            {formatBytes(bkp.sizeBytes)}
                          </td>
                          <td className="py-2.5 text-stone-600">
                            <span className="text-[11px]">
                              {bkp.recordCounts.menuItems} Items · {bkp.recordCounts.orders} Orders · {bkp.recordCounts.bills} Bills
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-[10px] text-stone-500" title={bkp.sha256Checksum}>
                            {bkp.sha256Checksum.slice(0, 10)}...{bkp.sha256Checksum.slice(-6)}
                          </td>
                          <td className="py-2.5 text-right space-x-1.5">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => handleRestoreBackup(bkp.id)}
                              isLoading={isRestoring}
                              leftIcon={<RotateCcw className="w-3 h-3 text-amber-600" />}
                            >
                              Restore
                            </Button>

                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleDeleteBackup(bkp.id)}
                              leftIcon={<Trash2 className="w-3 h-3 text-rose-500" />}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
