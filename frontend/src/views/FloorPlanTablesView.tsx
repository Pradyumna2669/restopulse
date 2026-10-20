import React, { useState } from 'react';
import {
  Plus,
  QrCode,
  RotateCw,
  ArrowRightLeft,
  Users,
  Trash2,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { RestaurantTable, RestaurantProfile, TableStatus } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ApiService } from '../services/api';

interface FloorPlanTablesViewProps {
  tables: RestaurantTable[];
  profile: RestaurantProfile;
  onRefreshTables: () => Promise<void>;
  onOpenCustomerViewForTable: (table: RestaurantTable) => void;
  onTransferTable: (fromTableId: string, toTableId: string) => Promise<void>;
  onVacateTable: (tableId: string) => Promise<void>;
}

export const FloorPlanTablesView: React.FC<FloorPlanTablesViewProps> = ({
  tables,
  profile,
  onRefreshTables,
  onOpenCustomerViewForTable,
  onTransferTable,
  onVacateTable
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeTableForQr, setActiveTableForQr] = useState<RestaurantTable | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromTable, setTransferFromTable] = useState<RestaurantTable | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>('');

  // Add Table Form
  const [tableNumber, setTableNumber] = useState('');
  const [section, setSection] = useState('Main Floor');
  const [capacity, setCapacity] = useState<number>(4);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sections = Array.from(new Set(tables.map(t => t.section))).filter(Boolean);

  const filteredTables = tables.filter(t => {
    return selectedSection === 'all' || t.section === selectedSection;
  });

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;
    try {
      setIsSaving(true);
      await ApiService.addTable({
        tableNumber: tableNumber.trim(),
        section: section.trim() || 'Main Floor',
        capacity: Number(capacity) || 4
      });
      await onRefreshTables();
      setTableNumber('');
      setIsAddModalOpen(false);
      setStatusMessage('Table added successfully');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Failed to add table');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRotateQr = async (tableId: string) => {
    try {
      const updated = await ApiService.rotateTableQr(tableId);
      await onRefreshTables();
      if (activeTableForQr?.id === tableId) {
        setActiveTableForQr(updated.table);
      }
      setStatusMessage('Secure QR token rotated');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Failed to rotate QR');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!window.confirm('Delete this table record?')) return;
    try {
      await ApiService.deleteTable(tableId);
      await onRefreshTables();
      setStatusMessage('Table deleted');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Failed to delete table');
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferFromTable || !transferTargetId) return;
    try {
      await onTransferTable(transferFromTable.id, transferTargetId);
      setIsTransferModalOpen(false);
      setStatusMessage(`Orders transferred to Table`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Transfer failed');
    }
  };

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'running':
        return <Badge variant="warning" size="xs" dot>Running KOT</Badge>;
      case 'billed':
        return <Badge variant="info" size="xs" dot>Bill Generated</Badge>;
      default:
        return <Badge variant="success" size="xs" dot>Vacant</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Floor Plan & QR Tables</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Monitor real-time table occupancy, print encrypted customer QR tokens, and manage guest transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {statusMessage && (
            <span className="text-xs font-medium text-sage-700 bg-sage-50 border border-sage-200 px-3 py-1 rounded-full">
              {statusMessage}
            </span>
          )}

          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Table
          </Button>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setSelectedSection('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedSection === 'all'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 border border-canvas-border hover:bg-canvas-200'
          }`}
        >
          All Sections ({tables.length})
        </button>

        {sections.map(sec => {
          const count = tables.filter(t => t.section === sec).length;
          const isSelected = selectedSection === sec;
          return (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-canvas-border hover:bg-canvas-200'
              }`}
            >
              <span>{sec}</span>
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-stone-700 text-white' : 'bg-canvas-200 text-stone-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tables Floor Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map(tbl => {
          const isOccupied = tbl.status === 'running' || tbl.status === 'billed';

          return (
            <Card
              key={tbl.id}
              hoverEffect
              className={`flex flex-col justify-between p-5 border-2 ${
                tbl.status === 'running'
                  ? 'border-amber-300 bg-amber-50/20'
                  : tbl.status === 'billed'
                  ? 'border-blue-300 bg-blue-50/20'
                  : 'border-canvas-border bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-mono text-stone-900">
                      {tbl.tableNumber}
                    </span>
                    <span className="text-xs text-stone-400 font-medium">
                      • {tbl.section}
                    </span>
                  </div>
                  {getStatusBadge(tbl.status)}
                </div>

                <div className="py-3 flex items-center justify-between text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span>Capacity: {tbl.capacity} Pax</span>
                  </span>

                  <span className="font-mono text-[11px] text-stone-400">
                    Token: {(tbl.qrToken || tbl.id).slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-canvas-border flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setActiveTableForQr(tbl);
                      setIsQrModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-canvas-100 hover:bg-stone-900 hover:text-white border border-canvas-border text-stone-600 transition-colors"
                    title="View & Print Table QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenCustomerViewForTable(tbl)}
                    className="p-2 rounded-xl bg-canvas-100 hover:bg-terracotta-500 hover:text-white border border-canvas-border text-stone-600 transition-colors"
                    title="Open Customer Mobile Menu View"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>

                  {isOccupied && (
                    <button
                      onClick={() => {
                        setTransferFromTable(tbl);
                        setIsTransferModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-canvas-100 hover:bg-blue-600 hover:text-white border border-canvas-border text-stone-600 transition-colors"
                      title="Transfer Orders to Another Table"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {isOccupied && (
                    <button
                      onClick={() => onVacateTable(tbl.id)}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold transition-colors"
                      title="Clear table occupancy"
                    >
                      Vacate
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteTable(tbl.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 transition-colors"
                    title="Delete Table"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Table Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Restaurant Table"
        subtitle="Create a new physical dining table with automated encrypted QR token."
        maxWidth="md"
      >
        <form onSubmit={handleAddTable} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Table Number *</label>
            <input
              type="text"
              required
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="e.g. T-05, AC-03, Rooftop-1"
              className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Dining Section</label>
              <input
                type="text"
                value={section}
                onChange={e => setSection(e.target.value)}
                placeholder="Main Floor, Rooftop, Patio"
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Capacity (Pax)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={capacity}
                onChange={e => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-canvas-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
            >
              Create Table
            </Button>
          </div>
        </form>
      </Modal>

      {/* Table QR Stand Modal */}
      {activeTableForQr && (
        <Modal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          title={`Table ${activeTableForQr.tableNumber} QR Code`}
          subtitle={`Section: ${activeTableForQr.section} • Cryptographic Token Protected`}
          maxWidth="md"
        >
          <div className="text-center space-y-5">
            {/* Printable Table Tent Preview */}
            <div className="p-6 bg-canvas-100 border-2 border-stone-800 rounded-3xl inline-block shadow-sm max-w-xs mx-auto">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 block mb-1">
                SCAN TO ORDER & PAY
              </span>
              <h3 className="text-base font-bold text-stone-900">{profile.name}</h3>

              {/* QR Image */}
              <div className="my-4 bg-white p-3 rounded-2xl border border-canvas-border inline-block shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${window.location.origin}/?table=${activeTableForQr.qrToken || activeTableForQr.id}`
                  )}`}
                  alt={`QR for Table ${activeTableForQr.tableNumber}`}
                  className="w-44 h-44 mx-auto"
                />
              </div>

              <div className="bg-stone-900 text-white rounded-xl py-1.5 px-3 font-mono font-bold text-sm">
                TABLE {activeTableForQr.tableNumber}
              </div>
              <p className="text-[10px] text-stone-500 mt-2">
                Fast & contactless ordering from your phone
              </p>
            </div>

            {/* Rotation & Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                onClick={() => handleRotateQr(activeTableForQr.id)}
              >
                Rotate Token
              </Button>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => onOpenCustomerViewForTable(activeTableForQr)}
              >
                Test QR Link
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Transfer Table Modal */}
      {transferFromTable && (
        <Modal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          title={`Shift Table ${transferFromTable.tableNumber}`}
          subtitle="Move active KOT tickets and bill items to another table."
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-stone-600">
              Select destination vacant table for <strong>Table {transferFromTable.tableNumber}</strong>:
            </p>

            <select
              value={transferTargetId}
              onChange={e => setTransferTargetId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-canvas-100 border border-canvas-border text-xs text-stone-900 focus:outline-none focus:border-stone-400"
            >
              <option value="">Select target table...</option>
              {tables
                .filter(t => t.id !== transferFromTable.id && t.status === 'vacant')
                .map(t => (
                  <option key={t.id} value={t.id}>
                    Table {t.tableNumber} ({t.section} - {t.capacity} Pax)
                  </option>
                ))}
            </select>

            <div className="pt-3 border-t border-canvas-border flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsTransferModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!transferTargetId}
                onClick={handleConfirmTransfer}
              >
                Confirm Table Shift
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
