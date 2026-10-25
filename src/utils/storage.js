import { SAMPLE_TRADES, SAMPLE_DIARY, SAMPLE_CAPITAL_LOGS } from './sampleData';
import { DEFAULT_RISK_SETTINGS } from './constants';
import { getActiveSession, PRIMARY_USER } from './auth';

// Legacy keys
const LEGACY_TRADES_KEY = 'fno_journal_trades_v1';
const LEGACY_DIARY_KEY = 'fno_journal_diary_v1';
const LEGACY_CAPITAL_KEY = 'fno_journal_capital_v1';
const LEGACY_SETTINGS_KEY = 'fno_journal_settings_v1';

/**
 * Derives user-isolated storage partition keys enforcing Row-Level Security (RLS)
 */
export function getUserStorageKeys(userId) {
  const uid = userId || 'guest';
  return {
    trades: `delta_usr_${uid}_trades_v2`,
    diary: `delta_usr_${uid}_diary_v2`,
    capital: `delta_usr_${uid}_capital_v2`,
    settings: `delta_usr_${uid}_settings_v2`,
    deletedTrades: `delta_usr_${uid}_deleted_trades_v1`,
  };
}

/**
 * Tombstone tracking for deleted trades to prevent zombie resurrection across sync
 */
export function getDeletedTradeIds(userId) {
  if (!userId) return [];
  const keys = getUserStorageKeys(userId);
  try {
    const raw = localStorage.getItem(keys.deletedTrades);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveDeletedTradeIds(userId, ids) {
  if (!userId) return;
  const keys = getUserStorageKeys(userId);
  try {
    localStorage.setItem(keys.deletedTrades, JSON.stringify(ids || []));
  } catch (e) {}
}

export function addDeletedTradeId(userId, tradeId) {
  if (!userId || !tradeId) return [];
  const current = getDeletedTradeIds(userId);
  if (!current.includes(tradeId)) {
    const updated = [...current, tradeId];
    saveDeletedTradeIds(userId, updated);
    return updated;
  }
  return current;
}

/**
 * Permanently wipes all trades, diary entries, and capital logs for a user account
 */
export function wipeUserAccountData(userId) {
  if (!userId) return;
  const keys = getUserStorageKeys(userId);
  try {
    localStorage.setItem(keys.trades, JSON.stringify([]));
    localStorage.setItem(keys.diary, JSON.stringify([]));
    localStorage.setItem(keys.capital, JSON.stringify([]));
    // Remove any legacy unpartitioned data
    localStorage.removeItem(LEGACY_TRADES_KEY);
    localStorage.removeItem(LEGACY_DIARY_KEY);
    localStorage.removeItem(LEGACY_CAPITAL_KEY);
  } catch (err) {
    console.error('Failed to wipe user data:', err);
  }
}

/**
 * Load user data with strict Row-Level Security (RLS)
 * Zero initial data for all accounts
 */
export function loadUserData(userId) {
  if (!userId) {
    return {
      trades: [],
      diary: [],
      capitalLogs: [],
      settings: DEFAULT_RISK_SETTINGS,
    };
  }

  const keys = getUserStorageKeys(userId);

  try {
    const rawTrades = localStorage.getItem(keys.trades);
    const rawDiary = localStorage.getItem(keys.diary);
    const rawCapital = localStorage.getItem(keys.capital);
    const rawSettings = localStorage.getItem(keys.settings);

    let trades = rawTrades ? JSON.parse(rawTrades) : [];
    let diary = rawDiary ? JSON.parse(rawDiary) : [];
    let capitalLogs = rawCapital ? JSON.parse(rawCapital) : [];
    let settings = rawSettings ? JSON.parse(rawSettings) : DEFAULT_RISK_SETTINGS;

    // Strict RLS filter & Tombstone purge: ensure deleted trades are never resurrected
    const deletedIds = getDeletedTradeIds(userId);
    const deletedSet = new Set(deletedIds);

    trades = (trades || [])
      .filter((t) => !deletedSet.has(t.id))
      .filter((t) => !t.userId || t.userId === userId)
      .map((t) => ({ ...t, userId }));
    diary = (diary || []).filter((d) => !d.userId || d.userId === userId).map((d) => ({ ...d, userId }));
    capitalLogs = (capitalLogs || []).filter((c) => !c.userId || c.userId === userId).map((c) => ({ ...c, userId }));

    return { trades, diary, capitalLogs, settings };
  } catch (err) {
    console.error(`Error loading data for user ${userId}:`, err);
    return {
      trades: [],
      diary: [],
      capitalLogs: [],
      settings: DEFAULT_RISK_SETTINGS,
    };
  }
}

/**
 * Backwards compatible initial data loader (uses active session)
 */
export function loadInitialData() {
  const session = getActiveSession();
  if (session && session.id) {
    return loadUserData(session.id, session.isPrimary);
  }
  // Default to Sunil's account if no session explicitly set
  return loadUserData(PRIMARY_USER.id, true);
}

/**
 * Save trades with Row-Level Security enforcement
 */
export function saveUserTrades(userId, trades) {
  if (!userId) return;
  const keys = getUserStorageKeys(userId);
  // Stamp owner userId on all trades
  const userTrades = (trades || []).map((t) => ({ ...t, userId }));
  try {
    localStorage.setItem(keys.trades, JSON.stringify(userTrades));
  } catch (err) {
    console.error('Error saving user trades:', err);
  }
}

export function saveUserDiary(userId, diary) {
  if (!userId) return;
  const keys = getUserStorageKeys(userId);
  const userDiary = (diary || []).map((d) => ({ ...d, userId }));
  try {
    localStorage.setItem(keys.diary, JSON.stringify(userDiary));
  } catch (err) {
    console.error('Error saving user diary:', err);
  }
}

export function saveUserCapitalLogs(userId, logs) {
  if (!userId) return;
  const keys = getUserStorageKeys(userId);
  const userLogs = (logs || []).map((l) => ({ ...l, userId }));
  try {
    localStorage.setItem(keys.capital, JSON.stringify(userLogs));
  } catch (err) {
    console.error('Error saving user capital logs:', err);
  }
}

export function saveUserSettings(userId, settings) {
  if (!userId) return;
  const keys = getUserStorageKeys(userId);
  try {
    localStorage.setItem(keys.settings, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving user settings:', err);
  }
}

// Global fallback proxies (routes to currently active user session)
export function saveTrades(trades) {
  const session = getActiveSession();
  const uid = session ? session.id : PRIMARY_USER.id;
  saveUserTrades(uid, trades);
}

export function saveDiary(diary) {
  const session = getActiveSession();
  const uid = session ? session.id : PRIMARY_USER.id;
  saveUserDiary(uid, diary);
}

export function saveCapitalLogs(logs) {
  const session = getActiveSession();
  const uid = session ? session.id : PRIMARY_USER.id;
  saveUserCapitalLogs(uid, logs);
}

export function saveSettings(settings) {
  const session = getActiveSession();
  const uid = session ? session.id : PRIMARY_USER.id;
  saveUserSettings(uid, settings);
}

/**
 * Export full backup as JSON file download
 */
export function exportBackupJSON(trades, diary, capitalLogs, settings) {
  const backupObj = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    software: 'F&O Trading Journal Professional',
    trades,
    diary,
    capitalLogs,
    settings,
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `FNO_Journal_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export Trades to CSV
 */
export function exportTradesCSV(trades) {
  if (!trades || trades.length === 0) {
    alert('No trades available to export.');
    return;
  }

  const headers = [
    'Trade ID',
    'Date',
    'Entry Time',
    'Exit Time',
    'Symbol',
    'Underlying',
    'Exchange',
    'Segment',
    'Direction',
    'Option Type',
    'Action',
    'Strike Price',
    'Expiry Date',
    'Lots',
    'Lot Size',
    'Quantity',
    'Entry Price',
    'Exit Price',
    'Gross PnL (INR)',
    'Charges (INR)',
    'Net PnL (INR)',
    'Margin Used',
    'Planned SL',
    'Planned Target',
    'R:R Ratio',
    'Strategy',
    'Rule Followed',
    'Entry Emotion',
    'Exit Emotion',
    'Entry Reason',
    'Exit Reason',
    'Notes',
    'Status',
  ];

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = trades.map((t) => [
    escapeCSV(t.id),
    escapeCSV(t.date),
    escapeCSV(t.entryTime),
    escapeCSV(t.exitTime),
    escapeCSV(t.symbol),
    escapeCSV(t.underlying),
    escapeCSV(t.exchange),
    escapeCSV(t.segment),
    escapeCSV(t.direction),
    escapeCSV(t.optionType),
    escapeCSV(t.optionAction),
    t.strikePrice || '',
    escapeCSV(t.expiryDate),
    t.lots || '',
    t.lotSize || '',
    t.quantity || '',
    t.entryPrice || '',
    t.exitPrice || '',
    t.grossPnL || '',
    t.charges || '',
    t.netPnL || '',
    t.marginUsed || '',
    t.stopLoss || '',
    t.target || '',
    t.riskRewardRatio || '',
    escapeCSV(t.strategy),
    t.ruleFollowed ? 'YES' : 'NO',
    escapeCSV(t.entryEmotion),
    escapeCSV(t.exitEmotion),
    escapeCSV(t.entryReason),
    escapeCSV(t.exitReason),
    escapeCSV(t.notes),
    escapeCSV(t.status),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Trades_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Parse CSV Content and return trade objects
 */
export function parseTradesCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const parseLine = (line) => {
    const values = [];
    let insideQuotes = false;
    let currVal = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currVal += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(currVal.trim());
        currVal = '';
      } else {
        currVal += char;
      }
    }
    values.push(currVal.trim());
    return values;
  };

  const trades = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length < 5) continue;

    const trade = {
      id: cols[0] || `IMP-${Date.now()}-${i}`,
      date: cols[1] || new Date().toISOString().slice(0, 10),
      entryTime: cols[2] || '09:15',
      exitTime: cols[3] || '15:30',
      symbol: cols[4] || 'NIFTY',
      underlying: cols[5] || 'NIFTY',
      exchange: cols[6] || 'NSE',
      segment: cols[7] || 'Options',
      direction: cols[8] || 'Long',
      optionType: cols[9] || 'CE',
      optionAction: cols[10] || 'Buy',
      strikePrice: parseFloat(cols[11]) || 0,
      expiryDate: cols[12] || '',
      lots: parseInt(cols[13], 10) || 1,
      lotSize: parseInt(cols[14], 10) || 25,
      quantity: parseInt(cols[15], 10) || 25,
      entryPrice: parseFloat(cols[16]) || 0,
      exitPrice: parseFloat(cols[17]) || 0,
      grossPnL: parseFloat(cols[18]) || 0,
      charges: parseFloat(cols[19]) || 0,
      netPnL: parseFloat(cols[20]) || 0,
      marginUsed: parseFloat(cols[21]) || 0,
      stopLoss: parseFloat(cols[22]) || 0,
      target: parseFloat(cols[23]) || 0,
      riskRewardRatio: parseFloat(cols[24]) || 0,
      strategy: cols[25] || 'Discretionary',
      ruleFollowed: cols[26]?.toUpperCase() === 'YES',
      entryEmotion: cols[27] || 'Disciplined',
      exitEmotion: cols[28] || 'Disciplined',
      entryReason: cols[29] || '',
      exitReason: cols[30] || '',
      notes: cols[31] || '',
      status: cols[32] || 'Closed',
      screenshots: [],
    };
    trades.push(trade);
  }
  return trades;
}
