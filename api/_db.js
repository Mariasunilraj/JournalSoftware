import { neon } from '@neondatabase/serverless';

let sqlClient = null;
let isInitialized = false;

export function getDatabase() {
  let connectionString =
    process.env.STORAGE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.STORAGE_DATABASE_URL ||
    process.env.NEON_DATABASE_URL;

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
    try {
      await sql`ALTER TABLE delta_users ADD COLUMN IF NOT EXISTS username TEXT;`;
      await sql`ALTER TABLE delta_users ADD COLUMN IF NOT EXISTS email TEXT;`;
      await sql`ALTER TABLE delta_users ADD COLUMN IF NOT EXISTS name TEXT;`;
      await sql`ALTER TABLE delta_users ADD COLUMN IF NOT EXISTS password_hash TEXT;`;
      await sql`ALTER TABLE delta_users ADD COLUMN IF NOT EXISTS created_at BIGINT DEFAULT 0;`;
    } catch (migErr) {
      console.warn('Columns already up-to-date or migration skipped:', migErr.message);
    }

    try {
      await sql`ALTER TABLE delta_users ALTER COLUMN data DROP NOT NULL;`;
    } catch (e) {}

    // 4. Clean up test collision accounts & normalize Sunil's primary identity
    try {
      // Purge any test account that used mariasunilraj8 with a different email
      await sql`
        DELETE FROM delta_users
        WHERE (LOWER(username) = 'mariasunilraj8' OR LOWER(email) LIKE 'mariasunilraj8%')
          AND LOWER(email) != 'mariasunilraj8@gmail.com';
      `;

      // Wipe any sync records that might have accidentally copied Sunil's trades to non-Sunil test users
      await sql`
        DELETE FROM delta_sync_records
        WHERE user_id NOT IN (
          SELECT id FROM delta_users WHERE LOWER(email) = 'mariasunilraj8@gmail.com'
        )
        AND user_id NOT IN ('usr_sunil_08', 'default', 'usr_default');
      `;

      // Normalize Sunil's account so username is 'mariasunilraj8' and email is 'mariasunilraj8@gmail.com'
      await sql`
        UPDATE delta_users
        SET username = 'mariasunilraj8', email = 'mariasunilraj8@gmail.com', name = 'Maria Sunil Raj'
        WHERE LOWER(email) = 'mariasunilraj8@gmail.com' OR LOWER(username) = 'mariasunilraj8@gmail.com';
      `;
    } catch (cleanErr) {
      console.warn('Account normalization notice:', cleanErr.message);
    }

    // 5. Strict Uniqueness Enforcement:
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS delta_users_unique_username ON delta_users (LOWER(username)) WHERE username IS NOT NULL;`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS delta_users_unique_email ON delta_users (LOWER(email)) WHERE email IS NOT NULL;`;
    } catch (idxErr) {
      console.warn('Unique index enforcement notice:', idxErr.message);
    }

    // 6. Sessions table
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
  }
}
