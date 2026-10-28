import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { mapUser } from '../utils/mappers';
import { AuthTokenPayload } from '../models/types';
import { isEmailConfigured, sendPasswordResetEmail } from '../services/emailService';

const SALT_ROUNDS = 10;

function issueToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone, address } = req.body as {
    name: string; email: string; password: string; phone?: string; address?: string;
  };

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount) {
    throw AppError.conflict('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, phone, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, email, passwordHash, phone ?? null, address ?? null]
  );

  const user = mapUser(result.rows[0]);
  const token = issueToken({ userId: user.id, role: user.role });

  res.status(201).json({ user, token });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
  const row = result.rows[0];
  if (!row) throw AppError.unauthorized('Invalid email or password.');

  const passwordMatches = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatches) throw AppError.unauthorized('Invalid email or password.');

  const user = mapUser(row);
  const token = issueToken({ userId: user.id, role: user.role });

  res.status(200).json({ user, token });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user!.userId]);
  const row = result.rows[0];
  if (!row) throw AppError.notFound('User not found.');
  res.status(200).json({ user: mapUser(row) });
});

const RESET_REQUEST_COOLDOWN_SECONDS = 60;

const FORGOT_PASSWORD_MESSAGE = 'If an account exists for that email, a password reset link has been sent.';

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Always responds with the same generic message so account existence cannot be
 * inferred; everything that differs between known and unknown emails happens
 * after the response is sent. The token is never logged or returned.
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  res.status(200).json({ message: FORGOT_PASSWORD_MESSAGE });

  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE email = $1 AND is_active = TRUE', [email]);
    const user = result.rows[0];
    if (!user) return;

    if (!isEmailConfigured()) {
      console.error('[password-reset] email is not configured; set SMTP_HOST and MAIL_FROM (and SMTP_USER/SMTP_PASS). No email was sent.');
      return;
    }

    const recent = await pool.query(
      `SELECT 1 FROM password_reset_tokens
       WHERE user_id = $1 AND created_at > NOW() - make_interval(secs => $2)`,
      [user.id, RESET_REQUEST_COOLDOWN_SECONDS]
    );
    if (recent.rowCount) return;

    const token = crypto.randomBytes(32).toString('hex');
    const inserted = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + make_interval(mins => $3))
       RETURNING id`,
      [user.id, hashResetToken(token), env.passwordResetTtlMinutes]
    );

    try {
      await sendPasswordResetEmail(user.email, user.name, `${env.frontendBaseUrl}/reset-password?token=${token}`);
    } catch (err) {
      // A token that was never delivered is useless; remove it.
      await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [inserted.rows[0].id]);
      console.error('[password-reset] failed to send email:', err instanceof Error ? err.message : 'unknown error');
    }
  } catch (err) {
    console.error('[password-reset] request failed:', err instanceof Error ? err.message : 'unknown error');
  }
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query(
      `SELECT t.id, t.user_id FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > NOW() AND u.is_active = TRUE
       FOR UPDATE OF t`,
      [hashResetToken(token)]
    );
    const row = found.rows[0];
    if (!row) {
      throw AppError.badRequest('This reset link is invalid or has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, row.user_id]);
    // Consume this token and invalidate any other outstanding ones for the user.
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [
      row.user_id,
    ]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  res.status(200).json({ message: 'Your password has been reset. You can now log in.' });
});
