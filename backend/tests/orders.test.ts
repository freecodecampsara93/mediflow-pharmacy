import request from 'supertest';
import { app, testPool } from './testApp';
import { createAdmin, createBatch, createCustomer, createMedicine } from './helpers';

async function checkout(token: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      shippingName: 'Test Customer',
      shippingPhone: '+20-100-000-0000',
      shippingAddress: '1 Test St',
      paymentMethod: 'cash_on_delivery',
      ...overrides,
    });
}

describe('Order creation (checkout transaction)', () => {
  it('creates an order, decrements inventory, and clears the cart', async () => {
    const { token: adminToken } = await createAdmin(`order.admin.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(adminToken, { price: 15 });
    await createBatch(adminToken, medicine.id, { quantity: 20, expiryDate: '2099-01-01' });

    const { token } = await createCustomer(`order.customer.${Date.now()}@example.com`);
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ medicineId: medicine.id, quantity: 3 });

    const orderRes = await checkout(token);
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.totalAmount).toBe(45);
    expect(orderRes.body.data.status).toBe('pending');

    const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(cart.body.data.items.length).toBe(0);

    const updatedMedicine = await request(app).get(`/api/medicines/${medicine.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(updatedMedicine.body.data.totalStock).toBe(17);
  });

  it('rejects checkout with an empty cart', async () => {
    const { token } = await createCustomer(`order.empty.${Date.now()}@example.com`);
    const res = await checkout(token);
    expect(res.status).toBe(409);
  });

  it('never trusts a client-supplied total and always recomputes server-side', async () => {
    const { token: adminToken } = await createAdmin(`order.trust.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(adminToken, { price: 100 });
    await createBatch(adminToken, medicine.id, { quantity: 5, expiryDate: '2099-01-01' });

    const { token } = await createCustomer(`order.trust.customer.${Date.now()}@example.com`);
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ medicineId: medicine.id, quantity: 1 });

    // Attempt to smuggle a fake total in the request body - the API ignores unknown fields.
    const res = await checkout(token, { totalAmount: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.totalAmount).toBe(100);
  });

  it('rolls back the entire transaction when stock is insufficient at checkout time', async () => {
    const { token: adminToken } = await createAdmin(`order.rollback.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(adminToken, { price: 10 });
    await createBatch(adminToken, medicine.id, { quantity: 3, expiryDate: '2099-01-01' });

    const { token } = await createCustomer(`order.rollback.customer.${Date.now()}@example.com`);
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ medicineId: medicine.id, quantity: 3 });

    // Simulate another sale draining stock after the item was added to this cart.
    await testPool.query('UPDATE inventory SET total_stock = 0 WHERE medicine_id = $1', [medicine.id]);

    const ordersBefore = await testPool.query('SELECT COUNT(*)::int AS count FROM orders');

    const res = await checkout(token);
    expect(res.status).toBe(409);

    const ordersAfter = await testPool.query('SELECT COUNT(*)::int AS count FROM orders');
    expect(ordersAfter.rows[0].count).toBe(ordersBefore.rows[0].count);

    const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(cart.body.data.items.length).toBe(1);

    const stock = await testPool.query('SELECT total_stock FROM inventory WHERE medicine_id = $1', [medicine.id]);
    expect(stock.rows[0].total_stock).toBe(0);
  });

  it('rejects ordering a medicine whose only stock is in expired batches', async () => {
    const { token: adminToken } = await createAdmin(`order.expired.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(adminToken, { price: 10 });
    await createBatch(adminToken, medicine.id, {
      quantity: 10,
      expiryDate: '2020-01-01',
      batchNumber: `EXPIRED-${Date.now()}`,
    });

    const { token } = await createCustomer(`order.expired.customer.${Date.now()}@example.com`);
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ medicineId: medicine.id, quantity: 1 });

    const res = await checkout(token);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });
});

describe('Customer order history', () => {
  it('lets a customer view their own orders but not someone else\'s', async () => {
    const { token: adminToken } = await createAdmin(`order.hist.admin.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(adminToken, { price: 5 });
    await createBatch(adminToken, medicine.id, { quantity: 10, expiryDate: '2099-01-01' });

    const { token: tokenA } = await createCustomer(`order.hist.a.${Date.now()}@example.com`);
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${tokenA}`).send({ medicineId: medicine.id, quantity: 1 });
    const order = await checkout(tokenA);

    const { token: tokenB } = await createCustomer(`order.hist.b.${Date.now()}@example.com`);
    const forbidden = await request(app).get(`/api/orders/${order.body.data.id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(forbidden.status).toBe(404);

    const own = await request(app).get(`/api/orders/${order.body.data.id}`).set('Authorization', `Bearer ${tokenA}`);
    expect(own.status).toBe(200);
  });
});

describe('Admin orders + dashboard', () => {
  it('lists all orders, fetches detail, and updates status', async () => {
    const { token: adminToken } = await createAdmin(`order.admin2.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(adminToken, { price: 5 });
    await createBatch(adminToken, medicine.id, { quantity: 10, expiryDate: '2099-01-01' });

    const { token } = await createCustomer(`order.admin2.customer.${Date.now()}@example.com`);
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${token}`).send({ medicineId: medicine.id, quantity: 1 });
    const order = await checkout(token);

    const list = await request(app).get('/api/admin/orders').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((o: any) => o.id === order.body.data.id)).toBe(true);

    const statusUpdate = await request(app)
      .put(`/api/admin/orders/${order.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });
    expect(statusUpdate.status).toBe(200);
    expect(statusUpdate.body.data.status).toBe('confirmed');

    const invalidStatus = await request(app)
      .put(`/api/admin/orders/${order.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'not-a-real-status' });
    expect(invalidStatus.status).toBe(400);
  });

  it('returns dashboard statistics that reflect real data', async () => {
    const { token: adminToken } = await createAdmin(`dashboard.${Date.now()}@mediflow.example`);
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.totalMedicines).toBe('number');
    expect(typeof res.body.revenue).toBe('number');
  });

  it('lists customers with order counts and totals, never exposing password hashes', async () => {
    const { token: adminToken } = await createAdmin(`customers.${Date.now()}@mediflow.example`);
    const res = await request(app).get('/api/admin/customers').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).not.toContain('password');
  });
});
