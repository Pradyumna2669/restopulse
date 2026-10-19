import React, { useState } from 'react';
import { RestaurantTable, RestaurantProfile } from '../types';
import { X, Plus, Edit3, Trash2, RefreshCw, QrCode, Printer, ShieldCheck, ExternalLink } from 'lucide-react';
import { ApiService } from '../services/api';

interface AdminTableManagerModalProps {
  tables: RestaurantTable[];
  profile: RestaurantProfile;
  onRefreshTables: () => void;
  onOpenCustomerViewForTable: (table: RestaurantTable) => void;
  onClose: () => void;
}

export const AdminTableManagerModal: React.FC<AdminTableManagerModalProps> = ({
  tables,
  profile,
  onRefreshTables,
  onOpenCustomerViewForTable,
  onClose
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);

  // Form Fields
  const [tableNumber, setTableNumber] = useState('');
  const [section, setSection] = useState('Ground Floor');
  const [capacity, setCapacity] = useState<number>(4);
  const [saving, setSaving] = useState(false);

  const getTableSecureUrl = (table: RestaurantTable) => {
    const origin = window.location.origin;
    // Secure unguessable token used in URL
    return `${origin}/?table=${table.qrToken || table.id}`;
  };

  const openAddForm = () => {
    setEditingTable(null);
    setTableNumber('');
    setSection('Ground Floor');
    setCapacity(4);
    setIsFormOpen(true);
  };

  const openEditForm = (table: RestaurantTable) => {
    setEditingTable(table);
    setTableNumber(table.tableNumber);
    setSection(table.section);
    setCapacity(table.capacity);
    setIsFormOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    setSaving(true);
    try {
      if (editingTable) {
        await ApiService.updateTable(editingTable.id, {
          tableNumber,
          section,
          capacity
        });
      } else {
        await ApiService.addTable({
          tableNumber,
          section,
          capacity
        });
      }
      onRefreshTables();
      setIsFormOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save table');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTable = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete Table ${num}?`)) return;
    try {
      await ApiService.deleteTable(id);
      onRefreshTables();
    } catch (e: any) {
      alert(e.message || 'Failed to delete table');
    }
  };

  const handleRotateQr = async (id: string, num: string) => {
    if (!confirm(`Regenerate secure QR token for Table ${num}? The old QR code and URL will become inactive.`)) return;
    try {
      await ApiService.rotateTableQr(id);
      onRefreshTables();
      alert(`Secure QR token rotated successfully for Table ${num}!`);
    } catch (e: any) {
      alert(e.message || 'Failed to rotate QR token');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-850">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-brand-400" />
              <span>{profile.name} — Table & QR Code Manager</span>
            </h2>
            <p className="text-xs text-slate-400">
              Tables use cryptographically secure tokens in URLs to prevent customers from tampering with table numbers.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-all"
            >
              <Printer className="w-4 h-4 text-brand-400" />
              <span>Print All Stands</span>
            </button>
            <button
              onClick={openAddForm}
              className="flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Notice Banner */}
        <div className="bg-slate-900/80 px-6 py-2.5 border-b border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>Cryptographic Protection Active:</strong> URLs contain unique random tokens (e.g. <code className="text-brand-300 bg-slate-950 px-1 py-0.5 rounded font-mono">?table=sec_8f93...</code>) so guests cannot alter table numbers.
            </span>
          </span>
          <span className="text-[11px] text-slate-500">{tables.length} Total Tables</span>
        </div>

        {/* Tables Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-900/40">
          {tables.map(table => {
            const secureUrl = getTableSecureUrl(table);
            return (
              <div
                key={table.id}
                className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-600 transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xl font-black text-white tracking-tight">
                        Table {table.tableNumber}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {table.section} • {table.capacity} Pax
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        table.status === 'vacant'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {table.status}
                    </span>
                  </div>

                  {/* Secure QR Token Display */}
                  <div className="mt-3 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Secure QR Token:</span>
                      <button
                        onClick={() => handleRotateQr(table.id, table.tableNumber)}
                        className="text-brand-400 hover:text-brand-300 flex items-center space-x-1"
                        title="Rotate / Regenerate QR token"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Rotate Token</span>
                      </button>
                    </div>
                    <p className="text-[11px] font-mono text-emerald-400 font-bold truncate">
                      {table.qrToken || table.id}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono truncate">
                      {secureUrl}
                    </p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/60">
                  <button
                    onClick={() => onOpenCustomerViewForTable(table)}
                    className="flex items-center space-x-1 text-[11px] text-brand-300 hover:text-white bg-brand-500/10 hover:bg-brand-500/20 px-2.5 py-1 rounded-lg border border-brand-500/30 transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Customer View</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openEditForm(table)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-700 rounded-lg transition-colors"
                      title="Edit Table"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-700 rounded-lg transition-colors"
                      title="Delete Table"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add / Edit Table Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700 bg-slate-850">
                <h3 className="text-sm font-bold text-white">
                  {editingTable ? 'Edit Table' : 'Add New Dining Table'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTable} className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Table Number / Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder="e.g. T-05 or RF-03"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Floor Section
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={e => setSection(e.target.value)}
                    placeholder="e.g. Ground Floor, AC Hall, Rooftop"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                    Seating Capacity (Pax)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all"
                >
                  {saving ? 'Saving...' : editingTable ? 'Update Table' : 'Create Table with Secure QR'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
