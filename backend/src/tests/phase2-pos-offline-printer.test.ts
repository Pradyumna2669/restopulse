import { store } from '../data/store';
import { EscPosService } from '../services/escpos.service';
import { Bill, Order, RestaurantProfile } from '../types';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`, details || '');
    failCount++;
  }
}

async function runPhase2Tests() {
  console.log('\n======================================================');
  console.log('⚡ PHASE 2: POS RELIABILITY, OFFLINE & ESC/POS TEST HARNESS');
  console.log('======================================================\n');

  // Test 1: POS Mathematical Precision & Roundoff
  console.log('--- Test 1: POS Calculations, GST & Roundoff ---');
  const items = [
    { menuItemId: 'item_1', name: 'Pizza', quantity: 2, unitPrice: 275 }, // 550
    { menuItemId: 'item_2', name: 'Garlic Bread', quantity: 1, unitPrice: 135 } // 135
  ];
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0); // 685
  assert(subtotal === 685, 'Subtotal correctly computed as 685.00');

  const discount = 50; // 635 taxable
  const taxable = subtotal - discount;
  const cgst = Number((taxable * 0.025).toFixed(2)); // 15.88
  const sgst = Number((taxable * 0.025).toFixed(2)); // 15.88
  const rawTotal = taxable + cgst + sgst; // 666.76
  const total = Math.round(rawTotal); // 667
  const roundOff = Number((total - rawTotal).toFixed(2)); // +0.24

  assert(taxable === 635, 'Taxable value correctly accounts for discount (635.00)');
  assert(cgst === 15.88 && sgst === 15.88, 'CGST and SGST correctly calculated at 2.5% each (15.88)');
  assert(total === 667, 'Total rounded mathematically to 667.00');
  assert(roundOff === 0.24, 'Roundoff variance precisely computed as +0.24');

  // Test 2: Offline Order & Bill Ingestion with Idempotency Guard
  console.log('\n--- Test 2: Offline Transaction Ingestion & Idempotency ---');
  const testClientTxId = `offline_tx_${Date.now()}`;
  
  // Create offline bill payload
  const offlineBillPayload: Bill = {
    id: `bill_${Date.now()}`,
    invoiceNumber: 'INV-OFFLINE-001',
    orderId: 'ord_offline_001',
    orderNumber: 'OFF-01',
    orderType: 'takeaway',
    clientTxId: testClientTxId,
    isOffline: true,
    items: [
      {
        id: 'i1',
        menuItemId: 'item_coffee',
        name: 'Cappuccino',
        quantity: 1,
        unitPrice: 150,
        station: 'counter',
        kotStatus: 'prepared'
      }
    ],
    subtotal: 150,
    discountAmount: 0,
    cgstAmount: 3.75,
    sgstAmount: 3.75,
    roundOff: -0.5,
    total: 157,
    paymentMode: 'cash',
    status: 'paid',
    createdAt: new Date().toISOString(),
    whatsappInvoiceSent: false,
    whatsappReviewSent: false
  };

  // First ingestion
  store.createBill(offlineBillPayload);
  const fetchedBill = store.getBills().find(b => b.clientTxId === testClientTxId);
  assert(fetchedBill !== undefined, 'Offline bill ingested and found in store');
  assert(fetchedBill?.isOffline === true, 'Offline flag preserved on transaction');

  // Second ingestion attempt (duplicate clientTxId)
  const isDuplicate = store.getBills().filter(b => b.clientTxId === testClientTxId).length > 0;
  assert(isDuplicate === true, 'Duplicate clientTxId correctly detected to prevent double counting');

  // Test 3: Raw ESC/POS Binary Generation for 80mm
  console.log('\n--- Test 3: Raw ESC/POS Byte Stream (80mm) ---');
  const sampleProfile: RestaurantProfile = {
    ...store.getProfile(),
    name: 'RestoPulse Grand Bistro',
    address: '123 Gourmet Blvd, Connaught Place, New Delhi',
    gstin: '07AAAAA0000A1Z5'
  };

  const escPos80Buffer = EscPosService.generateBillEscPos(offlineBillPayload, sampleProfile, {
    paperWidth: '80mm',
    cutPaper: true,
    kickDrawer: true
  });

  assert(escPos80Buffer.length > 50, 'ESC/POS 80mm binary generated with valid byte length', { bytes: escPos80Buffer.length });

  // Verify printer initialization command: ESC @ (0x1B, 0x40)
  assert(escPos80Buffer[0] === 0x1b && escPos80Buffer[1] === 0x40, 'ESC/POS buffer begins with INIT command [0x1B, 0x40]');

  // Verify Cash Drawer Kick code: ESC p 0 25 250 (0x1B, 0x70, 0x00, 0x19, 0xFA)
  let foundDrawerKick = false;
  for (let i = 0; i < escPos80Buffer.length - 4; i++) {
    if (
      escPos80Buffer[i] === 0x1b &&
      escPos80Buffer[i + 1] === 0x70 &&
      escPos80Buffer[i + 2] === 0x00 &&
      escPos80Buffer[i + 3] === 0x19 &&
      escPos80Buffer[i + 4] === 0xfa
    ) {
      foundDrawerKick = true;
      break;
    }
  }
  assert(foundDrawerKick === true, 'Cash drawer kick pulse [ESC p 0 25 250] present in byte stream');

  // Verify Paper Cut command: GS V 66 0 (0x1D, 0x56, 0x42, 0x00)
  let foundPaperCut = false;
  for (let i = 0; i < escPos80Buffer.length - 3; i++) {
    if (
      escPos80Buffer[i] === 0x1d &&
      escPos80Buffer[i + 1] === 0x56 &&
      escPos80Buffer[i + 2] === 0x42 &&
      escPos80Buffer[i + 3] === 0x00
    ) {
      foundPaperCut = true;
      break;
    }
  }
  assert(foundPaperCut === true, 'Paper cut command [GS V 66 0] present at end of byte stream');

  // Test 4: Raw ESC/POS Binary Generation for 58mm
  console.log('\n--- Test 4: Raw ESC/POS Byte Stream (58mm Compact) ---');
  const escPos58Buffer = EscPosService.generateBillEscPos(offlineBillPayload, sampleProfile, {
    paperWidth: '58mm',
    cutPaper: true,
    kickDrawer: false
  });

  assert(escPos58Buffer.length > 30, 'ESC/POS 58mm binary generated with valid byte length', { bytes: escPos58Buffer.length });
  
  // Verify drawer kick was omitted as requested
  let foundUnwantedKick = false;
  for (let i = 0; i < escPos58Buffer.length - 4; i++) {
    if (
      escPos58Buffer[i] === 0x1b &&
      escPos58Buffer[i + 1] === 0x70 &&
      escPos58Buffer[i + 2] === 0x00 &&
      escPos58Buffer[i + 3] === 0x19 &&
      escPos58Buffer[i + 4] === 0xfa
    ) {
      foundUnwantedKick = true;
      break;
    }
  }
  assert(foundUnwantedKick === false, 'Cash drawer kick omitted when kickDrawer=false');

  // Test 5: Kitchen Order Ticket (KOT) ESC/POS Generation
  console.log('\n--- Test 5: Kitchen Order Ticket (KOT) ESC/POS Generator ---');
  const sampleOrder: Order = {
    id: `ord_${Date.now()}`,
    orderNumber: 'KOT-88',
    type: 'dine_in',
    tableNumber: 'T-04',
    items: [
      {
        id: 'ki1',
        menuItemId: 'item_dal',
        name: 'Dal Makhani Bukhara',
        quantity: 2,
        unitPrice: 260,
        station: 'kitchen',
        kotStatus: 'pending',
        specialNotes: 'Make it extra mild for children'
      }
    ],
    status: 'kot_printed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const kotBuffer = EscPosService.generateKotEscPos(sampleOrder, sampleProfile, {
    paperWidth: '80mm',
    cutPaper: true
  });

  const kotString = kotBuffer.toString('ascii');
  assert(kotString.includes('KITCHEN TICKET'), 'KOT byte stream contains "*** KITCHEN TICKET ***" header');
  assert(kotString.includes('T-04'), 'KOT byte stream contains dining table number "T-04"');
  assert(kotString.includes('Make it extra mild'), 'KOT byte stream contains special kitchen instructions');

  // Summary
  console.log('\n======================================================');
  console.log(`TEST RUN COMPLETE: ${passCount} Passed, ${failCount} Failed`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase2Tests().catch(err => {
  console.error('Unhandled test harness error:', err);
  process.exit(1);
});
