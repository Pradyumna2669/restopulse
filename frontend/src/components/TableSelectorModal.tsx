import React, { useState } from 'react';
import { RestaurantTable, Order } from '../types';
import {
  X,
  Users,
  CheckCircle2,
  Utensils,
  ArrowRightLeft,
  Trash2,
  Clock,
  Search,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface TableSelectorModalProps {
  tables: RestaurantTable[];
  orders?: Order[];
  selectedTableId?: string;
  currencySymbol?: string;
  onSelectTable: (table: RestaurantTable) => void;
  onTransferTable?: (fromTableId: string, toTableId: string) => Promise<void>;
  onVacateTable?: (tableId: string) => Promise<void>;
  onClose: () => void;
}

export const TableSelectorModal: React.FC<TableSelectorModalProps> = ({
  tables,
  orders = [],
  selectedTableId,
  currencySymbol = '₹',
  onSelectTable,
  onTransferTable,
  onVacateTable,
  onClose
}) => {
  const sections = Array.from(new Set(tables.map(t => t.section)));
  const [activeSection, setActiveSection] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Table Transfer Modal State
  const [transferSourceTable, setTransferSourceTable] = useState<RestaurantTable | null>(null);
  const [transferTargetTableId, setTransferTargetTableId] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Table Vacate Confirm State
  const [vacatingTableId, setVacatingTableId] = useState<string | null>(null);

  // Filter tables
  const filteredTables = tables.filter(t => {
    const matchesSection = activeSection === 'All' || t.section === activeSection;
    const matchesSearch =
      t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.section.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesSearch;
  });

  // Calculate floor statistics
  const totalTables = tables.length;
  const vacantCount = tables.filter(t => t.status === 'vacant').length;
  const runningCount = tables.filter(t => t.status === 'running').length;
  const billedCount = tables.filter(t => t.status === 'billed').length;
  const occupancyPercent = totalTables > 0 ? Math.round(((runningCount + billedCount) / totalTables) * 100) : 0;

  // Helper to find active order for a table
  const getTableActiveOrder = (table: RestaurantTable): { order?: Order; total: number; itemCount: number; elapsedMinutes: number } => {
    let order: Order | undefined;
    if (table.currentOrderId) {
      order = orders.find(o => o.id === table.currentOrderId);
    }
    if (!order) {
      order = orders.find(o => o.tableId === table.id && o.status !== 'settled' && o.status !== 'cancelled');
    }

    if (!order) {
      return { total: 0, itemCount: 0, elapsedMinutes: 0 };
    }

    const total = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000));

    return { order, total, itemCount, elapsedMinutes };
  };

  const handleConfirmTransfer = async () => {
    if (!transferSourceTable || !transferTargetTableId || !onTransferTable) return;
    try {
      setIsTransferring(true);
      setTransferError(null);
      await onTransferTable(transferSourceTable.id, transferTargetTableId);
      setTransferSourceTable(null);
      setTransferTargetTableId('');
    } catch (err: any) {
      setTransferError(err?.message || 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleConfirmVacate = async (tableId: string) => {
    if (!onVacateTable) return;
    try {
      await onVacateTable(tableId);
      setVacatingTableId(null);
    } catch (err) {
      console.error('Failed to vacate table:', err);
    }
  };

  // Vacant tables available for transfer (excluding source table)
  const availableTargetTables = tables.filter(
    t => t.status === 'vacant' && t.id !== transferSourceTable?.id
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Live Floor Plan & Table Shift</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {occupancyPercent}% Seated
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Select a table, transfer running orders between tables, or vacate tables
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip & Search */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-5 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300 font-medium">{vacantCount} Vacant</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-slate-300 font-medium">{runningCount} Occupied / Running</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-300 font-medium">{billedCount} Billed</span>
            </div>
            <div className="text-slate-400 border-l border-slate-700/60 pl-4">
              Total Tables: <strong className="text-white">{totalTables}</strong>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table or section..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center space-x-2 px-6 py-2.5 border-b border-slate-800 bg-slate-900/60 overflow-x-auto">
          <button
            onClick={() => setActiveSection('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === 'All'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            All Sections ({tables.length})
          </button>
          {sections.map(sec => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeSection === sec
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {sec} ({tables.filter(t => t.section === sec).length})
            </button>
          ))}
        </div>

        {/* Tables Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map(tbl => {
            const isSelected = selectedTableId === tbl.id;
            const isOccupied = tbl.status === 'running' || tbl.status === 'billed';
            const { order, total, itemCount, elapsedMinutes } = getTableActiveOrder(tbl);

            return (
              <div
                key={tbl.id}
                className={`group relative rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between p-4 ${
                  tbl.status === 'vacant'
                    ? 'bg-emerald-950/20 border-emerald-600/40 hover:border-emerald-500/80 hover:bg-emerald-950/30'
                    : tbl.status === 'running'
                    ? 'bg-amber-950/30 border-amber-600/50 hover:border-amber-400'
                    : 'bg-blue-950/30 border-blue-600/50 hover:border-blue-400'
                } ${isSelected ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-slate-950' : ''}`}
              >
                {/* Table Header Row */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-black tracking-tight text-white">
                          {tbl.tableNumber}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-brand-400" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <span>{tbl.section}</span>
                        <span>•</span>
                        <Users className="w-3 h-3 text-slate-400 inline" />
                        <span>{tbl.capacity} Pax</span>
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        tbl.status === 'vacant'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tbl.status === 'running'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {tbl.status}
                    </span>
                  </div>

                  {/* Occupied Table Details */}
                  {isOccupied && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 space-y-1.5 text-xs">
                      {order && (
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="font-mono text-[11px] text-brand-400 font-semibold">
                            #{order.orderNumber}
                          </span>
                          <span className="font-bold text-white">
                            {currencySymbol}{total.toFixed(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                        <span className="flex items-center space-x-1 text-amber-300">
                          <Clock className="w-3 h-3" />
                          <span>{elapsedMinutes}m ago</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {tbl.status === 'vacant' && (
                    <div className="mt-3 py-3 text-center rounded-xl bg-slate-900/40 border border-dashed border-emerald-800/40 text-[11px] text-emerald-400/80">
                      Ready for Seating
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      onSelectTable(tbl);
                      onClose();
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    Select
                  </button>

                  {/* Transfer / Shift Button (For Occupied tables) */}
                  {isOccupied && onTransferTable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransferSourceTable(tbl);
                        setTransferTargetTableId('');
                        setTransferError(null);
                      }}
                      title="Transfer / Shift table"
                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all text-xs flex items-center space-x-1"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Shift</span>
                    </button>
                  )}

                  {/* Vacate Button (For Occupied tables) */}
                  {isOccupied && onVacateTable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVacatingTableId(tbl.id);
                      }}
                      title="Clear / Vacate table"
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Search Result */}
        {filteredTables.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Utensils className="w-10 h-10 mx-auto mb-2 text-slate-600 stroke-1" />
            <p className="text-sm font-semibold text-slate-300">No tables match your search</p>
            <p className="text-xs text-slate-500 mt-1">Try changing your search term or section filter</p>
          </div>
        )}
      </div>

      {/* Table Shift / Transfer Modal Dialog */}
      {transferSourceTable && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-amber-400">
                <ArrowRightLeft className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Shift / Transfer Table</h3>
              </div>
              <button
                onClick={() => setTransferSourceTable(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Source Info */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Source Table</span>
                  <strong className="text-sm text-white font-extrabold">{transferSourceTable.tableNumber}</strong>
                  <span className="text-slate-400 ml-1">({transferSourceTable.section})</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-amber-400 block font-semibold">Running Order</span>
                  <span className="text-slate-300 font-mono">
                    {transferSourceTable.currentOrderId ? 'Active Ticket' : 'Seated'}
                  </span>
                </div>
              </div>

              {/* Destination Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Destination Vacant Table:
                </label>
                {availableTargetTables.length === 0 ? (
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs text-center">
                    No vacant tables available right now. Please vacate a table first.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {availableTargetTables.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTransferTargetTableId(t.id)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          transferTargetTableId === t.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/40 font-bold'
                            : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-sm font-black block">{t.tableNumber}</span>
                        <span className="text-[10px] text-slate-400 block">{t.section}</span>
                        <span className="text-[10px] text-slate-500 block">{t.capacity} Pax</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {transferError && (
                <div className="flex items-center space-x-2 text-rose-400 bg-rose-950/30 border border-rose-800/50 p-2.5 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTransferSourceTable(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!transferTargetTableId || isTransferring}
                onClick={handleConfirmTransfer}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5 shadow-lg shadow-amber-950/50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isTransferring ? 'Transferring...' : 'Confirm Table Shift'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Vacate Confirmation Modal */}
      {vacatingTableId && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base">Vacate & Clear Table?</h3>
            <p className="text-xs text-slate-400 mt-2">
              This will reset the table status back to Vacant and release the active order. Use this if the guests left or if the table was marked occupied by mistake.
            </p>
            <div className="flex items-center justify-end space-x-2 mt-5">
              <button
                onClick={() => setVacatingTableId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmVacate(vacatingTableId)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md"
              >
                Yes, Vacate Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
