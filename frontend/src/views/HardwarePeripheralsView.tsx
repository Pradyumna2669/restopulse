import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { hardwareManager } from '../services/hardware';
import {
  MenuItem,
  WeighingScaleProtocol,
  WeighingScaleReading,
  WeighableItemPriceCalculation,
  BarcodeResolvedItem,
  VfdGeneratedCommands,
  HardwarePeripheralsStatus
} from '../types';

interface HardwarePeripheralsViewProps {
  menuItems: MenuItem[];
  onAddToCart?: (item: MenuItem, quantity?: number, customPrice?: number, weight?: number, weightUnit?: 'g' | 'kg') => void;
  cartCount?: number;
  cartTotal?: number;
}

export const HardwarePeripheralsView: React.FC<HardwarePeripheralsViewProps> = ({
  menuItems,
  onAddToCart,
  cartCount = 0,
  cartTotal = 0
}) => {
  const [activeTab, setActiveTab] = useState<'scale' | 'scanner' | 'vfd'>('scale');
  const [status, setStatus] = useState<HardwarePeripheralsStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // --- Scale State ---
  const [scaleReading, setScaleReading] = useState<WeighingScaleReading>({
    rawWeight: 0.45,
    tareWeight: 0,
    netWeight: 0.45,
    unit: 'kg',
    isStable: true,
    protocol: 'CAS',
    rawPacket: 'ST,GS,+  0.450kg\r\n',
    timestamp: new Date().toISOString()
  });
  const [simWeight, setSimWeight] = useState<number>(0.45);
  const [simStable, setSimStable] = useState<boolean>(true);
  const [scaleProtocol, setScaleProtocol] = useState<WeighingScaleProtocol>('CAS');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [scaleUnit, setScaleUnit] = useState<'kg' | 'g'>('kg');
  const [serialConsoleLogs, setSerialConsoleLogs] = useState<string[]>([]);

  // Weighed Item Calculator
  const weighableCatalog = menuItems.filter(m => m.isWeighed || m.pricePerKg);
  const [selectedWeighableId, setSelectedWeighableId] = useState<string>(
    weighableCatalog[0]?.id || 'item_pistachio_mithai'
  );
  const [calculatedPriceInfo, setCalculatedPriceInfo] = useState<WeighableItemPriceCalculation | null>(null);

  // --- Barcode Scanner State ---
  const [scannedItemsHistory, setScannedItemsHistory] = useState<BarcodeResolvedItem[]>([]);
  const [manualBarcodeInput, setManualBarcodeInput] = useState<string>('');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // --- VFD State ---
  const [vfdLine1, setVfdLine1] = useState<string>('  WELCOME TO RESTO  ');
  const [vfdLine2, setVfdLine2] = useState<string>('   HOSPITALITY POS  ');
  const [vfdHex, setVfdHex] = useState<string>('1b400c1b5141202057454c434f4d4520544f20524553544f20200d1b5142202020484f53504954414c49545920504f5320200d');
  const [customVfdL1, setCustomVfdL1] = useState<string>('');
  const [customVfdL2, setCustomVfdL2] = useState<string>('');

  // Initial load
  useEffect(() => {
    loadHardwareStatus();

    // Subscribe to global barcode listener
    const unsubscribeBarcode = hardwareManager.subscribeBarcodeScanner((resolved) => {
      setScannedItemsHistory(prev => [resolved, ...prev.slice(0, 19)]);
      setScanMessage({
        text: `Scanned: ${resolved.menuItem.name} ${resolved.isWeightEmbedded ? `(${resolved.embeddedWeight}kg)` : ''} — ₹${resolved.finalPrice.toFixed(2)}`,
        type: 'success'
      });
      // Also update customer VFD display
      hardwareManager.updateVfdItemAdded(resolved.menuItem.name, resolved.finalPrice, (cartTotal || 0) + resolved.finalPrice);
    });

    return () => {
      unsubscribeBarcode();
    };
  }, []);

  // Update weighed price calculation when scale reading or selected item changes
  useEffect(() => {
    if (selectedWeighableId && scaleReading) {
      calculatePrice(selectedWeighableId, scaleReading.netWeight, scaleReading.unit);
    }
  }, [selectedWeighableId, scaleReading.netWeight, scaleReading.unit]);

  const loadHardwareStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getHardwareStatus();
      setStatus(res);
      setScaleReading(res.scale.currentReading);
      setVfdLine1(res.vfd.currentLine1);
      setVfdLine2(res.vfd.currentLine2);
      setVfdHex(res.vfd.lastCommandHex);
    } catch (err) {
      console.warn('Failed to fetch hardware status from server:', err);
    } finally {
      setLoading(false);
    }
  };

  const logSerial = (packet: string) => {
    setSerialConsoleLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ${packet.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}`,
      ...prev.slice(0, 25)
    ]);
  };

  // --- Scale Handlers ---
  const handleSimulateWeight = async (weight: number, stable: boolean = simStable, unit: 'kg' | 'g' = scaleUnit) => {
    setSimWeight(weight);
    setSimStable(stable);
    try {
      const updated = await api.simulateScale(weight, stable, unit);
      setScaleReading(updated);
      logSerial(updated.rawPacket);
    } catch (err) {
      console.error('Scale simulation failed:', err);
    }
  };

  const handleTare = async () => {
    try {
      hardwareManager.playBeep(1200, 0.05);
      const res = await api.setScaleTare();
      const updated = await api.readScale();
      setScaleReading(updated);
      logSerial(`TARE APPLIED: ${res.tareWeight.toFixed(3)}kg (Net: ${res.netWeight.toFixed(3)}kg)`);
    } catch (err) {
      console.error('Tare failed:', err);
    }
  };

  const handleResetTare = async () => {
    try {
      hardwareManager.playBeep(900, 0.05);
      const res = await api.resetScaleTare();
      const updated = await api.readScale();
      setScaleReading(updated);
      logSerial(`TARE ZEROED: 0.000kg (Net: ${res.netWeight.toFixed(3)}kg)`);
    } catch (err) {
      console.error('Tare reset failed:', err);
    }
  };

  const handleConnectWebSerial = async () => {
    try {
      const connected = await hardwareManager.connectWebSerialScale(baudRate);
      if (connected) {
        setIsSerialConnected(true);
        logSerial(`Web Serial Port connected at ${baudRate} baud (8-N-1)`);
      }
    } catch (err: any) {
      alert(`Serial connection failed: ${err.message || err}`);
    }
  };

  const calculatePrice = async (itemId: string, weight: number, unit: 'g' | 'kg') => {
    try {
      const calc = await api.calculateWeighedPrice(itemId, weight, unit);
      setCalculatedPriceInfo(calc);
    } catch {
      setCalculatedPriceInfo(null);
    }
  };

  const handleAddWeighedItemToCart = () => {
    if (!calculatedPriceInfo) return;
    const item = menuItems.find(m => m.id === calculatedPriceInfo.menuItemId);
    if (!item) return;

    hardwareManager.playBeep(1950, 0.08);

    if (onAddToCart) {
      onAddToCart(
        item,
        1,
        calculatedPriceInfo.calculatedPrice,
        calculatedPriceInfo.netWeight,
        calculatedPriceInfo.unit
      );
    }

    // Update VFD display
    const newTotal = (cartTotal || 0) + calculatedPriceInfo.calculatedPrice;
    hardwareManager.updateVfdItemAdded(item.name, calculatedPriceInfo.calculatedPrice, newTotal);
    setScanMessage({
      text: `Added ${item.name} (${calculatedPriceInfo.formattedDisplay}) to active cart!`,
      type: 'success'
    });
  };

  // --- Barcode Handlers ---
  const handleManualScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcodeInput.trim()) return;

    try {
      const resolved = await api.scanBarcode(manualBarcodeInput.trim(), 'manual_entry');
      hardwareManager.playBeep(2200, 0.07);
      setScannedItemsHistory(prev => [resolved, ...prev.slice(0, 19)]);
      setScanMessage({
        text: `Matched: ${resolved.menuItem.name} — ₹${resolved.finalPrice.toFixed(2)}`,
        type: 'success'
      });
      setManualBarcodeInput('');

      if (onAddToCart) {
        onAddToCart(
          resolved.menuItem,
          resolved.quantity,
          resolved.finalPrice,
          resolved.embeddedWeight,
          'kg'
        );
      }
      hardwareManager.updateVfdItemAdded(resolved.menuItem.name, resolved.finalPrice, (cartTotal || 0) + resolved.finalPrice);
    } catch (err: any) {
      hardwareManager.playBeep(350, 0.15, 'sawtooth');
      setScanMessage({
        text: err.message || `Barcode '${manualBarcodeInput}' not recognized`,
        type: 'error'
      });
    }
  };

  const handleTestBarcodeClick = async (barcode: string) => {
    setManualBarcodeInput(barcode);
    try {
      const resolved = await api.scanBarcode(barcode, 'manual_entry');
      hardwareManager.playBeep(2200, 0.07);
      setScannedItemsHistory(prev => [resolved, ...prev.slice(0, 19)]);
      setScanMessage({
        text: `Scanned: ${resolved.menuItem.name} ${resolved.isWeightEmbedded ? `(GS1 Weighed: ${resolved.embeddedWeight}kg)` : ''} — ₹${resolved.finalPrice.toFixed(2)}`,
        type: 'success'
      });

      if (onAddToCart) {
        onAddToCart(
          resolved.menuItem,
          resolved.quantity,
          resolved.finalPrice,
          resolved.embeddedWeight,
          'kg'
        );
      }
      hardwareManager.updateVfdItemAdded(resolved.menuItem.name, resolved.finalPrice, (cartTotal || 0) + resolved.finalPrice);
    } catch (err: any) {
      hardwareManager.playBeep(350, 0.15, 'sawtooth');
      setScanMessage({
        text: err.message || 'Unrecognized test barcode',
        type: 'error'
      });
    }
  };

  // --- VFD Handlers ---
  const applyVfdPreset = async (preset: 'welcome' | 'item' | 'total' | 'checkout' | 'thankyou') => {
    try {
      hardwareManager.playBeep(1400, 0.05);
      let res: VfdGeneratedCommands;
      if (preset === 'welcome') {
        res = await api.displayVfdWelcome('RestoPulse');
      } else if (preset === 'item') {
        res = await api.displayVfdItemAdded('Paneer Tikka', 280, 560);
      } else if (preset === 'total') {
        res = await api.displayVfd('2 ITEMS IN CART', 'TOTAL:      ₹ 560.00');
      } else if (preset === 'checkout') {
        res = await api.displayVfdCheckout(560, 'UPI / GPay');
      } else {
        res = await api.displayVfdThankYou(40);
      }

      setVfdLine1(res.line1Formatted);
      setVfdLine2(res.line2Formatted);
      setVfdHex(res.rawHex);
    } catch (err) {
      console.error('VFD preset update failed:', err);
    }
  };

  const handleCustomVfdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.displayVfd(customVfdL1, customVfdL2);
      setVfdLine1(res.line1Formatted);
      setVfdLine2(res.line2Formatted);
      setVfdHex(res.rawHex);
      setCustomVfdL1('');
      setCustomVfdL2('');
    } catch (err) {
      console.error('Custom VFD message failed:', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚖️</span>
            <h1 className="text-2xl font-bold tracking-tight text-stone-100">
              Hardware Peripherals & POS Integrations
            </h1>
          </div>
          <p className="text-sm text-stone-400 mt-1">
            Native RS-232 / USB digital weighing scales, global barcode gun listener, and customer-facing 2x20 VFD pole displays.
          </p>
        </div>

        {/* Live Status Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {loading && (
            <span className="text-xs text-stone-500 font-mono animate-pulse">Syncing...</span>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Scale: {isSerialConnected ? 'Web Serial Port Active' : (status?.scale.simulated ? 'Simulator Online' : 'Active')}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/80 text-blue-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Barcode Gun: Global Hook Active ({status?.scanner.totalScansToday || 0} scans)
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/60 border border-amber-800/80 text-amber-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            VFD Pole: 2x20 ESC/POS Ready
          </div>
          {cartCount > 0 && (
            <div className="px-3 py-1.5 rounded-full bg-stone-800 border border-stone-700 text-stone-300 text-xs font-medium">
              Cart: {cartCount} items (₹{cartTotal.toFixed(2)})
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-stone-800 gap-2">
        <button
          onClick={() => setActiveTab('scale')}
          className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'scale'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <span>⚖️</span>
          <span>Digital Weighing Scale & Gram-to-Price</span>
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'scanner'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <span>📦</span>
          <span>USB Barcode Scanner & Retail GS1 Bench</span>
        </button>
        <button
          onClick={() => setActiveTab('vfd')}
          className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'vfd'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <span>📟</span>
          <span>Customer VFD Pole Display (2x20 ESC/POS)</span>
        </button>
      </div>

      {/* TAB 1: DIGITAL WEIGHING SCALE */}
      {activeTab === 'scale' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Visual Digital Scale Terminal (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Scale Hardware Unit Console */}
            <div className="bg-[#121614] rounded-2xl border border-stone-800 p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-stone-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 font-semibold">
                    DIGITAL BENCH SCALE — RS-232 / SERIAL STREAM
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 font-mono">PROTOCOL:</span>
                  <span className="text-xs bg-stone-800 text-stone-200 px-2 py-0.5 rounded font-mono font-bold">
                    {scaleProtocol}
                  </span>
                </div>
              </div>

              {/* Digital LED Readout */}
              <div className="my-6 p-6 rounded-xl bg-black border-2 border-stone-800/90 flex flex-col items-center justify-center relative shadow-inner">
                {/* Status Annunciator Lamps */}
                <div className="flex items-center justify-between w-full mb-3 px-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${scaleReading.isStable ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-stone-800'}`} />
                      <span className="font-mono text-[10px] tracking-wider text-stone-400">STABLE</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${!scaleReading.isStable ? 'bg-amber-500 shadow-[0_0_8px_#F59E0B]' : 'bg-stone-800'}`} />
                      <span className="font-mono text-[10px] tracking-wider text-stone-400">MOTION</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${scaleReading.tareWeight > 0 ? 'bg-blue-500 shadow-[0_0_8px_#3B82F6]' : 'bg-stone-800'}`} />
                      <span className="font-mono text-[10px] tracking-wider text-stone-400">NET</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${scaleReading.netWeight === 0 ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-stone-800'}`} />
                      <span className="font-mono text-[10px] tracking-wider text-stone-400">ZERO</span>
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-500 tracking-wider">
                    {scaleReading.unit.toUpperCase()}
                  </div>
                </div>

                {/* Big 7-Segment Value Display */}
                <div className="flex items-baseline gap-3 my-2">
                  <span className="font-mono text-6xl md:text-7xl font-extrabold tracking-tight text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                    {scaleReading.unit === 'g'
                      ? Math.round(scaleReading.netWeight * 1000)
                      : scaleReading.netWeight.toFixed(3)}
                  </span>
                  <span className="font-mono text-2xl font-bold text-emerald-600">
                    {scaleReading.unit}
                  </span>
                </div>

                {/* Gross & Tare Secondary Readouts */}
                <div className="w-full flex items-center justify-between pt-4 mt-2 border-t border-stone-900 text-xs font-mono text-stone-400 px-2">
                  <div>
                    GROSS: <span className="text-stone-200 font-bold">{scaleReading.rawWeight.toFixed(3)} kg</span>
                  </div>
                  <div>
                    TARE: <span className="text-blue-400 font-bold">{scaleReading.tareWeight.toFixed(3)} kg</span>
                  </div>
                  <div>
                    NET: <span className="text-emerald-400 font-bold">{scaleReading.netWeight.toFixed(3)} kg</span>
                  </div>
                </div>
              </div>

              {/* Hardware Control Buttons (Tare, Zero, Unit) */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={handleTare}
                  className="py-3 px-4 rounded-xl bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/60 text-blue-200 font-mono font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                >
                  <span>⚖️</span>
                  <span>ZERO / TARE</span>
                </button>
                <button
                  onClick={handleResetTare}
                  className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 font-mono font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                >
                  <span>↺</span>
                  <span>RESET TARE</span>
                </button>
                <button
                  onClick={() => {
                    const nextUnit = scaleUnit === 'kg' ? 'g' : 'kg';
                    setScaleUnit(nextUnit);
                    handleSimulateWeight(simWeight, simStable, nextUnit);
                  }}
                  className="py-3 px-4 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 text-emerald-300 font-mono font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                >
                  <span>⇄</span>
                  <span>UNIT: {scaleUnit.toUpperCase()}</span>
                </button>
              </div>

              {/* Pan Weight Simulation Slider */}
              <div className="mt-6 pt-5 border-t border-stone-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="font-semibold text-stone-300">Scale Pan Simulator (Simulate Weight on Pan):</span>
                  <span className="font-mono text-emerald-400 font-bold">{simWeight.toFixed(3)} kg</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.025"
                  value={simWeight}
                  onChange={(e) => handleSimulateWeight(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-stone-800 rounded-lg"
                />

                {/* Quick Weight Preset Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: '0.000 (Empty)', val: 0 },
                    { label: '0.150 kg (Plate)', val: 0.15 },
                    { label: '0.450 kg (Mithai Box)', val: 0.45 },
                    { label: '1.250 kg (Cake)', val: 1.25 },
                    { label: '2.500 kg', val: 2.5 },
                    { label: '5.000 kg', val: 5.0 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleSimulateWeight(preset.val)}
                      className="px-2.5 py-1 text-xs rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700/80 transition-colors font-mono"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    onClick={() => handleSimulateWeight(simWeight, !simStable)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors font-mono ${
                      !simStable
                        ? 'bg-amber-900/40 border-amber-700 text-amber-300'
                        : 'bg-stone-800 border-stone-700 text-stone-400'
                    }`}
                  >
                    {!simStable ? '⚡ Motion Active' : 'Toggle Motion'}
                  </button>
                </div>
              </div>
            </div>

            {/* RS-232 Serial Port Connection Panel */}
            <div className="bg-[#121614] rounded-2xl border border-stone-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wide flex items-center gap-2">
                  <span>🔌</span>
                  <span>Physical RS-232 / USB Serial Port Bridge</span>
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono">
                  Web Serial API
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-stone-400 block mb-1">Scale Protocol</label>
                  <select
                    value={scaleProtocol}
                    onChange={(e) => setScaleProtocol(e.target.value as WeighingScaleProtocol)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="CAS">CAS (AP-1 / PD-II / DB-II)</option>
                    <option value="ESSAE">Essae-Teraoka (DS-215 / 852)</option>
                    <option value="TOLEDO">Mettler Toledo (8217 / PS60)</option>
                    <option value="GENERIC_ASCII">Generic Continuous ASCII</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-stone-400 block mb-1">Baud Rate (COM Port)</label>
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(parseInt(e.target.value, 10))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value={9600}>9600 (Standard)</option>
                    <option value={4800}>4800</option>
                    <option value={19200}>19200</option>
                    <option value={38400}>38400</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleConnectWebSerial}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs flex items-center justify-center gap-2 shadow transition-all"
                  >
                    <span>⚡</span>
                    <span>Connect COM Port</span>
                  </button>
                </div>
              </div>

              {/* Serial Packet Monitor Log */}
              <div className="pt-2">
                <span className="text-[11px] font-mono text-stone-400 block mb-1">Raw Continuous Serial Feed:</span>
                <div className="bg-black/90 p-3 rounded-lg border border-stone-800 font-mono text-[11px] text-emerald-400 h-28 overflow-y-auto space-y-0.5">
                  {serialConsoleLogs.length > 0 ? (
                    serialConsoleLogs.map((log, idx) => <div key={idx}>{log}</div>)
                  ) : (
                    <div className="text-stone-600 italic">Continuous serial stream packet log will appear here...</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Gram-to-Price Deli Calculator (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#121614] rounded-2xl border border-stone-800 p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <h3 className="font-bold text-stone-100 flex items-center gap-2">
                  <span>🍰</span>
                  <span>Bakery & Deli Gram-to-Price Engine</span>
                </h3>
                <span className="text-xs bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-medium">
                  Live Sync
                </span>
              </div>

              {/* Item Selection */}
              <div>
                <label className="text-xs text-stone-400 block mb-1.5 font-medium">
                  Select Weighed Product (Sold by Gram / Kg):
                </label>
                <select
                  value={selectedWeighableId}
                  onChange={(e) => setSelectedWeighableId(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {weighableCatalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — ₹{item.pricePerKg || item.basePrice}/kg
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Price Calculation Card */}
              {calculatedPriceInfo && (
                <div className="p-5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-4 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-stone-100 text-base">{calculatedPriceInfo.name}</h4>
                      <div className="text-xs text-stone-400 mt-0.5">
                        Rate: <span className="text-stone-300 font-bold">₹{calculatedPriceInfo.pricePerKg}/kg</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-stone-800 border border-stone-700 font-mono text-emerald-400">
                      {(calculatedPriceInfo.netWeight * 1000).toFixed(0)}g
                    </span>
                  </div>

                  <div className="p-3 bg-black/60 rounded-lg border border-stone-800 flex items-center justify-between">
                    <span className="text-xs text-stone-400">Calculated Final Price:</span>
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      ₹{calculatedPriceInfo.calculatedPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-stone-400 bg-stone-950/60 p-2.5 rounded border border-stone-800/80">
                    Formula: {calculatedPriceInfo.formattedDisplay}
                  </div>

                  <button
                    onClick={handleAddWeighedItemToCart}
                    disabled={calculatedPriceInfo.calculatedPrice <= 0}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>🛒</span>
                    <span>Add Weighed Item to Cart (₹{calculatedPriceInfo.calculatedPrice.toFixed(2)})</span>
                  </button>
                </div>
              )}

              {/* Supported Deli Items Quick Picker */}
              <div>
                <span className="text-xs font-semibold text-stone-300 block mb-2">Popular Weighable Deli Items:</span>
                <div className="grid grid-cols-1 gap-2">
                  {weighableCatalog.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedWeighableId(item.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                        selectedWeighableId === item.id
                          ? 'bg-emerald-950/30 border-emerald-600'
                          : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="text-xs font-medium text-stone-200">{item.name}</div>
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        ₹{item.pricePerKg || item.basePrice}/kg
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USB BARCODE SCANNER BENCH */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Barcode Gun Monitor & Quick Barcodes (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#121614] rounded-2xl border border-stone-800 p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔫</span>
                  <h3 className="font-bold text-stone-100">Global USB / HID Barcode Scanner Hook</h3>
                </div>
                <button
                  onClick={() => hardwareManager.playBeep()}
                  className="px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 flex items-center gap-1 font-mono"
                >
                  <span>🔊</span>
                  <span>Test Beep</span>
                </button>
              </div>

              {/* Scanner Status Banner */}
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/80 flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
                <div className="text-xs text-stone-300 leading-relaxed">
                  <span className="font-bold text-emerald-400">Scanner Ready: </span>
                  Point your physical USB barcode gun at any barcode and squeeze the trigger. The keystrokes are intercepted globally with zero need for input focus.
                </div>
              </div>

              {/* Manual Barcode Entry / Gun Test Box */}
              <form onSubmit={handleManualScanSubmit} className="space-y-3">
                <label className="text-xs text-stone-400 block font-medium">
                  Scan Simulator / Manual Barcode Input:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualBarcodeInput}
                    onChange={(e) => setManualBarcodeInput(e.target.value)}
                    placeholder="Enter EAN-13, SKU, or GS1 barcode..."
                    className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow"
                  >
                    Scan
                  </button>
                </div>
              </form>

              {/* Scan Toast Message */}
              {scanMessage && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono flex items-center justify-between ${
                    scanMessage.type === 'success'
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  <span>{scanMessage.text}</span>
                  <button onClick={() => setScanMessage(null)} className="text-stone-400 hover:text-stone-200">
                    ✕
                  </button>
                </div>
              )}

              {/* 1-Click Barcode Test Cards */}
              <div className="pt-3 border-t border-stone-800/80 space-y-3">
                <span className="text-xs font-semibold text-stone-300 block">
                  1-Click Test Barcodes (Click to simulate scanner hardware read):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleTestBarcodeClick('8901030000018')}
                    className="p-3 bg-stone-900 hover:bg-stone-800/80 rounded-xl border border-stone-800 text-left transition-all group"
                  >
                    <div className="text-xs font-bold text-stone-200 group-hover:text-emerald-400">
                      Paneer Tikka Angara
                    </div>
                    <div className="text-[11px] font-mono text-stone-400 mt-1 flex justify-between">
                      <span>EAN-13: 8901030000018</span>
                      <span className="text-emerald-400 font-bold">₹280.00</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTestBarcodeClick('8901030000025')}
                    className="p-3 bg-stone-900 hover:bg-stone-800/80 rounded-xl border border-stone-800 text-left transition-all group"
                  >
                    <div className="text-xs font-bold text-stone-200 group-hover:text-emerald-400">
                      Classic Butter Chicken
                    </div>
                    <div className="text-[11px] font-mono text-stone-400 mt-1 flex justify-between">
                      <span>EAN-13: 8901030000025</span>
                      <span className="text-emerald-400 font-bold">₹380.00</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTestBarcodeClick('2000101004508')}
                    className="p-3 bg-stone-900 hover:bg-stone-800/80 rounded-xl border border-emerald-900/50 text-left transition-all group"
                  >
                    <div className="text-xs font-bold text-emerald-300">
                      GS1 Weighed: 450g Pistachio Mithai
                    </div>
                    <div className="text-[11px] font-mono text-stone-400 mt-1 flex justify-between">
                      <span>GS1: 2000101004508</span>
                      <span className="text-emerald-400 font-bold">₹427.50</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTestBarcodeClick('2000102012005')}
                    className="p-3 bg-stone-900 hover:bg-stone-800/80 rounded-xl border border-emerald-900/50 text-left transition-all group"
                  >
                    <div className="text-xs font-bold text-emerald-300">
                      GS1 Weighed: 1.2kg Truffle Cake
                    </div>
                    <div className="text-[11px] font-mono text-stone-400 mt-1 flex justify-between">
                      <span>GS1: 2000102012005</span>
                      <span className="text-emerald-400 font-bold">₹1,020.00</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Scan Audit History Log (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#121614] rounded-2xl border border-stone-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <h3 className="font-bold text-stone-100 flex items-center gap-2">
                  <span>📜</span>
                  <span>Scanner Audit Trail</span>
                </h3>
                <span className="text-xs font-mono text-stone-400">
                  {scannedItemsHistory.length} Scans Today
                </span>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {scannedItemsHistory.length > 0 ? (
                  scannedItemsHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-stone-900 border border-stone-800/90 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-stone-200">{item.menuItem.name}</div>
                        <div className="text-[11px] font-mono text-stone-400 mt-0.5">
                          {item.isWeightEmbedded
                            ? `GS1 Weighed: ${item.embeddedWeight}kg @ ₹${item.unitPrice}/kg`
                            : `Code: ${item.barcode}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-400">
                          ₹{item.finalPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          {new Date(item.resolvedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-stone-500 text-xs italic">
                    No items scanned yet. Use the barcode gun or click one of the test cards to see live resolution!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER VFD POLE DISPLAY */}
      {activeTab === 'vfd' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Visual Hardware Replica (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#121614] rounded-2xl border border-stone-800 p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📟</span>
                  <h3 className="font-bold text-stone-100">
                    Customer-Facing 2x20 VFD Pole Display Replica
                  </h3>
                </div>
                <span className="text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                  20 COLUMNS × 2 ROWS
                </span>
              </div>

              {/* Physical VFD Hardware Box */}
              <div className="p-8 rounded-2xl bg-[#090D0B] border-4 border-[#222824] shadow-[0_15px_35px_rgba(0,0,0,0.8)] relative flex flex-col items-center">
                {/* VFD Bezel Glass */}
                <div className="w-full max-w-lg bg-[#040E07] border-2 border-[#12311D] rounded-lg p-5 shadow-inner relative overflow-hidden">
                  {/* Subtle matrix scanlines overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

                  {/* Line 1 */}
                  <div className="font-mono text-xl md:text-2xl font-bold tracking-[0.25em] text-[#00FFA6] drop-shadow-[0_0_12px_#00FFA6] whitespace-pre select-none">
                    {vfdLine1}
                  </div>

                  {/* Line 2 */}
                  <div className="font-mono text-xl md:text-2xl font-bold tracking-[0.25em] text-[#00FFA6] drop-shadow-[0_0_12px_#00FFA6] whitespace-pre select-none mt-2">
                    {vfdLine2}
                  </div>
                </div>

                {/* Pole Stand Neck Graphic */}
                <div className="w-10 h-8 bg-gradient-to-b from-[#222824] to-[#141816] border-x border-[#2E3631] mt-2" />
                <div className="w-28 h-3 bg-[#1C221E] rounded-full border border-[#2E3631]" />
              </div>

              {/* Preset Buttons */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-stone-400 block">
                  Quick Standard ESC/POS Screen Presets:
                </span>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <button
                    onClick={() => applyVfdPreset('welcome')}
                    className="p-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
                  >
                    1. Welcome
                  </button>
                  <button
                    onClick={() => applyVfdPreset('item')}
                    className="p-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
                  >
                    2. Item Added
                  </button>
                  <button
                    onClick={() => applyVfdPreset('total')}
                    className="p-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
                  >
                    3. Cart Total
                  </button>
                  <button
                    onClick={() => applyVfdPreset('checkout')}
                    className="p-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
                  >
                    4. Bill Paid
                  </button>
                  <button
                    onClick={() => applyVfdPreset('thankyou')}
                    className="p-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
                  >
                    5. Thank You
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Custom Message Transmitter & Raw Hex Command Inspector (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Custom Message Transmitter */}
            <div className="bg-[#121614] rounded-2xl border border-stone-800 p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-stone-100 flex items-center gap-2">
                <span>✍️</span>
                <span>Custom 2x20 Message Composer</span>
              </h3>

              <form onSubmit={handleCustomVfdSubmit} className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-stone-400 mb-1">
                    <span>Line 1 (Max 20 chars):</span>
                    <span className="font-mono">{customVfdL1.length}/20</span>
                  </div>
                  <input
                    type="text"
                    maxLength={20}
                    value={customVfdL1}
                    onChange={(e) => setCustomVfdL1(e.target.value)}
                    placeholder="ENTER LINE 1 TEXT"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-stone-400 mb-1">
                    <span>Line 2 (Max 20 chars):</span>
                    <span className="font-mono">{customVfdL2.length}/20</span>
                  </div>
                  <input
                    type="text"
                    maxLength={20}
                    value={customVfdL2}
                    onChange={(e) => setCustomVfdL2(e.target.value)}
                    placeholder="ENTER LINE 2 TEXT"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wide transition-all shadow"
                >
                  Transmit to VFD Pole Display
                </button>
              </form>
            </div>

            {/* Raw ESC/POS Hex Inspector */}
            <div className="bg-[#121614] rounded-2xl border border-stone-800 p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wide flex items-center gap-1.5">
                  <span>🔬</span>
                  <span>ESC/POS Command Hex Stream</span>
                </h4>
                <span className="text-[10px] font-mono text-stone-500">
                  {vfdHex.length / 2} BYTES
                </span>
              </div>

              <div className="bg-black/80 p-3 rounded-lg border border-stone-800 font-mono text-xs text-emerald-500 break-all leading-relaxed max-h-36 overflow-y-auto">
                {vfdHex ? (
                  vfdHex.match(/.{1,2}/g)?.join(' ')
                ) : (
                  <span className="text-stone-600 italic">No command bytes dispatched yet</span>
                )}
              </div>

              <div className="text-[11px] text-stone-400 leading-normal bg-stone-950/60 p-2.5 rounded border border-stone-800/80">
                Commands include <code className="text-emerald-400 font-mono">1B 40</code> (ESC @ Initialize),{' '}
                <code className="text-emerald-400 font-mono">0C</code> (Clear screen), and cursor placement sequences{' '}
                <code className="text-emerald-400 font-mono">1B 51 41/42</code> (Line 1/2).
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
