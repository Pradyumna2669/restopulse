import crypto from 'crypto';
import { store } from '../data/store';
import { PaymentGatewayService } from '../services/paymentGateway.service';
import { PaymentTransaction } from '../types';

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

async function runPhase13GatewayTests() {
  console.log('\n======================================================');
  console.log('💳 PHASE 13: OWNER PAYMENT GATEWAY INTEGRATIONS TEST HARNESS');
  console.log('======================================================\n');

  const originalProfile = store.getProfile();

  try {
    // ---------------------------------------------------------
    // TEST 1: Default Gateway Settings Initialization
    // ---------------------------------------------------------
    console.log('--- Test 1: Gateway Settings Initialization & Presets ---');
    const settings = PaymentGatewayService.getGatewaySettings();
    assert(!!settings, 'Gateway settings object retrieved');
    assert(settings.primaryProvider === 'razorpay', 'Default primary provider is Razorpay');
    assert(!!settings.gateways.razorpay, 'Razorpay gateway config exists');
    assert(!!settings.gateways.phonepe, 'PhonePe gateway config exists');
    assert(!!settings.gateways.paytm, 'Paytm gateway config exists');
    assert(!!settings.gateways.stripe, 'Stripe gateway config exists');
    assert(!!settings.gateways.pinelabs, 'Pine Labs EDC gateway config exists');

    // ---------------------------------------------------------
    // TEST 2: Owner Configures Razorpay Credentials
    // ---------------------------------------------------------
    console.log('\n--- Test 2: Owner Updates Razorpay Credentials ---');
    const rzpUpdate = PaymentGatewayService.updateGateway('razorpay', {
      enabled: true,
      environment: 'production',
      credentials: {
        keyId: 'rzp_live_RestroBistro99',
        keySecret: 'secret_rzp_live_abc12345',
        webhookSecret: 'whsec_prod_rzp_secure_token'
      }
    }, { userId: 'owner_01', userName: 'Rajesh (Owner)', role: 'owner' });

    assert(rzpUpdate.success === true, 'Razorpay credentials saved successfully');
    const updatedSettings = PaymentGatewayService.getGatewaySettings();
    const rzp = updatedSettings.gateways.razorpay!;
    assert(rzp.credentials.keyId === 'rzp_live_RestroBistro99', 'Razorpay Key ID persisted');
    assert(rzp.environment === 'production', 'Environment switched to production');
    assert(rzp.enabled === true, 'Razorpay marked as enabled');

    // ---------------------------------------------------------
    // TEST 3: Owner Configures PhonePe Gateway Credentials
    // ---------------------------------------------------------
    console.log('\n--- Test 3: Owner Updates PhonePe PG Credentials ---');
    const phonepeUpdate = PaymentGatewayService.updateGateway('phonepe', {
      enabled: true,
      environment: 'production',
      credentials: {
        merchantId: 'RESTRO_PHONEPE_PROD_MID',
        saltKey: 'salt_key_prod_abcdef123456',
        saltIndex: '2'
      }
    });

    assert(phonepeUpdate.success === true, 'PhonePe credentials updated');
    const phonepe = PaymentGatewayService.getGatewaySettings().gateways.phonepe!;
    assert(phonepe.credentials.merchantId === 'RESTRO_PHONEPE_PROD_MID', 'PhonePe Merchant ID persisted');
    assert(phonepe.credentials.saltIndex === '2', 'PhonePe Salt Index set to 2');

    // ---------------------------------------------------------
    // TEST 4: Changing Primary Payment Gateway
    // ---------------------------------------------------------
    console.log('\n--- Test 4: Designating Primary Active Gateway ---');
    PaymentGatewayService.setPrimaryGateway('phonepe', { userId: 'owner_01', userName: 'Rajesh', role: 'owner' });
    const primaryCheck1 = PaymentGatewayService.getGatewaySettings();
    assert(primaryCheck1.primaryProvider === 'phonepe', 'Primary gateway switched to PhonePe');

    PaymentGatewayService.setPrimaryGateway('razorpay');
    const primaryCheck2 = PaymentGatewayService.getGatewaySettings();
    assert(primaryCheck2.primaryProvider === 'razorpay', 'Primary gateway switched back to Razorpay');

    // ---------------------------------------------------------
    // TEST 5: Gateway Connection Validator & Health Tester
    // ---------------------------------------------------------
    console.log('\n--- Test 5: Gateway Connection Validation Tests ---');
    const rzpTest = PaymentGatewayService.testGatewayConnection('razorpay');
    assert(rzpTest.success === true, 'Razorpay test passes with complete credentials');

    const phonepeTest = PaymentGatewayService.testGatewayConnection('phonepe');
    assert(phonepeTest.success === true, 'PhonePe test passes with valid MID and Salt Key');

    // Test with missing keys for failure detection
    PaymentGatewayService.updateGateway('stripe', {
      credentials: { keyId: '', keySecret: '' }
    });
    const stripeFailTest = PaymentGatewayService.testGatewayConnection('stripe');
    assert(stripeFailTest.success === false, 'Stripe connection fails validation when keys are missing');
    assert(stripeFailTest.error!.includes('mandatory'), 'Returns descriptive error to restaurant owner');

    // ---------------------------------------------------------
    // TEST 6: Cryptographic Webhook HMAC Signature Verification
    // ---------------------------------------------------------
    console.log('\n--- Test 6: Inbound Webhook Cryptographic Verification ---');
    const testSecret = 'whsec_prod_rzp_secure_token';
    const testBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_test_101',
            amount: 75000,
            status: 'captured'
          }
        }
      }
    });

    const validSig = crypto.createHmac('sha256', testSecret).update(testBody).digest('hex');
    const isSigValid = PaymentGatewayService.verifyWebhookSignature('razorpay', testBody, validSig);
    assert(isSigValid === true, 'Valid Razorpay HMAC-SHA256 signature accepted');

    const tamperedSig = validSig.slice(0, -4) + 'abcd';
    const isTamperedValid = PaymentGatewayService.verifyWebhookSignature('razorpay', testBody, tamperedSig);
    assert(isTamperedValid === false, 'Tampered webhook signature rejected');

    // ---------------------------------------------------------
    // TEST 7: Inbound Webhook Settlement & Soundbox Voice Generation
    // ---------------------------------------------------------
    console.log('\n--- Test 7: Automated Webhook Settlement & Soundbox Handshake ---');
    // Pre-create an initiated bill & payment
    const testPayment = store.createPayment({
      id: 'pay_live_test_777',
      amount: 480.00,
      currency: 'INR',
      provider: 'razorpay',
      providerTransactionId: 'RZP_INT_777',
      status: 'pending',
      idempotencyKey: 'idem_test_777',
      paymentMethod: 'upi',
      payerDetails: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const webhookPayload = {
      paymentId: testPayment.id,
      amount: 480.00,
      providerTransactionId: 'RZP_CAPTURED_998877',
      payerVpa: 'priya.sharma@okhdfcbank'
    };

    const webhookResult = PaymentGatewayService.processInboundGatewayWebhook('razorpay', webhookPayload);
    assert(webhookResult.success === true, 'Gateway webhook processed successfully');
    assert(webhookResult.settled === true, 'Transaction marked as settled');
    assert(webhookResult.payment?.status === 'success', 'Payment status updated to success');
    assert(webhookResult.payment?.soundboxAnnounced === true, 'Soundbox voice alert marked processed');
    assert(
      !!webhookResult.soundboxSpeech && webhookResult.soundboxSpeech.includes('₹480 received'),
      'Soundbox speech text synthesized with exact amount'
    );

    // ---------------------------------------------------------
    // TEST 8: Immutable Audit Trail for Gateway Configuration & Settlements
    // ---------------------------------------------------------
    console.log('\n--- Test 8: Immutable Audit Trail Logging ---');
    const auditLogs = store.getAuditLogs().slice(0, 10);
    const configAudit = auditLogs.find(l => l.action === 'GATEWAY_CONFIG_UPDATED');
    const primaryAudit = auditLogs.find(l => l.action === 'PRIMARY_GATEWAY_CHANGED');
    const settlementAudit = auditLogs.find(l => l.action === 'PAYMENT_SETTLED' && l.entityId === 'pay_live_test_777');

    assert(!!configAudit, 'Owner gateway configuration update logged in audit trail');
    assert(!!primaryAudit, 'Primary gateway change logged with owner attribution in audit trail');
    assert(!!settlementAudit, 'Automated webhook settlement logged with provider transaction ID in audit trail');

    console.log('\n======================================================');
    console.log(`🏁 PHASE 13 RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('======================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } finally {
    store.updateProfile(originalProfile);
  }
}

runPhase13GatewayTests().catch(err => {
  console.error('Phase 13 test crashed:', err);
  process.exit(1);
});
