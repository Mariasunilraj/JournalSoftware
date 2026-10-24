import {
  saveUserTrades,
  saveUserDiary,
  saveUserCapitalLogs,
  saveUserSettings,
  loadUserData,
} from './storage';

/**
 * Pushes full user state to the master sync server
 */
export async function pushDataToSyncServer(userId, data) {
  if (!userId) return false;
  try {
    const payload = {
      trades: data.trades || [],
      diary: data.diary || [],
      capitalLogs: data.capitalLogs || [],
      settings: data.settings || null,
      updatedAt: Date.now(),
    };

    const res = await fetch(`/api/sync?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      localStorage.setItem(`delta_last_sync_${userId}`, String(Date.now()));
      return true;
    }
  } catch (err) {
    // Offline / detached network fallback: local storage remains 100% functional
    console.debug('Sync push deferred:', err.message);
  }
  return false;
}

/**
 * Pulls latest data from master sync server
 */
export async function pullDataFromSyncServer(userId) {
  if (!userId) return null;
  try {
    const res = await fetch(`/api/sync?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.debug('Sync pull deferred:', err.message);
    return null;
  }
}

/**
 * Intelligently merges server data with local device data without duplicates
 */
export function mergeDatasets(local, server) {
  if (!server) return local;

  // Merge Trades (by unique ID)
  const tradeMap = new Map();
  (server.trades || []).forEach((t) => {
    if (t.id) tradeMap.set(t.id, t);
  });
  (local.trades || []).forEach((t) => {
    if (t.id) {
      // If trade exists in both, keep local if modified or server
      tradeMap.set(t.id, { ...tradeMap.get(t.id), ...t });
    }
  });
  const mergedTrades = Array.from(tradeMap.values()).sort(
    (a, b) => new Date(`${b.date}T${b.entryTime || '09:15'}`) - new Date(`${a.date}T${a.entryTime || '09:15'}`)
  );

  // Merge Diary (by date or ID)
  const diaryMap = new Map();
  (server.diary || []).forEach((d) => {
    const key = d.id || d.date;
    if (key) diaryMap.set(key, d);
  });
  (local.diary || []).forEach((d) => {
    const key = d.id || d.date;
    if (key) diaryMap.set(key, { ...diaryMap.get(key), ...d });
  });
  const mergedDiary = Array.from(diaryMap.values()).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Merge Capital Logs (by ID)
  const capMap = new Map();
  (server.capitalLogs || []).forEach((c) => {
    if (c.id) capMap.set(c.id, c);
  });
  (local.capitalLogs || []).forEach((c) => {
    if (c.id) capMap.set(c.id, { ...capMap.get(c.id), ...c });
  });
  const mergedCapital = Array.from(capMap.values()).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Settings
  const mergedSettings = server.settings || local.settings;

  return {
    trades: mergedTrades,
    diary: mergedDiary,
    capitalLogs: mergedCapital,
    settings: mergedSettings,
  };
}
