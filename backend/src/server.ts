import { createApp } from './app';
import { env } from './config/env';
import { pool } from './config/db';

const app = createApp();

async function start() {
  try {
    await pool.query('SELECT 1');
    // eslint-disable-next-line no-console
    console.log('Connected to PostgreSQL.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to PostgreSQL:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`MediFlow Pharmacy API listening on port ${env.port} (${env.nodeEnv})`);
  });
}

start();
