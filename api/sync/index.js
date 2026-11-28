import { getDatabase, ensureTables } from '../_db.js';
import { getAuthenticatedUser } from '../_auth.js';

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB payload cap
const MAX_TRADES = 50000;
const MAX_DIARY_ENTRIES = 10000;
const MAX_CAPITAL_LOGS = 5000;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 1. Authenticate request & derive userId from signed session (cookie or token)
  const sessionUser = getAuthenticatedUser(req);
  if (!sessionUser || !sessionUser.userId) {
    return res.status(401).json({ error: 'Authentication required. Valid session required for sync.' });
  }

  const userId = sessionUser.userId;

  // 2. Validate request payload size
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: 'Payload too large. Maximum sync payload size is 10MB.' });
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

    // GET /api/sync - fetch authenticated user's records
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

      // Seamless Legacy Data Recovery:
      // If the authenticated user has 0 records, check if legacy trades exist in the database
      // under Sunil's former account ID or default partition so history is never lost!
      try {
        const legacyRows = await sql`
          SELECT trades, diary, capital_logs, settings, updated_at
          FROM delta_sync_records
          WHERE user_id IN ('usr_sunil_08', 'default', 'usr_default', 'usr_maria_sunil_raj')
          ORDER BY updated_at DESC
          LIMIT 1;
        `;

        if (legacyRows && legacyRows.length > 0 && Array.isArray(legacyRows[0].trades) && legacyRows[0].trades.length > 0) {
          const leg = legacyRows[0];
          // Auto-link to the new authenticated user
          await sql`
            INSERT INTO delta_sync_records (user_id, trades, diary, capital_logs, settings, updated_at)
            VALUES (${userId}, ${JSON.stringify(leg.trades)}::jsonb, ${JSON.stringify(leg.diary || [])}::jsonb, ${JSON.stringify(leg.capital_logs || [])}::jsonb, ${JSON.stringify(leg.settings || null)}::jsonb, ${Date.now()})
            ON CONFLICT (user_id) DO UPDATE SET
              trades = EXCLUDED.trades,
              diary = EXCLUDED.diary,
              capital_logs = EXCLUDED.capital_logs,
              settings = EXCLUDED.settings,
              updated_at = EXCLUDED.updated_at;
          `;

          return res.status(200).json({
            trades: leg.trades || [],
            diary: leg.diary || [],
            capitalLogs: leg.capital_logs || [],
            settings: leg.settings || null,
            updatedAt: Number(leg.updated_at || 0),
            recoveredFromLegacy: true,
          });
        }
      } catch (recoveryErr) {
        console.warn('Legacy sync recovery notice:', recoveryErr.message);
      }

      return res.status(200).json({
        trades: [],
        diary: [],
        capitalLogs: [],
        settings: null,
        updatedAt: 0,
      });
    }

    // POST /api/sync - push authenticated user's records
    if (req.method === 'POST') {
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      } catch (err) {
        return res.status(400).json({ error: 'Malformed JSON payload.' });
      }

      // Validate payload shape
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ error: 'Invalid payload shape: root must be a JSON object.' });
      }

      if (body.trades !== undefined && !Array.isArray(body.trades)) {
        return res.status(400).json({ error: 'Invalid payload shape: trades must be an array.' });
      }
      if (Array.isArray(body.trades) && body.trades.length > MAX_TRADES) {
        return res.status(400).json({ error: `Trades array exceeds maximum limit of ${MAX_TRADES} items.` });
      }

      if (body.diary !== undefined && !Array.isArray(body.diary)) {
        return res.status(400).json({ error: 'Invalid payload shape: diary must be an array.' });
      }
      if (Array.isArray(body.diary) && body.diary.length > MAX_DIARY_ENTRIES) {
        return res.status(400).json({ error: `Diary array exceeds maximum limit of ${MAX_DIARY_ENTRIES} items.` });
      }

      if (body.capitalLogs !== undefined && !Array.isArray(body.capitalLogs)) {
        return res.status(400).json({ error: 'Invalid payload shape: capitalLogs must be an array.' });
      }
      if (Array.isArray(body.capitalLogs) && body.capitalLogs.length > MAX_CAPITAL_LOGS) {
        return res.status(400).json({ error: `Capital logs array exceeds maximum limit of ${MAX_CAPITAL_LOGS} items.` });
      }

      if (body.settings !== undefined && body.settings !== null && (typeof body.settings !== 'object' || Array.isArray(body.settings))) {
        return res.status(400).json({ error: 'Invalid payload shape: settings must be an object or null.' });
      }

      if (body.updatedAt !== undefined && (typeof body.updatedAt !== 'number' || isNaN(body.updatedAt))) {
        return res.status(400).json({ error: 'Invalid payload shape: updatedAt must be a numeric timestamp.' });
      }

      const deletedIds = Array.isArray(body.deletedTradeIds) ? body.deletedTradeIds : [];
      const deletedSet = new Set(deletedIds);
      const rawTrades = Array.isArray(body.trades) ? body.trades : [];
      let cleanTrades = rawTrades.filter((t) => t && t.id && !deletedSet.has(t.id));

      // CRITICAL SERVER-SIDE DEFENSE:
      // If client is reporting trade deletions, but rawTrades is empty,
      // and this is NOT an explicit full reset (isFullReset !== true):
      // NEVER wipe out all trades! Instead, load the existing trades from the DB and remove ONLY the deleted IDs!
      if (deletedIds.length > 0 && cleanTrades.length === 0 && !body.isFullReset) {
        const existingRows = await sql`
          SELECT trades FROM delta_sync_records WHERE user_id = ${userId} LIMIT 1;
        `;
        if (existingRows && existingRows.length > 0 && Array.isArray(existingRows[0].trades) && existingRows[0].trades.length > 0) {
          cleanTrades = existingRows[0].trades.filter((t) => t && t.id && !deletedSet.has(t.id));
        }
      }

      const trades = JSON.stringify(cleanTrades);
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
