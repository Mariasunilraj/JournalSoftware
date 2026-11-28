import { getAuthenticatedUser } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(200).json({ authenticated: false, user: null });
  }

  return res.status(200).json({
    authenticated: true,
    user: {
      id: user.userId,
      username: user.username,
      email: user.email,
      name: user.name,
    },
  });
}
