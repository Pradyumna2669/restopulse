import React, { useState, useEffect } from 'react';
import { TableReservation, GuestWaitlistEntry, RestaurantTable } from '../types';
import { ApiService } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Calendar,
  Clock,
  Phone,
  Plus,
  CheckCircle,
  MessageCircle,
  Armchair,
  Search,
  X
} from 'lucide-react';

interface ReservationsWaitlistViewProps {
  tables: RestaurantTable[];
  currencySymbol: string;
  onSeatGuestAtTable?: (tableId: string) => void;
}

export const ReservationsWaitlistView: React.FC<ReservationsWaitlistViewProps> = ({
  tables,
  currencySymbol,
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
  const confirmedCount = reservations.filter(r => r.status === 'confirmed').length;
  const todayBookingsCount = reservations.filter(r => r.reservationDate === todayStr).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-canvas-border shadow-sm">
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'reservations'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Table Reservations</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'reservations' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {confirmedCount} Confirmed
            </span>
          </button>

          <button
            onClick={() => setActiveTab('waitlist')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'waitlist'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-canvas-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Live Guest Waitlist</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'waitlist' ? 'bg-stone-800 text-stone-200' : 'bg-canvas-200 text-stone-600'
              }`}
            >
              {activeWaitlist.length} Waiting
            </span>
          </button>
        </div>

        <div>
          {activeTab === 'reservations' ? (
            <Button
              variant="primary"
              onClick={() => setShowAddBooking(true)}
              className="flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Reservation</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setShowAddWaitlist(true)}
              className="flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Waitlist</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ADVANCE RESERVATIONS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 !p-3">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-stone-400 font-bold mr-1 shrink-0">Date Horizon:</span>
              <button
                onClick={() => setDateFilter('today')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateFilter === 'today'
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-canvas-100 text-stone-600 hover:text-stone-900'
                }`}
              >
                Today ({todayBookingsCount})
              </button>
              <button
                onClick={() => setDateFilter('tomorrow')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateFilter === 'tomorrow'
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-canvas-100 text-stone-600 hover:text-stone-900'
                }`}
              >
                Tomorrow
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateFilter === 'all'
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-canvas-100 text-stone-600 hover:text-stone-900'
                }`}
              >
                All Bookings ({reservations.length})
              </button>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search guest, mobile, table..."
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
              />
            </div>
          </Card>

          {/* Reservations List */}
          {filteredReservations.length === 0 ? (
            <Card className="py-16 text-center text-stone-400 text-xs">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-stone-300" />
              <p className="font-bold text-stone-800 text-sm">No reservations found</p>
              <p className="text-stone-400 mt-1">
                Click "New Reservation" to record advance bookings for guests.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReservations.map(res => {
                const isSeated = res.status === 'seated';
                const isCancelled = res.status === 'cancelled';
                const isConfirmed = res.status === 'confirmed';

                return (
                  <Card
                    key={res.id}
                    className={`flex flex-col justify-between transition-all ${
                      isSeated
                        ? 'opacity-65 bg-canvas-50'
                        : isCancelled
                        ? 'opacity-50 bg-rose-50/20 border-rose-200'
                        : 'border-canvas-border'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
                        <div>
                          <h4 className="text-sm font-bold text-stone-900">{res.guestName}</h4>
                          <span className="text-[11px] font-mono text-stone-500 flex items-center space-x-1 mt-0.5">
                            <Phone className="w-3 h-3 text-terracotta-500" />
                            <span>{res.guestPhone}</span>
                          </span>
                        </div>

                        <Badge
                          variant={
                            isSeated
                              ? 'neutral'
                              : isCancelled
                              ? 'terracotta'
                              : 'success'
                          }
                        >
                          {res.status}
                        </Badge>
                      </div>

                      {/* Booking Details Grid */}
                      <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-canvas-50 border border-canvas-border">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">Date & Time</span>
                          <span className="font-bold text-stone-900 font-mono text-xs block mt-0.5">
                            {res.reservationDate} @ {res.reservationTime}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-canvas-50 border border-canvas-border">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">Party Size</span>
                          <span className="font-bold text-stone-900 font-mono text-xs block mt-0.5">
                            👥 {res.pax} Guests
                          </span>
                        </div>
                      </div>

                      {/* Assigned Table & Deposit */}
                      <div className="space-y-1.5 text-xs text-stone-600">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Assigned Table:</span>
                          <span className="font-bold text-stone-900 font-mono">
                            {res.tableNumber ? `Table ${res.tableNumber}` : 'Unassigned'}
                          </span>
                        </div>

                        {Boolean(res.advanceDeposit && res.advanceDeposit > 0) && (
                          <div className="flex items-center justify-between">
                            <span className="text-stone-400">Advance Deposit:</span>
                            <span className="font-bold text-sage-700 font-mono">
                              {currencySymbol}{(res.advanceDeposit || 0).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {res.specialRequest && (
                          <div className="p-2 rounded-xl bg-canvas-100 text-[11px] text-stone-700 mt-2">
                            <span className="font-bold text-stone-900 block text-[10px] uppercase">Notes:</span>
                            <span>{res.specialRequest}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-canvas-border flex items-center space-x-2">
                      {isConfirmed && (
                        <>
                          <Button
                            variant="primary"
                            onClick={() => handleUpdateReservationStatus(res.id, 'seated', res.tableId)}
                            className="flex-1 !py-1.5 !text-xs font-bold flex items-center justify-center space-x-1"
                          >
                            <Armchair className="w-3.5 h-3.5" />
                            <span>Seat Guests</span>
                          </Button>

                          <button
                            onClick={() => handleUpdateReservationStatus(res.id, 'cancelled')}
                            className="p-2 rounded-xl bg-canvas-100 hover:bg-rose-50 text-stone-500 hover:text-rose-600 border border-canvas-border transition-colors text-xs"
                            title="Cancel reservation"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <a
                        href={`https://wa.me/91${res.guestPhone}?text=${encodeURIComponent(
                          `Hello ${res.guestName}! Your table booking for ${res.pax} guests on ${res.reservationDate} at ${res.reservationTime} is confirmed. 🍽️`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-sage-50 text-sage-700 hover:bg-sage-100 border border-sage-200 transition-colors"
                        title="Send booking confirmation WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE WAITLIST QUEUE BOARD */}
      {/* ========================================================================= */}
      {activeTab === 'waitlist' && (
        <div className="space-y-4">
          {activeWaitlist.length === 0 ? (
            <Card className="py-16 text-center text-stone-400 text-xs">
              <Clock className="w-12 h-12 mx-auto mb-2 text-stone-300" />
              <p className="font-bold text-stone-800 text-sm">Waitlist queue is empty</p>
              <p className="text-stone-400 mt-1">
                All walk-in parties have been seated. Add waiting guests using the button above.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeWaitlist.map(entry => {
                const isTableReady = entry.status === 'table_ready';
                const notif = notificationStatus[entry.id];

                return (
                  <Card
                    key={entry.id}
                    className={`flex flex-col justify-between transition-all ${
                      isTableReady
                        ? 'border-sage-400 bg-sage-50/20 shadow-sm'
                        : 'border-canvas-border'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
                        <div>
                          <h4 className="text-sm font-bold text-stone-900">{entry.guestName}</h4>
                          <span className="text-[11px] font-mono text-stone-500 flex items-center space-x-1 mt-0.5">
                            <Phone className="w-3 h-3 text-terracotta-500" />
                            <span>{entry.guestPhone}</span>
                          </span>
                        </div>

                        <Badge variant={isTableReady ? 'success' : 'warning'}>
                          {entry.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      {/* Queue Metrics */}
                      <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-canvas-50 border border-canvas-border">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">Party Size</span>
                          <span className="font-bold text-stone-900 font-mono text-xs block mt-0.5">
                            👥 {entry.pax} Guests
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-canvas-50 border border-canvas-border">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">Pref. Section</span>
                          <span className="font-bold text-stone-900 text-xs block mt-0.5 truncate">
                            {entry.sectionPreference || 'Any Section'}
                          </span>
                        </div>
                      </div>

                      {/* Wait Time Info */}
                      <div className="text-xs text-stone-500 flex items-center justify-between">
                        <span>Estimated Wait:</span>
                        <span className="font-mono font-bold text-stone-800">
                          ~{entry.estimatedWaitMinutes} mins
                        </span>
                      </div>

                      {notif && (
                        <div className="mt-2 p-2 rounded-xl bg-sage-50 text-sage-800 border border-sage-200 text-xs font-semibold text-center">
                          {notif}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-canvas-border flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => handlePingWhatsAppTableReady(entry)}
                        className="flex-1 !py-1.5 !text-xs font-bold flex items-center justify-center space-x-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-sage-600" />
                        <span>Ping WhatsApp</span>
                      </Button>

                      <Button
                        variant="dark"
                        onClick={() => handleUpdateWaitlistStatus(entry.id, 'seated')}
                        className="flex-1 !py-1.5 !text-xs font-bold flex items-center justify-center space-x-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Seat Party</span>
                      </Button>

                      <button
                        onClick={() => handleUpdateWaitlistStatus(entry.id, 'cancelled')}
                        className="p-2 rounded-xl bg-canvas-100 hover:bg-rose-50 text-stone-500 hover:text-rose-600 border border-canvas-border transition-colors text-xs"
                        title="Cancel from waitlist"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: NEW RESERVATION DIALOG */}
      {/* ========================================================================= */}
      {showAddBooking && (
        <Modal
          isOpen={true}
          onClose={() => setShowAddBooking(false)}
          title="New Table Reservation"
          subtitle="Record guest details, table assignment and advance deposit"
          maxWidth="md"
        >
          <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Guest Name *
                </label>
                <input
                  type="text"
                  required
                  value={resGuestName}
                  onChange={e => setResGuestName(e.target.value)}
                  placeholder="e.g. Aditi Sharma"
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={resGuestPhone}
                  onChange={e => setResGuestPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Party (Pax)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={resPax}
                  onChange={e => setResPax(Number(e.target.value))}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono text-center focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={resDate}
                  onChange={e => setResDate(e.target.value)}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-2 text-stone-900 text-xs focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Time *</label>
                <input
                  type="time"
                  required
                  value={resTime}
                  onChange={e => setResTime(e.target.value)}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-2 text-stone-900 text-xs focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Assign Table (Optional)
                </label>
                <select
                  value={resTableId}
                  onChange={e => setResTableId(e.target.value)}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2.5 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  <option value="">No specific table</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      Table {t.tableNumber} ({t.section} • {t.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  Advance Deposit ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={resDeposit}
                  onChange={e => setResDeposit(Number(e.target.value))}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Special Requests / Occasion
              </label>
              <textarea
                rows={2}
                value={resSpecialRequest}
                onChange={e => setResSpecialRequest(e.target.value)}
                placeholder="e.g. Birthday anniversary, high chair needed, quiet booth..."
                className="w-full bg-canvas-100 border border-canvas-border rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-canvas-border">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowAddBooking(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Create Reservation
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: ADD TO WAITLIST DIALOG */}
      {/* ========================================================================= */}
      {showAddWaitlist && (
        <Modal
          isOpen={true}
          onClose={() => setShowAddWaitlist(false)}
          title="Add Walk-in to Waitlist"
          subtitle="Enlist waiting guests and assign estimated queue time"
          maxWidth="md"
        >
          <form onSubmit={handleAddToWaitlist} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Guest Name *</label>
                <input
                  type="text"
                  required
                  value={waitGuestName}
                  onChange={e => setWaitGuestName(e.target.value)}
                  placeholder="e.g. Vikram Seth"
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={waitGuestPhone}
                  onChange={e => setWaitGuestPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Pax *</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={waitPax}
                  onChange={e => setWaitPax(Number(e.target.value))}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono text-center focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Section</label>
                <select
                  value={waitSection}
                  onChange={e => setWaitSection(e.target.value)}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-2 py-2 text-stone-900 focus:outline-none focus:border-stone-400"
                >
                  <option value="AC Hall">AC Hall</option>
                  <option value="Ground Floor">Ground Floor</option>
                  <option value="Rooftop Lounge">Rooftop Lounge</option>
                  <option value="Any Section">Any Section</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Est. Mins</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={waitMinutes}
                  onChange={e => setWaitMinutes(Number(e.target.value))}
                  className="w-full bg-canvas-100 border border-canvas-border rounded-xl px-3 py-2 text-stone-900 font-mono text-center focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-canvas-border">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowAddWaitlist(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Add to Queue
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
