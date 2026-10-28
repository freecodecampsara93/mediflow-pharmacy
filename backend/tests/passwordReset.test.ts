import request from 'supertest';

const mockSend = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/services/emailService', () => ({
  isEmailConfigured: () => true,
  sendPasswordResetEmail: (...args: unknown[]) => mockSend(...args),
}));

import { app, testPool } from './testApp';
import { createCustomer } from './helpers';

const OLD_PASSWORD = 'Passw0rd!123';
const NEW_PASSWORD = 'BrandNewPass456';

async function waitForEmail(callsBefore: number) {
  for (let i = 0; i < 50 && mockSend.mock.calls.length <= callsBefore; i++) {
    await new Promise((r) => setTimeout(r, 20));
  }
}

async function requestReset(email: string): Promise<string | null> {
  const before = mockSend.mock.calls.length;
  const res = await request(app).post('/api/auth/forgot-password').send({ email });
  expect(res.status).toBe(200);
  await waitForEmail(before);
  if (mockSend.mock.calls.length <= before) return null;
  const url = mockSend.mock.calls[mockSend.mock.calls.length - 1][2] as string;
  return new URL(url).searchParams.get('token');
}

describe('Password reset', () => {
  beforeEach(() => mockSend.mockClear());

  it('returns the same generic response for known and unknown emails and sends mail only for known', async () => {
    const { email } = await createCustomer(`reset.generic.${Date.now()}@example.com`);
    const known = await request(app).post('/api/auth/forgot-password').send({ email });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: `nobody.${Date.now()}@example.com` });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    await waitForEmail(0);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0]).toBe(email);
  });

  it('rejects an invalid email at validation', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('stores only a hash of the token and does not change the password on request', async () => {
    const { email, userId } = await createCustomer(`reset.hash.${Date.now()}@example.com`);
    const token = await requestReset(email);
    expect(token).toMatch(/^[a-f0-9]{64}$/);

    const rows = await testPool.query('SELECT token_hash FROM password_reset_tokens WHERE user_id = $1', [userId]);
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].token_hash).not.toBe(token);
    expect(rows.rows[0].token_hash).toHaveLength(64);

    const login = await request(app).post('/api/auth/login').send({ email, password: OLD_PASSWORD });
    expect(login.status).toBe(200);
  });

  it('resets the password with a valid token, keeps the account, and makes the token single-use', async () => {
    const { email, userId } = await createCustomer(`reset.ok.${Date.now()}@example.com`);
    const token = (await requestReset(email)) as string;

    const res = await request(app).post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD });
    expect(res.status).toBe(200);

    const oldLogin = await request(app).post('/api/auth/login').send({ email, password: OLD_PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/auth/login').send({ email, password: NEW_PASSWORD });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.id).toBe(userId);

    const reuse = await request(app).post('/api/auth/reset-password').send({ token, password: 'AnotherPass789' });
    expect(reuse.status).toBe(400);
  });

  it('rejects unknown, malformed, expired tokens and weak passwords', async () => {
    const { email, userId } = await createCustomer(`reset.bad.${Date.now()}@example.com`);

    const unknown = await request(app).post('/api/auth/reset-password').send({ token: 'a'.repeat(64), password: NEW_PASSWORD });
    expect(unknown.status).toBe(400);
    const malformed = await request(app).post('/api/auth/reset-password').send({ token: 'abc', password: NEW_PASSWORD });
    expect(malformed.status).toBe(400);

    const token = (await requestReset(email)) as string;
    const weak = await request(app).post('/api/auth/reset-password').send({ token, password: 'short' });
    expect(weak.status).toBe(400);

    await testPool.query(
      `UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1`,
      [userId]
    );
    const expired = await request(app).post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD });
    expect(expired.status).toBe(400);

    const stillOld = await request(app).post('/api/auth/login').send({ email, password: OLD_PASSWORD });
    expect(stillOld.status).toBe(200);
  });

  it('invalidates other outstanding tokens after a successful reset', async () => {
    const { email, userId } = await createCustomer(`reset.multi.${Date.now()}@example.com`);
    const first = (await requestReset(email)) as string;
    // Skip the per-user cooldown to simulate a second, later request.
    await testPool.query(`UPDATE password_reset_tokens SET created_at = NOW() - INTERVAL '5 minutes' WHERE user_id = $1`, [userId]);
    const second = (await requestReset(email)) as string;
    expect(second).not.toBe(first);

    expect((await request(app).post('/api/auth/reset-password').send({ token: second, password: NEW_PASSWORD })).status).toBe(200);
    expect((await request(app).post('/api/auth/reset-password').send({ token: first, password: 'AnotherPass789' })).status).toBe(400);
  });

  it('throttles repeated requests for the same account', async () => {
    const { email } = await createCustomer(`reset.cooldown.${Date.now()}@example.com`);
    await requestReset(email);
    const before = mockSend.mock.calls.length;
    await request(app).post('/api/auth/forgot-password').send({ email });
    await new Promise((r) => setTimeout(r, 200));
    expect(mockSend.mock.calls.length).toBe(before);
  });
});
