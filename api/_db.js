import { neon } from '@neondatabase/serverless';

let sqlClient = null;
let isInitialized = false;

export function getDatabase() {
  // Support STORAGE_URL (from Vercel Neon screenshot), POSTGRES_URL, DATABASE_URL, or any postgres connection string
  let connectionString =
    process.env.STORAGE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.STORAGE_DATABASE_URL ||
    process.env.NEON_DATABASE_URL;

  // Fallback: Dynamically search for any env var containing a postgres connection URL
  if (!connectionString) {
    const matchingKey = Object.keys(process.env).find(
      (k) =>
        (k.endsWith('_URL') || k.includes('POSTGRES') || k.includes('DATABASE')) &&
        typeof process.env[k] === 'string' &&
        process.env[k].startsWith('postgres')
    );
    if (matchingKey) {
      connectionString = process.env[matchingKey];
    }
  }

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
