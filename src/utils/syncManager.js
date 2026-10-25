import {
  saveUserTrades,
  saveUserDiary,
  saveUserCapitalLogs,
  saveUserSettings,
  loadUserData,
} from './storage';

/**
 * Timestamp helpers for event-consistent master sync
 */
export function markLocalModified(userId) {
  if (!userId) return;
  try {
    localStorage.setItem(`delta_last_modified_${userId}`, String(Date.now()));
  } catch (e) {}
}

export function getLastLocalModified(userId) {
  if (!userId) return 0;
  try {
    return Number(localStorage.getItem(`delta_last_modified_${userId}`) || 0);
  } catch (e) {
    return 0;
  }
}

export function getLastSynced(userId) {
  if (!userId) return 0;
  try {
    return Number(localStorage.getItem(`delta_last_sync_${userId}`) || 0);
  } catch (e) {
    return 0;
  }
}

export function setLastSynced(userId, timestamp) {
  if (!userId) return;
  try {
    localStorage.setItem(`delta_last_sync_${userId}`, String(timestamp || Date.now()));
  } catch (e) {}
}

/**
 * Health check to verify connection to Master Sync Server
 */
export async function checkServerHealth() {
  try {
    const res = await fetch('/api/sync/status', { cache: 'no-store' });
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

/**
 * Pushes full user state to the master sync server
 */
export async function pushDataToSyncServer(userId, data) {
  if (!userId) return false;
  try {
    const now = Date.now();
    const payload = {
      trades: data.trades || [],
      diary: data.diary || [],
      capitalLogs: data.capitalLogs || [],
      settings: data.settings || null,
      updatedAt: now,
    };

    const res = await fetch(`/api/sync?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setLastSynced(userId, now);
      markLocalModified(userId);
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
    const res = await fetch(`/api/sync?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.debug('Sync pull deferred:', err.message);
    return null;
  }
}

/**
 * Intelligently merges server data with local device data without duplicates or zombie resurrects
 */
export function mergeDatasets(local, server, lastSyncedAt = 0, lastModifiedAt = 0, deletedIds = []) {
  if (!server) return local;

  const deletedSet = new Set(deletedIds || []);

  // If server is newer than local modifications, server is authoritative ground truth
  if (server.updatedAt && server.updatedAt >= lastModifiedAt) {
    const cleanTrades = (server.trades || []).filter((t) => t && t.id && !deletedSet.has(t.id));
    return {
      trades: cleanTrades,
      diary: server.diary || [],
      capitalLogs: server.capitalLogs || [],
      settings: server.settings || local.settings,
    };
  }

  // Conflict reconciliation: device was used offline and has local modifications
  const tradeMap = new Map();
  (server.trades || []).forEach((t) => {
    if (t.id && !deletedSet.has(t.id)) tradeMap.set(t.id, t);
  });

  // Preserve only brand new trades created offline (createdAt > lastSyncedAt) or modified
  (local.trades || []).forEach((t) => {
    if (t.id && !deletedSet.has(t.id)) {
      const isNewOfflineTrade = (t.createdAt && t.createdAt > lastSyncedAt) || (t.updatedAt && t.updatedAt > lastSyncedAt);
      if (tradeMap.has(t.id)) {
        // Trade exists on both: choose latest updated
        const serverTrade = tradeMap.get(t.id);
        const localTime = t.updatedAt || 0;
        const serverTime = serverTrade.updatedAt || 0;
        tradeMap.set(t.id, localTime >= serverTime ? t : serverTrade);
      } else if (isNewOfflineTrade) {
        // New trade created locally while offline
        tradeMap.set(t.id, t);
      }
      // If trade existed before last sync or was deleted, DO NOT re-add!
    }
  });

  const mergedTrades = Array.from(tradeMap.values()).sort(
    (a, b) => new Date(`${b.date}T${b.entryTime || '09:15'}`) - new Date(`${a.date}T${a.entryTime || '09:15'}`)
  );

  // Diary Merge
  const diaryMap = new Map();
  (server.diary || []).forEach((d) => {
    const key = d.id || d.date;
    if (key) diaryMap.set(key, d);
  });
  (local.diary || []).forEach((d) => {
    const key = d.id || d.date;
    if (key) {
      if (diaryMap.has(key)) {
        diaryMap.set(key, { ...diaryMap.get(key), ...d });
      } else if (!lastSyncedAt || (d.updatedAt && d.updatedAt > lastSyncedAt)) {
        diaryMap.set(key, d);
      }
    }
  });
  const mergedDiary = Array.from(diaryMap.values()).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Capital Logs Merge
  const capMap = new Map();
  (server.capitalLogs || []).forEach((c) => {
    if (c.id) capMap.set(c.id, c);
  });
  (local.capitalLogs || []).forEach((c) => {
    if (c.id) {
      if (capMap.has(c.id)) {
        capMap.set(c.id, { ...capMap.get(c.id), ...c });
      } else if (!lastSyncedAt || (c.updatedAt && c.updatedAt > lastSyncedAt)) {
        capMap.set(c.id, c);
      }
    }
  });
  const mergedCapital = Array.from(capMap.values()).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const mergedSettings = server.settings || local.settings;

  return {
    trades: mergedTrades,
    diary: mergedDiary,
    capitalLogs: mergedCapital,
    settings: mergedSettings,
  };
}
