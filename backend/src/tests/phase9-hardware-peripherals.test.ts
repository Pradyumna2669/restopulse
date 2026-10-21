import http from 'http';
import express from 'express';
import { apiRouter } from '../routes/api.routes';
import { hardwareService } from '../services/hardwarePeripheral.service';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

let server: http.Server;
let port: number;

function request(method: string, path: string, body?: any, headers?: Record<string, string>): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      ...(headers || {})
    };
    if (data) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(data).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let resBody = '';
        res.on('data', chunk => { resBody += chunk; });
        res.on('end', () => {
          let parsed = resBody;
          try {
            parsed = JSON.parse(resBody);
          } catch {
            // keep as string
          }
          resolve({ status: res.statusCode || 200, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string, details?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`, details ? JSON.stringify(details, null, 2) : '');
    failedTests++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('⚖️ PHASE 9: HARDWARE PERIPHERALS & BARCODE/SCALE HARNESS');
  console.log('======================================================\n');

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      port = addr.port;
      resolve();
    });
  });

  try {
    // -----------------------------------------------------------------------
    // Test 1: RS-232 / USB Weighing Scale Protocol Parsers
    // -----------------------------------------------------------------------
    console.log('--- Test 1: RS-232 / USB Weighing Scale Protocol Parsers ---');

    // 1.1 CAS AP-1 / PD-II Protocol
    const casStable = hardwareService.parseCasScalePacket('ST,GS,+  0.450kg\r\n');
    assert(casStable.weight === 0.45, 'CAS stable packet extracts 0.450 kg weight', casStable);
    assert(casStable.isStable === true, 'CAS packet ST flag marks isStable=true', casStable);
    assert(casStable.unit === 'kg', 'CAS packet unit is kg', casStable);

    const casUnstable = hardwareService.parseCasScalePacket('US,GS,+  1.250kg\r\n');
    assert(casUnstable.weight === 1.25, 'CAS unstable packet extracts 1.250 kg weight', casUnstable);
    assert(casUnstable.isStable === false, 'CAS packet US flag marks isStable=false', casUnstable);

    const casNet = hardwareService.parseCasScalePacket('ST,NT,+  0.350kg\r\n');
    assert(casNet.weight === 0.35, 'CAS net reading extracts 0.350 kg', casNet);

    // 1.2 Essae-Teraoka DS-215 Protocol
    const essaeStable = hardwareService.parseEssaeScalePacket('   0.450 ST\r\n');
    assert(essaeStable.weight === 0.45, 'Essae packet extracts 0.450 kg', essaeStable);
    assert(essaeStable.isStable === true, 'Essae ST flag sets isStable=true', essaeStable);

    const essaeMotion = hardwareService.parseEssaeScalePacket('+000.800kg M\r\n');
    assert(essaeMotion.weight === 0.8, 'Essae motion packet extracts 0.800 kg', essaeMotion);
    assert(essaeMotion.isStable === false, 'Essae M flag marks isStable=false', essaeMotion);

    // 1.3 Mettler Toledo Protocol
    const toledoStable = hardwareService.parseToledoScalePacket('\x0200.450\x0D');
    assert(toledoStable.weight === 0.45, 'Toledo STX/CR packet extracts 0.450 kg', toledoStable);
    assert(toledoStable.isStable === true, 'Toledo stable packet has isStable=true', toledoStable);

    const toledoMotion = hardwareService.parseToledoScalePacket('\x02?00.450\x0D');
    assert(toledoMotion.weight === 0.45, 'Toledo motion packet extracts 0.450 kg', toledoMotion);
    assert(toledoMotion.isStable === false, 'Toledo question mark flag sets isStable=false', toledoMotion);

    // 1.4 Generic ASCII Parser
    const genericGrams = hardwareService.parseGenericAsciiPacket('450g STABLE');
    assert(genericGrams.weight === 450, 'Generic ASCII parser extracts 450', genericGrams);
    assert(genericGrams.unit === 'g', 'Generic ASCII detects grams unit', genericGrams);
    assert(genericGrams.isStable === true, 'Generic ASCII marks STABLE as true', genericGrams);

    // -----------------------------------------------------------------------
    // Test 2: Real-Time Tare Subtraction & Weight Stabilization
    // -----------------------------------------------------------------------
    console.log('\n--- Test 2: Real-Time Tare Subtraction & Weight Stabilization ---');

    // Simulate pan with plate: 0.650 kg
    hardwareService.simulateScaleReading(0.650, true, 'kg');
    const readingBeforeTare = hardwareService.getCurrentScaleReading();
    assert(readingBeforeTare.rawWeight === 0.65, 'Raw weight before tare is 0.650 kg', readingBeforeTare);

    // Press Tare button (locks tare at 0.150 kg container weight)
    const tareResult = hardwareService.setTare(0.150);
    assert(tareResult.tareWeight === 0.15, 'Tare weight set to 0.150 kg', tareResult);
    assert(tareResult.netWeight === 0.50, 'Net weight calculated to 0.500 kg', tareResult);

    const readingAfterTare = hardwareService.getCurrentScaleReading();
    assert(readingAfterTare.netWeight === 0.50, 'Current scale reading reflects 0.500 kg net', readingAfterTare);
    assert(readingAfterTare.tareWeight === 0.15, 'Scale reading retains tare weight 0.150 kg', readingAfterTare);

    // When items removed, net weight is zero-clamped (never negative in checkout display)
    hardwareService.simulateScaleReading(0.100, true, 'kg');
    const readingEmpty = hardwareService.getCurrentScaleReading();
    assert(readingEmpty.netWeight === 0, 'Net weight never drops below 0 when pan under-tare', readingEmpty);

    // Reset Tare
    const resetResult = hardwareService.resetTare();
    assert(resetResult.tareWeight === 0, 'Tare successfully reset to 0.000 kg', resetResult);

    // -----------------------------------------------------------------------
    // Test 3: Bakery & Deli Gram-to-Price Real-Time Engine
    // -----------------------------------------------------------------------
    console.log('\n--- Test 3: Bakery & Deli Gram-to-Price Real-Time Engine ---');

    // Royal Pistachio Kaju Katli (₹950/kg)
    // 450 grams net weight
    const mithaiCalc = hardwareService.calculateWeighedPrice('item_pistachio_mithai', 450, 'g');
    assert(mithaiCalc.name === 'Royal Pistachio Kaju Katli', 'Mithai item resolved by ID', mithaiCalc);
    assert(mithaiCalc.pricePerKg === 950, 'Mithai price per kg is ₹950', mithaiCalc);
    // 0.45 kg * 950 = 427.50
    assert(mithaiCalc.calculatedPrice === 427.5, 'Calculated price is ₹427.50 (450g @ ₹950/kg)', mithaiCalc);
    assert(mithaiCalc.formattedDisplay.includes('450g @ ₹950/kg = ₹427.50'), 'Formatted display matches standard format', mithaiCalc);

    // Dark Belgian Truffle Cake (₹850/kg)
    // 1.250 kg net weight
    const cakeCalc = hardwareService.calculateWeighedPrice('item_belgian_truffle_cake', 1.250, 'kg');
    assert(cakeCalc.name === 'Dark Belgian Truffle Cake', 'Cake item resolved', cakeCalc);
    assert(cakeCalc.pricePerKg === 850, 'Cake price per kg is ₹850', cakeCalc);
    // 1.25 * 850 = 1062.50
    assert(cakeCalc.calculatedPrice === 1062.5, 'Calculated price is ₹1,062.50 (1.25kg @ ₹850/kg)', cakeCalc);

    // Invalid item rejection
    let thrownError = false;
    try {
      hardwareService.calculateWeighedPrice('non_existent_item', 500, 'g');
    } catch {
      thrownError = true;
    }
    assert(thrownError, 'Non-existent item throws descriptive error');

    // -----------------------------------------------------------------------
    // Test 4: USB Barcode & QR Scanner Catalog Resolver
    // -----------------------------------------------------------------------
    console.log('\n--- Test 4: USB Barcode & QR Scanner Catalog Resolver ---');

    // EAN-13 Barcode lookup: Paneer Tikka
    const paneerScan = hardwareService.resolveBarcode('8901030000018', 'hardware_scanner');
    assert(paneerScan.menuItem.id === 'item_paneer_tikka', 'Barcode 8901030000018 resolves to Paneer Tikka', paneerScan);
    assert(paneerScan.finalPrice === 280, 'Paneer Tikka base price is ₹280', paneerScan);
    assert(paneerScan.isWeightEmbedded === false, 'Standard barcode is not weight-embedded', paneerScan);

    // Barcode lookup: Butter Chicken
    const chickenScan = hardwareService.resolveBarcode('8901030000025');
    assert(chickenScan.menuItem.id === 'item_butter_chicken', 'Barcode 8901030000025 resolves to Butter Chicken', chickenScan);
    assert(chickenScan.finalPrice === 380, 'Butter Chicken base price is ₹380', chickenScan);

    // SKU lookup: Garlic Naan
    const naanScan = hardwareService.resolveBarcode('SKU-GNAA-04');
    assert(naanScan.menuItem.id === 'item_garlic_naan', 'SKU SKU-GNAA-04 resolves to Garlic Naan', naanScan);
    assert(naanScan.finalPrice === 75, 'Garlic Naan price is ₹75', naanScan);

    // Unrecognized barcode rejection
    let unrecError = false;
    try {
      hardwareService.resolveBarcode('UNKNOWN_BARCODE_9999');
    } catch {
      unrecError = true;
    }
    assert(unrecError, 'Unrecognized barcode throws not found error');

    // -----------------------------------------------------------------------
    // Test 5: GS1 In-Store Retail Weight-Embedded Barcode Decoding
    // -----------------------------------------------------------------------
    console.log('\n--- Test 5: GS1 In-Store Retail Weight-Embedded Barcode Decoding ---');

    // GS1 Barcode: 20 (prefix) + 00101 (Pistachio Mithai SKU) + 00450 (450g) + 8 (check)
    // 2000101004508
    const deliScan = hardwareService.resolveBarcode('2000101004508');
    assert(deliScan.menuItem.id === 'item_pistachio_mithai', 'Retail GS1 barcode resolves to Pistachio Mithai', deliScan);
    assert(deliScan.isWeightEmbedded === true, 'Barcode detected as weight-embedded (prefix 20)', deliScan);
    assert(deliScan.embeddedWeight === 0.45, 'Weight decoded to 0.450 kg (450 grams)', deliScan);
    // 0.45 * 950 = 427.50
    assert(deliScan.finalPrice === 427.5, 'Automatic price computed: ₹427.50', deliScan);

    // GS1 Barcode: 20 (prefix) + 00102 (Truffle Cake SKU) + 01200 (1200g / 1.2kg) + 5
    // 2000102012005
    const cakeBarcodeScan = hardwareService.resolveBarcode('2000102012005');
    assert(cakeBarcodeScan.menuItem.id === 'item_belgian_truffle_cake', 'Retail barcode resolves to Truffle Cake', cakeBarcodeScan);
    assert(cakeBarcodeScan.isWeightEmbedded === true, 'Barcode detected as weight-embedded', cakeBarcodeScan);
    assert(cakeBarcodeScan.embeddedWeight === 1.2, 'Weight decoded to 1.200 kg', cakeBarcodeScan);
    // 1.2 * 850 = 1020.00
    assert(cakeBarcodeScan.finalPrice === 1020, 'Automatic price computed: ₹1,020.00', cakeBarcodeScan);

    // -----------------------------------------------------------------------
    // Test 6: Customer-Facing VFD Pole Display ESC/POS Protocol
    // -----------------------------------------------------------------------
    console.log('\n--- Test 6: Customer-Facing VFD Pole Display ESC/POS Protocol ---');

    // Welcome Display
    const welcomeVfd = hardwareService.getVfdWelcomeMessage('Resto');
    assert(welcomeVfd.line1Formatted.length === 20, 'Line 1 is formatted to exactly 20 characters', welcomeVfd);
    assert(welcomeVfd.line2Formatted.length === 20, 'Line 2 is formatted to exactly 20 characters', welcomeVfd);
    assert(welcomeVfd.line1Formatted.includes('RESTO'), 'Line 1 contains store name', welcomeVfd);
    assert(welcomeVfd.rawHex.startsWith('1b400c'), 'VFD commands start with ESC @ (1b40) and Clear (0c)', welcomeVfd);
    assert(welcomeVfd.rawHex.includes('1b5141'), 'Commands contain Line 1 cursor move ESC Q A (1b5141)', welcomeVfd);
    assert(welcomeVfd.rawHex.includes('1b5142'), 'Commands contain Line 2 cursor move ESC Q B (1b5142)', welcomeVfd);

    // Item Added Display: Paneer Tikka (280.00) with running total 560.00
    const itemAddedVfd = hardwareService.getVfdItemAddedMessage('Paneer Tikka', 280, 560);
    assert(itemAddedVfd.line1Formatted.length === 20, 'Item display line 1 is 20 chars', itemAddedVfd);
    assert(itemAddedVfd.line2Formatted.length === 20, 'Item display line 2 is 20 chars', itemAddedVfd);
    assert(itemAddedVfd.line1Formatted.includes('Paneer Tikka'), 'Line 1 shows item name', itemAddedVfd);
    assert(itemAddedVfd.line1Formatted.includes('280.00'), 'Line 1 shows item price', itemAddedVfd);
    assert(itemAddedVfd.line2Formatted.includes('560.00'), 'Line 2 shows running total', itemAddedVfd);

    // Thank You Display
    const thankYouVfd = hardwareService.getVfdThankYouMessage(40);
    assert(thankYouVfd.line1Formatted.includes('THANK YOU'), 'Line 1 has THANK YOU header', thankYouVfd);
    assert(thankYouVfd.line2Formatted.includes('40.00'), 'Line 2 shows change due ₹40.00', thankYouVfd);

    // -----------------------------------------------------------------------
    // Test 7: Hardware Peripherals End-to-End API Routes
    // -----------------------------------------------------------------------
    console.log('\n--- Test 7: Hardware Peripherals End-to-End API Routes ---');

    // 7.1 GET /api/hardware/status
    const statusRes = await request('GET', '/api/hardware/status');
    assert(statusRes.status === 200, 'GET /api/hardware/status returns 200', statusRes.body);
    assert(statusRes.body.scale && statusRes.body.scale.connected, 'Hardware status reports scale connected', statusRes.body);
    assert(statusRes.body.scanner && statusRes.body.scanner.active, 'Hardware status reports scanner active', statusRes.body);
    assert(statusRes.body.vfd && statusRes.body.vfd.connected, 'Hardware status reports VFD connected', statusRes.body);

    // 7.2 POST /api/hardware/scale/parse
    const parseRes = await request('POST', '/api/hardware/scale/parse', {
      rawPacket: 'ST,GS,+  0.750kg\r\n',
      protocol: 'CAS',
      tareWeight: 0.100
    });
    assert(parseRes.status === 200, 'POST /api/hardware/scale/parse returns 200', parseRes.body);
    assert(parseRes.body.rawWeight === 0.75, 'Decodes raw weight 0.750 kg', parseRes.body);
    assert(parseRes.body.netWeight === 0.65, 'Calculates net weight 0.650 kg with tare 0.100 kg', parseRes.body);
    assert(parseRes.body.isStable === true, 'Marks isStable=true', parseRes.body);

    // 7.3 POST /api/hardware/scale/simulate
    const simRes = await request('POST', '/api/hardware/scale/simulate', {
      weight: 1.5,
      isStable: true,
      unit: 'kg'
    });
    assert(simRes.status === 200, 'POST /api/hardware/scale/simulate returns 200', simRes.body);
    assert(simRes.body.rawWeight === 1.5, 'Simulates 1.5 kg weight', simRes.body);

    // 7.4 GET /api/hardware/scale/read
    const readRes = await request('GET', '/api/hardware/scale/read');
    assert(readRes.status === 200, 'GET /api/hardware/scale/read returns 200', readRes.body);
    assert(readRes.body.rawWeight === 1.5, 'Read endpoint returns active simulated weight', readRes.body);

    // 7.5 POST /api/hardware/scale/tare
    const tareApiRes = await request('POST', '/api/hardware/scale/tare', { tareWeight: 0.25 });
    assert(tareApiRes.status === 200, 'POST /api/hardware/scale/tare returns 200', tareApiRes.body);
    assert(tareApiRes.body.tareWeight === 0.25, 'Tare weight set to 0.25 kg', tareApiRes.body);
    assert(tareApiRes.body.netWeight === 1.25, 'Net weight reflects 1.25 kg after tare', tareApiRes.body);

    // 7.6 POST /api/hardware/scale/calculate-price
    const calcApiRes = await request('POST', '/api/hardware/scale/calculate-price', {
      menuItemId: 'item_pistachio_mithai',
      weight: 300,
      unit: 'g'
    });
    assert(calcApiRes.status === 200, 'POST /api/hardware/scale/calculate-price returns 200', calcApiRes.body);
    // 0.3 * 950 = 285.00
    assert(calcApiRes.body.calculatedPrice === 285, 'Calculated price is ₹285.00 for 300g Mithai', calcApiRes.body);

    // 7.7 GET /api/hardware/barcode/lookup/:code
    const barcodeLookupRes = await request('GET', '/api/hardware/barcode/lookup/8901030000018');
    assert(barcodeLookupRes.status === 200, 'GET /api/hardware/barcode/lookup/:code returns 200', barcodeLookupRes.body);
    assert(barcodeLookupRes.body.menuItem.name === 'Paneer Tikka Angara', 'Resolves Paneer Tikka Angara', barcodeLookupRes.body);

    // 7.8 POST /api/hardware/barcode/scan with retail GS1 barcode
    const barcodeScanRes = await request('POST', '/api/hardware/barcode/scan', {
      barcode: '2000101004508',
      source: 'hardware_scanner'
    });
    assert(barcodeScanRes.status === 200, 'POST /api/hardware/barcode/scan returns 200', barcodeScanRes.body);
    assert(barcodeScanRes.body.isWeightEmbedded === true, 'Scan API identifies weight-embedded barcode', barcodeScanRes.body);
    assert(barcodeScanRes.body.finalPrice === 427.5, 'Scan API computes final price ₹427.50', barcodeScanRes.body);

    // 7.9 POST /api/hardware/vfd/welcome
    const vfdWelcomeRes = await request('POST', '/api/hardware/vfd/welcome', { storeName: 'Delhi Bistro' });
    assert(vfdWelcomeRes.status === 200, 'POST /api/hardware/vfd/welcome returns 200', vfdWelcomeRes.body);
    assert(vfdWelcomeRes.body.line1Formatted.length === 20, 'Line 1 is 20 chars', vfdWelcomeRes.body);

    // 7.10 POST /api/hardware/vfd/item-added
    const vfdItemRes = await request('POST', '/api/hardware/vfd/item-added', {
      itemName: 'Butter Naan',
      itemPrice: 75,
      runningTotal: 760
    });
    assert(vfdItemRes.status === 200, 'POST /api/hardware/vfd/item-added returns 200', vfdItemRes.body);
    assert(vfdItemRes.body.line1Formatted.includes('Butter Naan'), 'VFD line 1 includes item name', vfdItemRes.body);
    assert(vfdItemRes.body.line2Formatted.includes('760.00'), 'VFD line 2 includes total', vfdItemRes.body);

    // 7.11 POST /api/hardware/vfd/checkout
    const vfdCheckoutRes = await request('POST', '/api/hardware/vfd/checkout', {
      totalPaid: 760,
      paymentMode: 'UPI'
    });
    assert(vfdCheckoutRes.status === 200, 'POST /api/hardware/vfd/checkout returns 200', vfdCheckoutRes.body);
    assert(vfdCheckoutRes.body.line2Formatted.includes('UPI'), 'VFD checkout shows payment mode', vfdCheckoutRes.body);

    // 7.12 POST /api/hardware/vfd/thank-you
    const vfdThankRes = await request('POST', '/api/hardware/vfd/thank-you', { changeDue: 0 });
    assert(vfdThankRes.status === 200, 'POST /api/hardware/vfd/thank-you returns 200', vfdThankRes.body);
    assert(vfdThankRes.body.line1Formatted.includes('THANK YOU'), 'VFD thank you line 1 has THANK YOU', vfdThankRes.body);

  } finally {
    server.close();
  }

  console.log('\n======================================================');
  console.log(`📊 PHASE 9 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test harness exception:', err);
  process.exit(1);
});
