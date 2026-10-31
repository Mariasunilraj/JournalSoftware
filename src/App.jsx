import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './components/Dashboard';
import TradeLog from './components/TradeLog';
import CalendarView from './components/CalendarView';
import DiaryView from './components/DiaryView';
import DataManagementView from './components/DataManagementView';
import TradeModal from './components/TradeModal';
import TradeDetailModal from './components/TradeDetailModal';
import PrintReport from './components/PrintReport';
import BottomNav from './components/BottomNav';
import AuthView from './components/AuthView';
import InstallAppModal from './components/InstallAppModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import ContractNoteModal from './components/ContractNoteModal';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import {
  pushDataToSyncServer,
  pullDataFromSyncServer,
  mergeDatasets,
  markLocalModified,
  getLastLocalModified,
  getLastSynced,
  setLastSynced,
} from './utils/syncManager';

import {
  loadUserData,
  saveUserTrades,
  saveUserDiary,
  saveUserCapitalLogs,
  saveUserSettings,
  wipeUserAccountData,
  getDeletedTradeIds,
  addDeletedTradeId,
} from './utils/storage';
import { calculateAnalytics } from './utils/analytics';
import { getActiveSession, logout as authLogout, initAuth, PRIMARY_USER } from './utils/auth';

export default function App() {
  // Ensure default Sunil account is initialized in user database & all demo data wiped clean
  useEffect(() => {
    initAuth();
    const wipedFlag = 'delta_sunil_wiped_clean_v3';
    if (!localStorage.getItem(wipedFlag)) {
      wipeUserAccountData(PRIMARY_USER.id);
      localStorage.setItem(wipedFlag, 'true');
      const session = getActiveSession();
      if (session && session.id === PRIMARY_USER.id) {
        setTrades([]);
        setDiary([]);
        setCapitalLogs([]);
        setSettings({ initialCapital: 0, maxDailyLoss: 5000, maxDailyTrades: 5, defaultBrokeragePerOrder: 20 });
      }
    }
  }, []);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    initAuth();
    return getActiveSession();
  });

  // Load user-isolated data enforcing Row-Level Security (RLS)
  const [trades, setTrades] = useState(() => {
    const session = getActiveSession();
    if (session) {
      return loadUserData(session.id).trades;
    }
    return [];
  });

  const [diary, setDiary] = useState(() => {
    const session = getActiveSession();
    if (session) {
      return loadUserData(session.id).diary;
    }
    return [];
  });

  const [capitalLogs, setCapitalLogs] = useState(() => {
    const session = getActiveSession();
    if (session) {
      return loadUserData(session.id).capitalLogs;
    }
    return [];
  });

  const [settings, setSettings] = useState(() => {
    const session = getActiveSession();
    if (session) {
      const s = loadUserData(session.id).settings;
      return { ...s, initialCapital: Number(s?.initialCapital) || 0 };
    }
    return { initialCapital: 0, maxDailyLoss: 5000, maxDailyTrades: 5, defaultBrokeragePerOrder: 20 };
  });

  // Active Navigation Tab: Trading Journal as main
  const [activeTab, setActiveTab] = useState('trades');

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [selectedTradeForView, setSelectedTradeForView] = useState(null);
  const [tradeToDelete, setTradeToDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isContractNoteModalOpen, setIsContractNoteModalOpen] = useState(false);

  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'offline'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Cross-Device Sync Engine (Phone <-> Laptop Master Sync)
  const triggerSync = useCallback(async () => {
    if (!currentUser) return;
    setSyncStatus('syncing');
    try {
      const serverData = await pullDataFromSyncServer(currentUser.id);
      const localData = loadUserData(currentUser.id);
      const lastSyncTimeVal = getLastSynced(currentUser.id);
      const lastModifiedVal = getLastLocalModified(currentUser.id);
      const deletedIds = getDeletedTradeIds(currentUser.id);

      // If server has never been initialized and local device has data, seed the server
      if (
        (!serverData || !serverData.updatedAt) &&
        (localData.trades.length || localData.diary.length || localData.capitalLogs.length)
      ) {
        await pushDataToSyncServer(currentUser.id, {
          ...localData,
          deletedTradeIds: deletedIds,
        });
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        return;
      }

      if (serverData && (serverData.trades || serverData.diary || serverData.capitalLogs || serverData.settings)) {
        const merged = mergeDatasets(localData, serverData, lastSyncTimeVal, lastModifiedVal, deletedIds);
        setTrades(merged.trades);
        setDiary(merged.diary);
        setCapitalLogs(merged.capitalLogs);
        if (merged.settings) {
          setSettings({ ...merged.settings, initialCapital: Number(merged.settings.initialCapital) || 0 });
        }

        saveUserTrades(currentUser.id, merged.trades);
        saveUserDiary(currentUser.id, merged.diary);
        saveUserCapitalLogs(currentUser.id, merged.capitalLogs);
        if (merged.settings) saveUserSettings(currentUser.id, merged.settings);

        // Update server if local had newer offline modifications merged in
        if (lastModifiedVal > (serverData.updatedAt || 0)) {
          await pushDataToSyncServer(currentUser.id, {
            ...merged,
            deletedTradeIds: deletedIds,
          });
        } else {
          setLastSynced(currentUser.id, serverData.updatedAt || Date.now());
        }

        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setSyncStatus('synced');
      }
    } catch (err) {
      setSyncStatus('offline');
    }
  }, [currentUser]);

  // Periodic Auto-Sync, Tab Focus & Mobile Wakeup (every 6s)
  useEffect(() => {
    if (!currentUser) return;
    triggerSync();
    const interval = setInterval(triggerSync, 6000);
    const onWake = () => {
      if (document.visibilityState === 'visible' || !document.hidden) {
        triggerSync();
      }
    };
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [currentUser, triggerSync]);

  // Handle successful login or registration
  const handleLoginSuccess = useCallback((user) => {
    setCurrentUser(user);
    const data = loadUserData(user.id);
    setTrades(data.trades);
    setDiary(data.diary);
    setCapitalLogs(data.capitalLogs);
    setSettings(data.settings);
    setActiveTab('trades');
    setTimeout(() => {
      pullDataFromSyncServer(user.id).then((serverData) => {
        if (serverData && (serverData.trades?.length || serverData.diary?.length)) {
          const merged = mergeDatasets(data, serverData);
          setTrades(merged.trades);
          setDiary(merged.diary);
          setCapitalLogs(merged.capitalLogs);
          if (merged.settings) setSettings(merged.settings);
          saveUserTrades(user.id, merged.trades);
          saveUserDiary(user.id, merged.diary);
          saveUserCapitalLogs(user.id, merged.capitalLogs);
          if (merged.settings) saveUserSettings(user.id, merged.settings);
        }
      });
    }, 200);
  }, []);

  // Handle user logout
  const handleLogout = useCallback(() => {
    authLogout();
    setCurrentUser(null);
    setTrades([]);
    setDiary([]);
    setCapitalLogs([]);
  }, []);

  // Calculate live analytics
  const analytics = useMemo(() => {
    return calculateAnalytics(trades, Number(settings?.initialCapital) || 0);
  }, [trades, settings?.initialCapital]);

  // Persist trades with Row-Level Security (RLS) & Real-time Auto-Sync
  const handleSaveTrade = useCallback((tradeData) => {
    if (!currentUser || !tradeData) return;
    const now = Date.now();
    markLocalModified(currentUser.id);

    const localData = loadUserData(currentUser.id);
    const baseList = (localData.trades && localData.trades.length > 0)
      ? localData.trades
      : (trades || []);

    const existsIndex = baseList.findIndex((t) => t.id === tradeData.id);
    const stampedTrade = {
      ...tradeData,
      userId: currentUser.id,
      createdAt: tradeData.createdAt || now,
      updatedAt: now,
    };

    let updatedTrades;
    if (existsIndex >= 0) {
      updatedTrades = [...baseList];
      updatedTrades[existsIndex] = stampedTrade;
    } else {
      updatedTrades = [stampedTrade, ...baseList];
    }

    saveUserTrades(currentUser.id, updatedTrades);
    setTrades(updatedTrades);

    pushDataToSyncServer(currentUser.id, {
      trades: updatedTrades,
      diary: localData.diary || diary,
      capitalLogs: localData.capitalLogs || capitalLogs,
      settings: localData.settings || settings,
    });
  }, [currentUser, trades, diary, capitalLogs, settings]);

  const handleImportParsedTrades = useCallback((newTrades) => {
    if (!currentUser || !Array.isArray(newTrades) || newTrades.length === 0) return;
    const now = Date.now();
    markLocalModified(currentUser.id);

    const localData = loadUserData(currentUser.id);
    const baseList = (localData.trades && localData.trades.length > 0)
      ? localData.trades
      : (trades || []);

    const stampedTrades = newTrades.map((t, idx) => ({
      ...t,
      id: t.id || `trade_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUser.id,
      createdAt: t.createdAt || now,
      updatedAt: now,
    }));

    const updatedTrades = [...stampedTrades, ...baseList];
    saveUserTrades(currentUser.id, updatedTrades);
    setTrades(updatedTrades);

    pushDataToSyncServer(currentUser.id, {
      trades: updatedTrades,
      diary: localData.diary || diary,
      capitalLogs: localData.capitalLogs || capitalLogs,
      settings: localData.settings || settings,
    });

    showToast(`Successfully imported ${stampedTrades.length} trades from contract note!`);
  }, [currentUser, trades, diary, capitalLogs, settings, showToast]);

  const handleDeleteTrade = useCallback((tradeOrId) => {
    if (!currentUser || !tradeOrId) return;
    const tradeId = typeof tradeOrId === 'string' ? tradeOrId : tradeOrId?.id;
    if (!tradeId) return;

    // 1. Add to persistent tombstone store
    const deletedIds = addDeletedTradeId(currentUser.id, tradeId);
    markLocalModified(currentUser.id);

    // 2. Synchronously derive updated trades from current state / localStorage
    const localData = loadUserData(currentUser.id);
    const baseList = (localData.trades && localData.trades.length > 0)
      ? localData.trades
      : (trades || []);
    const updatedTrades = baseList.filter((t) => t && t.id !== tradeId);

    // 3. Immediately persist updated trades to local storage
    saveUserTrades(currentUser.id, updatedTrades);

    // 4. Update React state immediately
    setTrades(updatedTrades);

    // 5. Push remaining trades to sync server (Neon Cloud)
    pushDataToSyncServer(currentUser.id, {
      trades: updatedTrades,
      diary: localData.diary || diary,
      capitalLogs: localData.capitalLogs || capitalLogs,
      settings: localData.settings || settings,
      deletedTradeIds: deletedIds,
    });

    showToast('Trade record deleted successfully');
  }, [currentUser, trades, diary, capitalLogs, settings, showToast]);

  const handleDeleteMultipleTrades = useCallback((tradeIds) => {
    if (!currentUser || !Array.isArray(tradeIds) || tradeIds.length === 0) return;
    const idSet = new Set(tradeIds);

    // 1. Add all to persistent tombstone store
    tradeIds.forEach((id) => addDeletedTradeId(currentUser.id, id));
    markLocalModified(currentUser.id);

    // 2. Synchronously derive updated trades
    const localData = loadUserData(currentUser.id);
    const baseList = (localData.trades && localData.trades.length > 0)
      ? localData.trades
      : (trades || []);
    const updatedTrades = baseList.filter((t) => t && !idSet.has(t.id));

    // 3. Immediately persist to local storage
    saveUserTrades(currentUser.id, updatedTrades);

    // 4. Update React state immediately
    setTrades(updatedTrades);

    // 5. Push remaining trades to sync server (Neon Cloud)
    pushDataToSyncServer(currentUser.id, {
      trades: updatedTrades,
      diary: localData.diary || diary,
      capitalLogs: localData.capitalLogs || capitalLogs,
      settings: localData.settings || settings,
      deletedTradeIds: tradeIds,
    });

    showToast(`Successfully deleted ${tradeIds.length} trades.`);
  }, [currentUser, trades, diary, capitalLogs, settings, showToast]);

  const handleRequestDeleteTrade = useCallback((tradeOrId) => {
    if (!tradeOrId) return;
    if (typeof tradeOrId === 'string') {
      const found = trades.find((t) => t.id === tradeOrId);
      setTradeToDelete(found || { id: tradeOrId, symbol: tradeOrId });
    } else {
      setTradeToDelete(tradeOrId);
    }
  }, [trades]);

  const handleDuplicateTrade = useCallback((tradeData) => {
    const duplicated = {
      ...tradeData,
      id: `TRD-${Date.now().toString().slice(-6)}`,
      symbol: `${tradeData.symbol} (Copy)`,
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    handleSaveTrade(duplicated);
  }, [handleSaveTrade]);

  // Persist diary with RLS & Auto-Sync
  const handleSaveDiary = useCallback((entry) => {
    if (!currentUser || !entry) return;
    const now = Date.now();
    markLocalModified(currentUser.id);

    const localData = loadUserData(currentUser.id);
    const baseList = (localData.diary && localData.diary.length > 0)
      ? localData.diary
      : (diary || []);

    const existsIndex = baseList.findIndex((d) => (d.id && d.id === entry.id) || d.date === entry.date);
    const stampedEntry = {
      ...entry,
      userId: currentUser.id,
      createdAt: entry.createdAt || now,
      updatedAt: now,
    };

    let updatedDiary;
    if (existsIndex >= 0) {
      updatedDiary = [...baseList];
      updatedDiary[existsIndex] = stampedEntry;
    } else {
      updatedDiary = [stampedEntry, ...baseList];
    }

    saveUserDiary(currentUser.id, updatedDiary);
    setDiary(updatedDiary);

    pushDataToSyncServer(currentUser.id, {
      trades: localData.trades || trades,
      diary: updatedDiary,
      capitalLogs: localData.capitalLogs || capitalLogs,
      settings: localData.settings || settings,
    });
  }, [currentUser, trades, diary, capitalLogs, settings]);

  const handleDeleteDiary = useCallback((idOrDate) => {
    if (!currentUser || !idOrDate) return;
    markLocalModified(currentUser.id);

    const localData = loadUserData(currentUser.id);
    const baseList = (localData.diary && localData.diary.length > 0)
      ? localData.diary
      : (diary || []);

    const updatedDiary = baseList.filter((d) => d.id !== idOrDate && d.date !== idOrDate);

    saveUserDiary(currentUser.id, updatedDiary);
    setDiary(updatedDiary);

    pushDataToSyncServer(currentUser.id, {
      trades: localData.trades || trades,
      diary: updatedDiary,
      capitalLogs: localData.capitalLogs || capitalLogs,
      settings: localData.settings || settings,
    });
  }, [currentUser, trades, diary, capitalLogs, settings]);

  // Persist capital with RLS & Auto-Sync
  const handleAddCapitalLog = useCallback((log) => {
    if (!currentUser) return;
    const now = Date.now();
    markLocalModified(currentUser.id);
    setCapitalLogs((prev) => {
      const stampedLog = {
        ...log,
        userId: currentUser.id,
        createdAt: log.createdAt || now,
        updatedAt: now,
      };
      const updated = [stampedLog, ...prev];
      saveUserCapitalLogs(currentUser.id, updated);
      pushDataToSyncServer(currentUser.id, {
        trades,
        diary,
        capitalLogs: updated,
        settings,
      });
      return updated;
    });
  }, [currentUser, trades, diary, settings]);

  // Bulk restore or sample load with RLS & Auto-Sync
  const handleUpdateAllData = useCallback(({ trades: newTrades, diary: newDiary, capitalLogs: newCap, settings: newSet }) => {
    if (!currentUser) return;
    markLocalModified(currentUser.id);
    if (newTrades) {
      setTrades(newTrades);
      saveUserTrades(currentUser.id, newTrades);
    }
    if (newDiary) {
      setDiary(newDiary);
      saveUserDiary(currentUser.id, newDiary);
    }
    if (newCap) {
      setCapitalLogs(newCap);
      saveUserCapitalLogs(currentUser.id, newCap);
    }
    if (newSet) {
      setSettings(newSet);
      saveUserSettings(currentUser.id, newSet);
    }
    pushDataToSyncServer(currentUser.id, {
      trades: newTrades || trades,
      diary: newDiary || diary,
      capitalLogs: newCap || capitalLogs,
      settings: newSet || settings,
    });
  }, [currentUser, trades, diary, capitalLogs, settings]);

  // Modal open helpers (memoized)
  const handleOpenEditTrade = useCallback((trade) => {
    setEditingTrade(trade);
    setIsTradeModalOpen(true);
  }, []);

  const handleOpenViewTrade = useCallback((trade) => {
    setSelectedTradeForView(trade);
  }, []);

  // If no user is logged in, show fintech Authentication screen
  if (!currentUser) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex font-sans selection:bg-emerald-500 selection:text-black w-full">
      {/* Side Navigation Bar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        analytics={analytics}
        isOpenMobile={isMobileSidebarOpen}
        setIsOpenMobile={setIsMobileSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenInstallApp={() => setIsInstallModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-black">
        {/* Topbar */}
        <Topbar
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          analytics={analytics}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenInstallApp={() => setIsInstallModalOpen(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6 pb-24 lg:pb-8 min-w-0">
          {activeTab === 'trades' && (
            <TradeLog
              trades={trades}
              onOpenTradeModal={handleOpenEditTrade}
              onViewTrade={handleOpenViewTrade}
              onDeleteTrade={handleRequestDeleteTrade}
              onDeleteMultipleTrades={handleDeleteMultipleTrades}
              onDuplicateTrade={handleDuplicateTrade}
              onSaveTrade={handleSaveTrade}
              onOpenContractNoteModal={() => setIsContractNoteModalOpen(true)}
            />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              analytics={analytics}
              trades={trades}
              settings={settings}
              onOpenTradeModal={handleOpenEditTrade}
              onViewTrade={handleOpenViewTrade}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              trades={trades}
              onViewTrade={handleOpenViewTrade}
              onOpenTradeModal={handleOpenEditTrade}
            />
          )}

          {activeTab === 'diary' && (
            <DiaryView
              diary={diary}
              onSaveDiary={handleSaveDiary}
              onDeleteDiary={handleDeleteDiary}
              trades={trades}
            />
          )}

          {activeTab === 'data' && (
            <DataManagementView
              trades={trades}
              diary={diary}
              capitalLogs={capitalLogs}
              settings={settings}
              onUpdateAllData={handleUpdateAllData}
              onAddCapitalLog={handleAddCapitalLog}
              onOpenPrintReport={() => setIsPrintReportOpen(true)}
              analytics={analytics}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="no-print border-t border-neutral-900 bg-black py-4 pb-24 lg:pb-4 text-center text-xs text-neutral-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>DELTA JOURNAL • Fintech High-Precision Trading Terminal</span>
            <span className="text-neutral-400">NSE / BSE Equity & Derivatives</span>
          </div>
        </footer>
      </div>

      {/* Mobile & Tablet Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        analytics={analytics}
      />

      {/* Modals - Mounted only when active for maximum rendering speed */}
      {isTradeModalOpen && (
        <TradeModal
          isOpen={isTradeModalOpen}
          onClose={() => {
            setIsTradeModalOpen(false);
            setEditingTrade(null);
          }}
          onSave={handleSaveTrade}
          onDelete={(trade) => {
            setIsTradeModalOpen(false);
            setEditingTrade(null);
            handleRequestDeleteTrade(trade);
          }}
          initialTrade={editingTrade}
          defaultBrokerage={settings.defaultBrokeragePerOrder || 20}
        />
      )}

      {selectedTradeForView && (
        <TradeDetailModal
          isOpen={Boolean(selectedTradeForView)}
          onClose={() => setSelectedTradeForView(null)}
          trade={selectedTradeForView}
          onEdit={(t) => {
            setSelectedTradeForView(null);
            handleOpenEditTrade(t);
          }}
          onDelete={(trade) => {
            setSelectedTradeForView(null);
            handleRequestDeleteTrade(trade);
          }}
          onDuplicate={(t) => {
            handleDuplicateTrade(t);
            setSelectedTradeForView(null);
          }}
        />
      )}

      {isPrintReportOpen && (
        <PrintReport
          isOpen={isPrintReportOpen}
          onClose={() => setIsPrintReportOpen(false)}
          analytics={analytics}
          trades={trades}
          settings={settings}
        />
      )}

      {/* PWA App Install Modal for Phones & Laptops */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* AI Broker Contract Note / Tradebook PDF Import Modal */}
      <ContractNoteModal
        isOpen={isContractNoteModalOpen}
        onClose={() => setIsContractNoteModalOpen(false)}
        onImportTrades={handleImportParsedTrades}
        currentUser={currentUser}
      />

      {/* Custom In-App Confirmation Modal (Never blocked by browsers/PWAs) */}
      <ConfirmDeleteModal
        isOpen={Boolean(tradeToDelete)}
        onClose={() => setTradeToDelete(null)}
        onConfirm={() => {
          if (tradeToDelete) {
            handleDeleteTrade(tradeToDelete);
            setTradeToDelete(null);
          }
        }}
        title="Delete Trade from Journal"
        itemName={tradeToDelete ? `${tradeToDelete.symbol || 'Trade'} (${tradeToDelete.id})` : ''}
        message="Are you sure you want to permanently delete this trade? This will remove the execution from your journal and recalculate your P&L."
      />

      {/* Instant Action Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-emerald-500/40 text-emerald-400 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Vercel Web Analytics & Speed Insights Real-User Monitoring */}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
