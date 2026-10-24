import React from 'react';
import { Menu, LogOut, Download, RefreshCw } from 'lucide-react';
import { formatINR, formatINRCompact } from '../utils/calculations';

export default function Topbar({
  activeTab,
  onOpenMobileSidebar,
  analytics,
  currentUser,
  onLogout,
  onOpenInstallApp,
  syncStatus,
  lastSyncTime,
  onSyncNow,
  onOpenSyncModal,
}) {
  const tabTitles = {
    trades: { title: 'Trading Journal', desc: 'Main Trading Records & Daily Activity' },
    dashboard: { title: 'Dashboard', desc: 'Account Growth, Metrics & Equity Curve' },
    calendar: { title: 'Trading Calendar', desc: 'Monthly P&L Heatmap & Session Tracking' },
    diary: { title: 'Psychology Diary', desc: 'Daily Mindset, Discipline & Lessons Learned' },
    data: { title: 'Backup & Export', desc: 'CSV Export, JSON System Backup & Capital Ledger' },
  };

  const currentTabInfo = tabTitles[activeTab] || { title: 'Trading Journal', desc: '' };
  const netPnL = analytics.netPnL || 0;
  const isNetProfit = netPnL >= 0;

  return (
    <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-neutral-800 text-white no-print px-3 sm:px-6 py-2.5 sm:py-3">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Mobile hamburger, Logo & Page Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition shrink-0 active:scale-95"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile App Emblem */}
          <div className="lg:hidden w-8 h-8 rounded-lg bg-black border border-emerald-500/30 p-0.5 shrink-0 shadow-[0_0_8px_rgba(0,230,118,0.2)]">
            <img src="/logo-circle.png" alt="Delta Journal" className="w-full h-full object-contain" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-white tracking-tight truncate">
                {currentTabInfo.title}
              </h1>
              {activeTab === 'trades' && (
                <span className="text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                  MAIN
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 hidden md:block truncate">
              {currentTabInfo.desc}
            </p>
          </div>
        </div>

        {/* Right: Sync Status + Install App + Real-time Net P&L ticker + User Logout */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Real-time Phone <-> Laptop Wi-Fi Sync */}
          <button
            onClick={onOpenSyncModal || onSyncNow}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 ${
              syncStatus === 'syncing'
                ? 'bg-neutral-900 border-emerald-500/50 text-emerald-300'
                : syncStatus === 'offline'
                ? 'bg-neutral-900/90 border-neutral-800 text-rose-400'
                : 'bg-neutral-900/90 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
            }`}
            title={lastSyncTime ? `Phone & Laptop Synced at ${lastSyncTime}. Click to open Device Sync Center.` : 'Click to open Device Sync Center'}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${syncStatus === 'offline' ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline font-bold">
              {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'offline' ? 'Offline' : 'Synced'}
            </span>
          </button>

          {/* Install App Quick Action (for both Phone & Laptop) */}
          <button
            onClick={onOpenInstallApp}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-emerald-500/40 text-emerald-400 text-xs font-bold transition active:scale-95"
            title="Install Delta Journal App on Phone or Laptop"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Install App</span>
          </button>

          <div className="flex items-center space-x-2.5 sm:space-x-4 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs sm:text-sm">
            <div>
              <span className="text-[10px] sm:text-xs uppercase text-neutral-400 font-semibold tracking-wider hidden sm:inline">Net Realized: </span>
              <span className="text-[10px] sm:text-xs uppercase text-neutral-400 font-semibold tracking-wider sm:hidden">Net: </span>
              <strong className={`font-black ${isNetProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                <span className="hidden sm:inline">{formatINR(netPnL)}</span>
                <span className="sm:hidden">{formatINRCompact(netPnL)}</span>
              </strong>
            </div>
            <div className="hidden sm:block h-4 w-px bg-neutral-800" />
            <div className="hidden sm:block">
              <span className="text-[10px] sm:text-xs uppercase text-neutral-400 font-semibold tracking-wider">Win Rate: </span>
              <strong className="text-white font-bold">{analytics.winRate}%</strong>
            </div>
          </div>

          {/* Quick Sign Out Action */}
          {currentUser && (
            <button
              onClick={onLogout}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-neutral-700 transition"
              title={`Sign out of ${currentUser.username}`}
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
