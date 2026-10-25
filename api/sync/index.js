import { getDatabase, ensureTables } from '../_db.js';

export default async function handler(req, res) {
  // CORS Headers for multi-device access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const sql = getDatabase();
  if (!sql) {
    return res.status(503).json({
      error: 'Neon Postgres database is not connected. Please add DATABASE_URL or POSTGRES_URL in Vercel.',
      offline: true,
    });
  }

  try {
    await ensureTables(sql);

    const userId = (req.query.userId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT trades, diary, capital_logs, settings, updated_at
        FROM delta_sync_records
        WHERE user_id = ${userId}
        LIMIT 1;
      `;

      if (rows && rows.length > 0) {
        const row = rows[0];
        return res.status(200).json({
          trades: row.trades || [],
          diary: row.diary || [],
          capitalLogs: row.capital_logs || [],
          settings: row.settings || null,
          updatedAt: Number(row.updated_at || 0),
        });
      }

      return res.status(200).json({
        trades: [],
        diary: [],
        capitalLogs: [],
        settings: null,
        updatedAt: 0,
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const trades = JSON.stringify(body.trades || []);
      const diary = JSON.stringify(body.diary || []);
      const capitalLogs = JSON.stringify(body.capitalLogs || []);
      const settings = JSON.stringify(body.settings || null);
      const updatedAt = Number(body.updatedAt || Date.now());

      await sql`
        INSERT INTO delta_sync_records (user_id, trades, diary, capital_logs, settings, updated_at)
        VALUES (${userId}, ${trades}::jsonb, ${diary}::jsonb, ${capitalLogs}::jsonb, ${settings}::jsonb, ${updatedAt})
        ON CONFLICT (user_id)
        DO UPDATE SET
          trades = EXCLUDED.trades,
          diary = EXCLUDED.diary,
          capital_logs = EXCLUDED.capital_logs,
          settings = EXCLUDED.settings,
          updated_at = EXCLUDED.updated_at;
      `;

      return res.status(200).json({ success: true, updatedAt });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Neon Sync Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Database Error' });
  }
}
