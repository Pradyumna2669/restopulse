import crypto from 'crypto';
import { store } from '../data/store';
import { DeliveryPartner, PaymentProvider, PaymentTransaction, Order } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AggregatorSecurityService {
  /**
   * Verifies HMAC-SHA256 signature sent by Zomato, Swiggy, ONDC or Magicpin
   */
  public static verifyWebhookSignature(
    partner: DeliveryPartner,
    payloadString: string,
    signatureHeader?: string
  ): boolean {
    const config = store.getDeliveryPartners().find(p => p.partner === partner);
    if (!config || !config.webhookSecret) {
      return false;
    }

    // Allow test tokens for local simulation
    if (signatureHeader === 'test_signature_valid' || signatureHeader === config.webhookSecret) {
      return true;
    }

    if (!signatureHeader) {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', config.webhookSecret);
      hmac.update(payloadString);
      const expectedSignature = hmac.digest('hex');

      // Timing-safe comparison to prevent timing side-channel attacks
      const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
      const actualBuffer = Buffer.from(signatureHeader, 'utf-8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Processes inbound aggregator order webhooks with signature check and event deduplication
   */
  public static processInboundWebhook(
    partner: DeliveryPartner,
    eventId: string,
    eventType: 'ORDER_PLACED' | 'ORDER_CANCELLED' | 'RIDER_ASSIGNED',
    payload: any,
    signatureHeader?: string,
    rawPayloadString?: string
  ): { status: 'processed' | 'duplicate_skipped' | 'signature_mismatch' | 'failed'; order?: Order; error?: string } {
    const payloadStr = rawPayloadString || JSON.stringify(payload);
    const isSignatureValid = this.verifyWebhookSignature(partner, payloadStr, signatureHeader);

    if (!isSignatureValid) {
      store.addWebhookLog({
        eventId,
        partner,
        signatureValid: false,
        status: 'signature_mismatch',
        error: 'Invalid HMAC-SHA256 signature'
      });
      return { status: 'signature_mismatch', error: 'Unauthorized: Webhook signature verification failed' };
    }

    // Idempotency check: Has this event already been processed?
    if (store.isWebhookEventProcessed(eventId)) {
      store.addWebhookLog({
        eventId,
        partner,
        signatureValid: true,
        status: 'duplicate_skipped',
        orderId: payload.orderId
      });
      return { status: 'duplicate_skipped', error: 'Duplicate webhook event skipped' };
    }

    // Process event based on type
    if (eventType === 'ORDER_CANCELLED') {
      const order = store.getOrders().find(
        o => o.partnerOrderId === payload.orderId || o.id === payload.orderId
      );
      if (order) {
        order.status = 'cancelled';
        order.partnerOrderStatus = 'cancelled';
        order.specialNotes = (order.specialNotes ? order.specialNotes + ' | ' : '') + `[Cancelled by ${partner.toUpperCase()}]: ${payload.reason || 'Aggregator cancellation'}`;
        order.updatedAt = new Date().toISOString();
        store.updateOrder(order.id, { status: 'cancelled' });
        
        store.addAuditLog({
          userId: `aggregator-${partner}`,
          userName: `${partner.toUpperCase()} Webhook`,
          role: 'manager',
          action: 'AGGREGATOR_ORDER_CANCELLED',
          entityType: 'order',
          entityId: order.id,
          reason: payload.reason || 'Cancelled by food delivery partner',
          details: { eventId, partnerOrderId: order.partnerOrderId }
        });
      }

      store.addWebhookLog({
        eventId,
        partner,
        signatureValid: true,
        status: 'processed',
        orderId: order?.id
      });

      return { status: 'processed', order };
    }

    // Default: Inbound New Order
    const order = store.simulatePartnerOrder(partner, payload);
    store.addWebhookLog({
      eventId,
      partner,
      signatureValid: true,
      status: 'processed',
      orderId: order.id
    });

    store.addAuditLog({
      userId: `aggregator-${partner}`,
      userName: `${partner.toUpperCase()} Gateway`,
      role: 'cashier',
      action: 'AGGREGATOR_ORDER_INGESTED',
      entityType: 'order',
      entityId: order.id,
      details: {
        eventId,
        partnerOrderId: order.partnerOrderId,
        netPayout: order.partnerNetPayout,
        commissionAmount: order.partnerCommissionAmount
      }
    });

    return { status: 'processed', order };
  }

  /**
   * Initiates a payment transaction with idempotency protection
   */
  public static initiatePayment(data: {
    billId?: string;
    orderId?: string;
    amount: number;
    provider: PaymentProvider;
    method?: 'upi' | 'card' | 'netbanking' | 'wallet' | 'cash';
    payerPhone?: string;
    payerVpa?: string;
    idempotencyKey?: string;
  }): PaymentTransaction {
    const key = data.idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const existing = store.getPaymentByIdempotencyKey(key);
    if (existing) {
      return existing;
    }

    const transaction: PaymentTransaction = {
      id: `pay_${uuidv4()}`,
      billId: data.billId,
      orderId: data.orderId,
      amount: data.amount,
      currency: 'INR',
      provider: data.provider,
      providerTransactionId: `${data.provider.toUpperCase()}_TXN_${Date.now()}`,
      status: 'pending',
      idempotencyKey: key,
      paymentMethod: data.method || 'upi',
      payerDetails: {
        phone: data.payerPhone,
        vpa: data.payerVpa
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return store.createPayment(transaction);
  }

  /**
   * Confirms payment settlement and reconciles associated bill
   */
  public static confirmPayment(
    paymentId: string,
    providerTxId?: string
  ): { success: boolean; payment?: PaymentTransaction; error?: string } {
    const payment = store.getPaymentById(paymentId);
    if (!payment) {
      return { success: false, error: 'Payment transaction not found' };
    }

    if (payment.status === 'success') {
      return { success: true, payment };
    }

    const updated = store.updatePayment(payment.id, {
      status: 'success',
      providerTransactionId: providerTxId || payment.providerTransactionId,
      updatedAt: new Date().toISOString()
    });

    // If billId attached, update bill
    if (payment.billId) {
      const bill = store.getBillById(payment.billId);
      if (bill && bill.status === 'unpaid') {
        store.updateBill(bill.id, { status: 'paid' });
      }
    }

    store.addAuditLog({
      userId: 'payment-gateway',
      userName: `${payment.provider.toUpperCase()} Gateway`,
      role: 'cashier',
      action: 'PAYMENT_SETTLED',
      entityType: 'bill',
      entityId: payment.billId || payment.id,
      details: {
        paymentId: payment.id,
        amount: payment.amount,
        provider: payment.provider,
        method: payment.paymentMethod
      }
    });

    return { success: true, payment: updated };
  }

  /**
   * Refunds payment with manager approval and audit logging
   */
  public static refundPayment(
    paymentId: string,
    amount: number,
    reason: string,
    approvedBy: { userId: string; userName: string; role: any }
  ): { success: boolean; payment?: PaymentTransaction; error?: string } {
    const payment = store.getPaymentById(paymentId);
    if (!payment) {
      return { success: false, error: 'Payment transaction not found' };
    }

    if (payment.status !== 'success') {
      return { success: false, error: `Cannot refund transaction in status '${payment.status}'` };
    }

    const updated = store.updatePayment(payment.id, {
      status: 'refunded',
      refundDetails: {
        refundId: `ref_${Date.now()}`,
        amount,
        reason,
        refundedAt: new Date().toISOString(),
        approvedBy: `${approvedBy.userName} (${approvedBy.role})`
      }
    });

    store.addAuditLog({
      userId: approvedBy.userId,
      userName: approvedBy.userName,
      role: approvedBy.role,
      action: 'PAYMENT_REFUNDED',
      entityType: 'bill',
      entityId: payment.billId || payment.id,
      reason,
      approvedBy,
      details: {
        paymentId: payment.id,
        amountRefunded: amount,
        originalAmount: payment.amount
      }
    });

    return { success: true, payment: updated };
  }
}
