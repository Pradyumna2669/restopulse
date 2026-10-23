import axios from 'axios';
import { Bill, RestaurantProfile } from '../types';
import { store } from '../data/store';

export class OpenWAService {
  /**
   * Normalize phone number to standard WhatsApp format (e.g., 919876543210@c.us)
   */
  public static normalizeChatId(phone: string): string {
    // Remove all non-digits
    let clean = phone.replace(/\D/g, '');
    
    // If Indian 10-digit number without country code, prefix 91
    if (clean.length === 10) {
      clean = '91' + clean;
    }
    
    return `${clean}@c.us`;
  }

  /**
   * Format invoice into a clean, modern WhatsApp message
   */
  public static formatInvoiceMessage(bill: Bill, profile: RestaurantProfile): string {
    const divider = '━━━━━━━━━━━━━━━━━━━━━━';
    const subDivider = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

    let itemLines = '';
    bill.items.forEach((item, index) => {
      const variationText = item.selectedVariation ? ` (${item.selectedVariation.name})` : '';
      const addonText = item.selectedAddons && item.selectedAddons.length > 0 
        ? `\n  └ +${item.selectedAddons.map(a => a.name).join(', ')}` 
        : '';
      
      const itemTotal = item.quantity * item.unitPrice;
      itemLines += `*${index + 1}.* ${item.name}${variationText} x ${item.quantity}\n     ${profile.currencySymbol}${itemTotal.toFixed(2)}${addonText}\n`;
    });

    const msg = 
`🧾 *TAX INVOICE / RECEIPT*
*${profile.name.toUpperCase()}*
_${profile.tagline}_
📍 ${profile.address}
📞 Phone: ${profile.phone}
🏛 GSTIN: ${profile.gstin}
${divider}
*Invoice No:* ${bill.invoiceNumber}
*Date:* ${new Date(bill.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
*Order Type:* ${bill.orderType.toUpperCase()} ${bill.tableNumber ? `(Table: ${bill.tableNumber})` : ''}
*Customer:* ${bill.customerName || 'Valued Guest'}
${subDivider}
*ITEMS ORDERED:*
${itemLines}${subDivider}
*Subtotal:* ${profile.currencySymbol}${bill.subtotal.toFixed(2)}
*CGST (2.5%):* ${profile.currencySymbol}${bill.cgstAmount.toFixed(2)}
*SGST (2.5%):* ${profile.currencySymbol}${bill.sgstAmount.toFixed(2)}
${bill.discountAmount > 0 ? `*Discount:* -${profile.currencySymbol}${bill.discountAmount.toFixed(2)}\n` : ''}*Round Off:* ${profile.currencySymbol}${bill.roundOff.toFixed(2)}
*GRAND TOTAL:* *${profile.currencySymbol}${bill.total.toFixed(2)}*
*Payment Mode:* ${bill.paymentMode.toUpperCase()} (PAID)
${divider}
Thank you for dining with us! We look forward to serving you again soon. ✨`;

    return msg;
  }

  /**
   * Format Google Review request message
   */
  public static formatReviewMessage(bill: Bill, profile: RestaurantProfile): string {
    const customer = bill.customerName ? ` ${bill.customerName}` : '';
    return (
`🌟 *HOW WAS YOUR EXPERIENCE?* 🌟

Dear${customer},

Thank you for visiting *${profile.name}* today! Our team strives to deliver the best culinary experience and hospitality to every guest.

If you enjoyed your meal and service, could you take *10 seconds* to support our local staff with a 5-star review on Google? It means the world to us! ❤️

👉 *Tap here to leave a review:*
${profile.googlePlaceReviewUrl}

Thank you for your love and support! 🙏`
    );
  }

  /**
   * Check OpenWA gateway connection status
   */
  public static async checkConnection(configOverride?: { apiUrl?: string; sessionId?: string; apiKey?: string }): Promise<{
    online: boolean;
    statusCode?: number;
    apiUrl: string;
    sessionId: string;
    error?: string;
    details?: any;
  }> {
    const profile = store.getProfile();
    const apiUrl = configOverride?.apiUrl || profile.openwaConfig.apiUrl || 'http://localhost:2785';
    const sessionId = configOverride?.sessionId || profile.openwaConfig.sessionId || 'default';
    const apiKey = configOverride?.apiKey !== undefined ? configOverride.apiKey : profile.openwaConfig.apiKey;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
      headers['api_key'] = apiKey;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      // Primary: check specific session
      const resp = await axios.get(`${apiUrl}/api/sessions/${sessionId}`, {
        headers,
        timeout: 4000
      });
      return {
        online: true,
        statusCode: 200,
        apiUrl,
        sessionId,
        details: resp.data
      };
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        return {
          online: false,
          statusCode: 401,
          apiUrl,
          sessionId,
          error: '401 Unauthorized: An API Key is required or the provided key is invalid.'
        };
      }
      if (status === 403) {
        return {
          online: false,
          statusCode: 403,
          apiUrl,
          sessionId,
          error: '403 Forbidden: API key does not have access permissions.'
        };
      }
      if (status === 404) {
        // Try fallback to sessions list
        try {
          const listResp = await axios.get(`${apiUrl}/api/sessions`, { headers, timeout: 3000 });
          const sessions = Array.isArray(listResp.data) ? listResp.data : [];
          const found = sessions.some((s: any) => (typeof s === 'string' ? s === sessionId : s.name === sessionId || s.id === sessionId));
          return {
            online: true,
            statusCode: 200,
            apiUrl,
            sessionId,
            details: {
              activeSessions: sessions,
              sessionActive: found,
              note: found ? 'Session found' : `Session "${sessionId}" not yet started in OpenWA`
            }
          };
        } catch (innerErr: any) {
          return {
            online: false,
            statusCode: 404,
            apiUrl,
            sessionId,
            error: `Session "${sessionId}" not found on OpenWA gateway at ${apiUrl}.`
          };
        }
      }

      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return {
          online: false,
          statusCode: 0,
          apiUrl,
          sessionId,
          error: `Connection refused at ${apiUrl}. Verify server address, port, and ensure OpenWA is running.`
        };
      }

      return {
        online: false,
        statusCode: status,
        apiUrl,
        sessionId,
        error: err.response?.data?.message || err.message || 'Error communicating with OpenWA'
      };
    }
  }

  /**
   * Send WhatsApp text message via self-hosted OpenWA API (U:\auto-wa\OpenWA)
   */
  public static async sendTextMessage(
    chatId: string, 
    text: string,
    configOverride?: { apiUrl?: string; sessionId?: string; apiKey?: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string; statusCode?: number }> {
    const profile = store.getProfile();
    const apiUrl = configOverride?.apiUrl || profile.openwaConfig.apiUrl || 'http://localhost:2785';
    const sessionId = configOverride?.sessionId || profile.openwaConfig.sessionId || 'default';
    const apiKey = configOverride?.apiKey !== undefined ? configOverride.apiKey : profile.openwaConfig.apiKey;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
      headers['api_key'] = apiKey;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Try primary OpenWA / WAHA endpoint: /api/sessions/:sessionId/messages/send-text
    try {
      const response = await axios.post(
        `${apiUrl}/api/sessions/${sessionId}/messages/send-text`,
        {
          chatId,
          text,
          linkPreview: true
        },
        {
          headers,
          timeout: 12000
        }
      );

      return {
        success: true,
        messageId: response.data?.id || response.data?.messageId || 'openwa_msg_ok'
      };
    } catch (err: any) {
      const status = err.response?.status;
      // If 404 on endpoint, try alternative WAHA/OpenWA format: POST /api/sendText
      if (status === 404) {
        try {
          const fallbackResp = await axios.post(
            `${apiUrl}/api/sendText`,
            {
              session: sessionId,
              chatId,
              text
            },
            {
              headers,
              timeout: 12000
            }
          );
          return {
            success: true,
            messageId: fallbackResp.data?.id || fallbackResp.data?.messageId || 'openwa_msg_ok'
          };
        } catch (fallbackErr: any) {
          const errMsg = fallbackErr.response?.data?.message || fallbackErr.message || 'Failed to reach OpenWA gateway';
          return {
            success: false,
            statusCode: fallbackErr.response?.status,
            error: errMsg
          };
        }
      }

      const errMsg = err.response?.data?.message || err.message || 'Failed to reach OpenWA gateway';
      console.warn(`[OpenWA] Failed to send message to ${chatId}:`, errMsg);
      return {
        success: false,
        statusCode: status,
        error: errMsg
      };
    }
  }

  /**
   * Process and dispatch Bill Invoice via WhatsApp
   */
  public static async dispatchInvoice(billId: string): Promise<Bill | undefined> {
    const bill = store.getBillById(billId);
    if (!bill || !bill.customerPhone) return bill;

    const profile = store.getProfile();
    const chatId = this.normalizeChatId(bill.customerPhone);
    const invoiceMsg = this.formatInvoiceMessage(bill, profile);

    console.log(`[OpenWA] Sending invoice for ${bill.invoiceNumber} to ${chatId}...`);
    const result = await this.sendTextMessage(chatId, invoiceMsg);

    const update: Partial<Bill> = {
      whatsappInvoiceSent: result.success,
      whatsappInvoiceTimestamp: new Date().toISOString(),
      whatsappInvoiceMessageId: result.messageId,
      whatsappError: result.error
    };

    store.updateBill(bill.id, update);

    // If review prompt is enabled and configured for immediate dispatch (or scheduled)
    if (profile.openwaConfig.autoSendReviewPrompt) {
      const delayMs = (profile.openwaConfig.reviewPromptDelayMinutes || 0) * 60 * 1000;
      
      if (delayMs <= 0) {
        // Immediate review request dispatch
        setTimeout(async () => {
          await this.dispatchReviewPrompt(bill.id);
        }, 1500); // 1.5s pause between invoice and review request
      } else {
        // Scheduled
        console.log(`[OpenWA] Scheduled Google Review prompt for ${bill.invoiceNumber} in ${profile.openwaConfig.reviewPromptDelayMinutes} mins.`);
        setTimeout(async () => {
          await this.dispatchReviewPrompt(bill.id);
        }, delayMs);
      }
    }

    return store.getBillById(billId);
  }

  /**
   * Dispatch Google Review prompt
   */
  public static async dispatchReviewPrompt(billId: string): Promise<void> {
    const bill = store.getBillById(billId);
    if (!bill || !bill.customerPhone || bill.whatsappReviewSent) return;

    const profile = store.getProfile();
    const chatId = this.normalizeChatId(bill.customerPhone);
    const reviewMsg = this.formatReviewMessage(bill, profile);

    console.log(`[OpenWA] Sending Google Review request for ${bill.invoiceNumber} to ${chatId}...`);
    const result = await this.sendTextMessage(chatId, reviewMsg);

    store.updateBill(bill.id, {
      whatsappReviewSent: result.success,
      whatsappReviewTimestamp: new Date().toISOString(),
      whatsappReviewMessageId: result.messageId
    });
  }

  /**
   * Dispatch Waitlist / Reservation Table Ready alert
   */
  public static async dispatchTableReadyAlert(guestName: string, phone: string, tableNumber?: string): Promise<{ success: boolean; error?: string }> {
    const profile = store.getProfile();
    const chatId = this.normalizeChatId(phone);
    const msg = `🎉 *GOOD NEWS FROM ${profile.name.toUpperCase()}!*\n\nDear *${guestName}*,\nYour table ${tableNumber ? `(*Table ${tableNumber}*) ` : ''}is ready and waiting for you!\n\nPlease proceed to the host desk to be seated immediately.\n\n📍 ${profile.address}\n📞 ${profile.phone}`;
    return await this.sendTextMessage(chatId, msg);
  }

  /**
   * Dispatch Table Reservation Confirmation alert
   */
  public static async dispatchReservationConfirmed(guestName: string, phone: string, date: string, time: string, pax: number, tableNumber?: string): Promise<{ success: boolean; error?: string }> {
    const profile = store.getProfile();
    const chatId = this.normalizeChatId(phone);
    const msg = `📅 *RESERVATION CONFIRMED!*\n*${profile.name.toUpperCase()}*\n\nDear *${guestName}*,\nYour table reservation is confirmed for *${date}* at *${time}* for *${pax} Guests* ${tableNumber ? `(${tableNumber})` : ''}.\n\nWe look forward to hosting you!\n📍 ${profile.address}\n📞 ${profile.phone}`;
    return await this.sendTextMessage(chatId, msg);
  }
}

