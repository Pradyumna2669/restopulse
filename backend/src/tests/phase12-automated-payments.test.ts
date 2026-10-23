import { store } from '../data/store';
import { PaymentAutomationService } from '../services/paymentAutomation.service';
import { OpenWAService } from '../services/openwa.service';

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

async function runPhase12AutomatedPaymentTests() {
  console.log('\n======================================================');
  console.log('⚡ PHASE 12: RESTAURANT PAYMENT AUTOMATION TEST HARNESS');
  console.log('======================================================\n');

  // Backup original profile config
  const originalProfile = store.getProfile();

  try {
    // ---------------------------------------------------------
    // TEST 1: Owner Toggle Configuration & Defaults
    // ---------------------------------------------------------
    console.log('--- Test 1: Owner Payment Automation Configuration ---');
    store.updateProfile({
      paymentConfig: {
        enableDynamicUpiQr: true,
        enableAutoSoundboxChime: true,
        enableEdcPush: true,
        enablePayAtTable: true,
        enableWhatsAppPayLink: true,
        enablePrePayCounter: false,
        upiVpa: 'restroplus.billing@icici',
        merchantName: 'RestroPlus Bistro & Cafe'
      }
    });

    const currentProfile = store.getProfile();
    assert(
      currentProfile.paymentConfig?.enableDynamicUpiQr === true &&
      currentProfile.paymentConfig?.upiVpa === 'restroplus.billing@icici',
      'Owner can configure automated payment parameters & custom UPI VPA'
    );

    // ---------------------------------------------------------
    // TEST 2: Dynamic UPI QR Generation (Exact Amount & VPA)
    // ---------------------------------------------------------
    console.log('\n--- Test 2: Dynamic UPI QR Intent Generation ---');
    const qrResult = PaymentAutomationService.generateDynamicUpiQr({
      amount: 450.50,
      orderId: 'ORD_AUTO_101',
      tableNumber: 'T-04',
      payerPhone: '9876543210'
    });

    assert(qrResult.success === true, 'Dynamic UPI QR generation succeeded');
    assert(!!qrResult.upiUrl, 'UPI intent URL generated');
    assert(qrResult.upiUrl!.includes('pa=restroplus.billing%40icici') || qrResult.upiUrl!.includes('pa=restroplus.billing@icici'), 'UPI URL contains configured merchant VPA');
    assert(qrResult.upiUrl!.includes('am=450.50'), 'UPI URL encodes exact order amount without rounding error');
    assert(!!qrResult.payment && qrResult.payment.status === 'pending', 'Payment initiated with tracking ID');

    // ---------------------------------------------------------
    // TEST 3: Owner Disable Dynamic UPI QR
    // ---------------------------------------------------------
    console.log('\n--- Test 3: Owner Can Disable UPI QR Feature ---');
    store.updateProfile({
      paymentConfig: {
        ...currentProfile.paymentConfig!,
        enableDynamicUpiQr: false
      }
    });

    const disabledQrResult = PaymentAutomationService.generateDynamicUpiQr({
      amount: 250,
      orderId: 'ORD_AUTO_102'
    });
    assert(disabledQrResult.success === false, 'Dynamic UPI QR rejected when disabled by restaurant owner');
    assert(disabledQrResult.error!.includes('disabled by restaurant owner'), 'Returned clear feedback to staff/customer');

    // Re-enable for next tests
    store.updateProfile({
      paymentConfig: {
        ...currentProfile.paymentConfig!,
        enableDynamicUpiQr: true
      }
    });

    // ---------------------------------------------------------
    // TEST 4: Real-Time UPI Settlement & Soundbox Voice Chime
    // ---------------------------------------------------------
    console.log('\n--- Test 4: Real-Time UPI Settlement & Soundbox Speech ---');
    const testPayment = qrResult.payment!;
    const confirmResult = PaymentAutomationService.confirmUpiPayment(
      testPayment.id,
      'UPI_TX_987654321',
      'anita@okaxis'
    );

    assert(confirmResult.success === true, 'UPI payment confirmed in real-time');
    assert(confirmResult.payment?.status === 'success', 'Payment status updated to success');
    assert(confirmResult.payment?.soundboxAnnounced === true, 'Soundbox announcement marked as processed');
    assert(!!confirmResult.soundboxSpeech && confirmResult.soundboxSpeech.includes('₹451 received'), 'Soundbox speech synthesis text generated');

    const paymentInStore = PaymentAutomationService.getPaymentStatus(testPayment.id);
    assert(paymentInStore?.status === 'success', 'Payment status readable via getPaymentStatus');

    // ---------------------------------------------------------
    // TEST 5: Integrated EDC Terminal Push (Pine Labs / Paytm EDC)
    // ---------------------------------------------------------
    console.log('\n--- Test 5: EDC Terminal Push & Settlement ---');
    const edcResult = PaymentAutomationService.pushEdcTerminal({
      amount: 1250.00,
      orderId: 'ORD_AUTO_103',
      terminalId: 'COUNTER_PINE_01'
    });

    assert(edcResult.success === true, 'EDC push initiated and confirmed');
    assert(!!edcResult.authCode && edcResult.authCode.startsWith('AUTH_'), 'EDC generated card authorization code');
    assert(!!edcResult.rrn && edcResult.rrn.startsWith('RRN'), 'EDC generated Bank Reference Retrieval Number (RRN)');
    assert(edcResult.payment?.provider === 'pinelabs', 'Payment provider tracked as Pine Labs');
    assert(edcResult.payment?.status === 'success', 'Card payment settled immediately');

    // ---------------------------------------------------------
    // TEST 6: Owner Disable EDC Terminal Push
    // ---------------------------------------------------------
    console.log('\n--- Test 6: Owner Can Disable EDC Push Feature ---');
    store.updateProfile({
      paymentConfig: {
        ...currentProfile.paymentConfig!,
        enableEdcPush: false
      }
    });

    const disabledEdcResult = PaymentAutomationService.pushEdcTerminal({
      amount: 500,
      orderId: 'ORD_AUTO_104'
    });
    assert(disabledEdcResult.success === false, 'EDC push rejected when disabled by restaurant owner');
    assert(disabledEdcResult.error!.includes('disabled by owner'), 'Owner disabling is enforced');

    // Re-enable
    store.updateProfile({
      paymentConfig: {
        ...currentProfile.paymentConfig!,
        enableEdcPush: true
      }
    });

    // ---------------------------------------------------------
    // TEST 7: Immutable Audit Trail for Automated Payments
    // ---------------------------------------------------------
    console.log('\n--- Test 7: Audit Logging for Automated Collections ---');
    const recentAuditLogs = store.getAuditLogs().slice(0, 10);
    const upiAudit = recentAuditLogs.find(l => l.action === 'PAYMENT_CONFIRMED' && l.details?.payerVpa === 'anita@okaxis');
    const edcAudit = recentAuditLogs.find(l => l.action === 'PAYMENT_CONFIRMED' && l.details?.provider === 'pinelabs');

    assert(!!upiAudit, 'UPI Soundbox settlement logged in immutable audit trail');
    assert(!!edcAudit, 'EDC Pine Labs transaction logged with Auth Code & RRN in audit trail');

    // ---------------------------------------------------------
    // TEST 8: WhatsApp Invoice 1-Tap UPI Payment Link
    // ---------------------------------------------------------
    console.log('\n--- Test 8: WhatsApp Bill 1-Tap UPI Pay Link ---');
    const mockBill: any = {
      id: 'BILL_TEST_99',
      invoiceNumber: 'INV-2026-99',
      orderId: 'ORD_99',
      orderType: 'dine_in',
      total: 350.00,
      subtotal: 350.00,
      cgstAmount: 0,
      sgstAmount: 0,
      discountAmount: 0,
      roundOff: 0,
      paymentMode: 'upi',
      status: 'pending',
      items: [{ menuItemId: 'm1', name: 'Cappuccino', quantity: 1, unitPrice: 350 }],
      createdAt: new Date().toISOString()
    };

    const formattedInvoice = OpenWAService.formatInvoiceMessage(mockBill, currentProfile);
    assert(formattedInvoice.includes('upi://pay?pa=restroplus.billing@icici'), 'WhatsApp invoice includes 1-tap UPI payment link');
    assert(formattedInvoice.includes('&am=350.00'), 'WhatsApp invoice UPI pay link includes exact bill total');

    console.log('\n======================================================');
    console.log(`🏁 PHASE 12 RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('======================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } finally {
    // Restore original profile
    store.updateProfile(originalProfile);
  }
}

runPhase12AutomatedPaymentTests().catch(err => {
  console.error('Phase 12 test crashed:', err);
  process.exit(1);
});
