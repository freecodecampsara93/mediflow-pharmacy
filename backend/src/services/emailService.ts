import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return !!(env.smtpHost && env.mailFrom);
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return transporter;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Sends the password reset email. Throws if SMTP is not configured or delivery fails.
 * Callers must not log the reset URL or token.
 */
export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('Email is not configured (set SMTP_HOST and MAIL_FROM, plus SMTP_USER/SMTP_PASS if required).');
  }

  const minutes = env.passwordResetTtlMinutes;
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  await getTransporter().sendMail({
    from: env.mailFrom,
    to,
    subject: 'Reset your MediFlow Pharmacy password',
    text:
      `Hello ${name},\n\n` +
      `We received a request to reset your MediFlow Pharmacy password. ` +
      `Open the link below to choose a new one. It expires in ${minutes} minutes and can be used once:\n\n` +
      `${resetUrl}\n\n` +
      `If you did not request this, you can safely ignore this email; your password will not change.`,
    html:
      `<p>Hello ${safeName},</p>` +
      `<p>We received a request to reset your MediFlow Pharmacy password. ` +
      `Click the button below to choose a new one. The link expires in ${minutes} minutes and can be used once.</p>` +
      `<p><a href="${safeUrl}" style="display:inline-block;padding:10px 18px;background:#0f9d8a;color:#fff;border-radius:6px;text-decoration:none">Reset password</a></p>` +
      `<p>Or paste this link into your browser:<br>${safeUrl}</p>` +
      `<p>If you did not request this, you can safely ignore this email; your password will not change.</p>`,
  });
}
