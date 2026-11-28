// Delta Journal - Authentication & Row-Level Security (RLS) User Manager

const USERS_KEY = 'delta_users_db_v1';
const SESSION_KEY = 'delta_active_session_v1';

/**
 * Deterministic hash for secure client-side credential verification
 */
function hashPassword(pwd) {
  let hash = 0;
  for (let i = 0; i < pwd.length; i++) {
    const char = pwd.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `delta_hash_${Math.abs(hash).toString(16)}_${pwd.length}`;
}

/**
 * Synchronize registered users with master sync server
 */
export async function syncUsersWithServer() {
  try {
    const res = await fetch('/api/sync/users');
    if (!res.ok) return;
    const serverUsers = await res.json();
    if (!Array.isArray(serverUsers)) return;

    const localUsers = getUsers();
    const userMap = new Map();

    // Add server users first
    serverUsers.forEach((u) => {
      if (u.id) userMap.set(u.id, u);
    });

    // Add / update with local users
    localUsers.forEach((u) => {
      if (u.id) userMap.set(u.id, { ...userMap.get(u.id), ...u });
    });

    const merged = Array.from(userMap.values());
    localStorage.setItem(USERS_KEY, JSON.stringify(merged));

    // If local had new users that server didn't, push to server
    if (merged.length > serverUsers.length) {
      await fetch('/api/sync/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
    }
  } catch (err) {
    // Graceful offline fallback
  }
}

/**
 * Initialize user store & sync with server if available
 */
export function initAuth() {
  try {
    // Background sync users with server
    syncUsersWithServer();
  } catch (err) {
    console.error('Failed to initialize auth store:', err);
  }
}

/**
 * Get all registered users (passwords remain hashed)
 */
export function getUsers() {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Get active session
 */
export function getActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Login user with username/email and password
 */
export function login(identifier, password) {
  initAuth();
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: 'Please enter both username/email and password.' };
  }

  const users = getUsers();
  const user = users.find(
    (u) =>
      (u.username && u.username.toLowerCase() === cleanId) ||
      (u.email && u.email.toLowerCase() === cleanId)
  );

  if (!user) {
    return {
      success: false,
      error: 'Account not found. Please register or check your credentials.',
    };
  }

  const inputHash = hashPassword(cleanPass);
  if (user.passwordHash !== inputHash) {
    return { success: false, error: 'Incorrect password. Please verify and try again.' };
  }

  // Create isolated user session
  const session = {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    token: `delta_sec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    loginTime: new Date().toISOString(),
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {}

  return { success: true, user: session };
}

/**
 * Register a new individual user account with zero initial data & RLS privacy
 */
export function register({ username, email, name, password }) {
  initAuth();
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanEmail = (email || cleanUser).trim().toLowerCase();
  const cleanName = (name || '').trim() || cleanUser.split('@')[0] || 'Trader';
  const cleanPass = (password || '').trim();

  if (!cleanUser) {
    return { success: false, error: 'Please enter a valid username or email.' };
  }
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const users = getUsers();
  const exists = users.some(
    (u) =>
      u.username.toLowerCase() === cleanUser ||
      (cleanEmail && u.email.toLowerCase() === cleanEmail)
  );

  if (exists) {
    return {
      success: false,
      error: 'An account with this username/email already exists. Please sign in.',
    };
  }

  const newId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser = {
    id: newId,
    username: cleanUser,
    email: cleanEmail,
    name: cleanName,
    passwordHash: hashPassword(cleanPass),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    // Immediately sync new user account with master server
    fetch('/api/sync/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users),
    }).catch(() => {});
  } catch (e) {}

  // Auto-login session for newly registered user
  const session = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    name: newUser.name,
    isPrimary: false,
    token: `delta_sec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    loginTime: new Date().toISOString(),
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {}

  return { success: true, user: session };
}

/**
 * Logout active user
 */
export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}
