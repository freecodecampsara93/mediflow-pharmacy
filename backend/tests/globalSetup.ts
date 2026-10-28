import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import './testEnv';

/**
 * Creates (or resets) a dedicated `<db>_test` database and applies schema.sql,
 * so the test suite runs against a real, isolated PostgreSQL database and
 * never touches development data.
 */
export default async function globalSetup(): Promise<void> {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = parseInt(process.env.DB_PORT ?? '5432', 10);
  const user = process.env.DB_USER ?? 'postgres';
  const password = process.env.DB_PASSWORD ?? '';
  const testDbName = process.env.DB_NAME as string;

  const adminClient = new Client({ host, port, user, password, database: 'postgres' });
  await adminClient.connect();

  await adminClient.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, [testDbName]);
  await adminClient.query(`DROP DATABASE IF EXISTS ${testDbName}`);
  await adminClient.query(`CREATE DATABASE ${testDbName}`);
  await adminClient.end();

  const testClient = new Client({ host, port, user, password, database: testDbName });
  await testClient.connect();
  const schemaSql = fs.readFileSync(path.resolve(__dirname, '../../database/schema.sql'), 'utf-8');
  await testClient.query(schemaSql);
  await testClient.end();
}
