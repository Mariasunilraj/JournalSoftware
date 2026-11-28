import {
  checkRateLimit,
  resetRateLimit,
  getClientIp,
  verifyPassword,
  createSignedSessionToken,
  serializeSessionCookie,
} from '../_auth.js';
import { findUserByIdentifier } from '../_userStore.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = getClientIp(req);

  // 1. Rate Limiting Check (10 attempts per 15 minutes)
  const rateCheck = checkRateLimit(`login_${clientIp}`, 10, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many login attempts. Please try again in ${rateCheck.retryAfter} seconds.`,
      retryAfter: rateCheck.retryAfter,
    });
  }

  try {
    let body = {};
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        body = {};
      }
    } else if (Buffer.isBuffer(req.body)) {
      try {
        body = JSON.parse(req.body.toString('utf-8'));
      } catch (e) {
        body = {};
      }
    } else if (req.body && typeof req.body === 'object') {
      body = req.body;
    }

    const identifier = (body.identifier || body.username || body.email || '').trim();
    const password = (body.password || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter both username/email and password.' });
    }

    const user = await findUserByIdentifier(identifier);

    // Constant-time execution path: check password even if user is null to prevent timing enumeration
    const DUMMY_HASH = '$2a$12$e80A1h5q89QZz1y8rJ9kueZ5/qfB1x3G7u0M2W4Y6v8X1T3R5P7K9';
    const hashToVerify = user ? (user.password_hash || user.passwordHash) : DUMMY_HASH;
    const isPasswordValid = await verifyPassword(password, hashToVerify);

    // Generic error message: never differentiate between "account not found" vs "wrong password"
    if (!user || !isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    // Reset rate limit upon successful login
    resetRateLimit(`login_${clientIp}`);

    // Create signed session token & httpOnly SameSite cookie
    const token = createSignedSessionToken(user);
    const isSecure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', serializeSessionCookie(token, isSecure));

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error('Server Login Error:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected server error occurred during login.',
    });
  }
}
