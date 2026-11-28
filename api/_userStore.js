import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, ensureTables } from './_db.js';

const LOCAL_VAULT_PATH = path.resolve(process.cwd(), '.storage', 'server_users_vault.json');

function getLocalVault() {
  try {
    if (fs.existsSync(LOCAL_VAULT_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_VAULT_PATH, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function saveLocalVault(users) {
  try {
    const dir = path.dirname(LOCAL_VAULT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_VAULT_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {}
}

export async function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim().toLowerCase();

  const sql = getDatabase();
  if (sql) {
    try {
      await ensureTables(sql);
      const rows = await sql`
        SELECT id, username, email, name, password_hash, created_at
        FROM delta_users
        WHERE LOWER(username) = ${clean} OR LOWER(email) = ${clean}
        LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        return rows[0];
      }
      return null;
    } catch (err) {
      console.error('Database findUser error:', err);
    }
  }

  // Local vault fallback
  const vault = getLocalVault();
  return vault.find(
    (u) =>
      (u.username && u.username.toLowerCase() === clean) ||
      (u.email && u.email.toLowerCase() === clean)
  ) || null;
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
      console.error('Database findUserById error:', err);
    }
  }

  // Local vault fallback
  const vault = getLocalVault();
  const u = vault.find((v) => v.id === cleanId);
  if (!u) return null;
  return { id: u.id, username: u.username, email: u.email, name: u.name, created_at: u.created_at };
}

export async function createUser({ id, username, email, name, passwordHash }) {
  const userRecord = {
    id: id || `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    username: username.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
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
      console.error('Database createUser error:', err);
      throw err;
    }
  }

  // Local vault fallback
  const vault = getLocalVault();
  vault.push(userRecord);
  saveLocalVault(vault);
  return userRecord;
}
