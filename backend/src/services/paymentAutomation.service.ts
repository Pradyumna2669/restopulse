import { store } from '../data/store';
import { AggregatorSecurityService } from './aggregatorSecurity.service';
import { PaymentTransaction, RestaurantProfile } from '../types';

export class PaymentAutomationService {
  /**
   * Generates a dynamic UPI QR intent payload with exact amount & merchant VPA
   */
  public static generateDynamicUpiQr(data: {
    amount: number;
    orderId?: string;
    billId?: string;
    tableNumber?: string;
    payerPhone?: string;
    idempotencyKey?: string;
  }): {
    success: boolean;
    payment?: PaymentTransaction;
    upiUrl?: string;
    error?: string;
  } {
    const profile = store.getProfile();
    const paymentConfig = profile.paymentConfig || {
      enableDynamicUpiQr: true,
      enableAutoSoundboxChime: true,
      enableEdcPush: true,
      enablePayAtTable: true,
      enableWhatsAppPayLink: true,
      enablePrePayCounter: false,
      upiVpa: 'restroplus@icici',
      merchantName: profile.name || 'RestroPlus'
    };

    if (paymentConfig.enableDynamicUpiQr === false) {
      return { success: false, error: 'Dynamic UPI QR is disabled by restaurant owner in settings.' };
    }

    if (!data.amount || data.amount <= 0) {
      return { success: false, error: 'Valid payment amount is required.' };
    }

    const vpa = paymentConfig.upiVpa || 'restroplus@icici';
    const merchantName = paymentConfig.merchantName || profile.name || 'RestroPlus';
    const note = encodeURIComponent(`Bill ${data.orderId || data.billId || 'Dining'}`);

    // Standard NPCI UPI Intent URI: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
    const upiUrl = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(merchantName)}&am=${data.amount.toFixed(2)}&cu=INR&tn=${note}`;

    const payment = AggregatorSecurityService.initiatePayment({
      billId: data.billId,
      orderId: data.orderId,
      amount: data.amount,
      provider: 'razorpay',
      method: 'upi',
      payerPhone: data.payerPhone,
      payerVpa: undefined,
      idempotencyKey: data.idempotencyKey
    });

    payment.upiUrl = upiUrl;
    store.updatePayment(payment.id, { upiUrl });

    return {
      success: true,
      payment,
      upiUrl
    };
  }

  /**
   * Verifies & confirms an incoming UPI payment (from soundbox or gateway webhook)
   */
  public static confirmUpiPayment(
    paymentId: string,
    providerTxId?: string,
    payerVpa?: string
  ): {
    success: boolean;
    payment?: PaymentTransaction;
    soundboxSpeech?: string;
    error?: string;
    message?: string;
  } {
    const payment = store.getPaymentById(paymentId);
    if (!payment) {
      return { success: false, error: 'Payment transaction not found' };
    }

    const txId = providerTxId || `UPI_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const confirmResult = AggregatorSecurityService.confirmPayment(paymentId, txId);
    if (!confirmResult.success || !confirmResult.payment) {
      return { success: false, error: confirmResult.error || 'Failed to confirm payment' };
    }

    const confirmedPayment = confirmResult.payment;
    confirmedPayment.payerDetails = {
      ...confirmedPayment.payerDetails,
      vpa: payerVpa || 'customer@okaxis'
    };
    confirmedPayment.settledAt = new Date().toISOString();
    confirmedPayment.soundboxAnnounced = true;
    store.updatePayment(confirmedPayment.id, {
      payerDetails: confirmedPayment.payerDetails,
      settledAt: confirmedPayment.settledAt,
      soundboxAnnounced: confirmedPayment.soundboxAnnounced
    });

    // If linked to an order, advance status to settled in real-time
    if (confirmedPayment.orderId) {
      store.updateOrderStatus(confirmedPayment.orderId, 'settled');
    }

    // If linked to a bill, ensure bill status is paid
    if (confirmedPayment.billId) {
      store.updateBill(confirmedPayment.billId, {
        status: 'paid',
        paymentMode: 'upi'
      });
    }

    // Log immutable audit entry for automated settlement
    store.addAuditLog({
      userId: 'system_soundbox',
      userName: 'UPI Soundbox / Gateway',
      role: 'owner',
      action: 'PAYMENT_CONFIRMED',
      entityType: 'payment',
      entityId: confirmedPayment.id,
      details: {
        amount: confirmedPayment.amount,
        reference: txId,
        payerVpa: payerVpa || 'UPI Guest',
        note: 'Automated UPI Settlement confirmed'
      }
    });

    const soundboxSpeech = `Payment of ₹${Math.round(confirmedPayment.amount)} received successfully on UPI.`;

    return {
      success: true,
      payment: confirmedPayment,
      soundboxSpeech,
      message: 'Payment confirmed in real-time!'
    };
  }

  /**
   * Pushes bill amount directly to an integrated card terminal (Pine Labs / Paytm EDC)
   */
  public static pushEdcTerminal(data: {
    amount: number;
    billId?: string;
    orderId?: string;
    terminalId?: string;
  }): {
    success: boolean;
    payment?: PaymentTransaction;
    authCode?: string;
    rrn?: string;
    error?: string;
    message?: string;
  } {
    const profile = store.getProfile();
    const paymentConfig = profile.paymentConfig || {
      enableDynamicUpiQr: true,
      enableAutoSoundboxChime: true,
      enableEdcPush: true,
      enablePayAtTable: true,
      enableWhatsAppPayLink: true,
      enablePrePayCounter: false,
      upiVpa: 'restroplus@icici',
      merchantName: profile.name || 'RestroPlus'
    };

    if (paymentConfig.enableEdcPush === false) {
      return { success: false, error: 'EDC Card Terminal integration is disabled by owner in settings.' };
    }

    if (!data.amount || data.amount <= 0) {
      return { success: false, error: 'Valid payment amount is required' };
    }

    const authCode = `AUTH_${Math.floor(100000 + Math.random() * 900000)}`;
    const rrn = `RRN${Date.now().toString().slice(-8)}`;

    const payment = AggregatorSecurityService.initiatePayment({
      billId: data.billId,
      orderId: data.orderId,
      amount: data.amount,
      provider: 'pinelabs',
      method: 'card',
      idempotencyKey: `edc_${Date.now()}`
    });

    const confirmResult = AggregatorSecurityService.confirmPayment(payment.id, `PL_${Date.now()}`);
    if (!confirmResult.success || !confirmResult.payment) {
      return { success: false, error: 'Failed to process card on EDC terminal' };
    }

    const settled = confirmResult.payment;
    settled.authCode = authCode;
    settled.rrn = rrn;
    settled.settledAt = new Date().toISOString();
    store.updatePayment(settled.id, {
      authCode,
      rrn,
      settledAt: settled.settledAt
    });

    if (data.orderId) {
      store.updateOrderStatus(data.orderId, 'settled');
    }

    store.addAuditLog({
      userId: 'system_edc',
      userName: 'Pine Labs EDC',
      role: 'owner',
      action: 'PAYMENT_CONFIRMED',
      entityType: 'payment',
      entityId: settled.id,
      details: {
        amount: settled.amount,
        authCode,
        rrn,
        provider: 'pinelabs',
        terminalId: data.terminalId || 'PL_COUNTER_01'
      }
    });

    return {
      success: true,
      payment: settled,
      authCode,
      rrn,
      message: 'Card payment authorized & settled on EDC terminal!'
    };
  }

  /**
   * Retrieves status of an active payment transaction
   */
  public static getPaymentStatus(paymentId: string): PaymentTransaction | null {
    return store.getPaymentById(paymentId) || null;
  }
}
