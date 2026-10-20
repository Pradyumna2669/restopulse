
export interface OfflinePendingItem {
  clientTxId: string;
  type: 'order' | 'bill';
  payload: any;
  queuedAt: string;
  retryCount: number;
}

const STORAGE_KEY = 'restopulse_offline_queue';

export const OfflineQueueService = {
  getQueue(): OfflinePendingItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  enqueue(type: 'order' | 'bill', payload: any): OfflinePendingItem {
    const queue = this.getQueue();
    const clientTxId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const item: OfflinePendingItem = {
      clientTxId,
      type,
      payload: {
        ...payload,
        clientTxId,
        isOffline: true
      },
      queuedAt: new Date().toISOString(),
      retryCount: 0
    };
    queue.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    return item;
  },

  remove(clientTxId: string) {
    const queue = this.getQueue().filter(i => i.clientTxId !== clientTxId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  },

  getPendingCount(): number {
    return this.getQueue().length;
  },

  async syncAll(): Promise<{ syncedOrders: number; syncedBills: number; failed: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { syncedOrders: 0, syncedBills: 0, failed: 0 };

    let syncedOrders = 0;
    let syncedBills = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const endpoint = item.type === 'order' ? '/api/orders/sync-offline' : '/api/bills/sync-offline';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });

        if (res.ok) {
          if (item.type === 'order') syncedOrders++;
          else syncedBills++;
          this.remove(item.clientTxId);
        } else {
          item.retryCount++;
          failed++;
        }
      } catch {
        item.retryCount++;
        failed++;
      }
    }

    return { syncedOrders, syncedBills, failed };
  }
};
