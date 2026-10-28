import request from 'supertest';
import { app } from './testApp';
import { createAdmin, createBatch, createCustomer, createMedicine } from './helpers';

describe('Cart', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });

  it('adds, updates, removes items and computes totals server-side', async () => {
    const { token: adminToken } = await createAdmin(`cart.admin.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(adminToken, { price: 20 });
    await createBatch(adminToken, medicine.id, { quantity: 10 });

    const { token } = await createCustomer(`cart.customer.${Date.now()}@example.com`);

    const add = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId: medicine.id, quantity: 2 });
    expect(add.status).toBe(201);
    expect(add.body.data.total).toBe(40);

    const update = await request(app)
      .put(`/api/cart/items/${medicine.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 3 });
    expect(update.body.data.total).toBe(60);

    const remove = await request(app).delete(`/api/cart/items/${medicine.id}`).set('Authorization', `Bearer ${token}`);
    expect(remove.body.data.items.length).toBe(0);
  });

  it('rejects adding more than available stock', async () => {
    const { token: adminToken } = await createAdmin(`cart.stock.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(adminToken);
    await createBatch(adminToken, medicine.id, { quantity: 2 });

    const { token } = await createCustomer(`cart.stock.customer.${Date.now()}@example.com`);
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId: medicine.id, quantity: 999 });
    expect(res.status).toBe(400);
  });
});

describe('Wishlist', () => {
  it('adds and removes items, ignoring duplicates', async () => {
    const { token: adminToken } = await createAdmin(`wish.admin.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(adminToken);
    const { token } = await createCustomer(`wish.customer.${Date.now()}@example.com`);

    const add1 = await request(app).post(`/api/wishlist/${medicine.id}`).set('Authorization', `Bearer ${token}`);
    expect(add1.status).toBe(201);
    const add2 = await request(app).post(`/api/wishlist/${medicine.id}`).set('Authorization', `Bearer ${token}`);
    expect(add2.status).toBe(201);

    const list = await request(app).get('/api/wishlist').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.length).toBe(1);

    const remove = await request(app).delete(`/api/wishlist/${medicine.id}`).set('Authorization', `Bearer ${token}`);
    expect(remove.status).toBe(204);

    const listAfter = await request(app).get('/api/wishlist').set('Authorization', `Bearer ${token}`);
    expect(listAfter.body.data.length).toBe(0);
  });
});
