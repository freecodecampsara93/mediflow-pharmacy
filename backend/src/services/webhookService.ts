import { env } from '../config/env';

const WEBHOOK_TIMEOUT_MS = 3000;

async function postWebhook(url: string, payload: unknown, label: string): Promise<void> {
  if (!url) {
    console.log(`[webhook:${label}] skipped - no URL configured`);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[webhook:${label}] non-2xx response: ${res.status}`);
    }
  } catch (err) {
    // Webhook failures must never break the calling request.
    console.error(`[webhook:${label}] failed:`, err instanceof Error ? err.message : err);
  } finally {
    clearTimeout(timeout);
  }
}

export interface OrderWebhookPayload {
  orderId: number;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  items: { medicineName: string; quantity: number; unitPrice: number }[];
}

export function sendOrderWebhook(payload: OrderWebhookPayload): void {
  void postWebhook(env.n8nOrderWebhookUrl, payload, 'order');
}

export interface LowStockWebhookPayload {
  medicineId: number;
  medicineName: string;
  remainingStock: number;
  minimumStock: number;
}

export function sendLowStockWebhook(payload: LowStockWebhookPayload): void {
  void postWebhook(env.n8nLowStockWebhookUrl, payload, 'low-stock');
}

export interface ExpiryWebhookPayload {
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
}

export function sendExpiryWebhook(payload: ExpiryWebhookPayload): void {
  void postWebhook(env.n8nExpiryWebhookUrl, payload, 'expiry');
}
