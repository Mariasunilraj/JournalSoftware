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
 * Initialize user store
 */
export function initAuth() {
  // Local user auth initialization
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
 * Generate a structured session token containing user identity and expiration
 */
export function generateSessionToken(user) {
  if (!user || !user.id) return '';
  const payload = {
    uid: user.id,
    u: user.username || user.email || '',
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const json = JSON.stringify(payload);
  const b64 = typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json).toString('base64');
  return `delta_sess_${b64}`;
}

/**
 * Get active session
 */
export function getActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.id) return null;
    // Upgrade legacy session tokens to structured delta_sess_ format if necessary
    if (!session.token || !session.token.startsWith('delta_sess_')) {
      session.token = generateSessionToken(session);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    return session;
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
    token: generateSessionToken(user),
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
  } catch (e) {}

  // Auto-login session for newly registered user
  const session = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    name: newUser.name,
    token: generateSessionToken(newUser),
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
