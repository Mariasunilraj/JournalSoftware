import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, ensureTables } from './_db.js';

const LOCAL_VAULT_PATH =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production'
    ? path.join('/tmp', 'server_users_vault.json')
    : path.resolve(process.cwd(), '.storage', 'server_users_vault.json');

let inMemoryVault = [];

function getLocalVault() {
  try {
    if (fs.existsSync(LOCAL_VAULT_PATH)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_VAULT_PATH, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        const map = new Map();
        for (const u of data) map.set(u.id, u);
        for (const u of inMemoryVault) map.set(u.id, u);
        inMemoryVault = Array.from(map.values());
        return inMemoryVault;
      }
    }
  } catch (e) {}
  return inMemoryVault;
}

function saveLocalVault(users) {
  try {
    inMemoryVault = users;
    const dir = path.dirname(LOCAL_VAULT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_VAULT_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.warn('saveLocalVault filesystem notice:', e.message);
  }
}

/**
 * Finds user by username, email, or handle prefix.
 * Guarantees that handles like 'mariasunilraj8' match 'mariasunilraj8@gmail.com'
 * to prevent any other person from claiming an existing user's handle.
 */
export async function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim().toLowerCase();
  const handle = clean.includes('@') ? clean.split('@')[0] : clean;
  const altClean = clean.includes('@') ? clean.replace('@', '') : `${clean}@gmail.com`;

  const sql = getDatabase();
  if (sql) {
    try {
      await ensureTables(sql);
      const rows = await sql`
        SELECT id, username, email, name, password_hash, created_at
        FROM delta_users
        WHERE LOWER(username) = ${clean}
           OR LOWER(email) = ${clean}
           OR LOWER(username) = ${altClean}
           OR LOWER(email) = ${altClean}
           OR LOWER(username) = ${handle}
           OR SPLIT_PART(LOWER(email), '@', 1) = ${handle}
           OR SPLIT_PART(LOWER(username), '@', 1) = ${handle}
        LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        return rows[0];
      }
      return null;
    } catch (err) {
      console.warn('Database findUserByIdentifier warning:', err.message);
    }
  }

  // Local & in-memory vault fallback
  const vault = getLocalVault();
  return (
    vault.find(
      (u) =>
        (u.username && (
          u.username.toLowerCase() === clean ||
          u.username.toLowerCase() === altClean ||
          u.username.toLowerCase() === handle ||
          u.username.toLowerCase().split('@')[0] === handle
        )) ||
        (u.email && (
          u.email.toLowerCase() === clean ||
          u.email.toLowerCase() === altClean ||
          u.email.toLowerCase().split('@')[0] === handle
        ))
    ) || null
  );
}

export async function findUserById(userId) {
  if (!userId) return null;
  const cleanId = String(userId).trim();

  const sql = getDatabase();
  if (sql) {
    try {
      await ensureTables(sql);
      const rows = await sql`
        SELECT id, username, email, name, created_at
        FROM delta_users
        WHERE id = ${cleanId}
        LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        return rows[0];
      }
      return null;
    } catch (err) {
      console.warn('Database findUserById warning:', err.message);
    }
  }

  const vault = getLocalVault();
  const u = vault.find((v) => v.id === cleanId);
  if (!u) return null;
  return { id: u.id, username: u.username, email: u.email, name: u.name, created_at: u.created_at };
}

/**
 * Creates a new user record with strict uniqueness enforcement.
 * Throws DUPLICATE_USER error if the username, email, or handle is already registered.
 * Never overwrites an existing user account.
 */
export async function createUser({ id, username, email, name, passwordHash }) {
  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Pre-validation: check if an account with this username or handle already exists
  const existingUser = await findUserByIdentifier(cleanUsername);
  if (existingUser) {
    const err = new Error(`The username "${cleanUsername}" is already reserved by another trader. Please choose a different username.`);
    err.code = 'DUPLICATE_USER';
    err.field = 'username';
    throw err;
  }

  if (cleanEmail && cleanEmail !== cleanUsername) {
    const existingEmail = await findUserByIdentifier(cleanEmail);
    if (existingEmail) {
      const err = new Error(`The email "${cleanEmail}" is already registered to an existing account. No one can re-register or use an existing email.`);
      err.code = 'DUPLICATE_USER';
      err.field = 'email';
      throw err;
    }
  }

  const userRecord = {
    id: id || `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    username: cleanUsername,
    email: cleanEmail,
    name: name.trim(),
    password_hash: passwordHash,
    created_at: Date.now(),
  };

  const sql = getDatabase();
  if (sql) {
    try {
      await ensureTables(sql);
      await sql`
        INSERT INTO delta_users (id, username, email, name, password_hash, created_at)
        VALUES (${userRecord.id}, ${userRecord.username}, ${userRecord.email}, ${userRecord.name}, ${userRecord.password_hash}, ${userRecord.created_at});
      `;
      return userRecord;
    } catch (err) {
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
        const dupErr = new Error('This username or email is already registered and protected. It cannot be re-registered or used by another user.');
        dupErr.code = 'DUPLICATE_USER';
        throw dupErr;
      }
      console.warn('Database createUser write warning (falling back to vault):', err.message);
    }
  }

  // Local & in-memory vault fallback (with strict uniqueness check)
  const vault = getLocalVault();
  const duplicateInVault = vault.find(
    (u) =>
      (u.username && u.username.toLowerCase() === cleanUsername) ||
      (u.email && u.email.toLowerCase() === cleanEmail)
  );

  if (duplicateInVault) {
    const dupErr = new Error('This username or email is already registered and protected. It cannot be re-registered or used by another user.');
    dupErr.code = 'DUPLICATE_USER';
    throw dupErr;
  }

  vault.push(userRecord);
  saveLocalVault(vault);
  return userRecord;
}
