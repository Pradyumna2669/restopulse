import { Bill, RestaurantProfile, EscPosOptions } from '../types';

export class EscPosClientService {
  /**
   * Generates a Uint8Array containing standard raw ESC/POS binary codes for client-side download or WebUSB streaming
   */
  public static generateBillBytes(
    bill: Bill,
    profile: RestaurantProfile,
    options: EscPosOptions = { paperWidth: '80mm', cutPaper: true, kickDrawer: true }
  ): Uint8Array {
    const lineWidth = options.paperWidth === '58mm' ? 32 : 48;
    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];

    // ESC/POS Command Constants
    const CMD_INIT = new Uint8Array([0x1b, 0x40]);
    const CMD_ALIGN_CENTER = new Uint8Array([0x1b, 0x61, 0x01]);
    const CMD_ALIGN_LEFT = new Uint8Array([0x1b, 0x61, 0x00]);
    const CMD_ALIGN_RIGHT = new Uint8Array([0x1b, 0x61, 0x02]);
    const CMD_BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]);
    const CMD_BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]);
    const CMD_DOUBLE_SIZE = new Uint8Array([0x1d, 0x21, 0x11]);
    const CMD_NORMAL_SIZE = new Uint8Array([0x1d, 0x21, 0x00]);
    const CMD_DRAWER_KICK = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    const CMD_CUT_PAPER = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);

    parts.push(CMD_INIT);

    if (options.kickDrawer) {
      parts.push(CMD_DRAWER_KICK);
    }

    // Header
    parts.push(CMD_ALIGN_CENTER);
    parts.push(CMD_BOLD_ON);
    parts.push(CMD_DOUBLE_SIZE);
    parts.push(encoder.encode(`${profile.name}\n`));
    parts.push(CMD_NORMAL_SIZE);
    parts.push(CMD_BOLD_OFF);

    if (profile.address) parts.push(encoder.encode(`${profile.address}\n`));
    if (profile.phone) parts.push(encoder.encode(`Phone: ${profile.phone}\n`));
    if (profile.gstin) {
      parts.push(CMD_BOLD_ON);
      parts.push(encoder.encode(`GSTIN: ${profile.gstin} | FSSAI: ${profile.fssai || 'N/A'}\n`));
      parts.push(CMD_BOLD_OFF);
    }

    const sep = '-'.repeat(lineWidth) + '\n';
    const doubleSep = '='.repeat(lineWidth) + '\n';

    // Metadata
    parts.push(CMD_ALIGN_LEFT);
    parts.push(encoder.encode(sep));
    const invLine = `Inv: ${bill.invoiceNumber}`.padEnd(lineWidth - 12) + new Date(bill.createdAt).toLocaleDateString() + '\n';
    parts.push(encoder.encode(invLine));
    const typeLine = (bill.tableNumber ? `Table: ${bill.tableNumber}` : `Type: ${bill.orderType.toUpperCase()}`).padEnd(lineWidth - 8) + new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '\n';
    parts.push(encoder.encode(typeLine));

    // Items
    parts.push(encoder.encode(sep));
    parts.push(CMD_BOLD_ON);
    if (options.paperWidth === '58mm') {
      parts.push(encoder.encode('ITEM'.padEnd(16) + 'QTY'.padStart(4) + 'AMT'.padStart(12) + '\n'));
    } else {
      parts.push(encoder.encode('ITEM'.padEnd(24) + 'QTY'.padStart(6) + 'RATE'.padStart(9) + 'AMT'.padStart(9) + '\n'));
    }
    parts.push(CMD_BOLD_OFF);
    parts.push(encoder.encode(sep));

    bill.items.forEach(item => {
      const amt = (item.quantity * item.unitPrice).toFixed(2);
      if (options.paperWidth === '58mm') {
        const line = item.name.substring(0, 15).padEnd(16) + `x${item.quantity}`.padStart(4) + amt.padStart(12) + '\n';
        parts.push(encoder.encode(line));
      } else {
        const line = item.name.substring(0, 23).padEnd(24) + `x${item.quantity}`.padStart(6) + item.unitPrice.toFixed(2).padStart(9) + amt.padStart(9) + '\n';
        parts.push(encoder.encode(line));
      }
    });

    // Totals
    parts.push(encoder.encode(sep));
    const subtotalLine = 'Subtotal:'.padEnd(lineWidth - 10) + bill.subtotal.toFixed(2).padStart(10) + '\n';
    parts.push(encoder.encode(subtotalLine));
    if (bill.discountAmount > 0) {
      const discLine = 'Discount:'.padEnd(lineWidth - 10) + `-${bill.discountAmount.toFixed(2)}`.padStart(10) + '\n';
      parts.push(encoder.encode(discLine));
    }
    parts.push(encoder.encode('CGST (2.5%):'.padEnd(lineWidth - 10) + bill.cgstAmount.toFixed(2).padStart(10) + '\n'));
    parts.push(encoder.encode('SGST (2.5%):'.padEnd(lineWidth - 10) + bill.sgstAmount.toFixed(2).padStart(10) + '\n'));

    parts.push(encoder.encode(doubleSep));
    parts.push(CMD_BOLD_ON);
    parts.push(CMD_DOUBLE_SIZE);
    const halfWidth = Math.floor(lineWidth / 2);
    parts.push(encoder.encode('TOTAL:'.padEnd(halfWidth - 8) + `Rs.${bill.total.toFixed(2)}`.padStart(8) + '\n'));
    parts.push(CMD_NORMAL_SIZE);
    parts.push(CMD_BOLD_OFF);
    parts.push(encoder.encode(doubleSep));

    parts.push(CMD_ALIGN_RIGHT);
    parts.push(encoder.encode(`Paid via: ${bill.paymentMode.toUpperCase()}\n`));

    parts.push(CMD_ALIGN_CENTER);
    parts.push(encoder.encode('\nThank you for visiting us!\n\n'));

    if (options.cutPaper) {
      parts.push(encoder.encode('\n\n\n'));
      parts.push(CMD_CUT_PAPER);
    }

    // Combine all chunks into a single Uint8Array
    const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of parts) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Triggers direct browser download of binary .bin file for raw thermal printer streaming
   */
  public static downloadRawEscPosFile(bill: Bill, profile: RestaurantProfile, options: EscPosOptions) {
    const bytes = this.generateBillBytes(bill, profile, options);
    const blob = new Blob([bytes as any], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt_${bill.invoiceNumber}_${options.paperWidth}.bin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
