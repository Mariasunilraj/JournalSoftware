// Delta Journal - Server-Side Authentication & Session Manager
// All password hashing (bcrypt 12 rounds), session issuance, and rate limiting run server-side.

const SESSION_KEY = 'delta_active_session_v1';

/**
 * Initialize user store hook (client-side)
 */
export function initAuth() {
  // Legacy cleanup if old insecure user stores exist in browser
  try {
    if (localStorage.getItem('delta_users_db_v1')) {
      localStorage.removeItem('delta_users_db_v1');
    }
  } catch (e) {}
}

/**
 * Get registered users stub (passwords are no longer stored client-side)
 */
export function getUsers() {
  return [];
}

/**
 * Get active session from browser storage
 */
export function getActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.id) return null;
    return session;
  } catch (e) {
    return null;
  }
}

/**
 * Login user via server-side endpoint with rate limiting & timing-safe generic error
 * @param {string} identifier - username or email
 * @param {string} password - plain password
 * @returns {Promise<{ success: boolean, user?: object, error?: string, retryAfter?: number }>}
 */
export async function login(identifier, password) {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: 'Please enter both username/email and password.' };
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // sends and receives httpOnly SameSite session cookie
      body: JSON.stringify({
        identifier: cleanId,
        password: cleanPass,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Invalid username/email or password.',
        retryAfter: data.retryAfter,
      };
    }

    const session = {
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      name: data.user.name,
      token: data.token,
      loginTime: new Date().toISOString(),
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {}

    return { success: true, user: session };
  } catch (err) {
    return {
      success: false,
      error: 'Unable to connect to authentication server. Please check your connection and try again.',
    };
  }
}

/**
 * Register a new individual user account via server-side endpoint with bcrypt 12-round hashing
 * @param {{ username: string, email?: string, name?: string, password: string }} param0
 * @returns {Promise<{ success: boolean, user?: object, error?: string, retryAfter?: number }>}
 */
export async function register({ username, email, name, password }) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanEmail = (email || cleanUser).trim().toLowerCase();
  const cleanName = (name || '').trim() || cleanUser.split('@')[0] || 'Trader';
  const cleanPass = (password || '').trim();

  if (!cleanUser || cleanUser.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' };
  }
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        username: cleanUser,
        email: cleanEmail,
        name: cleanName,
        password: cleanPass,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Registration failed. Please check your details and try again.',
        retryAfter: data.retryAfter,
      };
    }

    const session = {
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      name: data.user.name,
      token: data.token,
      loginTime: new Date().toISOString(),
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {}

    return { success: true, user: session };
  } catch (err) {
    return {
      success: false,
      error: 'Unable to connect to authentication server. Please check your connection and try again.',
    };
  }
}

/**
 * Logout active user and invalidate server-side cookie
 */
export async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  } finally {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }
}

/**
 * Verify active session with server
 */
export async function verifySessionWithServer() {
  try {
    const session = getActiveSession();
    const headers = {};
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }

    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      headers,
    });

    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));

    if (!data.authenticated || !data.user) {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (e) {}
      return null;
    }

    return data.user;
  } catch (e) {
    // If offline, maintain local session
    return getActiveSession();
  }
}
