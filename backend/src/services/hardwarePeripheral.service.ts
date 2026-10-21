import { store } from '../data/store';
import {
  MenuItem,
  WeighingScaleProtocol,
  WeighingScaleReading,
  WeighableItemPriceCalculation,
  BarcodeResolvedItem,
  VfdGeneratedCommands,
  HardwarePeripheralsStatus
} from '../types';

/**
 * Service managing native hardware peripherals:
 * 1. RS-232 / USB Digital Weighing Scales (CAS, Essae, Toledo, Generic ASCII)
 * 2. USB Barcode & QR Scanners (Standard EAN/Code128 + GS1 Weight-Embedded barcodes)
 * 3. Customer-Facing VFD Pole Display (2x20 ESC/POS binary protocol)
 */
export class HardwarePeripheralService {
  // In-memory active peripheral state for real-time operations & simulation
  private simulatedRawWeight: number = 0;
  private tareWeight: number = 0;
  private scaleUnit: 'g' | 'kg' = 'kg';
  private isStable: boolean = true;
  private activeProtocol: WeighingScaleProtocol = 'CAS';

  private vfdLine1: string = '  WELCOME TO RESTO  ';
  private vfdLine2: string = '   HOSPITALITY POS  ';
  private vfdLastHex: string = '';

  private scanLogs: { barcode: string; timestamp: string; source: string }[] = [];

  // =========================================================================
  // 1. WEIGHING SCALE PROTOCOL PARSERS
  // =========================================================================

  /**
   * Parse continuous ASCII stream packet from CAS scales (AP-1, PD-II, DB-II)
   * Example: "ST,GS,+  0.450kg\r\n" or "US,GS,+  1.250kg\r\n"
   */
  parseCasScalePacket(raw: string): { weight: number; isStable: boolean; unit: 'g' | 'kg' } {
    const trimmed = raw.trim();
    // Pattern: ST,GS,+  0.450kg or US,GS,+  1.250kg
    const match = trimmed.match(/^(ST|US),(GS|NT),([+-]?)\s*([0-9]+\.?[0-9]*)\s*(kg|g)?/i);
    if (match) {
      const stableFlag = match[1].toUpperCase();
      const sign = match[3] === '-' ? -1 : 1;
      const num = parseFloat(match[4]);
      const unit = (match[5] && match[5].toLowerCase() === 'g') ? 'g' : 'kg';
      return {
        weight: Number((sign * num).toFixed(3)),
        isStable: stableFlag === 'ST',
        unit
      };
    }

    // Fallback: search for numbers with ST/US
    const isStable = !trimmed.includes('US');
    const numMatch = trimmed.match(/[-+]?[0-9]+\.?[0-9]*/);
    const weight = numMatch ? parseFloat(numMatch[0]) : 0;
    const unit = /g\b/i.test(trimmed) && !/kg\b/i.test(trimmed) ? 'g' : 'kg';
    return { weight, isStable, unit };
  }

  /**
   * Parse continuous ASCII stream packet from Essae-Teraoka scales (DS-215, DS-852)
   * Example: "   0.450 ST\r\n" or "+000.450kg S\r\n" or "0.450kg ST"
   */
  parseEssaeScalePacket(raw: string): { weight: number; isStable: boolean; unit: 'g' | 'kg' } {
    const trimmed = raw.trim();
    // Essae sends weight followed by ST (stable) or US / M (motion)
    const match = trimmed.match(/([+-]?\s*[0-9]+\.?[0-9]*)\s*(kg|g)?\s*(ST|S|US|U|M)?/i);
    if (match) {
      const numStr = match[1].replace(/\s+/g, '');
      const weight = parseFloat(numStr) || 0;
      const unit = (match[2] && match[2].toLowerCase() === 'g') ? 'g' : 'kg';
      const status = match[3] ? match[3].toUpperCase() : 'ST';
      const isStable = status === 'ST' || status === 'S';
      return {
        weight: Number(weight.toFixed(3)),
        isStable,
        unit
      };
    }
    return { weight: 0, isStable: true, unit: 'kg' };
  }

  /**
   * Parse continuous packet from Mettler Toledo scales (8217, PS60)
   * Example: "\x0200.450\x0D" (STX + weight + CR) or "\x02?00.450\x0D" (? = motion)
   */
  parseToledoScalePacket(raw: string): { weight: number; isStable: boolean; unit: 'g' | 'kg' } {
    // Strip STX (\x02), ETX (\x03), CR (\x0D), LF (\x0A)
    const sanitized = raw.replace(/[\x02\x03\x0D\x0A]/g, '').trim();
    const isMotion = sanitized.includes('?') || sanitized.includes('M');
    const cleanNum = sanitized.replace(/[^0-9.-]/g, '');
    const weight = parseFloat(cleanNum) || 0;
    return {
      weight: Number(weight.toFixed(3)),
      isStable: !isMotion,
      unit: 'kg'
    };
  }

  /**
   * Generic ASCII scale packet parser with automatic protocol detection
   */
  parseGenericAsciiPacket(raw: string): { weight: number; isStable: boolean; unit: 'g' | 'kg' } {
    const trimmed = raw.trim();
    const isUnstable = /motion|unstable|\bUS\b|\bM\b|\?/i.test(trimmed);
    const numMatch = trimmed.match(/[-+]?[0-9]+\.?[0-9]*/);
    const weight = numMatch ? parseFloat(numMatch[0]) : 0;
    const isGrams = /(?:[0-9]|\s|^)g\b/i.test(trimmed) && !/kg/i.test(trimmed);
    return {
      weight: Number(weight.toFixed(3)),
      isStable: !isUnstable,
      unit: isGrams ? 'g' : 'kg'
    };
  }

  /**
   * Universal scale stream reader decoding incoming raw serial packets into structured readings
   */
  decodeScalePacket(
    rawPacket: string,
    protocol: WeighingScaleProtocol = this.activeProtocol,
    currentTare: number = this.tareWeight
  ): WeighingScaleReading {
    let parsed: { weight: number; isStable: boolean; unit: 'g' | 'kg' };

    switch (protocol) {
      case 'CAS':
        parsed = this.parseCasScalePacket(rawPacket);
        break;
      case 'ESSAE':
        parsed = this.parseEssaeScalePacket(rawPacket);
        break;
      case 'TOLEDO':
        parsed = this.parseToledoScalePacket(rawPacket);
        break;
      case 'GENERIC_ASCII':
      default:
        parsed = this.parseGenericAsciiPacket(rawPacket);
        break;
    }

    const rawWeight = parsed.weight;
    // Calculate net weight (deducting tare)
    const netWeight = Math.max(0, Number((rawWeight - currentTare).toFixed(3)));

    return {
      rawWeight,
      tareWeight: currentTare,
      netWeight,
      unit: parsed.unit,
      isStable: parsed.isStable,
      protocol,
      rawPacket,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set simulated scale weight and stability (for demo, testing, or headless environments)
   */
  simulateScaleReading(weight: number, isStable: boolean = true, unit: 'g' | 'kg' = 'kg'): WeighingScaleReading {
    this.simulatedRawWeight = weight;
    this.isStable = isStable;
    this.scaleUnit = unit;

    const netWeight = Math.max(0, Number((weight - this.tareWeight).toFixed(3)));
    return {
      rawWeight: weight,
      tareWeight: this.tareWeight,
      netWeight,
      unit,
      isStable,
      protocol: this.activeProtocol,
      rawPacket: `ST,GS,+${weight.toFixed(3)}${unit}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set tare weight from current reading or explicit value
   */
  setTare(tareValue?: number): { tareWeight: number; netWeight: number } {
    if (typeof tareValue === 'number') {
      this.tareWeight = Math.max(0, Number(tareValue.toFixed(3)));
    } else {
      this.tareWeight = Math.max(0, Number(this.simulatedRawWeight.toFixed(3)));
    }
    const netWeight = Math.max(0, Number((this.simulatedRawWeight - this.tareWeight).toFixed(3)));
    return { tareWeight: this.tareWeight, netWeight };
  }

  /**
   * Zero / Reset tare weight back to 0
   */
  resetTare(): { tareWeight: number; netWeight: number } {
    this.tareWeight = 0;
    const netWeight = Number(this.simulatedRawWeight.toFixed(3));
    return { tareWeight: 0, netWeight };
  }

  /**
   * Get current scale status and reading
   */
  getCurrentScaleReading(): WeighingScaleReading {
    const netWeight = Math.max(0, Number((this.simulatedRawWeight - this.tareWeight).toFixed(3)));
    return {
      rawWeight: this.simulatedRawWeight,
      tareWeight: this.tareWeight,
      netWeight,
      unit: this.scaleUnit,
      isStable: this.isStable,
      protocol: this.activeProtocol,
      rawPacket: `ST,GS,+${this.simulatedRawWeight.toFixed(3)}${this.scaleUnit}`,
      timestamp: new Date().toISOString()
    };
  }

  // =========================================================================
  // 2. GRAM-TO-PRICE CALCULATION ENGINE
  // =========================================================================

  /**
   * Calculate live price for weighed items (sweets, cakes, bakery, butchery)
   */
  calculateWeighedPrice(
    menuItemId: string,
    weight: number,
    unit: 'g' | 'kg' = 'kg',
    customTare: number = 0
  ): WeighableItemPriceCalculation {
    const items = store.getMenuItems();
    const item = items.find(m => m.id === menuItemId || m.sku === menuItemId || m.barcode === menuItemId);

    if (!item) {
      throw new Error(`Menu item not found: ${menuItemId}`);
    }

    // Convert weight to kg for calculation
    const netWeight = Math.max(0, Number((weight - (customTare > 0 ? customTare : 0)).toFixed(3)));
    const weightInKg = unit === 'g' ? netWeight / 1000 : netWeight;

    // Price per kg determination
    const pricePerKg = item.pricePerKg ?? (item.isWeighed ? item.basePrice : item.basePrice);
    const calculatedPrice = Math.max(0, Number((weightInKg * pricePerKg).toFixed(2)));

    const formattedDisplay = unit === 'g'
      ? `${netWeight.toFixed(0)}g @ ₹${pricePerKg}/kg = ₹${calculatedPrice.toFixed(2)}`
      : `${netWeight.toFixed(3)}kg @ ₹${pricePerKg}/kg = ₹${calculatedPrice.toFixed(2)}`;

    return {
      menuItemId: item.id,
      name: item.name,
      netWeight,
      unit,
      pricePerKg,
      calculatedPrice,
      tareWeightApplied: customTare,
      isStable: this.isStable,
      formattedDisplay
    };
  }

  // =========================================================================
  // 3. BARCODE & SKU RESOLVER (STANDARD & GS1 WEIGHT-EMBEDDED)
  // =========================================================================

  /**
   * Resolve scanned barcode string into catalog item, supporting:
   * 1. Standard EAN-13 / Code-128 / UPC barcodes (direct match on item.barcode / sku / id)
   * 2. GS1 In-Store Weight-Embedded retail barcodes (prefix 20, 21, 22, 02)
   *    Format: 20 IIIII WWWWW C
   *    - 20: Weight-embedded prefix
   *    - IIIII: 5-digit item SKU code
   *    - WWWWW: 5-digit weight in grams (e.g. 00450 = 450 grams)
   *    - C: 1-digit check digit
   */
  resolveBarcode(barcode: string, source: 'hardware_scanner' | 'manual_entry' | 'camera_qr' = 'hardware_scanner'): BarcodeResolvedItem {
    const clean = barcode.trim();
    if (!clean) {
      throw new Error('Barcode cannot be empty');
    }

    // Record scan log
    this.scanLogs.push({
      barcode: clean,
      source,
      timestamp: new Date().toISOString()
    });

    const menuItems = store.getMenuItems();

    // 1. Check for GS1 In-Store Weight-Embedded Barcode (13 digits starting with 20, 21, 22, 02)
    if (/^(20|21|22|02)\d{11}$/.test(clean)) {
      const prefix = clean.slice(0, 2);
      const itemCode = clean.slice(2, 7); // 5 digits
      const valueField = parseInt(clean.slice(7, 12), 10); // 5 digits

      // Find item matching SKU or code
      const matchedItem = menuItems.find(i =>
        i.sku === itemCode ||
        i.id.includes(itemCode) ||
        (i.barcode && i.barcode.includes(itemCode))
      );

      if (matchedItem) {
        if (prefix === '20') {
          // Weight embedded in grams
          const weightInGrams = valueField;
          const weightInKg = weightInGrams / 1000;
          const pricePerKg = matchedItem.pricePerKg || matchedItem.basePrice;
          const finalPrice = Math.max(0, Number((weightInKg * pricePerKg).toFixed(2)));

          return {
            barcode: clean,
            sku: matchedItem.sku,
            menuItem: matchedItem,
            isWeightEmbedded: true,
            embeddedWeight: weightInKg,
            unitPrice: pricePerKg,
            finalPrice,
            quantity: 1,
            resolvedAt: new Date().toISOString()
          };
        } else if (prefix === '21') {
          // Price embedded in paise (1/100 of Rupee)
          const finalPrice = Number((valueField / 100).toFixed(2));
          return {
            barcode: clean,
            sku: matchedItem.sku,
            menuItem: matchedItem,
            isWeightEmbedded: false,
            embeddedPrice: finalPrice,
            unitPrice: finalPrice,
            finalPrice,
            quantity: 1,
            resolvedAt: new Date().toISOString()
          };
        }
      }
    }

    // 2. Standard Barcode / SKU / ID Lookup
    const matchedItem = menuItems.find(i =>
      i.barcode === clean ||
      i.sku === clean ||
      i.id === clean ||
      i.name.toLowerCase() === clean.toLowerCase()
    );

    if (matchedItem) {
      return {
        barcode: clean,
        sku: matchedItem.sku,
        menuItem: matchedItem,
        isWeightEmbedded: false,
        unitPrice: matchedItem.basePrice,
        finalPrice: matchedItem.basePrice,
        quantity: 1,
        resolvedAt: new Date().toISOString()
      };
    }

    throw new Error(`Unrecognized barcode or SKU: ${clean}`);
  }

  // =========================================================================
  // 4. CUSTOMER-FACING VFD POLE DISPLAY (2x20 ESC/POS PROTOCOL)
  // =========================================================================

  /**
   * Format text for a 20-character VFD display line
   */
  private formatVfdLine(text: string, align: 'left' | 'center' | 'right' = 'left'): string {
    const clean = text.replace(/[\r\n\t]/g, ' ');
    if (clean.length > 20) {
      return clean.slice(0, 20);
    }
    if (align === 'center') {
      const totalPad = 20 - clean.length;
      const leftPad = Math.floor(totalPad / 2);
      const rightPad = totalPad - leftPad;
      return ' '.repeat(leftPad) + clean + ' '.repeat(rightPad);
    }
    if (align === 'right') {
      return clean.padStart(20, ' ');
    }
    return clean.padEnd(20, ' ');
  }

  /**
   * Format dual-column item and price for 20-character display
   * Example: "PANEER TIKKA  280.00"
   */
  formatVfdItemLine(name: string, priceStr: string): string {
    const right = priceStr.trim();
    const maxLeftLen = 20 - right.length - 1;
    const left = name.length > maxLeftLen ? name.slice(0, maxLeftLen).trim() : name;
    const spacesNeeded = Math.max(1, 20 - left.length - right.length);
    return left + ' '.repeat(spacesNeeded) + right;
  }

  /**
   * Generate raw ESC/POS binary command bytes and hex string for 2x20 VFD pole displays
   * Standard ESC/POS sequence:
   * - 0x1B 0x40 (ESC @: Initialize printer / display)
   * - 0x0C (FF: Clear screen)
   * - 0x1B 0x51 0x41 (ESC Q A: Move cursor to Line 1) + 20 chars of line 1 + 0x0D
   * - 0x1B 0x51 0x42 (ESC Q B: Move cursor to Line 2) + 20 chars of line 2 + 0x0D
   */
  generateVfdCommandBytes(line1: string, line2: string): VfdGeneratedCommands {
    const l1 = this.formatVfdLine(line1);
    const l2 = this.formatVfdLine(line2);

    const buffer: number[] = [
      0x1B, 0x40, // ESC @ Initialize
      0x0C,       // Clear screen
      0x1B, 0x51, 0x41 // ESC Q A (Line 1)
    ];

    for (let i = 0; i < l1.length; i++) {
      buffer.push(l1.charCodeAt(i));
    }
    buffer.push(0x0D);

    buffer.push(0x1B, 0x51, 0x42); // ESC Q B (Line 2)
    for (let i = 0; i < l2.length; i++) {
      buffer.push(l2.charCodeAt(i));
    }
    buffer.push(0x0D);

    const rawHex = buffer.map(b => b.toString(16).padStart(2, '0')).join('');

    this.vfdLine1 = l1;
    this.vfdLine2 = l2;
    this.vfdLastHex = rawHex;

    return {
      line1Formatted: l1,
      line2Formatted: l2,
      rawHex,
      byteCount: buffer.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate Welcome Message for VFD
   */
  getVfdWelcomeMessage(storeName: string = 'RESTOPULSE'): VfdGeneratedCommands {
    const l1 = this.formatVfdLine(`WELCOME TO ${storeName.toUpperCase()}`, 'center');
    const l2 = this.formatVfdLine('HOSPITALITY POS', 'center');
    return this.generateVfdCommandBytes(l1, l2);
  }

  /**
   * Generate Item Added display for VFD
   */
  getVfdItemAddedMessage(itemName: string, itemPrice: number, runningTotal: number): VfdGeneratedCommands {
    const line1 = this.formatVfdItemLine(itemName, itemPrice.toFixed(2));
    const line2 = this.formatVfdItemLine('TOTAL', `₹${runningTotal.toFixed(2)}`);
    return this.generateVfdCommandBytes(line1, line2);
  }

  /**
   * Generate Checkout / Settlement display for VFD
   */
  getVfdCheckoutMessage(totalPaid: number, paymentMode: string): VfdGeneratedCommands {
    const line1 = this.formatVfdItemLine('BILL PAID', `₹${totalPaid.toFixed(2)}`);
    const line2 = this.formatVfdItemLine('MODE', paymentMode.toUpperCase());
    return this.generateVfdCommandBytes(line1, line2);
  }

  /**
   * Generate Thank You display for VFD
   */
  getVfdThankYouMessage(changeDue?: number): VfdGeneratedCommands {
    const line1 = this.formatVfdLine('THANK YOU!', 'center');
    const line2 = changeDue && changeDue > 0
      ? this.formatVfdItemLine('CHANGE DUE', `₹${changeDue.toFixed(2)}`)
      : this.formatVfdLine('PLEASE VISIT AGAIN', 'center');
    return this.generateVfdCommandBytes(line1, line2);
  }

  // =========================================================================
  // 5. HARDWARE SYSTEM STATUS
  // =========================================================================

  /**
   * Return comprehensive real-time status of all connected / simulated peripherals
   */
  getHardwareStatus(): HardwarePeripheralsStatus {
    const currentReading = this.getCurrentScaleReading();
    const lastScan = this.scanLogs[this.scanLogs.length - 1];

    return {
      scale: {
        connected: true,
        protocol: this.activeProtocol,
        currentReading,
        tareWeight: this.tareWeight,
        simulated: true
      },
      scanner: {
        active: true,
        lastScannedBarcode: lastScan?.barcode,
        lastScannedAt: lastScan?.timestamp,
        totalScansToday: this.scanLogs.length
      },
      vfd: {
        connected: true,
        currentLine1: this.vfdLine1,
        currentLine2: this.vfdLine2,
        lastCommandHex: this.vfdLastHex,
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

export const hardwareService = new HardwarePeripheralService();
