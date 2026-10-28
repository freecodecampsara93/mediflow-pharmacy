import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    if (process.env.NODE_ENV === 'test') return fallback ?? '';
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',

  dbHost: process.env.DB_HOST ?? 'localhost',
  dbPort: parseInt(process.env.DB_PORT ?? '5432', 10),
  dbName: process.env.DB_NAME ?? 'mediflow_pharmacy',
  dbUser: process.env.DB_USER ?? 'postgres',
  dbPassword: process.env.DB_PASSWORD ?? '',

  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'test' ? 'test_secret' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  expiryWarningDays: parseInt(process.env.EXPIRY_WARNING_DAYS ?? '30', 10),

  frontendBaseUrl: (process.env.FRONTEND_BASE_URL ?? 'http://localhost:4201').replace(/\/+$/, ''),
  passwordResetTtlMinutes: parseInt(process.env.PASSWORD_RESET_TTL_MINUTES ?? '30', 10),

  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: parseInt(process.env.SMTP_PORT ?? '587', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  mailFrom: process.env.MAIL_FROM ?? '',

  n8nOrderWebhookUrl: process.env.N8N_ORDER_WEBHOOK_URL ?? '',
  n8nLowStockWebhookUrl: process.env.N8N_LOW_STOCK_WEBHOOK_URL ?? '',
  n8nExpiryWebhookUrl: process.env.N8N_EXPIRY_WEBHOOK_URL ?? '',
};
