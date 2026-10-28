import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_jest_runs_only';

// Idempotent: process.env persists across test files in the same Jest worker,
// so re-running this module (once per test file) must not double-suffix.
const rawDbName = process.env.DB_NAME ?? 'mediflow_pharmacy';
process.env.DB_NAME = rawDbName.endsWith('_test') ? rawDbName : `${rawDbName}_test`;
// Leave webhook URLs untouched if a test explicitly set one before importing
// this module (see webhook.test.ts); otherwise default them to disabled.
if (!process.env.N8N_ORDER_WEBHOOK_URL) process.env.N8N_ORDER_WEBHOOK_URL = '';
if (!process.env.N8N_LOW_STOCK_WEBHOOK_URL) process.env.N8N_LOW_STOCK_WEBHOOK_URL = '';
if (!process.env.N8N_EXPIRY_WEBHOOK_URL) process.env.N8N_EXPIRY_WEBHOOK_URL = '';

export const TEST_DB_NAME = process.env.DB_NAME as string;
