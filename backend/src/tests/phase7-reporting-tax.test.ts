import assert from 'assert';
import { store } from '../data/store';
import { ReportingService } from '../services/reporting.service';
import { EscPosService } from '../services/escpos.service';
import { Bill, StaffUser } from '../types';

async function runPhase7ReportingTaxTests() {
  console.log('\n======================================================');
  console.log('📈 PHASE 7: REPORTING, TAX & BUSINESS INTELLIGENCE HARNESS');
  console.log('======================================================\n');

  let passCount = 0;
  let failCount = 0;

  function runTest(description: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✅ PASS: ${description}`);
      passCount++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     ${err.message}`);
      failCount++;
    }
  }

  // ---------------------------------------------------------
  // Setup: Ensure controlled bills with diverse order types,
  // discounts, and payment tenders exist for thorough testing.
  // ---------------------------------------------------------
  const testBill1: Bill = {
    id: `bill_test_dinein_${Date.now()}`,
    invoiceNumber: 'INV-TEST-001',
    orderId: 'ord_test_01',
    orderNumber: 'T01-01',
    orderType: 'dine_in',
    tableNumber: 'T-01',
    customerName: 'Aarav Mehta',
    items: [
      {
        id: 'it_1',
        menuItemId: 'item_butter_chicken',
        name: 'Classic Butter Chicken',
        quantity: 2,
        unitPrice: 380,
        station: 'kitchen',
        kotStatus: 'prepared'
      },
      {
        id: 'it_2',
        menuItemId: 'item_garlic_naan',
        name: 'Garlic Butter Naan',
        quantity: 4,
        unitPrice: 60,
        station: 'tandoor',
        kotStatus: 'prepared'
      }
    ],
    subtotal: 1000,
    discountAmount: 250, // High discount > 200
    discountReason: 'Manager VIP Courtesy',
    cgstAmount: 18.75, // 2.5% of 750
    sgstAmount: 18.75, // 2.5% of 750
    roundOff: 0.5,
    total: 788,
    paymentMode: 'cash',
    staffId: 'staff-waiter-01',
    staffName: 'Amit Kumar (Lead Captain)',
    servedBy: 'Amit Kumar',
    status: 'paid',
    createdAt: new Date().toISOString(),
    whatsappInvoiceSent: false,
    whatsappReviewSent: false
  };

  const testBill2: Bill = {
    id: `bill_test_takeaway_${Date.now()}`,
    invoiceNumber: 'INV-TEST-002',
    orderId: 'ord_test_02',
    orderNumber: 'TK-02',
    orderType: 'takeaway',
    takeawayToken: 'TK-105',
    customerName: 'Sunita Rao',
    items: [
      {
        id: 'it_3',
        menuItemId: 'item_biryani',
        name: 'Hyderabadi Chicken Dum Biryani',
        quantity: 1,
        unitPrice: 320,
        station: 'kitchen',
        kotStatus: 'prepared'
      }
    ],
    subtotal: 320,
    discountAmount: 50, // Standard discount <= 200
    discountReason: 'Happy Hour Special',
    cgstAmount: 6.75,
    sgstAmount: 6.75,
    roundOff: 0.5,
    total: 284,
    paymentMode: 'upi',
    staffId: 'staff-cashier-01',
    staffName: 'Pooja Sharma (Head Cashier)',
    status: 'paid',
    createdAt: new Date().toISOString(),
    whatsappInvoiceSent: false,
    whatsappReviewSent: false
  };

  const testBill3: Bill = {
    id: `bill_test_delivery_${Date.now()}`,
    invoiceNumber: 'INV-TEST-003',
    orderId: 'ord_test_03',
    orderNumber: 'ZOM-9901',
    orderType: 'delivery',
    deliveryPartner: 'zomato',
    partnerOrderId: 'ZOM-9901',
    customerName: 'Rohan Verma',
    items: [
      {
        id: 'it_4',
        menuItemId: 'item_cold_coffee',
        name: 'Signature Cold Brew',
        quantity: 2,
        unitPrice: 180,
        station: 'counter',
        kotStatus: 'prepared'
      }
    ],
    subtotal: 360,
    discountAmount: 0,
    cgstAmount: 9.0,
    sgstAmount: 9.0,
    roundOff: 0,
    total: 378,
    paymentMode: 'card',
    status: 'paid',
    createdAt: new Date().toISOString(),
    whatsappInvoiceSent: false,
    whatsappReviewSent: false
  };

  const testBillVoided: Bill = {
    id: `bill_test_voided_${Date.now()}`,
    invoiceNumber: 'INV-TEST-VOID-01',
    orderId: 'ord_test_void_01',
    orderNumber: 'VD-01',
    orderType: 'dine_in',
    items: [],
    subtotal: 500,
    discountAmount: 0,
    cgstAmount: 12.5,
    sgstAmount: 12.5,
    roundOff: 0,
    total: 525,
    paymentMode: 'cash',
    status: 'cancelled',
    cancellationReason: 'Guest changed mind before cooking',
    createdAt: new Date().toISOString(),
    whatsappInvoiceSent: false,
    whatsappReviewSent: false
  };

  store.createBill(testBill1);
  store.createBill(testBill2);
  store.createBill(testBill3);
  store.createBill(testBillVoided);

  // ---------------------------------------------------------
  // TEST 1: Hourly Sales Heatmap & Order Distribution Analytics
  // ---------------------------------------------------------
  console.log('--- Test 1: Hourly Sales Heatmap Analytics ---');

  const hourly = ReportingService.getHourlySales();

  runTest('Hourly distribution returns 24 distinct hours', () => {
    assert.strictEqual(hourly.hourlyBreakdown.length, 24);
    assert.strictEqual(hourly.hourlyBreakdown[0].hour, 0);
    assert.strictEqual(hourly.hourlyBreakdown[23].hour, 23);
  });

  runTest('Hourly sales distribution has non-zero total day sales', () => {
    assert(hourly.totalDaySales > 0, `Total day sales ${hourly.totalDaySales} > 0`);
    assert(hourly.totalOrders > 0, `Total orders ${hourly.totalOrders} > 0`);
    assert(hourly.overallAov > 0, `Overall AOV ${hourly.overallAov} > 0`);
  });

  runTest('Peak hour identification includes valid hour label and sales', () => {
    assert(typeof hourly.peakHour.hour === 'number');
    assert(hourly.peakHour.hour >= 0 && hourly.peakHour.hour <= 23);
    assert(hourly.peakHour.hourLabel.includes(':00'));
    assert(hourly.peakHour.grossSales >= 0);
  });

  runTest('Hourly intensity levels correctly assign categorical ranges', () => {
    const validIntensities = ['zero', 'low', 'medium', 'high', 'peak'];
    hourly.hourlyBreakdown.forEach(h => {
      assert(validIntensities.includes(h.intensity), `Intensity ${h.intensity} is valid`);
      if (h.grossSales === 0) {
        assert.strictEqual(h.intensity, 'zero');
      }
    });
  });

  runTest('Busiest operational window formats correctly', () => {
    assert(typeof hourly.busiestWindow === 'string');
    assert(hourly.busiestWindow.includes(':00'));
  });

  // ---------------------------------------------------------
  // TEST 2: Category Performance & Food Cost Margins
  // ---------------------------------------------------------
  console.log('\n--- Test 2: Category Performance & Food Cost Margins ---');

  const catReport = ReportingService.getCategoryPerformance();

  runTest('Category performance report returns categories breakdown', () => {
    assert(catReport.categories.length > 0, 'Categories exist');
    assert(catReport.totalRevenue > 0, `Total revenue ${catReport.totalRevenue} > 0`);
    assert(catReport.totalVolume > 0, `Total volume ${catReport.totalVolume} > 0`);
  });

  runTest('Category percentage sum matches ~100% of analyzed sales', () => {
    const sumPct = catReport.categories.reduce((sum, c) => sum + c.percentageOfTotalSales, 0);
    assert(sumPct >= 99 && sumPct <= 101, `Percentage sum ${sumPct}% is ~100%`);
  });

  runTest('Categories compute gross margin percentage and estimated food cost', () => {
    catReport.categories.forEach(cat => {
      if (cat.grossRevenue > 0) {
        assert(cat.estimatedFoodCost >= 0, 'Food cost is non-negative');
        assert(cat.grossMarginPercent >= 0 && cat.grossMarginPercent <= 100, `Margin ${cat.grossMarginPercent}% in bounds`);
        assert(typeof cat.topSellingItem.name === 'string');
      }
    });
  });

  // ---------------------------------------------------------
  // TEST 3: Staff Sales Contribution & Leaderboard
  // ---------------------------------------------------------
  console.log('\n--- Test 3: Staff Sales Contribution & Leaderboard ---');

  const staffReport = ReportingService.getStaffSales();

  runTest('Staff sales report includes active staff members', () => {
    assert(staffReport.totalStaffActive > 0);
    assert(staffReport.staffBreakdown.length > 0);
    assert(staffReport.totalSalesRecorded > 0);
  });

  runTest('Lead captain or active staff member has attributed sales & bills', () => {
    const top = staffReport.topPerformer;
    assert(top !== undefined);
    assert(top.sales > 0, `Top performer sales ${top.sales} > 0`);
    assert(top.billsCount > 0, `Top performer bills ${top.billsCount} > 0`);
  });

  runTest('Staff tender breakdown accurately tallies payment modes', () => {
    staffReport.staffBreakdown.forEach(staff => {
      const sumTenders = staff.tenderBreakdown.cash + staff.tenderBreakdown.card + staff.tenderBreakdown.upi + staff.tenderBreakdown.split;
      // Allow minor rounding difference
      assert(Math.abs(sumTenders - staff.grossSales) < 1.0, `Tenders sum ${sumTenders} matches sales ${staff.grossSales}`);
    });
  });

  // ---------------------------------------------------------
  // TEST 4: Discount Attribution & High Discount Sign-Off Audit
  // ---------------------------------------------------------
  console.log('\n--- Test 4: Discount Attribution & High Discount Sign-Off ---');

  const discountReport = ReportingService.getDiscountAudit();

  runTest('Discount audit captures recorded discounts', () => {
    assert(discountReport.totalDiscountsGiven > 0, `Total discounts ${discountReport.totalDiscountsGiven} > 0`);
    assert(discountReport.totalDiscountedBills > 0, 'Has discounted bills');
    assert(discountReport.records.length > 0, 'Has discount records');
  });

  runTest('High discount (> ₹200) is flagged and mandates manager approval', () => {
    assert(discountReport.highDiscountCount >= 1, `High discount count ${discountReport.highDiscountCount} >= 1`);
    assert(discountReport.highDiscountValue >= 200, `High discount value ${discountReport.highDiscountValue} >= 200`);
    const highRecord = discountReport.records.find(r => r.isHighDiscount);
    assert(highRecord !== undefined, 'Found high discount record');
    assert.strictEqual(highRecord?.requiresManagerApproval, true);
    assert(highRecord?.managerApproval !== undefined, 'Manager approval details captured');
    assert.strictEqual(highRecord?.managerApproval?.role, 'manager');
  });

  runTest('Top discount reasons categorization aggregates count and amount', () => {
    assert(discountReport.topReasons.length > 0, 'Top reasons populated');
    const vipReason = discountReport.topReasons.find(r => r.reason.toLowerCase().includes('courtesy') || r.reason.toLowerCase().includes('vip') || r.reason.toLowerCase().includes('manager'));
    assert(vipReason !== undefined, 'Found Manager Courtesy / VIP reason');
    assert(vipReason!.totalAmount >= 250);
  });

  // ---------------------------------------------------------
  // TEST 5: Statutory Indian GSTR-1 Tax Ledger & Export
  // ---------------------------------------------------------
  console.log('\n--- Test 5: Statutory Indian GSTR-1 Tax Ledger ---');

  const gstr1 = ReportingService.getGstr1TaxLedger();

  runTest('GSTR-1 includes restaurant GSTIN and legal trade name', () => {
    assert(gstr1.gstin.length >= 10, 'Valid GSTIN');
    assert(gstr1.tradeName.length > 0, 'Trade name present');
    assert.strictEqual(gstr1.financialYear, '2026-27');
  });

  runTest('Dine-In turnover is classified under SAC 996331', () => {
    const sac996331 = gstr1.sacSummary.find(s => s.sacCode === '996331');
    assert(sac996331 !== undefined, 'SAC 996331 exists');
    assert.strictEqual(sac996331?.cgstRate, 2.5);
    assert.strictEqual(sac996331?.sgstRate, 2.5);
    assert(sac996331!.totalValue > 0, 'Dine in sales > 0');
    assert(sac996331!.taxableValue > 0, 'Dine in taxable > 0');
    assert(sac996331!.cgstAmount > 0, 'CGST collected > 0');
  });

  runTest('Takeaway and Delivery turnover is classified under SAC 996332', () => {
    const sac996332 = gstr1.sacSummary.find(s => s.sacCode === '996332');
    assert(sac996332 !== undefined, 'SAC 996332 exists');
    assert.strictEqual(sac996332?.cgstRate, 2.5);
    assert.strictEqual(sac996332?.sgstRate, 2.5);
    assert(sac996332!.totalValue > 0, 'Takeaway/Delivery sales > 0');
    assert(sac996332!.cgstAmount > 0, 'CGST collected > 0');
  });

  runTest('Cancelled/Voided bills are excluded from statutory tax filing', () => {
    assert(gstr1.voidedInvoicesExcluded >= 1, `Voided excluded count ${gstr1.voidedInvoicesExcluded} >= 1`);
  });

  runTest('GSTR-1 JSON export schema matches GST portal upload format', () => {
    const jsonExport: any = ReportingService.exportGstr1Json();
    assert.strictEqual(jsonExport.gstin, gstr1.gstin);
    assert.strictEqual(jsonExport.fp, '102026');
    assert(Array.isArray(jsonExport.b2cs), 'B2CS array exists');
    assert(Array.isArray(jsonExport.hsn?.data), 'HSN data array exists');
    assert.strictEqual(jsonExport.hsn.data[0].hsn_sc, '996331');
  });

  runTest('GSTR-1 CSV export generates valid comma-separated text', () => {
    const csvExport = ReportingService.exportGstr1Csv();
    assert(typeof csvExport === 'string');
    assert(csvExport.includes('HSN/SAC,Description,UQC,Total Quantity'));
    assert(csvExport.includes('996331'));
    assert(csvExport.includes('996332'));
  });

  // ---------------------------------------------------------
  // TEST 6: End-of-Day (EOD) Z-Report & Cash Closing Audit
  // ---------------------------------------------------------
  console.log('\n--- Test 6: End-of-Day Z-Report & Cash Closing Audit ---');

  const zReport = ReportingService.getEodZReport();

  runTest('EOD Z-Report consolidates sales and tax metrics', () => {
    assert(zReport.reportNumber.startsWith('Z-'));
    assert(zReport.financialSummary.grossSales > 0);
    assert(zReport.financialSummary.taxableSales > 0);
    assert(zReport.financialSummary.cgst > 0);
    assert(zReport.financialSummary.sgst > 0);
    assert(zReport.financialSummary.billsCount > 0);
  });

  runTest('EOD Cash drawer audit tracks opening float, cash sales, and discrepancy', () => {
    assert(zReport.cashDrawerAudit.openingFloat >= 0);
    assert(zReport.cashDrawerAudit.cashSales >= 0);
    assert(zReport.cashDrawerAudit.pettyExpensesTotal >= 0);
    assert(typeof zReport.cashDrawerAudit.expectedCash === 'number');
    assert(typeof zReport.cashDrawerAudit.actualCashCounted === 'number');
    assert(['balanced', 'short', 'over'].includes(zReport.cashDrawerAudit.auditStatus));
  });

  runTest('EOD Tender breakdown includes Cash, UPI, Cards, and Delivery Aggregators', () => {
    assert(zReport.tenderBreakdown.cash.count >= 0);
    assert(zReport.tenderBreakdown.upi.count >= 0);
    assert(zReport.tenderBreakdown.card.count >= 0);
    assert(zReport.tenderBreakdown.aggregators.total >= 0);
  });

  // ---------------------------------------------------------
  // TEST 7: Raw ESC/POS 80mm Z-Report Binary Stream Generation
  // ---------------------------------------------------------
  console.log('\n--- Test 7: Raw ESC/POS 80mm Z-Report Binary Generation ---');

  const profile = store.getProfile();
  const zReportBuffer = EscPosService.generateZReportEscPos(zReport, profile, { paperWidth: '80mm', cutPaper: true });

  runTest('ESC/POS Z-Report produces valid non-empty byte buffer', () => {
    assert(Buffer.isBuffer(zReportBuffer), 'Result is a Node Buffer');
    assert(zReportBuffer.length > 200, `Buffer length ${zReportBuffer.length} > 200 bytes`);
  });

  runTest('ESC/POS Z-Report starts with initialization command (ESC @)', () => {
    assert.strictEqual(zReportBuffer[0], 0x1b);
    assert.strictEqual(zReportBuffer[1], 0x40);
  });

  runTest('ESC/POS Z-Report contains store name, Z-Report header, and audit sections', () => {
    const asciiStr = zReportBuffer.toString('ascii');
    assert(asciiStr.includes(profile.name), 'Contains store name');
    assert(asciiStr.includes('DAILY SALES CLOSING Z-REPORT'), 'Contains Z-Report header');
    assert(asciiStr.includes('SALES & TAX RECONCILIATION'), 'Contains sales & tax section');
    assert(asciiStr.includes('PAYMENT TENDER BREAKDOWN'), 'Contains payment tender section');
    assert(asciiStr.includes('CASH DRAWER CLOSING AUDIT'), 'Contains cash drawer section');
    assert(asciiStr.includes('Cashier Signature:'), 'Contains cashier signature line');
    assert(asciiStr.includes('Manager Signature:'), 'Contains manager signature line');
  });

  runTest('ESC/POS Z-Report ends with paper cut sequence (GS V 66 0)', () => {
    const cutSeq = Buffer.from([0x1d, 0x56, 0x42, 0x00]);
    assert(zReportBuffer.includes(cutSeq), 'Contains paper cut byte sequence');
  });

  // ---------------------------------------------------------
  // Summary
  // ---------------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 PHASE 7 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhase7ReportingTaxTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
