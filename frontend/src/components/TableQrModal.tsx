import React from 'react';
import { RestaurantTable, RestaurantProfile } from '../types';
import { X, QrCode, Printer, ExternalLink } from 'lucide-react';

interface TableQrModalProps {
  tables: RestaurantTable[];
  profile: RestaurantProfile;
  onOpenCustomerViewForTable: (table: RestaurantTable) => void;
  onClose: () => void;
}

export const TableQrModal: React.FC<TableQrModalProps> = ({
  tables,
  profile,
  onOpenCustomerViewForTable,
  onClose
}) => {
  const getTableUrl = (table: RestaurantTable) => {
    const origin = window.location.origin;
    return `${origin}/?table=${table.qrToken || table.id}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-850">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-brand-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Table QR Codes & Tent Cards</h2>
              <p className="text-xs text-slate-400">Print QR codes for tables. Customers scan and order for their table only.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Table Stands</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* QR Stands Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-slate-900/50">
          {tables.map(table => {
            const tableUrl = getTableUrl(table);
            // Dynamic SVG QR Code generator representation
            return (
              <div
                key={table.id}
                className="bg-white text-slate-900 rounded-2xl p-5 border-2 border-slate-300 shadow-xl flex flex-col items-center text-center relative group"
              >
                {/* Brand & Section */}
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-600">
                  {profile.name}
                </span>
                <span className="text-xs font-semibold text-slate-500 mt-0.5">
                  Section: {table.section}
                </span>

                {/* Big Table Number */}
                <div className="my-2 bg-slate-100 border border-slate-200 px-4 py-1.5 rounded-xl">
                  <span className="text-2xl font-black tracking-tight text-slate-900">
                    TABLE {table.tableNumber}
                  </span>
                </div>

                {/* Simulated High-Res QR Graphic */}
                <div className="p-3 bg-white border-2 border-slate-900 rounded-xl my-2 shadow-inner">
                  <div className="w-32 h-32 flex flex-col items-center justify-center border-4 border-slate-900 p-1 relative bg-slate-50">
                    {/* Corner Markers */}
                    <div className="absolute top-1 left-1 w-6 h-6 border-4 border-slate-900 bg-slate-900 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-white" />
                    </div>
                    <div className="absolute top-1 right-1 w-6 h-6 border-4 border-slate-900 bg-slate-900 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-white" />
                    </div>
                    <div className="absolute bottom-1 left-1 w-6 h-6 border-4 border-slate-900 bg-slate-900 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-white" />
                    </div>

                    {/* Center Icon */}
                    <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md">
                      <QrCode className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] font-bold text-slate-800 mt-1">
                  Scan to View Menu & Order
                </p>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5 max-w-[200px] truncate">
                  {tableUrl}
                </p>

                {/* Live Preview Button */}
                <button
                  onClick={() => onOpenCustomerViewForTable(table)}
                  className="mt-3 flex items-center space-x-1.5 bg-slate-900 hover:bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview as Customer</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
