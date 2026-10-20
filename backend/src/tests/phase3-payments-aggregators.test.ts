import crypto from 'crypto';
import { store } from '../data/store';
import { AggregatorSecurityService } from '../services/aggregatorSecurity.service';
import { DeliveryPartner } from '../types';

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

async function runPhase3PaymentAndAggregatorTests() {
  console.log('\n======================================================');
  console.log('💳 PHASE 3: PAYMENTS, AGGREGATORS & RECONCILIATION HARNESS');
  console.log('======================================================\n');

  // ---------------------------------------------------------
  // TEST 1: HMAC-SHA256 Signature Verification
  // ---------------------------------------------------------
  console.log('--- Test 1: Webhook HMAC-SHA256 Signature Verification ---');
  const zomatoConfig = store.getDeliveryPartners().find(p => p.partner === 'zomato');
  assert(!!zomatoConfig && !!zomatoConfig.webhookSecret, 'Zomato partner config has webhookSecret configured');

  const secret = zomatoConfig!.webhookSecret!;
  const testPayload = JSON.stringify({ orderId: 'ZOM_TEST_101', amount: 850, customer: 'Anita Roy' });

  // Generate valid HMAC
  const validHmac = crypto.createHmac('sha256', secret).update(testPayload).digest('hex');
  const isValid = AggregatorSecurityService.verifyWebhookSignature('zomato', testPayload, validHmac);
  assert(isValid === true, 'Valid HMAC-SHA256 signature is verified successfully');

  // Test tampered signature
  const tamperedHmac = validHmac.substring(0, validHmac.length - 2) + 'ab';
  const isTamperedValid = AggregatorSecurityService.verifyWebhookSignature('zomato', testPayload, tamperedHmac);
  assert(isTamperedValid === false, 'Tampered HMAC-SHA256 signature is rejected');

  // Test invalid secret / payload mismatch
  const mismatchedPayload = JSON.stringify({ orderId: 'ZOM_TEST_101', amount: 9999 });
  const isMismatchedValid = AggregatorSecurityService.verifyWebhookSignature('zomato', mismatchedPayload, validHmac);
  assert(isMismatchedValid === false, 'Mismatched payload against signature is rejected');

  // ---------------------------------------------------------
  // TEST 2: Webhook Ingestion & Event Deduplication (Idempotency)
  // ---------------------------------------------------------
  console.log('\n--- Test 2: Inbound Webhook Event Deduplication ---');
  const eventId1 = `evt_order_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const orderPayload = {
    orderId: `ZOM_ORD_${Date.now()}`,
    customerName: 'Sanjay Dutt',
    customerPhone: '+91 98765 43210',
    deliveryAddress: 'Flat 402, Green Glen, Mumbai',
    items: [
      { id: 'item_1', name: 'Paneer Butter Masala', quantity: 2, price: 320 },
      { id: 'item_2', name: 'Garlic Naan', quantity: 4, price: 60 }
    ],
    subtotal: 880,
    tax: 44,
    deliveryFee: 40,
    total: 964
  };
  const rawOrderStr = JSON.stringify(orderPayload);
  const orderHmac = crypto.createHmac('sha256', secret).update(rawOrderStr).digest('hex');

  // First ingestion: Should succeed
  const initialResult = AggregatorSecurityService.processInboundWebhook(
    'zomato',
    eventId1,
    'ORDER_PLACED',
    orderPayload,
    orderHmac,
    rawOrderStr
  );
  assert(initialResult.status === 'processed', 'First webhook delivery is processed successfully');
  assert(!!initialResult.order && initialResult.order.deliveryPartner === 'zomato', 'Order is created in store with deliveryPartner="zomato"');
  const createdOrderId = initialResult.order!.id;

  // Duplicate ingestion with identical eventId: Should be skipped
  const duplicateResult = AggregatorSecurityService.processInboundWebhook(
    'zomato',
    eventId1,
    'ORDER_PLACED',
    orderPayload,
    orderHmac,
    rawOrderStr
  );
  assert(duplicateResult.status === 'duplicate_skipped', 'Duplicate webhook eventId is idempotently skipped');

  // Verify webhook log history contains the event
  const isProcessedInStore = store.isWebhookEventProcessed(eventId1);
  assert(isProcessedInStore === true, 'store.isWebhookEventProcessed returns true for processed eventId');

  // ---------------------------------------------------------
  // TEST 3: Aggregator Order Cancellation Workflow
  // ---------------------------------------------------------
  console.log('\n--- Test 3: Aggregator Order Cancellation Workflow ---');
  const eventIdCancel = `evt_cancel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cancelPayload = {
    orderId: initialResult.order!.partnerOrderId,
    reason: 'Customer cancelled order before food prep started'
  };
  const rawCancelStr = JSON.stringify(cancelPayload);
  const cancelHmac = crypto.createHmac('sha256', secret).update(rawCancelStr).digest('hex');

  const cancelResult = AggregatorSecurityService.processInboundWebhook(
    'zomato',
    eventIdCancel,
    'ORDER_CANCELLED',
    cancelPayload,
    cancelHmac,
    rawCancelStr
  );
  assert(cancelResult.status === 'processed', 'Order cancellation webhook is processed');
  const updatedOrder = store.getOrders().find(o => o.id === createdOrderId);
  assert(updatedOrder?.status === 'cancelled', 'Order status is updated to "cancelled"');
  assert(updatedOrder?.partnerOrderStatus === 'cancelled', 'Order partnerOrderStatus is "cancelled"');

  // Audit trail entry check
  const auditLogs = store.getAuditLogs({ limit: 10 });
  const cancellationLog = auditLogs.find(l => l.action === 'AGGREGATOR_ORDER_CANCELLED' && l.entityId === createdOrderId);
  assert(!!cancellationLog, 'Audit log created for AGGREGATOR_ORDER_CANCELLED with cancellation reason');

  // ---------------------------------------------------------
  // TEST 4: Payment Gateway Lifecycle (Initiate, Confirm, Refund)
  // ---------------------------------------------------------
  console.log('\n--- Test 4: Payment Intent Lifecycle & Manager PIN Refund ---');
  const paymentKey = `idem_pay_${Date.now()}_test`;
  const initiatedPayment = AggregatorSecurityService.initiatePayment({
    amount: 1250,
    provider: 'razorpay',
    method: 'upi',
    payerPhone: '+91 99999 88888',
    payerVpa: 'sanjay@okhdfcbank',
    idempotencyKey: paymentKey
  });
  assert(initiatedPayment.status === 'pending', 'Payment intent initiated in "pending" status');
  assert(initiatedPayment.idempotencyKey === paymentKey, 'Payment stores provided idempotencyKey');

  // Idempotency: Re-initiating with same key returns existing transaction
  const reInitiated = AggregatorSecurityService.initiatePayment({
    amount: 1250,
    provider: 'razorpay',
    idempotencyKey: paymentKey
  });
  assert(reInitiated.id === initiatedPayment.id, 'Payment initiation with duplicate idempotencyKey returns existing record');

  // Confirmation
  const confirmResult = AggregatorSecurityService.confirmPayment(initiatedPayment.id, 'RZP_PAY_SETTLED_999');
  assert(confirmResult.success === true, 'Payment confirmation succeeds');
  assert(confirmResult.payment?.status === 'success', 'Payment status updated to "success"');

  // Refund with Manager authorization
  const managerUser = store.getStaffUsers().find(u => u.role === 'manager');
  assert(!!managerUser, 'Manager account available for refund authorization');
  const refundResult = AggregatorSecurityService.refundPayment(
    initiatedPayment.id,
    1250,
    'Guest charged twice due to bank UPI lag',
    { userId: managerUser!.id, userName: managerUser!.name, role: managerUser!.role }
  );
  assert(refundResult.success === true, 'Payment refunded successfully with manager approval');
  assert(refundResult.payment?.status === 'refunded', 'Payment status is "refunded"');
  assert(Boolean(refundResult.payment?.refundDetails?.approvedBy?.includes('Manager')), 'Refund record contains manager approval tag');

  // ---------------------------------------------------------
  // TEST 5: Financial Reconciliation Calculation
  // ---------------------------------------------------------
  console.log('\n--- Test 5: Aggregator Commission & Payout Reconciliation Engine ---');
  const recon = store.getAggregatorReconciliation();
  assert(!!recon, 'Reconciliation report generated');
  assert(recon.partnerBreakdown.length >= 4, 'Reconciliation includes 4 delivery partners');

  // Check specific partner calculation
  const zomatoRecon = recon.partnerBreakdown.find(p => p.partner === 'zomato');
  assert(!!zomatoRecon, 'Zomato breakdown exists in reconciliation');
  if (zomatoRecon && zomatoRecon.grossSales > 0) {
    // Net Payout formula: Gross - Commission - 18% GST - 1% TCS
    const expectedNet = zomatoRecon.grossSales - zomatoRecon.commissionAmount - zomatoRecon.gstOnCommission - zomatoRecon.tcsAmount;
    assert(
      Math.abs(zomatoRecon.netPayout - expectedNet) < 0.05,
      `Zomato net payout calculation matches formula (Expected: ${expectedNet.toFixed(2)}, Actual: ${zomatoRecon.netPayout.toFixed(2)})`
    );
  }

  // Summary
  console.log('\n======================================================');
  console.log(`📊 PHASE 3 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase3PaymentAndAggregatorTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
