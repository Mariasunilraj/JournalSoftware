import { clearSessionCookie } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
}
