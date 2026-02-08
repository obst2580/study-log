import { Pool } from 'pg';
import { config } from '../config.js';
import { createSchema } from './schema.js';
import { runMigrations } from './migrations.js';

let pool: Pool | null = null;

export async function initDatabase(): Promise<Pool> {
  pool = new Pool({
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password,
  });

  await runMigrations(pool);
  await createSchema(pool);

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
