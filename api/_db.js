import { neon } from '@neondatabase/serverless';

let sqlClient = null;
let isInitialized = false;

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    return null;
  }
  if (!sqlClient) {
    sqlClient = neon(connectionString);
  }
  return sqlClient;
}

export async function ensureTables(sql) {
  if (isInitialized || !sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS delta_sync_records (
      user_id TEXT PRIMARY KEY,
      trades JSONB DEFAULT '[]'::jsonb,
      diary JSONB DEFAULT '[]'::jsonb,
      capital_logs JSONB DEFAULT '[]'::jsonb,
      settings JSONB DEFAULT '{}'::jsonb,
      updated_at BIGINT DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS delta_users (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at BIGINT DEFAULT 0
    );
  `;

  isInitialized = true;
}
