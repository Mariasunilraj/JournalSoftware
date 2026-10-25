import { getDatabase, ensureTables } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const sql = getDatabase();
  if (!sql) {
    const relevantKeys = Object.keys(process.env).filter(
      (k) =>
        k.includes('URL') ||
        k.includes('STORAGE') ||
        k.includes('POSTGRES') ||
        k.includes('DATABASE')
    );
    return res.status(200).json({
      online: false,
      database: 'Not Connected',
      message: 'Please link Neon Postgres via Vercel Storage tab and click Redeploy.',
      detectedEnvKeys: relevantKeys,
      timestamp: Date.now(),
    });
  }

  try {
    await ensureTables(sql);
    const result = await sql`SELECT NOW() as db_time;`;
    return res.status(200).json({
      online: true,
      provider: 'Neon Cloud Serverless Postgres',
      dbTime: result[0]?.db_time,
      timestamp: Date.now(),
    });
  } catch (error) {
    return res.status(200).json({
      online: false,
      error: error.message,
      timestamp: Date.now(),
    });
  }
}
