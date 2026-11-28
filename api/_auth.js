import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'delta_journal_session_hmac_secret_2026_change_in_production';
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days

// In-memory rate limiter per IP address
const rateLimits = new Map();

/**
 * Checks and increments rate limit for an IP address
 * @param {string} ip
 * @param {number} maxAttempts default 5
 * @param {number} windowMs default 15 minutes (900,000ms)
 */
export function checkRateLimit(ip, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const safeIp = ip || 'unknown-client';
  const now = Date.now();
  const record = rateLimits.get(safeIp);

  if (!record || now > record.resetAt) {
    rateLimits.set(safeIp, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxAttempts) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true };
}

export function resetRateLimit(ip) {
  const safeIp = ip || 'unknown-client';
  rateLimits.delete(safeIp);
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Hash password securely with bcrypt (12 salt rounds)
 */
export async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, 12);
}

/**
 * Verify password with bcrypt
 */
export async function verifyPassword(plainPassword, hash) {
  if (!plainPassword || !hash) return false;
  return await bcrypt.compare(plainPassword, hash);
}

/**
 * Creates a cryptographically signed session token (HMAC-SHA256)
 */
export function createSignedSessionToken(user) {
  const payload = {
    uid: user.id,
    u: user.username,
    e: user.email,
    n: user.name || '',
    iat: Date.now(),
    exp: Date.now() + SESSION_MAX_AGE_SEC * 1000,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `delta_sess_${payloadB64}.${signature}`;
}

/**
 * Verifies a signed session token using constant-time comparison
 */
export function verifySignedSessionToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('delta_sess_')) {
    return null;
  }

  try {
    const raw = token.slice('delta_sess_'.length);
    const parts = raw.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    // Constant-time buffer comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const json = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(json);

    if (!payload || !payload.uid) return null;
    if (payload.exp && Date.now() > payload.exp) return null;

    return {
      userId: payload.uid,
      username: payload.u,
      email: payload.e,
      name: payload.n,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Parse cookies from request header
 */
export function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });
  return list;
}

/**
 * Serialize httpOnly SameSite session cookie
 */
export function serializeSessionCookie(token, isSecure = false) {
  const flags = [
    `delta_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SEC}`,
  ];
  if (isSecure) flags.push('Secure');
  return flags.join('; ');
}

/**
 * Serialize clearing of session cookie
 */
export function clearSessionCookie() {
  return 'delta_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;';
}

/**
 * Extract authenticated user from httpOnly cookie or Authorization header
 */
export function getAuthenticatedUser(req) {
  // 1. Try httpOnly cookie first
  const cookies = parseCookies(req);
  if (cookies.delta_session) {
    const user = verifySignedSessionToken(cookies.delta_session);
    if (user) return user;
  }

  // 2. Try Authorization header (Bearer <token>)
  const authHeader = req.headers['authorization'] || req.headers['x-session-token'];
  if (authHeader && typeof authHeader === 'string') {
    let token = authHeader.trim();
    if (token.startsWith('Bearer ')) token = token.slice(7).trim();
    const user = verifySignedSessionToken(token);
    if (user) return user;
  }

  return null;
}
