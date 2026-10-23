import React, { useState, useEffect } from 'react';
import {
  CustomerProfile,
  DeliveryPartnerConfig,
  DeliveryPartner,
  ReconciliationReport,
  WebhookDeliveryLog,
  MarketingCampaign,
  CustomerFeedback,
  AutomatedTriggerConfig,
  NpsSummaryReport,
  RfmSegment
} from '../types';
import { ApiService, api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import {
  Search,
  UserPlus,
  Crown,
  Award,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Heart,
  FileText,
  Save,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  Copy,
  Check,
  Users,
  X,
  Receipt,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Scale,
  Megaphone,
  Star,
  Gift,
  Send,
  Trash2,
  Clock
} from 'lucide-react';

interface CustomerCrmViewProps {
  currencySymbol: string;
  onSelectCustomer?: (customer: CustomerProfile) => void;
  onOrderSimulated?: () => void;
}

export const CustomerCrmView: React.FC<CustomerCrmViewProps> = ({
  currencySymbol,
  onSelectCustomer,
  onOrderSimulated
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'campaigns' | 'feedback' | 'automations' | 'partners' | 'reconciliation'>('directory');
  
  // Phase 11: Reelo Marketing Campaigns, RFM & Feedback States
  const [rfmSummary, setRfmSummary] = useState<Record<RfmSegment | 'all', number>>({ all: 0, champions: 0, loyal: 0, at_risk: 0, dormant: 0, new: 0 });
  const [rfmSegmentFilter, setRfmSegmentFilter] = useState<'all' | RfmSegment>('all');
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState<string | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);
  
  // Campaign Form State
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignSegment, setCampaignSegment] = useState<'all' | RfmSegment>('all');
  const [campaignDiscount, setCampaignDiscount] = useState<number>(20);
  const [campaignOfferCode, setCampaignOfferCode] = useState('SPECIAL20');
  const [campaignTemplate, setCampaignTemplate] = useState('🍽️ *SPECIAL OFFER AT {{restaurantName}}!*\n\nHey {{name}},\nEnjoy *{{discount}}% OFF* your next meal with code *{{offerCode}}*. You also have *{{points}} loyalty points* available! ✨\n\nSee you soon!');
  
  // Feedback & NPS States
  const [npsReport, setNpsReport] = useState<NpsSummaryReport | null>(null);
  const [isRecordingFeedback, setIsRecordingFeedback] = useState(false);
  const [fbPhone, setFbPhone] = useState('');
  const [fbName, setFbName] = useState('');
  const [fbRating, setFbRating] = useState<number>(5);
  const [fbText, setFbText] = useState('');
  const [fbTags, setFbTags] = useState('food, service');
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string | null>(null);

  // Marketing Automations State
  const [automations, setAutomations] = useState<AutomatedTriggerConfig | null>(null);
  const [isRunningDailyAutomations, setIsRunningDailyAutomations] = useState(false);
  const [automationRunResult, setAutomationRunResult] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartnerConfig[]>([]);
  const [reconciliationReport, setReconciliationReport] = useState<ReconciliationReport | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookDeliveryLog[]>([]);
  const [isLoadingRecon, setIsLoadingRecon] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [manualPoints, setManualPoints] = useState<number>(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [simulationAlert, setSimulationAlert] = useState<string | null>(null);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newPoints, setNewPoints] = useState(25); // Welcome bonus

  useEffect(() => {
    loadCustomers();
    loadDeliveryPartners();
    loadMarketingData();
  }, []);

  useEffect(() => {
    if (activeTab === 'reconciliation') {
      loadReconciliation();
    } else if (activeTab === 'campaigns') {
      loadCampaigns();
    } else if (activeTab === 'feedback') {
      loadFeedback();
    } else if (activeTab === 'automations') {
      loadAutomations();
    }
  }, [activeTab]);

  const loadMarketingData = async () => {
    try {
      const segData = await api.getMarketingSegments();
      setRfmSummary(segData.summary);
    } catch (e) {
      console.error('Failed to load RFM segments:', e);
    }
  };

  const loadCampaigns = async () => {
    try {
      const data = await api.getMarketingCampaigns();
      setCampaigns(data);
      loadMarketingData();
    } catch (e) {
      console.error('Failed to load campaigns:', e);
    }
  };

  const loadFeedback = async () => {
    try {
      const report = await api.getFeedbackSummary();
      setNpsReport(report);
    } catch (e) {
      console.error('Failed to load feedback report:', e);
    }
  };

  const loadAutomations = async () => {
    try {
      const config = await api.getMarketingAutomations();
      setAutomations(config);
    } catch (e) {
      console.error('Failed to load marketing automations:', e);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMarketingCampaign({
        title: campaignTitle,
        type: 'whatsapp',
        targetSegment: campaignSegment,
        discountPercent: campaignDiscount,
        offerCode: campaignOfferCode,
        templateMessage: campaignTemplate
      });
      setIsCreatingCampaign(false);
      setCampaignTitle('');
      loadCampaigns();
      setBroadcastResult('Campaign created successfully!');
      setTimeout(() => setBroadcastResult(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to create campaign');
    }
  };

  const handleBroadcastCampaign = async (campaignId: string) => {
    try {
      setIsBroadcasting(campaignId);
      const res = await api.broadcastCampaign(campaignId);
      setBroadcastResult(`Broadcast Complete! Delivered: ${res.deliveredCount}, Failed: ${res.failedCount} (${res.recipientCount} Total)`);
      loadCampaigns();
      setTimeout(() => setBroadcastResult(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Broadcast failed');
    } finally {
      setIsBroadcasting(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.deleteMarketingCampaign(campaignId);
      loadCampaigns();
    } catch (err: any) {
      alert('Failed to delete campaign');
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbPhone) return alert('Phone number required');
    try {
      const tagsArray = fbTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await api.submitCustomerFeedback({
        customerPhone: fbPhone,
        customerName: fbName || 'Guest',
        rating: fbRating,
        feedbackText: fbText,
        tags: tagsArray
      });
      setIsRecordingFeedback(false);
      setFbPhone('');
      setFbName('');
      setFbText('');
      loadFeedback();
      if (res.isPromoter && res.googleReviewUrl) {
        setFeedbackSuccessMsg(`5-Star Feedback Logged! Customer will be nudged to Google Reviews: ${res.googleReviewUrl}`);
      } else if (res.managerAlertTriggered) {
        setFeedbackSuccessMsg('Low rating logged. Alert placed in manager audit trail for service recovery.');
      } else {
        setFeedbackSuccessMsg('Customer feedback recorded successfully!');
      }
      setTimeout(() => setFeedbackSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    }
  };

  const handleResolveFeedback = async (feedbackId: string) => {
    const notes = prompt('Enter manager resolution notes (e.g. Spoke with guest, offered voucher):');
    if (!notes) return;
    try {
      await api.resolveCustomerFeedback(feedbackId, notes);
      loadFeedback();
    } catch (err: any) {
      alert('Failed to resolve feedback');
    }
  };

  const handleSaveAutomations = async () => {
    if (!automations) return;
    try {
      await api.updateMarketingAutomations(automations);
      alert('Automated Marketing Journeys updated successfully!');
    } catch (err: any) {
      alert('Failed to update automations');
    }
  };

  const handleTriggerDailyAutomations = async () => {
    try {
      setIsRunningDailyAutomations(true);
      const res = await api.triggerMarketingAutomationsDaily();
      setAutomationRunResult(`Daily Journey Run Complete! Sent ${res.birthdaysTriggered} birthday perks and ${res.winbackTriggered} win-back vouchers.`);
      setTimeout(() => setAutomationRunResult(null), 6000);
    } catch (err: any) {
      alert('Failed to run daily automations');
    } finally {
      setIsRunningDailyAutomations(false);
    }
  };

  const loadReconciliation = async () => {
    setIsLoadingRecon(true);
    try {
      const [report, logs] = await Promise.all([
        ApiService.getReconciliationReport(),
        ApiService.getWebhookLogs(50)
      ]);
      setReconciliationReport(report);
      setWebhookLogs(logs);
    } catch (err) {
      console.error('Failed to load reconciliation report:', err);
    } finally {
      setIsLoadingRecon(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await ApiService.getCustomers();
      setCustomers(data);
      if (data.length > 0 && !selectedCustomer) {
        setSelectedCustomer(data[0]);
        setEditNotes(data[0].notes || '');
        setManualPoints(data[0].loyaltyPoints);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const loadDeliveryPartners = async () => {
    try {
      const data = await ApiService.getDeliveryPartners();
      setDeliveryPartners(data);
    } catch (err) {
      console.error('Failed to load delivery partners:', err);
    }
  };

  const handleSelectCustomer = (c: CustomerProfile) => {
    setSelectedCustomer(c);
    setEditNotes(c.notes || '');
    setManualPoints(c.loyaltyPoints);
    setIsAddingNew(false);
  };

  const handleSaveCustomerUpdates = async () => {
    if (!selectedCustomer) return;
    try {
      const updated = await ApiService.upsertCustomer({
        phone: selectedCustomer.phone,
        notes: editNotes,
        loyaltyPoints: manualPoints
      });
      setCustomers(prev => prev.map(c => (c.phone === updated.phone ? updated : c)));
      setSelectedCustomer(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update customer:', err);
    }
  };

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone) return;
    try {
      const created = await ApiService.upsertCustomer({
        phone: newPhone,
        name: newName || 'Valued Guest',
        email: newEmail,
        notes: newNotes,
        loyaltyPoints: Number(newPoints) || 0
      });
      setCustomers(prev => [created, ...prev.filter(c => c.phone !== created.phone)]);
      setSelectedCustomer(created);
      setEditNotes(created.notes || '');
      setManualPoints(created.loyaltyPoints);
      setIsAddingNew(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewNotes('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to create customer:', err);
    }
  };

  const handleTogglePartner = async (partner: DeliveryPartner, enabled: boolean) => {
    try {
      const updated = await ApiService.updateDeliveryPartner(partner, { enabled });
      setDeliveryPartners(prev => prev.map(p => (p.partner === partner ? updated : p)));
    } catch (err) {
      console.error('Failed to toggle partner:', err);
    }
  };

  const handleUpdatePartnerField = async (partner: DeliveryPartner, field: keyof DeliveryPartnerConfig, value: any) => {
    try {
      const updated = await ApiService.updateDeliveryPartner(partner, { [field]: value });
      setDeliveryPartners(prev => prev.map(p => (p.partner === partner ? updated : p)));
    } catch (err) {
      console.error('Failed to update partner config:', err);
    }
  };

  const handleSimulateInboundOrder = async (partner: DeliveryPartner) => {
    try {
      const res = await ApiService.simulatePartnerOrder(partner);
      if (res.success) {
        setSimulationAlert(
          `⚡ Simulated ${partner.toUpperCase()} order #${res.order?.orderNumber || 'ORD'} injected into KDS & Dispatch!`
        );
        if (onOrderSimulated) {
          onOrderSimulated();
        }
        await loadCustomers();
        setTimeout(() => setSimulationAlert(null), 5000);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
      alert('Order simulation failed. Ensure backend server is running on port 5000.');
    }
  };

  const handleCopyWebhook = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Calculations & Filtering
  const vipCount = customers.filter(c => c.tier === 'VIP Platinum' || c.tier === 'Gold').length;
  const totalPointsSum = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
  const totalSpendSum = customers.reduce((sum, c) => sum + c.totalSpend, 0);

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(q) || c.phone.includes(q);
    const matchesTier = selectedTierFilter === 'all' || c.tier === selectedTierFilter;
    const matchesChannel =
      selectedChannelFilter === 'all' ||
      (selectedChannelFilter === 'direct' && (!c.channel || c.channel === 'direct')) ||
      c.channel === selectedChannelFilter;
    const matchesRfm = rfmSegmentFilter === 'all' || c.rfmSegment === rfmSegmentFilter;
    return matchesSearch && matchesTier && matchesChannel && matchesRfm;
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'VIP Platinum':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Crown className="w-3 h-3 mr-1 text-purple-600" />
            VIP Platinum
          </span>
        );
      case 'Gold':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Award className="w-3 h-3 mr-1 text-amber-600" />
            Gold Member
          </span>
        );
      case 'Silver':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
            Silver
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Bronze
          </span>
        );
    }
  };


  const getRfmBadge = (segment?: RfmSegment) => {
    switch (segment) {
      case 'champions':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">🌟 Champion</span>;
      case 'loyal':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">🔁 Loyal</span>;
      case 'at_risk':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">⚠️ At-Risk</span>;
      case 'dormant':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">💤 Dormant</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">🆕 New Guest</span>;
    }
  };

  const getChannelBadge = (channel?: DeliveryPartner) => {
    switch (channel) {
      case 'zomato':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">🔴 Zomato</span>;
      case 'swiggy':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">🟠 Swiggy</span>;
      case 'ondc':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">🔵 ONDC</span>;
      case 'magicpin':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">🟣 Magicpin</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-50 text-sage-800 border border-sage-200">🟢 In-House</span>;
    }
  };

  const activePartnersCount = deliveryPartners.filter(p => p.enabled).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Campaign Broadcast Alert */}
      {broadcastResult && (
        <div className="bg-emerald-50 border border-emerald-300 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-emerald-800 shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-bold">{broadcastResult}</span>
          </div>
          <button onClick={() => setBroadcastResult(null)} className="text-emerald-600 hover:text-emerald-900 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Feedback Alert */}
      {feedbackSuccessMsg && (
        <div className="bg-blue-50 border border-blue-300 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-blue-800 shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <Star className="w-4 h-4 text-blue-600" />
            <span className="font-bold">{feedbackSuccessMsg}</span>
          </div>
          <button onClick={() => setFeedbackSuccessMsg(null)} className="text-blue-600 hover:text-blue-900 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Automation Alert */}
      {automationRunResult && (
        <div className="bg-purple-50 border border-purple-300 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-purple-800 shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="font-bold">{automationRunResult}</span>
          </div>
          <button onClick={() => setAutomationRunResult(null)} className="text-purple-600 hover:text-purple-900 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Simulation Banner Notification */}
      {simulationAlert && (
        <div className="bg-sage-50 border border-sage-300 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-sage-800 shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <Zap className="w-4 h-4 text-sage-600 animate-bounce" />
            <span className="font-bold">{simulationAlert}</span>
          </div>
          <button
            onClick={() => setSimulationAlert(null)}
            className="text-sage-600 hover:text-sage-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-canvas-border shadow-sm">
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'directory'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Guest CRM Directory</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'directory' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {customers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'campaigns'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>WhatsApp Campaigns</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'campaigns' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {campaigns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'feedback'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Feedback & NPS</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'feedback' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {npsReport?.totalResponses || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('automations')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'automations'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Automations</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'automations' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              Reelo
            </span>
          </button>

          <button
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'partners'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Delivery Partners</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'partners' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {activePartnersCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'reconciliation'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Payout Reconciliation & Webhooks</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'reconciliation' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              Finance
            </span>
          </button>
        </div>

        {activeTab === 'directory' && (
          <Button
            variant="primary"
            onClick={() => {
              setIsAddingNew(true);
              setSelectedCustomer(null);
            }}
            className="flex items-center space-x-1.5 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Guest</span>
          </Button>
        )}

        {activeTab === 'reconciliation' && (
          <Button
            variant="secondary"
            onClick={loadReconciliation}
            disabled={isLoadingRecon}
            className="flex items-center space-x-1.5 shrink-0 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecon ? 'animate-spin' : ''}`} />
            <span>Refresh Reconciliation</span>
          </Button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GUEST CRM DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Analytics KPI Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-canvas-200 text-stone-800 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Registered Diners
                </span>
                <span className="text-xl font-black text-stone-900 font-mono">
                  {customers.length} Guests
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  VIP & Gold Patrons
                </span>
                <span className="text-xl font-black text-purple-700 font-mono">
                  {vipCount} Members
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Loyalty Points Pool
                </span>
                <span className="text-xl font-black text-amber-700 font-mono">
                  {totalPointsSum.toLocaleString()} Pts
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-sage-50 text-sage-700 border border-sage-200 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Lifetime Diner Spend
                </span>
                <span className="text-xl font-black text-stone-900 font-mono">
                  {currencySymbol}{totalSpendSum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </Card>
          </div>

          {/* Two-Column Master-Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Search & Customer Directory (5 cols) */}
            <Card className="lg:col-span-5 space-y-4 !p-4 flex flex-col max-h-[800px]">
              {/* Search & Filters */}
              <div className="space-y-3 pb-3 border-b border-canvas-border">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search guest by name or mobile..."
                    className="w-full bg-canvas-100 border border-canvas-border rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
                  />
                </div>

                {/* Channel Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] pb-1">
                  {[
                    { key: 'all', label: 'All Channels' },
                    { key: 'direct', label: '🟢 Dine-In' },
                    { key: 'zomato', label: '🔴 Zomato' },
                    { key: 'swiggy', label: '🟠 Swiggy' },
                    { key: 'ondc', label: '🔵 ONDC' }
                  ].map(ch => (
                    <button
                      key={ch.key}
                      onClick={() => setSelectedChannelFilter(ch.key)}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                        selectedChannelFilter === ch.key
                          ? 'bg-stone-900 text-white'
                          : 'bg-canvas-100 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>

                {/* Loyalty Tier Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px]">
                  {[
                    { key: 'all', label: 'All Tiers' },
                    { key: 'VIP Platinum', label: '👑 Platinum' },
                    { key: 'Gold', label: '🥇 Gold' },
                    { key: 'Silver', label: '🥈 Silver' },
                    { key: 'Bronze', label: '🥉 Bronze' }
                  ].map(tier => (
                    <button
                      key={tier.key}
                      onClick={() => setSelectedTierFilter(tier.key)}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                        selectedTierFilter === tier.key
                          ? 'bg-amber-600 text-white'
                          : 'bg-canvas-100 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>

                {/* RFM Lifecycle Segment Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] pt-1">
                  {[
                    { key: 'all', label: 'All Segments' },
                    { key: 'champions', label: '🏆 Champions' },
                    { key: 'loyal', label: '💎 Loyal' },
                    { key: 'new', label: '🌱 New' },
                    { key: 'at_risk', label: '⚠️ At Risk' },
                    { key: 'dormant', label: '💤 Dormant' }
                  ].map(seg => (
                    <button
                      key={seg.key}
                      onClick={() => setRfmSegmentFilter(seg.key as any)}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                        rfmSegmentFilter === seg.key
                          ? 'bg-purple-600 text-white'
                          : 'bg-canvas-100 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {seg.label} {rfmSummary[seg.key as keyof typeof rfmSummary] ? `(${rfmSummary[seg.key as keyof typeof rfmSummary]})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer List */}
              <div className="overflow-y-auto flex-1 divide-y divide-canvas-border space-y-1">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-xs">
                    No matching customer profiles found.
                  </div>
                ) : (
                  filtered.map(c => {
                    const isSelected = selectedCustomer?.phone === c.phone && !isAddingNew;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between ${
                          isSelected
                            ? 'bg-stone-900 text-white shadow-sm'
                            : 'hover:bg-canvas-50 text-stone-900'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-xs font-bold truncate">{c.name}</h4>
                            {getChannelBadge(c.channel)}
                          </div>
                          <div
                            className={`flex items-center space-x-2 text-[11px] mt-1 ${
                              isSelected ? 'text-stone-300' : 'text-stone-500'
                            }`}
                          >
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 opacity-70" />
                              <span className="font-mono">{c.phone}</span>
                            </span>
                            <span>•</span>
                            <span>{c.visitsCount} visits</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-bold font-mono block ${
                              isSelected ? 'text-amber-300' : 'text-amber-700'
                            }`}
                          >
                            {c.loyaltyPoints} Pts
                          </span>
                          <span
                            className={`text-[10px] font-mono ${
                              isSelected ? 'text-stone-300' : 'text-stone-400'
                            }`}
                          >
                            {currencySymbol}{c.totalSpend.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Right Column: Profile Detail or Enrollment Form (7 cols) */}
            <div className="lg:col-span-7">
              {isAddingNew ? (
                <Card className="space-y-5">
                  <div className="border-b border-canvas-border pb-3">
                    <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                      <UserPlus className="w-5 h-5 text-terracotta-600" />
                      <span>Enroll New Guest in CRM</span>
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Create customer loyalty profile for automatic digital receipts and visit rewards.
                    </p>
                  </div>

                  <form onSubmit={handleCreateNewCustomer} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Guest Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          placeholder="e.g. Ramesh Patel"
                          className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Mobile Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={newPhone}
                          onChange={e => setNewPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          placeholder="ramesh@gmail.com"
                          className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Welcome Bonus Points
                        </label>
                        <input
                          type="number"
                          value={newPoints}
                          onChange={e => setNewPoints(Number(e.target.value))}
                          className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">
                        Preferences & Dietary Notes
                      </label>
                      <textarea
                        rows={3}
                        value={newNotes}
                        onChange={e => setNewNotes(e.target.value)}
                        placeholder="e.g. Prefers window table, allergic to peanuts, oat milk preference..."
                        className="w-full bg-canvas-100 border border-canvas-border rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400 resize-none"
                      />
                    </div>

                    <div className="flex items-center space-x-3 pt-2">
                      <Button variant="primary" type="submit" className="flex items-center space-x-1.5">
                        <Save className="w-4 h-4" />
                        <span>Save & Enroll Guest</span>
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setIsAddingNew(false);
                          if (customers.length > 0) setSelectedCustomer(customers[0]);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : selectedCustomer ? (
                <Card className="space-y-6">
                  {/* Header Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-canvas-50 border border-canvas-border">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-black text-lg shrink-0">
                        {selectedCustomer.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-stone-900">{selectedCustomer.name}</h3>
                          {getTierBadge(selectedCustomer.tier)}
                          {getChannelBadge(selectedCustomer.channel)}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1">
                          <span className="flex items-center space-x-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-stone-400" />
                            <span>{selectedCustomer.phone}</span>
                          </span>
                          {selectedCustomer.email && (
                            <>
                              <span>•</span>
                              <span className="flex items-center space-x-1">
                                <Mail className="w-3.5 h-3.5 text-stone-400" />
                                <span>{selectedCustomer.email}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {onSelectCustomer && (
                      <Button
                        variant="secondary"
                        onClick={() => onSelectCustomer(selectedCustomer)}
                        className="self-start sm:self-auto text-xs"
                      >
                        Use for Order
                      </Button>
                    )}
                  </div>

                  {/* 3 Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-canvas-50 border border-canvas-border rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-stone-500 flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>Loyalty Wallet</span>
                      </span>
                      <span className="text-2xl font-black text-amber-700 font-mono block">
                        {selectedCustomer.loyaltyPoints} Pts
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono block">
                        Cash Value: {currencySymbol}{selectedCustomer.loyaltyPoints.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-canvas-50 border border-canvas-border rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-stone-500 flex items-center space-x-1">
                        <DollarSign className="w-3.5 h-3.5 text-sage-600" />
                        <span>Lifetime Spend</span>
                      </span>
                      <span className="text-2xl font-black text-stone-900 font-mono block">
                        {currencySymbol}{selectedCustomer.totalSpend.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono block">
                        Avg: {currencySymbol}{(selectedCustomer.totalSpend / Math.max(1, selectedCustomer.visitsCount)).toFixed(0)} / visit
                      </span>
                    </div>

                    <div className="bg-canvas-50 border border-canvas-border rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-stone-500 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>Visits & Frequency</span>
                      </span>
                      <span className="text-2xl font-black text-stone-900 font-mono block">
                        {selectedCustomer.visitsCount} Visits
                      </span>
                      <span className="text-[10px] text-stone-400 truncate block">
                        Last visit: {new Date(selectedCustomer.lastVisit).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Frequently Ordered Dishes */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span>Favorite & Frequently Ordered Dishes</span>
                    </h4>
                    {selectedCustomer.favoriteItems && selectedCustomer.favoriteItems.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomer.favoriteItems.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-canvas-100 text-stone-800 border border-canvas-border rounded-xl text-xs font-medium"
                          >
                            🍲 {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 italic">
                        Ordered dishes are automatically logged when orders are settled.
                      </p>
                    )}
                  </div>

                  {/* Profile Notes & Points Override */}
                  <div className="space-y-3 pt-3 border-t border-canvas-border">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-terracotta-600" />
                        <span>Guest Notes & Points Adjustment</span>
                      </h4>
                      {saveSuccess && (
                        <span className="text-xs text-sage-700 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
                          <span>Changes saved successfully</span>
                        </span>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="Special instructions, dietary needs, VIP preferences..."
                      className="w-full bg-canvas-100 border border-canvas-border rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400 resize-none"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-stone-500 font-medium">Manual Points Override:</span>
                        <input
                          type="number"
                          value={manualPoints}
                          onChange={e => setManualPoints(Number(e.target.value))}
                          className="w-24 bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-1.5 text-xs text-stone-900 font-mono text-center focus:outline-none focus:border-stone-400"
                        />
                      </div>

                      <Button
                        variant="primary"
                        onClick={handleSaveCustomerUpdates}
                        className="flex items-center justify-center space-x-1.5 !py-2 !text-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Updates</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="py-16 text-center text-stone-400 text-xs">
                  Select a guest from the left directory to view full profile details.
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DELIVERY PARTNERS INTEGRATION */}
      {/* ========================================================================= */}
      {activeTab === 'partners' && (
        <div className="space-y-6">
          <Card className="!p-4 bg-gradient-to-r from-canvas-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-terracotta-600" />
                  <span>Food Delivery Aggregators & Webhook Endpoints</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Connect direct webhook feeds from Zomato, Swiggy, ONDC, and Magicpin for automatic KDS injection and order tagging.
                </p>
              </div>
              <Badge variant="terracotta">4 Supported Aggregators</Badge>
            </div>
          </Card>

          {/* Aggregator Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deliveryPartners.map(p => {
              const webhookUrl = `${window.location.origin}/api/webhooks/aggregators/${p.partner}`;
              const isCopied = copiedKey === p.partner;

              return (
                <Card
                  key={p.partner}
                  className={`space-y-4 transition-all ${
                    p.enabled
                      ? 'border-canvas-border'
                      : 'opacity-65 bg-canvas-50'
                  }`}
                >
                  {/* Header Row: Logo, Name & Enable Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {p.partner === 'zomato' ? '🔴' : p.partner === 'swiggy' ? '🟠' : p.partner === 'ondc' ? '🔵' : '🟣'}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{p.name}</h4>
                        <span className={`text-[10px] font-bold ${p.enabled ? 'text-sage-700' : 'text-stone-400'}`}>
                          {p.enabled ? '● Channel Active & Listening' : '○ Channel Paused'}
                        </span>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={e => handleTogglePartner(p.partner, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-stone-900"></div>
                    </label>
                  </div>

                  {/* Partner Configuration Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                        Merchant Store ID
                      </label>
                      <input
                        type="text"
                        value={p.storeId}
                        onChange={e => handleUpdatePartnerField(p.partner, 'storeId', e.target.value)}
                        className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                        Aggregator Commission % Rate
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={p.commissionPercent}
                          onChange={e => handleUpdatePartnerField(p.partner, 'commissionPercent', Number(e.target.value))}
                          className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-1.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Inbound Webhook URL */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                      Inbound Webhook Endpoint
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={webhookUrl}
                        className="flex-1 bg-canvas-100 border border-canvas-border rounded-xl px-3 py-1.5 text-[11px] text-stone-600 font-mono select-all focus:outline-none"
                      />
                      <Button
                        variant="secondary"
                        onClick={() => handleCopyWebhook(webhookUrl, p.partner)}
                        className="!p-2 shrink-0"
                        title="Copy Webhook URL"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-sage-600" /> : <Copy className="w-3.5 h-3.5 text-stone-600" />}
                      </Button>
                    </div>
                  </div>

                  {/* Auto-Accept & Simulation Button Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-canvas-border">
                    <label className="flex items-center space-x-2 cursor-pointer text-xs text-stone-700">
                      <input
                        type="checkbox"
                        checked={p.autoAcceptOrders}
                        onChange={e => handleUpdatePartnerField(p.partner, 'autoAcceptOrders', e.target.checked)}
                        className="rounded bg-canvas-100 border-canvas-border text-stone-900 focus:ring-0"
                      />
                      <span className="text-xs font-semibold">Auto-Accept Inbound Orders</span>
                    </label>

                    <Button
                      variant="primary"
                      onClick={() => handleSimulateInboundOrder(p.partner)}
                      className="flex items-center justify-center space-x-1.5 !py-1.5 !text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-terracotta-200" />
                      <span>Simulate Inbound Order</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AGGREGATOR PAYOUT RECONCILIATION & WEBHOOK SECURITY AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="bg-stone-900 text-stone-100 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-terracotta-400" />
                <h3 className="text-sm font-bold tracking-tight text-white">
                  Financial Reconciliation & Aggregator Ledger Engine
                </h3>
              </div>
              <p className="text-xs text-stone-400 max-w-2xl">
                Real-time calculation of platform commissions, statutory 18% GST on aggregator service fees, 
                and 1% Tax Collected at Source (TCS) under CGST Section 52. Verified against HMAC-SHA256 authenticated webhooks.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-stone-800 border border-stone-700 text-stone-300 font-mono">
                {webhookLogs.length} Webhook Events Logged
              </span>
            </div>
          </div>

          {/* KPI Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-canvas-200 text-stone-800 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Gross Online Orders
                </span>
                <span className="text-xl font-black text-stone-900 font-mono">
                  {currencySymbol}{reconciliationReport?.totalGrossOnlineSales.toLocaleString('en-IN') || '0'}
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Platform Commissions
                </span>
                <span className="text-xl font-black text-stone-900 font-mono">
                  -{currencySymbol}{reconciliationReport?.totalCommissionsDeducted.toLocaleString('en-IN') || '0'}
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  GST & 1% TCS Deductions
                </span>
                <span className="text-xl font-black text-stone-900 font-mono">
                  -{currencySymbol}
                  {(
                    (reconciliationReport?.totalGstOnCommissions || 0) +
                    (reconciliationReport?.partnerBreakdown?.reduce((s, p) => s + p.tcsAmount, 0) || 0)
                  ).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </span>
              </div>
            </Card>

            <Card className="flex items-center space-x-3.5 bg-sage-50/50 border-sage-200">
              <div className="w-11 h-11 rounded-2xl bg-sage-100 text-sage-800 border border-sage-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-sage-700 uppercase tracking-wider block">
                  Net Receivable Payout
                </span>
                <span className="text-xl font-black text-sage-900 font-mono">
                  {currencySymbol}{reconciliationReport?.totalNetPayoutReceivable.toLocaleString('en-IN', { maximumFractionDigits: 1 }) || '0'}
                </span>
              </div>
            </Card>
          </div>

          {/* Channel Sales Distribution Bar */}
          {reconciliationReport?.cashVsOnlineSplit && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800">Channel Revenue Allocation</span>
                <span className="text-stone-500 font-mono text-[11px]">
                  Cash: {currencySymbol}{reconciliationReport.cashVsOnlineSplit.cashSales} | 
                  Direct Online: {currencySymbol}{reconciliationReport.cashVsOnlineSplit.onlineGatewaySales} | 
                  Aggregator Net: {currencySymbol}{reconciliationReport.cashVsOnlineSplit.aggregatorNetSales.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-canvas-200 h-3 rounded-full overflow-hidden flex">
                {(() => {
                  const cash = reconciliationReport.cashVsOnlineSplit.cashSales;
                  const direct = reconciliationReport.cashVsOnlineSplit.onlineGatewaySales;
                  const agg = reconciliationReport.cashVsOnlineSplit.aggregatorNetSales;
                  const total = (cash + direct + agg) || 1;
                  const cashPct = Math.round((cash / total) * 100);
                  const directPct = Math.round((direct / total) * 100);
                  const aggPct = 100 - cashPct - directPct;
                  return (
                    <>
                      <div style={{ width: `${cashPct}%` }} className="bg-stone-700 h-full" title={`Cash: ${cashPct}%`} />
                      <div style={{ width: `${directPct}%` }} className="bg-sage-600 h-full" title={`Online Direct: ${directPct}%`} />
                      <div style={{ width: `${aggPct}%` }} className="bg-terracotta-500 h-full" title={`Aggregators: ${aggPct}%`} />
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center space-x-6 text-[11px] text-stone-600 pt-1">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-700 inline-block"></span>
                  <span>In-House Cash</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sage-600 inline-block"></span>
                  <span>Direct UPI / Gateway</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-terracotta-500 inline-block"></span>
                  <span>Aggregator Net Payout</span>
                </div>
              </div>
            </Card>
          )}

          {/* Partner Payout Reconciliation Ledger Table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-canvas-border flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Partner Settlement Breakdown</h4>
                <p className="text-xs text-stone-500">Itemized commission fees and net settlement per channel</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-100/60 text-stone-600 border-b border-canvas-border uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Aggregator Channel</th>
                    <th className="py-3 px-3 text-right">Orders</th>
                    <th className="py-3 px-3 text-right">Gross Sales</th>
                    <th className="py-3 px-3 text-right">Commission Fee</th>
                    <th className="py-3 px-3 text-right">18% GST on Fee</th>
                    <th className="py-3 px-3 text-right">1% TCS</th>
                    <th className="py-3 px-4 text-right font-bold text-stone-800">Net Receivable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border font-mono">
                  {reconciliationReport?.partnerBreakdown && reconciliationReport.partnerBreakdown.length > 0 ? (
                    reconciliationReport.partnerBreakdown.map(entry => (
                      <tr key={entry.partner} className="hover:bg-canvas-50/70 transition-colors">
                        <td className="py-3 px-4 font-sans font-medium text-stone-900 flex items-center space-x-2">
                          <span>
                            {entry.partner === 'zomato' ? '🔴' : entry.partner === 'swiggy' ? '🟠' : entry.partner === 'ondc' ? '🔵' : '🟣'}
                          </span>
                          <span>{entry.partnerName}</span>
                        </td>
                        <td className="py-3 px-3 text-right text-stone-700">{entry.orderCount}</td>
                        <td className="py-3 px-3 text-right text-stone-900 font-bold">
                          {currencySymbol}{entry.grossSales.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-600">
                          -{currencySymbol}{entry.commissionAmount.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-600">
                          -{currencySymbol}{entry.gstOnCommission.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-600">
                          -{currencySymbol}{entry.tcsAmount.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-sage-800">
                          {currencySymbol}{entry.netPayout.toFixed(1)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-stone-400 font-sans">
                        No aggregator orders recorded for this settlement period yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Webhook Delivery & HMAC Signature Verification Audit Trail */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-canvas-border flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Inbound Webhooks Security Audit</h4>
                <p className="text-xs text-stone-500">HMAC-SHA256 signature verification & deduplication event trail</p>
              </div>
              <span className="text-[11px] font-mono text-stone-500 bg-canvas-100 px-2 py-0.5 rounded-full">
                Last {webhookLogs.length} events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-100/60 text-stone-600 border-b border-canvas-border uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Event ID / Partner</th>
                    <th className="py-3 px-3">HMAC Signature</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Linked Order</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border font-mono text-[11px]">
                  {webhookLogs.length > 0 ? (
                    webhookLogs.map(log => (
                      <tr key={log.id} className="hover:bg-canvas-50/70 transition-colors">
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs uppercase font-bold text-stone-800">{log.partner}</span>
                            <span className="font-mono text-[10px] text-stone-400 truncate max-w-[120px]">{log.eventId}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {log.signatureValid ? (
                            <span className="inline-flex items-center space-x-1 text-sage-700 font-sans font-semibold text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5 text-sage-600" />
                              <span>Verified HMAC</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-700 font-sans font-semibold text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Invalid Signature</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {log.status === 'processed' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-50 text-sage-700 border border-sage-200">
                              ✓ Processed
                            </span>
                          )}
                          {log.status === 'duplicate_skipped' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Idempotent Skipped
                            </span>
                          )}
                          {log.status === 'signature_mismatch' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Rejected (HMAC)
                            </span>
                          )}
                          {log.status === 'failed' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-sans text-stone-700">
                          {log.orderId ? (
                            <span className="font-mono text-stone-900 font-bold">{log.orderId}</span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-stone-500 font-mono text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-stone-400 font-sans">
                        No inbound webhook events logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: WHATSAPP & SMS MARKETING CAMPAIGNS (REELO SUITE) */}
      {/* ======================================================== */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* RFM Segmentation Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { id: 'all', label: 'All Guests', count: rfmSummary.all, color: 'border-stone-200 bg-white text-stone-900' },
              { id: 'champions', label: '🌟 Champions', count: rfmSummary.champions, color: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
              { id: 'loyal', label: '🔁 Regulars', count: rfmSummary.loyal, color: 'border-blue-200 bg-blue-50 text-blue-900' },
              { id: 'at_risk', label: '⚠️ At-Risk', count: rfmSummary.at_risk, color: 'border-amber-200 bg-amber-50 text-amber-900' },
              { id: 'dormant', label: '💤 Dormant', count: rfmSummary.dormant, color: 'border-rose-200 bg-rose-50 text-rose-900' },
              { id: 'new', label: '🆕 New Visits', count: rfmSummary.new, color: 'border-purple-200 bg-purple-50 text-purple-900' }
            ].map(seg => (
              <div
                key={seg.id}
                onClick={() => {
                  setCampaignSegment(seg.id as any);
                  setIsCreatingCampaign(true);
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer hover:shadow-md transition-all ${seg.color}`}
              >
                <div className="text-[11px] font-bold opacity-80">{seg.label}</div>
                <div className="text-xl font-extrabold mt-1">{seg.count}</div>
                <div className="text-[10px] opacity-70 mt-0.5">Click to target</div>
              </div>
            ))}
          </div>

          {/* Campaigns Table Card */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Broadcast Campaigns</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Send personalized promo vouchers, win-back messages & menu highlights directly to guest phones.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreatingCampaign(true)}
                className="text-xs"
              >
                + New Campaign
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-canvas-border text-stone-500 font-semibold bg-canvas-50">
                    <th className="py-2.5 px-3">Campaign Title</th>
                    <th className="py-2.5 px-3">Target Segment</th>
                    <th className="py-2.5 px-3">Promo Offer</th>
                    <th className="py-2.5 px-3">Recipients</th>
                    <th className="py-2.5 px-3">Delivered</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border">
                  {campaigns.length > 0 ? (
                    campaigns.map(cmp => (
                      <tr key={cmp.id} className="hover:bg-canvas-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-stone-900">{cmp.title}</div>
                          <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                            Created: {new Date(cmp.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {getRfmBadge(cmp.targetSegment === 'all' ? undefined : cmp.targetSegment as any)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono bg-canvas-100 border border-canvas-border px-2 py-0.5 rounded text-[11px] font-bold text-terracotta-700">
                            {cmp.offerCode} ({cmp.discountPercent}% OFF)
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold">{cmp.recipientCount || '—'}</td>
                        <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">{cmp.deliveredCount || 0}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            cmp.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : cmp.status === 'sending'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                                : cmp.status === 'failed'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}>
                            {cmp.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleBroadcastCampaign(cmp.id)}
                            isLoading={isBroadcasting === cmp.id}
                            className="text-xs py-1 px-2.5"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Broadcast
                          </Button>
                          <button
                            onClick={() => handleDeleteCampaign(cmp.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Campaign"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-stone-400">
                        No marketing campaigns yet. Create your first WhatsApp promo campaign above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: SMART CUSTOMER FEEDBACK & NPS REVIEWS */}
      {/* ======================================================== */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* NPS Ribbon Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-emerald-50/50 to-white border-emerald-200">
              <div className="text-xs font-bold text-emerald-900">Net Promoter Score (NPS)</div>
              <div className="text-3xl font-black text-emerald-800 mt-1">
                {npsReport?.overallNps !== undefined ? (npsReport.overallNps > 0 ? `+${npsReport.overallNps}` : npsReport.overallNps) : '0'}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                Range: -100 to +100 (% Promoters - % Detractors)
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-bold text-stone-600">Average Guest Rating</div>
              <div className="text-3xl font-black text-stone-900 mt-1 flex items-center gap-1.5">
                <span>{npsReport?.averageRating || 5.0}</span>
                <span className="text-amber-500 text-2xl">★</span>
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                Based on {npsReport?.totalResponses || 0} customer reviews
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-bold text-stone-600">Promoters (4-5 Stars)</div>
              <div className="text-3xl font-black text-emerald-700 mt-1">
                {npsReport?.promoterCount || 0}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                {npsReport?.promoterPercent || 0}% redirected to Google Maps
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-bold text-stone-600">Detractors (1-2 Stars)</div>
              <div className="text-3xl font-black text-rose-700 mt-1">
                {npsReport?.detractorCount || 0}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                Shielded; flagged for manager service recovery
              </div>
            </Card>
          </div>

          {/* Feedback Feed */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Customer Review & Feedback Stream</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Real-time guest sentiment tracking with automated Google Review redirection for 5-star ratings.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsRecordingFeedback(true)}
                className="text-xs"
              >
                + Log Feedback
              </Button>
            </div>

            <div className="space-y-3">
              {npsReport?.recentFeedbacks && npsReport.recentFeedbacks.length > 0 ? (
                npsReport.recentFeedbacks.map((fb: CustomerFeedback) => (
                  <div
                    key={fb.id}
                    className={`p-4 rounded-xl border transition-all ${
                      fb.npsCategory === 'promoter'
                        ? 'bg-emerald-50/30 border-emerald-100'
                        : fb.npsCategory === 'detractor'
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-stone-50/40 border-stone-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-stone-900">{fb.customerName}</span>
                        <span className="text-xs text-stone-500 font-mono">({fb.customerPhone})</span>
                        <span className="text-amber-500 font-bold text-sm">
                          {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          fb.npsCategory === 'promoter'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : fb.npsCategory === 'detractor'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {fb.npsCategory.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-stone-400 font-mono">
                          {new Date(fb.createdAt).toLocaleString()}
                        </span>
                        {fb.npsCategory === 'detractor' && fb.managerStatus === 'new' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleResolveFeedback(fb.id)}
                            className="text-xs py-1 px-2.5 text-rose-700 bg-rose-100 hover:bg-rose-200 border-rose-300"
                          >
                            Resolve Issue
                          </Button>
                        )}
                        {fb.managerStatus === 'resolved' && (
                          <span className="text-[10px] bg-sage-50 text-sage-800 border border-sage-200 px-2 py-0.5 rounded-full font-semibold">
                            ✓ Resolved by Manager
                          </span>
                        )}
                      </div>
                    </div>

                    {fb.feedbackText && (
                      <p className="text-xs text-stone-700 mt-2 bg-white/70 p-2.5 rounded-lg border border-canvas-border">
                        "{fb.feedbackText}"
                      </p>
                    )}

                    {fb.managerNotes && (
                      <div className="text-[11px] text-stone-600 mt-2 bg-stone-100 p-2 rounded-lg">
                        <span className="font-bold">Manager Note:</span> {fb.managerNotes}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-stone-400 text-xs">
                  No feedback records found yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: AUTOMATED MARKETING JOURNEYS (AUTOPILOT) */}
      {/* ======================================================== */}
      {activeTab === 'automations' && automations && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Birthday Perk */}
            <Card className="space-y-3 p-5">
              <div className="flex items-center justify-between border-b border-canvas-border pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Birthday Greeting & Perk</h4>
                    <p className="text-[11px] text-stone-500">Automated morning WhatsApp voucher on guest birthday</p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={automations.birthdayPerk.enabled}
                  onChange={(v: boolean) => setAutomations({
                    ...automations,
                    birthdayPerk: { ...automations.birthdayPerk, enabled: v }
                  })}
                  label=""
                />
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Discount Percentage (%)</label>
                  <input
                    type="number"
                    value={automations.birthdayPerk.discountPercent}
                    onChange={e => setAutomations({
                      ...automations,
                      birthdayPerk: { ...automations.birthdayPerk, discountPercent: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-1.5 rounded-lg border border-canvas-border"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">WhatsApp Message Template</label>
                  <textarea
                    rows={4}
                    value={automations.birthdayPerk.offerText}
                    onChange={e => setAutomations({
                      ...automations,
                      birthdayPerk: { ...automations.birthdayPerk, offerText: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-canvas-border text-xs font-mono"
                  />
                </div>
              </div>
            </Card>

            {/* 2. Inactivity Win-Back */}
            <Card className="space-y-3 p-5">
              <div className="flex items-center justify-between border-b border-canvas-border pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Dormant Guest Win-Back</h4>
                    <p className="text-[11px] text-stone-500">Automated reminder for guests absent for 30+ days</p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={automations.winbackTrigger.enabled}
                  onChange={(v: boolean) => setAutomations({
                    ...automations,
                    winbackTrigger: { ...automations.winbackTrigger, enabled: v }
                  })}
                  label=""
                />
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Inactivity Threshold (Days)</label>
                  <input
                    type="number"
                    value={automations.winbackTrigger.inactiveDaysThreshold}
                    onChange={e => setAutomations({
                      ...automations,
                      winbackTrigger: { ...automations.winbackTrigger, inactiveDaysThreshold: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-1.5 rounded-lg border border-canvas-border"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">WhatsApp Message Template</label>
                  <textarea
                    rows={4}
                    value={automations.winbackTrigger.offerText}
                    onChange={e => setAutomations({
                      ...automations,
                      winbackTrigger: { ...automations.winbackTrigger, offerText: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-canvas-border text-xs font-mono"
                  />
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              size="lg"
              disabled={isRunningDailyAutomations}
              onClick={handleTriggerDailyAutomations}
            >
              <Zap className="w-4 h-4 mr-2 text-amber-500" />
              {isRunningDailyAutomations ? 'Running Daily Triggers...' : 'Test Run Daily Journeys Now'}
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSaveAutomations}
            >
              Save Automation Settings
            </Button>
          </div>
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL */}
      {isCreatingCampaign && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg space-y-4 p-6 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-600" />
                <span>Create WhatsApp Broadcast Campaign</span>
              </h3>
              <button onClick={() => setIsCreatingCampaign(false)} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={campaignTitle}
                  onChange={e => setCampaignTitle(e.target.value)}
                  placeholder="e.g. Weekend Special 20% Off"
                  className="w-full px-3 py-2 rounded-lg border border-canvas-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Target Customer Segment</label>
                  <select
                    value={campaignSegment}
                    onChange={e => setCampaignSegment(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-canvas-border"
                  >
                    <option value="all">All Guests ({rfmSummary.all})</option>
                    <option value="champions">Champions / VIP ({rfmSummary.champions})</option>
                    <option value="loyal">Loyal Regulars ({rfmSummary.loyal})</option>
                    <option value="at_risk">At-Risk ({rfmSummary.at_risk})</option>
                    <option value="dormant">Dormant ({rfmSummary.dormant})</option>
                    <option value="new">New Visitors ({rfmSummary.new})</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Promo Code & Discount</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={campaignOfferCode}
                      onChange={e => setCampaignOfferCode(e.target.value)}
                      placeholder="CODE20"
                      className="w-2/3 px-2 py-2 rounded-lg border border-canvas-border font-mono uppercase"
                    />
                    <input
                      type="number"
                      value={campaignDiscount}
                      onChange={e => setCampaignDiscount(Number(e.target.value))}
                      placeholder="%"
                      className="w-1/3 px-2 py-2 rounded-lg border border-canvas-border"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">WhatsApp Message Template</label>
                <textarea
                  rows={4}
                  required
                  value={campaignTemplate}
                  onChange={e => setCampaignTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-canvas-border font-mono text-[11px]"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Tokens: {"{{name}}"}, {"{{discount}}"}, {"{{offerCode}}"}, {"{{points}}"}, {"{{restaurantName}}"}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreatingCampaign(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Create Campaign</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* RECORD FEEDBACK MODAL */}
      {isRecordingFeedback && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md space-y-4 p-6 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-canvas-border pb-3">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span>Record Customer Review / Feedback</span>
              </h3>
              <button onClick={() => setIsRecordingFeedback(false)} className="text-stone-400 hover:text-stone-700">✕</button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Customer Mobile Number</label>
                <input
                  type="text"
                  required
                  value={fbPhone}
                  onChange={e => setFbPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 rounded-lg border border-canvas-border font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={fbName}
                  onChange={e => setFbName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 rounded-lg border border-canvas-border"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFbRating(star)}
                      className={`text-2xl transition-all ${fbRating >= star ? 'text-amber-500 scale-110' : 'text-stone-300'}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-stone-700 ml-2">
                    {fbRating >= 4 ? 'Promoter (Google Maps)' : fbRating === 3 ? 'Passive' : 'Detractor (Alert Manager)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Customer Comments</label>
                <textarea
                  rows={3}
                  value={fbText}
                  onChange={e => setFbText(e.target.value)}
                  placeholder="What did the customer say about food, ambience or service?"
                  className="w-full px-3 py-2 rounded-lg border border-canvas-border text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Feedback Tags (comma-separated)</label>
                <input
                  type="text"
                  value={fbTags}
                  onChange={e => setFbTags(e.target.value)}
                  placeholder="food, service, ambience, pricing"
                  className="w-full px-3 py-1.5 rounded-lg border border-canvas-border text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsRecordingFeedback(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Submit Feedback</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
