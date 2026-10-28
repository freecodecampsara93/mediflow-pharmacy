// Set BEFORE requiring testApp/testEnv so the app boots with webhooks "enabled".
// Uses require() instead of import: TypeScript hoists `import` statements above
// plain code when compiling to CommonJS, which would run these assignments too late.
process.env.N8N_ORDER_WEBHOOK_URL = 'http://127.0.0.1:9/unreachable-order-webhook';
process.env.N8N_LOW_STOCK_WEBHOOK_URL = 'http://127.0.0.1:9/unreachable-low-stock-webhook';

/* eslint-disable @typescript-eslint/no-var-requires */
const request = require('supertest');
const { app } = require('./testApp');
const { createAdmin, createBatch, createCustomer, createMedicine } = require('./helpers');
const webhookService = require('../src/services/webhookService');

describe('Webhook failure handling', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('still completes the order successfully when the n8n webhook call fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('simulated network failure')) as unknown as typeof fetch;

    const { token: adminToken } = await createAdmin(`webhook.admin.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(adminToken, { price: 10 });
    await createBatch(adminToken, medicine.id, { quantity: 5, expiryDate: '2099-01-01' });

    const { token } = await createCustomer(`webhook.customer.${Date.now()}@example.com`);
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ medicineId: medicine.id, quantity: 1 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingName: 'Webhook Test',
        shippingPhone: '+20-100-000-0000',
        shippingAddress: '1 Test St',
        paymentMethod: 'cash_on_delivery',
      });

    expect(res.status).toBe(201);
    // Webhook fires asynchronously after the response is sent; give it a tick.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(global.fetch).toHaveBeenCalled();
  });

  it('never throws synchronously, since webhooks are fire-and-forget', () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('simulated network failure')) as unknown as typeof fetch;
    expect(() =>
      webhookService.sendOrderWebhook({
        orderId: 1,
        customerName: 'x',
        customerEmail: 'x@example.com',
        totalAmount: 1,
        status: 'pending',
        items: [],
      })
    ).not.toThrow();
  });
});
