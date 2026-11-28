import { neon } from '@neondatabase/serverless';

let sqlClient = null;
let isInitialized = false;

export function getDatabase() {
  // Support STORAGE_URL (from Vercel Neon integration), POSTGRES_URL, DATABASE_URL, or any postgres connection string
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

  try {
    // 1. Sync records table
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

    // 2. Base users table
    await sql`
      CREATE TABLE IF NOT EXISTS delta_users (
        id TEXT PRIMARY KEY,
        username TEXT,
        email TEXT,
        name TEXT,
        password_hash TEXT,
        created_at BIGINT DEFAULT 0
      );
    `;

    // 3. Schema migration for delta_users:
    // If delta_users was previously created with legacy schema (id, data, updated_at),
    // add missing columns and relax constraints so modern auth succeeds
    try {
      await sql`ALTER TABLE delta_users ADD COLUMN IF NOT EXISTS username TEXT;`;
      await sql`ALTER TABLE delta_users ADD COLUMN IF NOT EXISTS email TEXT;`;
      await sql`ALTER TABLE delta_users ADD COLUMN IF NOT EXISTS name TEXT;`;
      await sql`ALTER TABLE delta_users ADD COLUMN IF NOT EXISTS password_hash TEXT;`;
      await sql`ALTER TABLE delta_users ADD COLUMN IF NOT EXISTS created_at BIGINT DEFAULT 0;`;
    } catch (migErr) {
      console.warn('Columns already up-to-date or migration skipped:', migErr.message);
    }

    // If legacy 'data' column has a NOT NULL constraint, drop it so inserts without 'data' succeed
    try {
      await sql`ALTER TABLE delta_users ALTER COLUMN data DROP NOT NULL;`;
    } catch (e) {
      // Column 'data' does not exist or is already nullable
    }

    // 4. Strict Uniqueness Enforcement:
    // Ensure no one can ever insert a duplicate username or duplicate email at the database engine level
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS delta_users_unique_username ON delta_users (LOWER(username)) WHERE username IS NOT NULL;`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS delta_users_unique_email ON delta_users (LOWER(email)) WHERE email IS NOT NULL;`;
    } catch (idxErr) {
      console.warn('Unique index enforcement notice:', idxErr.message);
    }

    // 5. Sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS delta_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at BIGINT DEFAULT 0,
        expires_at BIGINT DEFAULT 0
      );
    `;

    isInitialized = true;
  } catch (err) {
    console.error('ensureTables migration warning:', err);
    // Do not throw so caller functions can still operate or use fallbacks
  }
}
