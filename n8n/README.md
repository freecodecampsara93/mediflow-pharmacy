# MediFlow Pharmacy — n8n Automation Workflows

n8n is used **only** for operational notifications (order confirmations, low-stock
alerts, expiry alerts). It never makes medical decisions and never touches
prescription or diagnosis data — it only relays order/inventory facts that the
backend has already computed and validated.

Every workflow follows the same shape:

```
Backend  ──POST──▶  n8n Webhook  ──▶  Edit Fields (Set)  ──▶  Gmail
```

The backend fires these webhooks **after** its own database transaction has
already committed successfully (see `backend/src/controllers/orderController.ts`
and `backend/src/services/webhookService.ts`). A webhook failure is logged and
swallowed — it never rolls back an order or blocks a request, and it never
receives payment details or passwords.

## Import instructions

1. Open your n8n instance → **Workflows → Import from File**.
2. Import each `.json` file in `n8n/workflows/`.
3. Open the imported **Webhook** node, copy its "Production URL", and paste it
   into the matching backend `.env` variable:
   - `workflow-1-order-notification.json` → `N8N_ORDER_WEBHOOK_URL`
   - `workflow-2-low-stock-alert.json` → `N8N_LOW_STOCK_WEBHOOK_URL`
   - `workflow-3-expiry-alert.json` → `N8N_EXPIRY_WEBHOOK_URL`
4. Open each **Gmail** node and attach your own Gmail OAuth2 credential
   (n8n → Credentials → New → Gmail OAuth2 API). No credentials are baked
   into the exported JSON.
5. Activate each workflow.

## Workflow 1 — Order Notification

**Trigger:** backend calls this webhook once, right after an order transaction
commits (`sendOrderWebhook` in `webhookService.ts`).

**Payload received:**
```json
{
  "orderId": 42,
  "customerName": "Sara Ahmed",
  "customerEmail": "sara.ahmed@example.com",
  "totalAmount": 45.00,
  "status": "pending",
  "items": [{ "medicineName": "Vitamin C 1000mg Tablets", "quantity": 3, "unitPrice": 8.99 }]
}
```

**Nodes:**
1. **Webhook** (`POST /order-webhook`) — receives the payload above.
2. **Edit Fields (Set)** — builds two ready-to-send text blocks: an order-items
   HTML list and a formatted total, so both Gmail nodes can reuse them.
3. **Gmail — Customer Confirmation** — sends `To: {{ $json.customerEmail }}`,
   subject `Your MediFlow Pharmacy order #{{ $json.orderId }} is confirmed`,
   with the order summary.
4. **Gmail — Pharmacy Notification** — sends to the pharmacy's own inbox
   (set as a fixed address in the node, e.g. `orders@yourpharmacy.example`),
   subject `New order #{{ $json.orderId }} received`, so staff can start
   fulfillment.

## Workflow 2 — Low Stock Alert

**Trigger:** backend calls this webhook whenever, after an order or manual
inventory adjustment, a medicine's `total_stock` drops below its
`minimum_stock` (`sendLowStockWebhook`).

**Payload received:**
```json
{ "medicineId": 11, "medicineName": "Throat Lozenges Honey & Lemon", "remainingStock": 8, "minimumStock": 20 }
```

**Nodes:**
1. **Webhook** (`POST /low-stock-webhook`).
2. **Edit Fields (Set)** — formats a "reorder needed" message.
3. **Gmail — Admin Alert** — sends to the pharmacy admin inbox, subject
   `Low stock: {{ $json.medicineName }}`, body includes remaining vs.
   minimum stock so staff know how urgently to reorder.

## Workflow 3 — Expiry Alert

**Trigger:** this one is *pulled*, not pushed automatically on every request
(expiry doesn't change minute-to-minute). Two supported setups:

- **Recommended:** add an n8n **Schedule Trigger** (e.g. daily at 08:00) that
  calls `POST {{BACKEND_URL}}/api/admin/notify/expiring-batches` (admin JWT
  required — store it in an n8n credential, not in the workflow JSON). That
  endpoint (see `backend/src/controllers/adminController.ts`,
  `notifyExpiringBatches`) queries all batches expiring within
  `EXPIRY_WARNING_DAYS` and calls this same webhook once per expiring batch.
- **Alternative:** an OS-level cron job or Windows Task Scheduler entry that
  curls the same admin endpoint on a schedule.

**Payload received per expiring batch:**
```json
{ "medicineId": 7, "medicineName": "Aspirin 300mg Tablets", "batchNumber": "PAIN-ASP-300-B1", "expiryDate": "2026-10-01" }
```

**Nodes:**
1. **Webhook** (`POST /expiry-webhook`).
2. **Edit Fields (Set)** — formats the batch + expiry date.
3. **Gmail — Admin Alert** — sends to the pharmacy admin inbox, subject
   `Expiry alert: {{ $json.medicineName }} (batch {{ $json.batchNumber }})`.

## What n8n is explicitly NOT used for

- No diagnosis, treatment suggestions, or medical advice of any kind.
- No prescription validation or approval logic.
- No payment processing — the backend only ever sends order totals and
  method names (`cash_on_delivery` / `mock_payment`), never card data.
