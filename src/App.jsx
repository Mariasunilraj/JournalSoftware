import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import {
  pushDataToSyncServer,
  pullDataFromSyncServer,
  mergeDatasets,
} from './utils/syncManager';

import {
  loadUserData,
  saveUserTrades,
  saveUserDiary,
  saveUserCapitalLogs,
  saveUserSettings,
  wipeUserAccountData,
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
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'offline'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Cross-Device Sync Engine (Phone <-> Laptop Master Sync)
  const triggerSync = useCallback(async () => {
    if (!currentUser) return;
    setSyncStatus('syncing');
    try {
      const serverData = await pullDataFromSyncServer(currentUser.id);
      const localData = loadUserData(currentUser.id);

      // If server is empty and local device has data, seed the server
      if (
        (!serverData || (!serverData.trades?.length && !serverData.diary?.length && !serverData.capitalLogs?.length)) &&
        (localData.trades.length || localData.diary.length || localData.capitalLogs.length)
      ) {
        await pushDataToSyncServer(currentUser.id, localData);
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        return;
      }

      if (serverData && (serverData.trades || serverData.diary || serverData.capitalLogs || serverData.settings)) {
        const merged = mergeDatasets(localData, serverData);
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

        // Update server with merged set
        await pushDataToSyncServer(currentUser.id, merged);
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setSyncStatus('synced');
      }
    } catch (err) {
      setSyncStatus('offline');
    }
  }, [currentUser]);

  // Periodic Auto-Sync & Tab Focus Wakeup (every 10s)
  useEffect(() => {
    if (!currentUser) return;
    triggerSync();
    const interval = setInterval(triggerSync, 10000);
    const onFocus = () => triggerSync();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
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
    if (!currentUser) return;
    setTrades((prev) => {
      const existsIndex = prev.findIndex((t) => t.id === tradeData.id);
      let updated;
      const stampedTrade = { ...tradeData, userId: currentUser.id };
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = stampedTrade;
      } else {
        updated = [stampedTrade, ...prev];
      }
      saveUserTrades(currentUser.id, updated);
      // Auto push to sync master
      pushDataToSyncServer(currentUser.id, {
        trades: updated,
        diary,
        capitalLogs,
        settings,
      });
      return updated;
    });
  }, [currentUser, diary, capitalLogs, settings]);

  const handleDeleteTrade = useCallback((tradeId) => {
    if (!currentUser) return;
    setTrades((prev) => {
      const updated = prev.filter((t) => t.id !== tradeId);
      saveUserTrades(currentUser.id, updated);
      pushDataToSyncServer(currentUser.id, {
        trades: updated,
        diary,
        capitalLogs,
        settings,
      });
      return updated;
    });
  }, [currentUser, diary, capitalLogs, settings]);

  const handleDuplicateTrade = useCallback((tradeData) => {
    const duplicated = {
      ...tradeData,
      id: `TRD-${Date.now().toString().slice(-6)}`,
      symbol: `${tradeData.symbol} (Copy)`,
      date: new Date().toISOString().slice(0, 10),
    };
    handleSaveTrade(duplicated);
  }, [handleSaveTrade]);

  // Persist diary with RLS & Auto-Sync
  const handleSaveDiary = useCallback((entry) => {
    if (!currentUser) return;
    setDiary((prev) => {
      const existsIndex = prev.findIndex((d) => (d.id && d.id === entry.id) || d.date === entry.date);
      let updated;
      const stampedEntry = { ...entry, userId: currentUser.id };
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = stampedEntry;
      } else {
        updated = [stampedEntry, ...prev];
      }
      saveUserDiary(currentUser.id, updated);
      pushDataToSyncServer(currentUser.id, {
        trades,
        diary: updated,
        capitalLogs,
        settings,
      });
      return updated;
    });
  }, [currentUser, trades, capitalLogs, settings]);

  const handleDeleteDiary = useCallback((idOrDate) => {
    if (!currentUser) return;
    setDiary((prev) => {
      const updated = prev.filter((d) => d.id !== idOrDate && d.date !== idOrDate);
      saveUserDiary(currentUser.id, updated);
      pushDataToSyncServer(currentUser.id, {
        trades,
        diary: updated,
        capitalLogs,
        settings,
      });
      return updated;
    });
  }, [currentUser, trades, capitalLogs, settings]);

  // Persist capital with RLS & Auto-Sync
  const handleAddCapitalLog = useCallback((log) => {
    if (!currentUser) return;
    setCapitalLogs((prev) => {
      const stampedLog = { ...log, userId: currentUser.id };
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
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onSyncNow={triggerSync}
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
          syncStatus={syncStatus}
          lastSyncTime={lastSyncTime}
          onSyncNow={triggerSync}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6 pb-24 lg:pb-8 min-w-0">
          {activeTab === 'trades' && (
            <TradeLog
              trades={trades}
              onOpenTradeModal={handleOpenEditTrade}
              onViewTrade={handleOpenViewTrade}
              onDeleteTrade={handleDeleteTrade}
              onDuplicateTrade={handleDuplicateTrade}
              onSaveTrade={handleSaveTrade}
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
          onDelete={handleDeleteTrade}
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
          onDelete={(id) => {
            handleDeleteTrade(id);
            setSelectedTradeForView(null);
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
    </div>
  );
}
