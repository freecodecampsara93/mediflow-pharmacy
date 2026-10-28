import request from 'supertest';
import { app } from './testApp';
import { createAdmin, createCustomer } from './helpers';

describe('Auth', () => {
  it('registers a new customer and returns a token + safe user object', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'New Customer',
      email: `new.customer.${Date.now()}@example.com`,
      password: 'StrongPass123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('customer');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email registration', async () => {
    const email = `dup.${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({ name: 'User A', email, password: 'StrongPass123' });
    const res = await request(app).post('/api/auth/register').send({ name: 'User B', email, password: 'StrongPass123' });
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords at registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email: `weak.${Date.now()}@example.com`, password: '123' });
    expect(res.status).toBe(400);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    const { email } = await createCustomer(`login.${Date.now()}@example.com`);

    const good = await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd!123' });
    expect(good.status).toBe(200);
    expect(good.body.token).toBeDefined();

    const bad = await request(app).post('/api/auth/login').send({ email, password: 'WrongPassword' });
    expect(bad.status).toBe(401);
  });

  it('rejects /auth/me without a token and accepts it with one', async () => {
    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);

    const { token } = await createCustomer(`me.${Date.now()}@example.com`);
    const withToken = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(withToken.status).toBe(200);
    expect(withToken.body.user.email).toContain('me.');
  });

  it('rejects admin-only routes for customers and allows admins', async () => {
    const { token: customerToken } = await createCustomer(`notadmin.${Date.now()}@example.com`);
    const forbidden = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Should Fail' });
    expect(forbidden.status).toBe(403);

    const { token: adminToken } = await createAdmin(`admin.forbid.${Date.now()}@mediflow.example`);
    const allowed = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Allowed Category ${Date.now()}` });
    expect(allowed.status).toBe(201);
  });
});
