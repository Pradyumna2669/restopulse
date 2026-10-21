import { Bill, Order, RestaurantProfile, EscPosOptions, EodZReportData } from '../types';

export class EscPosService {
  // ESC/POS Command Constants
  private static readonly ESC = 0x1b;
  private static readonly GS = 0x1d;
  private static readonly LF = 0x0a;

  private static readonly CMD_INIT = Buffer.from([0x1b, 0x40]);
  private static readonly CMD_ALIGN_LEFT = Buffer.from([0x1b, 0x61, 0x00]);
  private static readonly CMD_ALIGN_CENTER = Buffer.from([0x1b, 0x61, 0x01]);
  private static readonly CMD_ALIGN_RIGHT = Buffer.from([0x1b, 0x61, 0x02]);
  private static readonly CMD_BOLD_ON = Buffer.from([0x1b, 0x45, 0x01]);
  private static readonly CMD_BOLD_OFF = Buffer.from([0x1b, 0x45, 0x00]);
  private static readonly CMD_DOUBLE_SIZE = Buffer.from([0x1d, 0x21, 0x11]);
  private static readonly CMD_NORMAL_SIZE = Buffer.from([0x1d, 0x21, 0x00]);
  private static readonly CMD_DRAWER_KICK = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  private static readonly CMD_CUT_PAPER = Buffer.from([0x1d, 0x56, 0x42, 0x00]);

  /**
   * Pads string to width or trims with ellipsis
   */
  private static padRight(str: string, width: number): string {
    if (str.length > width) return str.substring(0, width);
    return str + ' '.repeat(width - str.length);
  }

  private static padLeft(str: string, width: number): string {
    if (str.length > width) return str.substring(0, width);
    return ' '.repeat(width - str.length) + str;
  }

  /**
   * Formats a two-column line (key left, value right)
   */
  private static formatTwoCol(left: string, right: string, width: number): string {
    const spaceCount = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(spaceCount) + right;
  }

  /**
   * Generates raw ESC/POS byte buffer for a customer tax invoice
   */
  public static generateBillEscPos(
    bill: Bill,
    profile: RestaurantProfile,
    options: EscPosOptions = { paperWidth: '80mm', cutPaper: true, kickDrawer: true }
  ): Buffer {
    const lineWidth = options.paperWidth === '58mm' ? 32 : 48;
    const separator = '-'.repeat(lineWidth);
    const doubleSep = '='.repeat(lineWidth);
    const chunks: Buffer[] = [];

    // 1. Initialize printer
    chunks.push(this.CMD_INIT);

    // 2. Optional Cash Drawer Kick
    if (options.kickDrawer) {
      chunks.push(this.CMD_DRAWER_KICK);
    }

    // 3. Store Header (Centered, Bold)
    chunks.push(this.CMD_ALIGN_CENTER);
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(this.CMD_DOUBLE_SIZE);
    chunks.push(Buffer.from(`${profile.name}\n`, 'ascii'));
    chunks.push(this.CMD_NORMAL_SIZE);
    chunks.push(this.CMD_BOLD_OFF);

    if (profile.address) {
      chunks.push(Buffer.from(`${profile.address}\n`, 'ascii'));
    }
    if (profile.phone) {
      chunks.push(Buffer.from(`Phone: ${profile.phone}\n`, 'ascii'));
    }
    if (profile.gstin) {
      chunks.push(this.CMD_BOLD_ON);
      chunks.push(Buffer.from(`GSTIN: ${profile.gstin} | FSSAI: ${profile.fssai || 'N/A'}\n`, 'ascii'));
      chunks.push(this.CMD_BOLD_OFF);
    }

    // 4. Invoice & Order Metadata
    chunks.push(this.CMD_ALIGN_LEFT);
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol(`Inv: ${bill.invoiceNumber}`, new Date(bill.createdAt).toLocaleDateString(), lineWidth) + '\n', 'ascii'));
    
    const orderInfo = bill.tableNumber ? `Table: ${bill.tableNumber}` : `Type: ${bill.orderType.toUpperCase()}`;
    const timeStr = new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    chunks.push(Buffer.from(this.formatTwoCol(orderInfo, timeStr, lineWidth) + '\n', 'ascii'));

    if (bill.customerName) {
      chunks.push(Buffer.from(`Customer: ${bill.customerName} (${bill.customerPhone || 'N/A'})\n`, 'ascii'));
    }

    // 5. Itemized Table
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));
    chunks.push(this.CMD_BOLD_ON);
    if (options.paperWidth === '58mm') {
      // 32-char layout: Item (16), Qty (4), Amt (12)
      chunks.push(Buffer.from(this.padRight('ITEM', 16) + this.padLeft('QTY', 4) + this.padLeft('AMT', 12) + '\n', 'ascii'));
    } else {
      // 48-char layout: Item (26), Qty (6), Rate (8), Amt (8)
      chunks.push(Buffer.from(this.padRight('ITEM', 24) + this.padLeft('QTY', 6) + this.padLeft('RATE', 9) + this.padLeft('AMT', 9) + '\n', 'ascii'));
    }
    chunks.push(this.CMD_BOLD_OFF);
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));

    bill.items.forEach(item => {
      const itemAmt = (item.quantity * item.unitPrice).toFixed(2);
      if (options.paperWidth === '58mm') {
        const namePart = this.padRight(item.name, 16);
        const qtyPart = this.padLeft(`x${item.quantity}`, 4);
        const amtPart = this.padLeft(itemAmt, 12);
        chunks.push(Buffer.from(`${namePart}${qtyPart}${amtPart}\n`, 'ascii'));
      } else {
        const namePart = this.padRight(item.name, 24);
        const qtyPart = this.padLeft(`x${item.quantity}`, 6);
        const ratePart = this.padLeft(item.unitPrice.toFixed(2), 9);
        const amtPart = this.padLeft(itemAmt, 9);
        chunks.push(Buffer.from(`${namePart}${qtyPart}${ratePart}${amtPart}\n`, 'ascii'));
      }
    });

    // 6. Totals & Tax Breakups
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol('Subtotal:', bill.subtotal.toFixed(2), lineWidth) + '\n', 'ascii'));
    if (bill.discountAmount > 0) {
      chunks.push(Buffer.from(this.formatTwoCol('Discount:', `-${bill.discountAmount.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    }
    chunks.push(Buffer.from(this.formatTwoCol('CGST (2.5%):', bill.cgstAmount.toFixed(2), lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol('SGST (2.5%):', bill.sgstAmount.toFixed(2), lineWidth) + '\n', 'ascii'));
    if (bill.roundOff !== 0) {
      chunks.push(Buffer.from(this.formatTwoCol('Round Off:', bill.roundOff.toFixed(2), lineWidth) + '\n', 'ascii'));
    }

    chunks.push(Buffer.from(`${doubleSep}\n`, 'ascii'));
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(this.CMD_DOUBLE_SIZE);
    chunks.push(Buffer.from(this.formatTwoCol('TOTAL:', `Rs.${bill.total.toFixed(2)}`, Math.floor(lineWidth / 2)) + '\n', 'ascii'));
    chunks.push(this.CMD_NORMAL_SIZE);
    chunks.push(this.CMD_BOLD_OFF);
    chunks.push(Buffer.from(`${doubleSep}\n`, 'ascii'));

    chunks.push(this.CMD_ALIGN_RIGHT);
    chunks.push(Buffer.from(`Paid via: ${bill.paymentMode.toUpperCase()}\n`, 'ascii'));

    // 7. Footer & Review QR Hint
    chunks.push(this.CMD_ALIGN_CENTER);
    chunks.push(Buffer.from('\nThank you for dining with us!\nVisit Again!\n\n', 'ascii'));

    // 8. Cut paper
    if (options.cutPaper) {
      chunks.push(Buffer.from('\n\n\n'));
      chunks.push(this.CMD_CUT_PAPER);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Generates raw ESC/POS byte buffer for a Kitchen Order Ticket (KOT)
   */
  public static generateKotEscPos(
    order: Order,
    profile: RestaurantProfile,
    options: EscPosOptions = { paperWidth: '80mm', cutPaper: true }
  ): Buffer {
    const lineWidth = options.paperWidth === '58mm' ? 32 : 48;
    const separator = '-'.repeat(lineWidth);
    const chunks: Buffer[] = [];

    chunks.push(this.CMD_INIT);
    chunks.push(this.CMD_ALIGN_CENTER);
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(this.CMD_DOUBLE_SIZE);
    chunks.push(Buffer.from(`*** KITCHEN TICKET ***\n`, 'ascii'));
    chunks.push(this.CMD_NORMAL_SIZE);
    chunks.push(this.CMD_BOLD_OFF);

    chunks.push(this.CMD_ALIGN_LEFT);
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(Buffer.from(this.formatTwoCol(`Order: #${order.orderNumber}`, order.tableNumber ? `Table: ${order.tableNumber}` : `Mode: ${order.type}`, lineWidth) + '\n', 'ascii'));
    chunks.push(this.CMD_BOLD_OFF);
    chunks.push(Buffer.from(this.formatTwoCol(`Time: ${new Date(order.createdAt).toLocaleTimeString()}`, `Items: ${order.items.length}`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));

    // Items
    order.items.forEach(item => {
      chunks.push(this.CMD_BOLD_ON);
      chunks.push(Buffer.from(`${this.padRight(item.name, lineWidth - 6)} x${item.quantity}\n`, 'ascii'));
      chunks.push(this.CMD_BOLD_OFF);
      if (item.specialNotes) {
        chunks.push(Buffer.from(`  >> NOTE: ${item.specialNotes}\n`, 'ascii'));
      }
    });

    chunks.push(Buffer.from(`${separator}\n\n\n`, 'ascii'));
    if (options.cutPaper) {
      chunks.push(this.CMD_CUT_PAPER);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Generates raw ESC/POS byte buffer for an End-of-Day (EOD) Z-Report
   */
  public static generateZReportEscPos(
    report: EodZReportData,
    profile: RestaurantProfile,
    options: EscPosOptions = { paperWidth: '80mm', cutPaper: true }
  ): Buffer {
    const lineWidth = options.paperWidth === '58mm' ? 32 : 48;
    const separator = '-'.repeat(lineWidth);
    const doubleSep = '='.repeat(lineWidth);
    const chunks: Buffer[] = [];

    // 1. Initialize
    chunks.push(this.CMD_INIT);

    // 2. Store Header (Centered, Bold)
    chunks.push(this.CMD_ALIGN_CENTER);
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(this.CMD_DOUBLE_SIZE);
    chunks.push(Buffer.from(`${profile.name}\n`, 'ascii'));
    chunks.push(this.CMD_NORMAL_SIZE);
    chunks.push(this.CMD_BOLD_OFF);

    if (profile.address) {
      chunks.push(Buffer.from(`${profile.address}\n`, 'ascii'));
    }
    if (profile.phone) {
      chunks.push(Buffer.from(`Phone: ${profile.phone}\n`, 'ascii'));
    }
    if (profile.gstin) {
      chunks.push(Buffer.from(`GSTIN: ${profile.gstin} | FSSAI: ${profile.fssai || 'N/A'}\n`, 'ascii'));
    }

    chunks.push(Buffer.from(`${doubleSep}\n`, 'ascii'));
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(Buffer.from(`*** DAILY SALES CLOSING Z-REPORT ***\n`, 'ascii'));
    chunks.push(this.CMD_BOLD_OFF);
    chunks.push(Buffer.from(`${doubleSep}\n`, 'ascii'));

    // 3. Metadata
    chunks.push(this.CMD_ALIGN_LEFT);
    chunks.push(Buffer.from(this.formatTwoCol(`Report #: ${report.reportNumber}`, new Date(report.generatedAt).toLocaleDateString(), lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol(`Shift ID: ${report.shiftInfo.shiftId}`, `Status: ${report.shiftInfo.status.toUpperCase()}`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(`Manager: ${report.shiftInfo.managerName}\n`, 'ascii'));

    // 4. Sales & Tax Summary
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));
    chunks.push(this.CMD_ALIGN_CENTER);
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(Buffer.from(`[ SALES & TAX RECONCILIATION ]\n`, 'ascii'));
    chunks.push(this.CMD_BOLD_OFF);
    chunks.push(this.CMD_ALIGN_LEFT);
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));

    chunks.push(Buffer.from(this.formatTwoCol('Gross Sales:', `Rs.${report.financialSummary.grossSales.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    if (report.financialSummary.discounts > 0) {
      chunks.push(Buffer.from(this.formatTwoCol('Total Discounts:', `-Rs.${report.financialSummary.discounts.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    }
    chunks.push(Buffer.from(this.formatTwoCol('Net Taxable Sales:', `Rs.${report.financialSummary.taxableSales.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol('Central GST (2.5%):', `Rs.${report.financialSummary.cgst.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol('State GST (2.5%):', `Rs.${report.financialSummary.sgst.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    if (report.financialSummary.roundOff !== 0) {
      chunks.push(Buffer.from(this.formatTwoCol('Round Off:', `Rs.${report.financialSummary.roundOff.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    }

    chunks.push(Buffer.from(`${doubleSep}\n`, 'ascii'));
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(this.CMD_DOUBLE_SIZE);
    chunks.push(Buffer.from(this.formatTwoCol('NET TOTAL:', `Rs.${report.financialSummary.netTotal.toFixed(2)}`, Math.floor(lineWidth / 2)) + '\n', 'ascii'));
    chunks.push(this.CMD_NORMAL_SIZE);
    chunks.push(this.CMD_BOLD_OFF);
    chunks.push(Buffer.from(`${doubleSep}\n`, 'ascii'));

    // 5. Payment Tenders
    chunks.push(this.CMD_ALIGN_CENTER);
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(Buffer.from(`[ PAYMENT TENDER BREAKDOWN ]\n`, 'ascii'));
    chunks.push(this.CMD_BOLD_OFF);
    chunks.push(this.CMD_ALIGN_LEFT);
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));

    chunks.push(Buffer.from(this.formatTwoCol(`Cash (${report.tenderBreakdown.cash.count}):`, `Rs.${report.tenderBreakdown.cash.amount.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol(`UPI / QR (${report.tenderBreakdown.upi.count}):`, `Rs.${report.tenderBreakdown.upi.amount.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol(`Cards (${report.tenderBreakdown.card.count}):`, `Rs.${report.tenderBreakdown.card.amount.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    if (report.tenderBreakdown.aggregators.total > 0) {
      chunks.push(Buffer.from(this.formatTwoCol('Aggregators (Online):', `Rs.${report.tenderBreakdown.aggregators.total.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    }

    // 6. Cash Drawer Audit
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));
    chunks.push(this.CMD_ALIGN_CENTER);
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(Buffer.from(`[ CASH DRAWER CLOSING AUDIT ]\n`, 'ascii'));
    chunks.push(this.CMD_BOLD_OFF);
    chunks.push(this.CMD_ALIGN_LEFT);
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));

    chunks.push(Buffer.from(this.formatTwoCol('Opening Float (+):', `Rs.${report.cashDrawerAudit.openingFloat.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol('Cash Sales (+):', `Rs.${report.cashDrawerAudit.cashSales.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol('Petty Paid Out (-):', `Rs.${report.cashDrawerAudit.pettyExpensesTotal.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol('Expected in Drawer:', `Rs.${report.cashDrawerAudit.expectedCash.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol('Actual Counted:', `Rs.${report.cashDrawerAudit.actualCashCounted.toFixed(2)}`, lineWidth) + '\n', 'ascii'));
    
    chunks.push(this.CMD_BOLD_ON);
    const discSign = report.cashDrawerAudit.discrepancy >= 0 ? '+' : '';
    chunks.push(Buffer.from(this.formatTwoCol('Discrepancy (Over/Short):', `${discSign}Rs.${report.cashDrawerAudit.discrepancy.toFixed(2)} [${report.cashDrawerAudit.auditStatus.toUpperCase()}]`, lineWidth) + '\n', 'ascii'));
    chunks.push(this.CMD_BOLD_OFF);

    // 7. Audit & Exceptions
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));
    chunks.push(this.CMD_ALIGN_CENTER);
    chunks.push(this.CMD_BOLD_ON);
    chunks.push(Buffer.from(`[ INVOICES & EXCEPTIONS ]\n`, 'ascii'));
    chunks.push(this.CMD_BOLD_OFF);
    chunks.push(this.CMD_ALIGN_LEFT);
    chunks.push(Buffer.from(`${separator}\n`, 'ascii'));

    chunks.push(Buffer.from(this.formatTwoCol('Settled Invoices:', `${report.financialSummary.billsCount} Bills`, lineWidth) + '\n', 'ascii'));
    chunks.push(Buffer.from(this.formatTwoCol('Voided / Cancelled:', `${report.financialSummary.voidedCount} (Rs.${report.financialSummary.voidedAmount.toFixed(2)})`, lineWidth) + '\n', 'ascii'));

    // 8. Signature lines
    chunks.push(Buffer.from(`${doubleSep}\n\n`, 'ascii'));
    chunks.push(Buffer.from(`Cashier Signature: _________________________\n\n`, 'ascii'));
    chunks.push(Buffer.from(`Manager Signature: _________________________\n\n`, 'ascii'));

    chunks.push(this.CMD_ALIGN_CENTER);
    chunks.push(Buffer.from(`*** END OF DAILY AUDIT ***\n\n\n`, 'ascii'));

    // 9. Cut paper
    if (options.cutPaper) {
      chunks.push(Buffer.from('\n\n\n'));
      chunks.push(this.CMD_CUT_PAPER);
    }

    return Buffer.concat(chunks);
  }
}
