import { getDatabase, ensureTables } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const sql = getDatabase();
  if (!sql) {
    return res.status(503).json({
      error: 'Neon Postgres database is not connected.',
      users: [],
    });
  }

  try {
    await ensureTables(sql);

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT data FROM delta_users ORDER BY updated_at DESC;
      `;
      const users = (rows || []).map((r) => r.data).filter(Boolean);
      return res.status(200).json(users);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || []);
      const userList = Array.isArray(body) ? body : [body];

      for (const u of userList) {
        if (!u || !u.id) continue;
        const safeId = String(u.id);
        const userData = JSON.stringify(u);
        const updatedAt = Date.now();

        await sql`
          INSERT INTO delta_users (id, data, updated_at)
          VALUES (${safeId}, ${userData}::jsonb, ${updatedAt})
          ON CONFLICT (id)
          DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
        `;
      }

      return res.status(200).json({ success: true, count: userList.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Neon Users Sync Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
