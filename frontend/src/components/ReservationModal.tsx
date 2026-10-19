import React, { useState, useEffect } from 'react';
import { TableReservation, GuestWaitlistEntry, RestaurantTable } from '../types';
import { ApiService } from '../services/api';
import {
  X,
  Calendar,
  Clock,
  Users,
  Phone,
  User,
  Plus,
  CheckCircle,
  MessageCircle,
  Armchair,
  Search,
  Sparkles
} from 'lucide-react';

interface ReservationModalProps {
  tables: RestaurantTable[];
  currencySymbol: string;
  onClose: () => void;
  onSeatGuestAtTable?: (tableId: string) => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  tables,
  currencySymbol,
  onClose,
  onSeatGuestAtTable
}) => {
  const [activeTab, setActiveTab] = useState<'reservations' | 'waitlist'>('reservations');
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [waitlist, setWaitlist] = useState<GuestWaitlistEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'all'>('today');

  // Booking Form State
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [resGuestName, setResGuestName] = useState('');
  const [resGuestPhone, setResGuestPhone] = useState('');
  const [resPax, setResPax] = useState<number>(2);
  const [resTableId, setResTableId] = useState('');
  const [resDate, setResDate] = useState(new Date().toISOString().split('T')[0]);
  const [resTime, setResTime] = useState('19:30');
  const [resDeposit, setResDeposit] = useState<number>(0);
  const [resSpecialRequest, setResSpecialRequest] = useState('');

  // Waitlist Form State
  const [showAddWaitlist, setShowAddWaitlist] = useState(false);
  const [waitGuestName, setWaitGuestName] = useState('');
  const [waitGuestPhone, setWaitGuestPhone] = useState('');
  const [waitPax, setWaitPax] = useState<number>(2);
  const [waitSection, setWaitSection] = useState('AC Hall');
  const [waitMinutes, setWaitMinutes] = useState<number>(15);

  const [notificationStatus, setNotificationStatus] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [resList, waitList] = await Promise.all([
        ApiService.getReservations(),
        ApiService.getWaitlist()
      ]);
      setReservations(resList);
      setWaitlist(waitList);
    } catch (err) {
      console.error('Failed to load reservations/waitlist:', err);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resGuestName || !resGuestPhone || !resDate || !resTime) return;

    const selectedTbl = tables.find(t => t.id === resTableId);

    try {
      const created = await ApiService.createReservation({
        guestName: resGuestName,
        guestPhone: resGuestPhone,
        pax: resPax,
        tableId: resTableId || undefined,
        tableNumber: selectedTbl?.tableNumber,
        reservationDate: resDate,
        reservationTime: resTime,
        advanceDeposit: resDeposit,
        specialRequest: resSpecialRequest || undefined
      });

      setReservations(prev => [created, ...prev]);
      setShowAddBooking(false);
      // Reset
      setResGuestName('');
      setResGuestPhone('');
      setResSpecialRequest('');
      setResDeposit(0);
    } catch (err) {
      console.error('Failed to create reservation:', err);
    }
  };

  const handleUpdateReservationStatus = async (id: string, status: TableReservation['status'], tableId?: string) => {
    try {
      const updated = await ApiService.updateReservationStatus(id, status, tableId);
      setReservations(prev => prev.map(r => (r.id === id ? updated : r)));
      if (status === 'seated' && tableId && onSeatGuestAtTable) {
        onSeatGuestAtTable(tableId);
      }
    } catch (err) {
      console.error('Failed to update reservation status:', err);
    }
  };

  const handleAddToWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitGuestName || !waitGuestPhone) return;

    try {
      const created = await ApiService.addToWaitlist({
        guestName: waitGuestName,
        guestPhone: waitGuestPhone,
        pax: waitPax,
        sectionPreference: waitSection,
        estimatedWaitMinutes: waitMinutes
      });

      setWaitlist(prev => [...prev, created]);
      setShowAddWaitlist(false);
      setWaitGuestName('');
      setWaitGuestPhone('');
    } catch (err) {
      console.error('Failed to add to waitlist:', err);
    }
  };

  const handleUpdateWaitlistStatus = async (id: string, status: GuestWaitlistEntry['status'], tableNumber?: string) => {
    try {
      const updated = await ApiService.updateWaitlistStatus(id, status, tableNumber);
      setWaitlist(prev => prev.map(w => (w.id === id ? updated : w)));
    } catch (err) {
      console.error('Failed to update waitlist status:', err);
    }
  };

  const handlePingWhatsAppTableReady = async (entry: GuestWaitlistEntry, tableNumber?: string) => {
    setNotificationStatus(prev => ({ ...prev, [entry.id]: 'Sending WhatsApp...' }));
    try {
      const res = await ApiService.notifyWaitlistWhatsApp(entry.id, tableNumber);
      if (res.success) {
        setNotificationStatus(prev => ({ ...prev, [entry.id]: 'WhatsApp Sent! ✓' }));
        // Also mark as table_ready
        handleUpdateWaitlistStatus(entry.id, 'table_ready', tableNumber);
      } else {
        setNotificationStatus(prev => ({ ...prev, [entry.id]: 'Failed: ' + (res.error || 'OpenWA error') }));
      }
    } catch {
      setNotificationStatus(prev => ({ ...prev, [entry.id]: 'Failed to send' }));
    }
    setTimeout(() => {
      setNotificationStatus(prev => {
        const copy = { ...prev };
        delete copy[entry.id];
        return copy;
      });
    }, 4000);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const filteredReservations = reservations.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = r.guestName.toLowerCase().includes(q) || r.guestPhone.includes(q) || (r.tableNumber && r.tableNumber.toLowerCase().includes(q));
    let matchesDate = true;
    if (dateFilter === 'today') matchesDate = r.reservationDate === todayStr;
    if (dateFilter === 'tomorrow') matchesDate = r.reservationDate === tomorrowStr;
    return matchesSearch && matchesDate;
  });

  const activeWaitlist = waitlist.filter(w => w.status === 'waiting' || w.status === 'table_ready');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[88vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Table Bookings & Guest Waitlist</span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage advance reservations • Live queue board • WhatsApp "Table Ready" notifications
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Tabs Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setActiveTab('reservations')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'reservations'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Reservations ({reservations.filter(r => r.status === 'confirmed').length})</span>
              </button>

              <button
                onClick={() => setActiveTab('waitlist')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'waitlist'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Live Waitlist ({activeWaitlist.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: RESERVATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'reservations' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Sub-bar: Search, Date Filter, and Add Booking Button */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 flex-1">
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search guest, phone or table..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      dateFilter === 'today' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setDateFilter('tomorrow')}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      dateFilter === 'tomorrow' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      dateFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Dates
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowAddBooking(!showAddBooking)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddBooking ? 'Close Form' : 'New Reservation'}</span>
              </button>
            </div>

            {/* Optional Collapsible New Booking Form */}
            {showAddBooking && (
              <form onSubmit={handleCreateReservation} className="p-4 bg-slate-850 border-b border-slate-700/80 grid grid-cols-4 gap-3 animate-fadeIn">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Guest Name *</label>
                  <input
                    type="text"
                    required
                    value={resGuestName}
                    onChange={e => setResGuestName(e.target.value)}
                    placeholder="e.g. Ananya Roy"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">WhatsApp Phone *</label>
                  <input
                    type="tel"
                    required
                    value={resGuestPhone}
                    onChange={e => setResGuestPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Pax (Guests)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={resPax}
                    onChange={e => setResPax(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Assigned Table (Optional)</label>
                  <select
                    value={resTableId}
                    onChange={e => setResTableId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Auto-assign later</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.tableNumber} ({t.section} • {t.capacity}p)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={resDate}
                    onChange={e => setResDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={resTime}
                    onChange={e => setResTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Advance Deposit ({currencySymbol})</label>
                  <input
                    type="number"
                    value={resDeposit}
                    onChange={e => setResDeposit(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Special Request</label>
                    <input
                      type="text"
                      value={resSpecialRequest}
                      onChange={e => setResSpecialRequest(e.target.value)}
                      placeholder="e.g. Birthday, quiet booth"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                  >
                    Confirm Booking
                  </button>
                </div>
              </form>
            )}

            {/* Reservations List Cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredReservations.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Calendar className="w-8 h-8 mb-2 opacity-50" />
                  <span>No reservations found for the selected criteria.</span>
                </div>
              ) : (
                filteredReservations.map(res => (
                  <div
                    key={res.id}
                    className={`bg-slate-800/80 border rounded-xl p-4 flex items-center justify-between transition-all ${
                      res.status === 'confirmed'
                        ? 'border-blue-500/40 bg-blue-950/10'
                        : res.status === 'seated'
                        ? 'border-emerald-500/40 bg-emerald-950/10'
                        : 'border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-white flex items-center space-x-1.5">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{res.guestName}</span>
                        </span>
                        <span className="text-xs text-slate-400 font-mono flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{res.guestPhone}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-700/60 flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{res.pax} Guests</span>
                        </span>
                        {res.tableNumber && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/60 text-purple-300 border border-purple-700/60 flex items-center space-x-1">
                            <Armchair className="w-3 h-3" />
                            <span>Table {res.tableNumber}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-slate-400 pt-0.5">
                        <span className="flex items-center space-x-1 text-slate-300 font-medium">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          <span>
                            {res.reservationDate} at {res.reservationTime}
                          </span>
                        </span>

                        {res.advanceDeposit ? (
                          <span className="text-emerald-400 font-bold font-mono">
                            Deposit: {currencySymbol}{res.advanceDeposit}
                          </span>
                        ) : null}

                        {res.specialRequest && (
                          <span className="text-amber-300 flex items-center space-x-1 italic">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>"{res.specialRequest}"</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {res.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleUpdateReservationStatus(res.id, 'seated', res.tableId)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Seat Guests</span>
                          </button>
                          <button
                            onClick={() => handleUpdateReservationStatus(res.id, 'cancelled')}
                            className="px-2.5 py-1.5 bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {res.status === 'seated' && (
                        <span className="px-3 py-1 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60">
                          Seated at {res.tableNumber || 'Table'}
                        </span>
                      )}

                      {res.status === 'cancelled' && (
                        <span className="px-3 py-1 rounded-lg text-xs font-medium text-rose-400 bg-rose-950/60 border border-rose-800/60">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LIVE GUEST WAITLIST */}
        {/* ========================================================================= */}
        {activeTab === 'waitlist' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Sub-bar: Waitlist Metrics & Add to Waitlist */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {activeWaitlist.length} Waiting Parties
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Est. Average wait: <strong className="text-amber-400">15-20 mins</strong>
                </span>
              </div>

              <button
                onClick={() => setShowAddWaitlist(!showAddWaitlist)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddWaitlist ? 'Close Form' : 'Add Walk-in Party'}</span>
              </button>
            </div>

            {/* Collapsible Add Walk-in to Waitlist Form */}
            {showAddWaitlist && (
              <form onSubmit={handleAddToWaitlist} className="p-4 bg-slate-850 border-b border-slate-700/80 grid grid-cols-5 gap-3 animate-fadeIn">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Party Name *</label>
                  <input
                    type="text"
                    required
                    value={waitGuestName}
                    onChange={e => setWaitGuestName(e.target.value)}
                    placeholder="e.g. Kunal Shah"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">WhatsApp Phone *</label>
                  <input
                    type="tel"
                    required
                    value={waitGuestPhone}
                    onChange={e => setWaitGuestPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Party Size (Pax)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={waitPax}
                    onChange={e => setWaitPax(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Preferred Section</label>
                  <select
                    value={waitSection}
                    onChange={e => setWaitSection(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="AC Hall">AC Hall</option>
                    <option value="Rooftop">Rooftop Garden</option>
                    <option value="Family Dining">Family Dining</option>
                    <option value="Any Available">Any Available Table</option>
                  </select>
                </div>

                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Est. Wait (Mins)</label>
                    <input
                      type="number"
                      value={waitMinutes}
                      onChange={e => setWaitMinutes(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                  >
                    Queue Guest
                  </button>
                </div>
              </form>
            )}

            {/* Waitlist Queue Cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeWaitlist.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Armchair className="w-8 h-8 mb-2 opacity-50" />
                  <span>No guests currently waiting in the queue. Tables available!</span>
                </div>
              ) : (
                activeWaitlist.map((entry, idx) => {
                  const elapsedMins = Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 60000);
                  const isReady = entry.status === 'table_ready';
                  const notifStatus = notificationStatus[entry.id];

                  return (
                    <div
                      key={entry.id}
                      className={`bg-slate-800/80 border rounded-xl p-4 flex items-center justify-between transition-all ${
                        isReady
                          ? 'border-emerald-500 bg-emerald-950/20 shadow-md'
                          : 'border-amber-500/30 bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center font-bold text-amber-400 text-base font-mono">
                          #{idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-bold text-white">{entry.guestName}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                              {entry.pax} Guests
                            </span>
                            {entry.sectionPreference && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-900/40 text-blue-300 border border-blue-800/50">
                                {entry.sectionPreference}
                              </span>
                            )}
                            {isReady && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white animate-pulse">
                                Table Ready
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center space-x-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{entry.guestPhone}</span>
                            </span>
                            <span>•</span>
                            <span className="text-amber-400 font-medium">
                              Waiting {elapsedMins} mins (Est: {entry.estimatedWaitMinutes}m)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Waitlist Control Buttons */}
                      <div className="flex items-center space-x-2">
                        {notifStatus ? (
                          <span className="text-xs text-emerald-400 font-bold px-2 py-1 bg-emerald-950/50 rounded-lg border border-emerald-800">
                            {notifStatus}
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePingWhatsAppTableReady(entry)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Ping WhatsApp</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleUpdateWaitlistStatus(entry.id, 'seated')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Seat Guest</span>
                        </button>

                        <button
                          onClick={() => handleUpdateWaitlistStatus(entry.id, 'cancelled')}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Remove from queue"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
