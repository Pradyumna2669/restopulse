import { api } from './api';
import {
  WeighingScaleReading,
  BarcodeResolvedItem,
  VfdGeneratedCommands
} from '../types';

export type BarcodeScanCallback = (resolved: BarcodeResolvedItem) => void;
export type ScaleReadingCallback = (reading: WeighingScaleReading) => void;

class HardwareManager {
  private audioCtx: AudioContext | null = null;
  private barcodeListeners: Set<BarcodeScanCallback> = new Set();
  private scaleListeners: Set<ScaleReadingCallback> = new Set();

  // Fast keystroke buffer for USB Barcode Scanners (HID Keyboard Emulation)
  private keyBuffer: string = '';
  private lastKeyTime: number = 0;
  private isListeningGlobalBarcode: boolean = false;

  // Web Serial Port & Reader state
  private serialPort: any = null;
  private serialReader: any = null;
  private isSerialReading: boolean = false;

  constructor() {
    this.initGlobalBarcodeListener();
  }

  // =========================================================================
  // AUDIO FEEDBACK (Cash Register / POS Barcode Scanner Beep)
  // =========================================================================
  playBeep(frequency: number = 1800, durationSec: number = 0.08, type: OscillatorType = 'sine'): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationSec);
    } catch {
      // Audio autoplay policy or unavailable
    }
  }

  // =========================================================================
  // USB BARCODE / QR SCANNER GLOBAL LISTENER
  // =========================================================================
  initGlobalBarcodeListener(): void {
    if (this.isListeningGlobalBarcode || typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - this.lastKeyTime;

      // USB barcode scanners typically fire keystrokes in < 50ms intervals
      if (timeDiff > 70) {
        // Human typing or delay - reset buffer unless it's the very first character
        this.keyBuffer = '';
      }

      this.lastKeyTime = now;

      if (e.key === 'Enter') {
        if (this.keyBuffer.length >= 3) {
          // Scanner burst detected!
          const barcode = this.keyBuffer;
          this.keyBuffer = '';

          // Don't submit active forms if focus is in a normal element
          e.preventDefault();
          this.handleBarcodeScanned(barcode);
        } else {
          this.keyBuffer = '';
        }
      } else if (e.key.length === 1) {
        // Printable ASCII character
        this.keyBuffer += e.key;
      }
    });

    this.isListeningGlobalBarcode = true;
  }

  async handleBarcodeScanned(barcode: string): Promise<void> {
    try {
      this.playBeep(2200, 0.07);
      const resolved = await api.scanBarcode(barcode, 'hardware_scanner');
      this.notifyBarcodeListeners(resolved);
    } catch (err) {
      console.warn(`[HardwareManager] Scanned barcode not recognized: ${barcode}`, err);
    }
  }

  subscribeBarcodeScanner(cb: BarcodeScanCallback): () => void {
    this.barcodeListeners.add(cb);
    return () => {
      this.barcodeListeners.delete(cb);
    };
  }

  private notifyBarcodeListeners(resolved: BarcodeResolvedItem): void {
    this.barcodeListeners.forEach(cb => {
      try {
        cb(resolved);
      } catch (e) {
        console.error('Error in barcode subscriber callback:', e);
      }
    });
  }

  // =========================================================================
  // WEB SERIAL API FOR WEIGHING SCALES (CAS, ESSAE, TOLEDO)
  // =========================================================================

  isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  async connectWebSerialScale(baudRate: number = 9600): Promise<boolean> {
    if (!this.isWebSerialSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Please use Chrome/Edge or simulated mode.');
    }

    try {
      this.serialPort = await (navigator as any).serial.requestPort();
      await this.serialPort.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      this.startSerialReaderLoop();
      return true;
    } catch (err: any) {
      console.error('[HardwareManager] Serial connection failed:', err);
      throw err;
    }
  }

  private async startSerialReaderLoop(): Promise<void> {
    if (!this.serialPort || !this.serialPort.readable) return;
    this.isSerialReading = true;

    try {
      const textDecoder = new TextDecoderStream();
      this.serialPort.readable.pipeTo(textDecoder.writable);
      this.serialReader = textDecoder.readable.getReader();

      let streamBuffer = '';

      while (this.isSerialReading) {
        const { value, done } = await this.serialReader.read();
        if (done) break;
        if (value) {
          streamBuffer += value;
          const lines = streamBuffer.split(/\r\n|\n|\r/);
          // Keep incomplete packet in buffer
          streamBuffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim().length > 0) {
              const reading = await api.parseScalePacket(line);
              this.notifyScaleListeners(reading);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[HardwareManager] Serial reader stream closed or error:', err);
    } finally {
      this.isSerialReading = false;
    }
  }

  async disconnectWebSerialScale(): Promise<void> {
    this.isSerialReading = false;
    if (this.serialReader) {
      try {
        await this.serialReader.cancel();
      } catch {
        // ignore
      }
      this.serialReader = null;
    }
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {
        // ignore
      }
      this.serialPort = null;
    }
  }

  subscribeScale(cb: ScaleReadingCallback): () => void {
    this.scaleListeners.add(cb);
    return () => {
      this.scaleListeners.delete(cb);
    };
  }

  private notifyScaleListeners(reading: WeighingScaleReading): void {
    this.scaleListeners.forEach(cb => {
      try {
        cb(reading);
      } catch (e) {
        console.error('Error in scale subscriber callback:', e);
      }
    });
  }

  // =========================================================================
  // VFD CUSTOMER DISPLAY DISPATCHER
  // =========================================================================
  async updateVfdCartTotal(cartItemsCount: number, totalAmount: number): Promise<VfdGeneratedCommands> {
    const line1 = cartItemsCount === 1 ? '1 ITEM IN CART' : `${cartItemsCount} ITEMS IN CART`;
    const line2 = `TOTAL:    ₹${totalAmount.toFixed(2)}`;
    return api.displayVfd(line1, line2);
  }

  async updateVfdItemAdded(itemName: string, itemPrice: number, runningTotal: number): Promise<VfdGeneratedCommands> {
    return api.displayVfdItemAdded(itemName, itemPrice, runningTotal);
  }

  async updateVfdSettlement(totalPaid: number, mode: string = 'UPI'): Promise<VfdGeneratedCommands> {
    return api.displayVfdCheckout(totalPaid, mode);
  }

  async updateVfdWelcome(storeName?: string): Promise<VfdGeneratedCommands> {
    return api.displayVfdWelcome(storeName);
  }

  async updateVfdThankYou(changeDue?: number): Promise<VfdGeneratedCommands> {
    return api.displayVfdThankYou(changeDue);
  }
}

export const hardwareManager = new HardwareManager();
