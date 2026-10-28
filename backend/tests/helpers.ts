import bcrypt from 'bcrypt';
import request from 'supertest';
import { app, testPool } from './testApp';

const DEMO_PASSWORD = 'Passw0rd!123';

export async function createAdmin(email = 'admin.test@mediflow.example') {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 4);
  await testPool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ('Test Admin', $1, $2, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [email, hash]
  );
  const res = await request(app).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
  return { email, token: res.body.token as string };
}

export async function createCustomer(email = 'customer.test@example.com') {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test Customer',
    email,
    password: DEMO_PASSWORD,
  });
  return { email, token: res.body.token as string, userId: res.body.user?.id as number };
}

export async function createCategory(token: string, name = `Category ${Date.now()}-${Math.random()}`) {
  const res = await request(app)
    .post('/api/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  return res.body.data;
}

export async function createMedicine(token: string, overrides: Record<string, unknown> = {}) {
  const sku = `TEST-SKU-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const res = await request(app)
    .post('/api/medicines')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test Medicine',
      description: 'A medicine used only for automated tests.',
      sku,
      price: 10,
      active: true,
      prescriptionRequired: false,
      ...overrides,
    });
  return res.body.data;
}

export async function createSupplier(token: string, name = `Supplier ${Date.now()}`) {
  const res = await request(app)
    .post('/api/suppliers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  return res.body.data;
}

export async function createBatch(token: string, medicineId: number, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/batches')
    .set('Authorization', `Bearer ${token}`)
    .send({
      medicineId,
      batchNumber: `BATCH-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      quantity: 50,
      expiryDate: '2099-01-01',
      purchasePrice: 5,
      sellingPrice: 10,
      ...overrides,
    });
  return res.body.data;
}
