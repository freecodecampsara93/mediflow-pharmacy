import request from 'supertest';
import { app } from './testApp';
import { createAdmin, createBatch, createCategory, createMedicine, createSupplier } from './helpers';

describe('Categories', () => {
  it('lists only active categories publicly and supports CRUD for admins', async () => {
    const { token } = await createAdmin(`cat.admin.${Date.now()}@mediflow.example`);
    const category = await createCategory(token, `Vitamins ${Date.now()}`);
    expect(category.id).toBeDefined();

    const list = await request(app).get('/api/categories');
    expect(list.status).toBe(200);
    expect(list.body.data.some((c: any) => c.id === category.id)).toBe(true);

    const updated = await request(app)
      .put(`/api/categories/${category.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.active).toBe(false);

    const listAfterDeactivate = await request(app).get('/api/categories');
    expect(listAfterDeactivate.body.data.some((c: any) => c.id === category.id)).toBe(false);
  });

  it('blocks deleting a category that still has medicines assigned', async () => {
    const { token } = await createAdmin(`cat.block.${Date.now()}@mediflow.example`);
    const category = await createCategory(token);
    await createMedicine(token, { categoryId: category.id });

    const res = await request(app).delete(`/api/categories/${category.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });
});

describe('Medicines', () => {
  it('rejects negative price on create', async () => {
    const { token } = await createAdmin(`med.neg.${Date.now()}@mediflow.example`);
    const res = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Medicine', sku: `BAD-${Date.now()}`, price: -5 });
    expect(res.status).toBe(400);
  });

  it('supports search, category filter, and pagination', async () => {
    const { token } = await createAdmin(`med.search.${Date.now()}@mediflow.example`);
    const category = await createCategory(token);
    const unique = `Zolpidex${Date.now()}`;
    await createMedicine(token, { name: unique, categoryId: category.id });

    const bySearch = await request(app).get(`/api/medicines?search=${unique}`);
    expect(bySearch.status).toBe(200);
    expect(bySearch.body.data.length).toBe(1);
    expect(bySearch.body.data[0].name).toBe(unique);

    const byCategory = await request(app).get(`/api/medicines?category=${category.id}`);
    expect(byCategory.body.data.some((m: any) => m.name === unique)).toBe(true);

    const paged = await request(app).get('/api/medicines?limit=1&page=1');
    expect(paged.body.data.length).toBe(1);
    expect(paged.body.pagination.limit).toBe(1);
  });

  it('hides inactive medicines from public listing but shows them to admins', async () => {
    const { token } = await createAdmin(`med.inactive.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(token, { active: false });

    const publicGet = await request(app).get(`/api/medicines/${medicine.id}`);
    expect(publicGet.status).toBe(404);

    const adminGet = await request(app).get(`/api/medicines/${medicine.id}`).set('Authorization', `Bearer ${token}`);
    expect(adminGet.status).toBe(200);
  });

  it('blocks deleting a medicine referenced by an existing order item', async () => {
    const { token } = await createAdmin(`med.delete.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(token);

    // Directly insert an order_item referencing this medicine to simulate order history.
    const { testPool } = await import('./testApp');
    const order = await testPool.query(
      `INSERT INTO orders (user_id, status, subtotal, total_amount, shipping_name, shipping_phone, shipping_address, payment_method)
       SELECT id, 'pending', 10, 10, 'x', 'x', 'x', 'cash_on_delivery' FROM users LIMIT 1 RETURNING id`
    );
    await testPool.query(
      `INSERT INTO order_items (order_id, medicine_id, medicine_name, quantity, unit_price, line_total) VALUES ($1,$2,'x',1,10,10)`,
      [order.rows[0].id, medicine.id]
    );

    const res = await request(app).delete(`/api/medicines/${medicine.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });
});

describe('Suppliers (admin-only)', () => {
  it('rejects unauthenticated access and allows admin CRUD', async () => {
    const unauth = await request(app).get('/api/suppliers');
    expect(unauth.status).toBe(401);

    const { token } = await createAdmin(`sup.${Date.now()}@mediflow.example`);
    const supplier = await createSupplier(token);
    expect(supplier.id).toBeDefined();

    const list = await request(app).get('/api/suppliers').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
  });
});

describe('Batches + Inventory + Expiry', () => {
  it('creating a batch increases inventory total_stock', async () => {
    const { token } = await createAdmin(`batch.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(token);

    await createBatch(token, medicine.id, { quantity: 25 });

    const updated = await request(app).get(`/api/medicines/${medicine.id}`).set('Authorization', `Bearer ${token}`);
    expect(updated.body.data.totalStock).toBe(25);
  });

  it('reports low-stock medicines once stock drops below minimum', async () => {
    const { token } = await createAdmin(`lowstock.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(token);
    await createBatch(token, medicine.id, { quantity: 5 });

    await request(app)
      .put(`/api/inventory/${medicine.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ minimumStock: 100 });

    const lowStock = await request(app).get('/api/inventory/low-stock').set('Authorization', `Bearer ${token}`);
    expect(lowStock.status).toBe(200);
    expect(lowStock.body.data.some((i: any) => i.medicineId === medicine.id)).toBe(true);
  });

  it('classifies batches as expiring-soon or expired correctly', async () => {
    const { token } = await createAdmin(`expiry.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(token);

    const soon = new Date();
    soon.setDate(soon.getDate() + 5);
    await createBatch(token, medicine.id, { expiryDate: soon.toISOString().slice(0, 10), batchNumber: `SOON-${Date.now()}` });

    const past = new Date();
    past.setDate(past.getDate() - 5);
    await createBatch(token, medicine.id, { expiryDate: past.toISOString().slice(0, 10), batchNumber: `PAST-${Date.now()}` });

    const expiringSoon = await request(app).get('/api/inventory/expiring-soon?days=30').set('Authorization', `Bearer ${token}`);
    expect(expiringSoon.body.data.some((b: any) => b.medicineId === medicine.id)).toBe(true);

    const expired = await request(app).get('/api/inventory/expired').set('Authorization', `Bearer ${token}`);
    expect(expired.body.data.some((b: any) => b.medicineId === medicine.id)).toBe(true);
  });

  it('rejects negative quantities and stock values', async () => {
    const { token } = await createAdmin(`negstock.${Date.now()}@mediflow.example`);
    const medicine = await createMedicine(token);

    const badBatch = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineId: medicine.id, batchNumber: 'X', quantity: -1, expiryDate: '2099-01-01', purchasePrice: 1, sellingPrice: 2 });
    expect(badBatch.status).toBe(400);

    const badInventory = await request(app)
      .put(`/api/inventory/${medicine.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ totalStock: -10 });
    expect(badInventory.status).toBe(400);
  });
});
