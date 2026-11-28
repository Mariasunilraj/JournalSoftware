import {
  checkRateLimit,
  resetRateLimit,
  getClientIp,
  hashPassword,
  createSignedSessionToken,
  serializeSessionCookie,
} from '../_auth.js';
import { findUserByIdentifier, createUser } from '../_userStore.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = getClientIp(req);

  // 1. Rate Limiting Check (10 registration attempts per 15 minutes)
  const rateCheck = checkRateLimit(`register_${clientIp}`, 10, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many registration attempts. Please try again in ${rateCheck.retryAfter} seconds.`,
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

    const rawUsername = (body.username || '').trim().toLowerCase();
    const rawEmail = (body.email || rawUsername).trim().toLowerCase();
    const rawName = (body.name || '').trim() || rawUsername.split('@')[0] || 'Trader';
    const password = (body.password || '').trim();

    if (!rawUsername || rawUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // 2. Strict Uniqueness Check: Nobody can use another person's username or email
    const existingByUsername = await findUserByIdentifier(rawUsername);
    if (existingByUsername) {
      return res.status(409).json({
        error: `The username "${rawUsername}" is already taken by another trader. Please choose a different username or sign in.`,
        field: 'username',
      });
    }

    if (rawEmail && rawEmail !== rawUsername) {
      const existingByEmail = await findUserByIdentifier(rawEmail);
      if (existingByEmail) {
        return res.status(409).json({
          error: `The email "${rawEmail}" is already registered to an existing account. No one can re-register or use an existing email. Please sign in.`,
          field: 'email',
        });
      }
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await hashPassword(password);
    const newId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser = await createUser({
      id: newId,
      username: rawUsername,
      email: rawEmail,
      name: rawName,
      passwordHash,
    });

    resetRateLimit(`register_${clientIp}`);

    // Create signed session token & httpOnly SameSite cookie
    const token = createSignedSessionToken(newUser);
    const isSecure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', serializeSessionCookie(token, isSecure));

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
      },
      token,
    });
  } catch (error) {
    if (
      error.code === 'DUPLICATE_USER' ||
      error.message?.includes('already in use') ||
      error.message?.includes('already registered') ||
      error.message?.includes('already taken')
    ) {
      return res.status(409).json({
        error: error.message || 'This username or email is already registered and protected. Please sign in.',
        field: error.field || 'general',
      });
    }

    console.error('Server Registration Error:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected server error occurred during registration.',
    });
  }
}
