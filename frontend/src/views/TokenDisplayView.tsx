import React, { useState, useEffect } from 'react';
import { RestaurantProfile, PublicOrderToken } from '../types';
import {
  Tv,
  Clock,
  CheckCircle2,
  ChefHat,
  Volume2,
  VolumeX,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

interface TokenDisplayViewProps {
  profile: RestaurantProfile;
  onExit: () => void;
}

export const TokenDisplayView: React.FC<TokenDisplayViewProps> = ({ profile, onExit }) => {
  const [tokens, setTokens] = useState<{ preparing: PublicOrderToken[]; ready: PublicOrderToken[] }>({
    preparing: [],
    ready: []
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchTokens = async () => {
    try {
      const res = await fetch('/api/public/tokens');
      if (res.ok) {
        const data = await res.json();
        setTokens(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchTokens();
    const tokenInterval = setInterval(fetchTokens, 4000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(tokenInterval);
      clearInterval(clockInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none font-sans">
      {/* Top TV Command Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center space-x-4">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Back to POS"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-terracotta-500/20 text-terracotta-400 border border-terracotta-500/30 flex items-center justify-center">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">{profile.name}</h1>
              <p className="text-xs text-slate-400">Order Pickup Status • Wall Display Screen</p>
            </div>
          </div>
        </div>

        {/* Live Clock & Sound Control */}
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-2xl font-mono font-black text-amber-400">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-amber-600/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title={soundEnabled ? 'Chime sound enabled' : 'Chime muted'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Split Display */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 p-8 gap-8 overflow-hidden">
        {/* LEFT COLUMN: NOW PREPARING */}
        <section className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 flex flex-col shadow-inner backdrop-blur-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ChefHat className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-amber-400 uppercase tracking-wider">
                Now Preparing
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-sm">
              {tokens.preparing.length} In Kitchen
            </span>
          </div>

          <div className="flex-1 mt-6 overflow-y-auto pr-2">
            {tokens.preparing.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                <Clock className="w-12 h-12 text-slate-700" />
                <p className="text-sm font-bold text-slate-500">All orders prepared!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {tokens.preparing.map(t => (
                  <div
                    key={t.orderId}
                    className="bg-slate-850 border border-amber-500/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-md transition-all hover:border-amber-400"
                  >
                    <span className="text-3xl font-mono font-black text-amber-300 tracking-tight">
                      #{t.takeawayToken}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium truncate max-w-[120px] mt-1">
                      {t.customerName || 'Takeaway Guest'}
                    </span>
                    <span className="text-[10px] text-amber-400/80 font-mono mt-1 flex items-center space-x-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{t.elapsedMinutes}m in prep</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: READY FOR PICKUP */}
        <section className="bg-emerald-950/20 rounded-3xl border border-emerald-600/40 p-6 flex flex-col shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-800/40">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
                <span>Ready for Pickup</span>
                <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-sm">
              {tokens.ready.length} Ready
            </span>
          </div>

          <div className="flex-1 mt-6 overflow-y-auto pr-2">
            {tokens.ready.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-slate-700" />
                <p className="text-sm font-bold text-slate-500">Orders ready for handover will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {tokens.ready.map(t => (
                  <div
                    key={t.orderId}
                    className="bg-emerald-900/40 border-2 border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg shadow-emerald-950/50 animate-pulse"
                  >
                    <span className="text-4xl font-mono font-black text-white tracking-tight drop-shadow">
                      #{t.takeawayToken}
                    </span>
                    <span className="text-xs text-emerald-200 font-bold truncate max-w-[120px] mt-1">
                      {t.customerName || 'Takeaway Guest'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase mt-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                      Counter Ready
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
