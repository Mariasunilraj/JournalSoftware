import React from 'react';
import { Menu, Download } from 'lucide-react';
import { formatINR } from '../utils/calculations';

export default function Topbar({
  activeTab,
  onOpenMobileSidebar,
  analytics,
  currentUser,
  onOpenInstallApp,
}) {
  const tabTitles = {
    trades: { title: 'Trading Journal', desc: 'Main Trading Records & Daily Activity' },
    dashboard: { title: 'Dashboard', desc: 'Account Growth, Metrics & Equity Curve' },
    calendar: { title: 'Trading Calendar', desc: 'Monthly P&L Heatmap & Session Tracking' },
    diary: { title: 'Psychology Diary', desc: 'Daily Mindset, Discipline & Lessons Learned' },
    data: { title: 'Backup & Export', desc: 'CSV Export, JSON System Backup & Capital Ledger' },
  };

  const currentTabInfo = tabTitles[activeTab] || { title: 'Trading Journal', desc: '' };
  const netPnL = analytics?.netPnL || 0;
  const isNetProfit = netPnL >= 0;

  return (
    <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-neutral-800 text-white no-print px-3 sm:px-6 py-2.5 sm:py-3">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Mobile hamburger (min 44x44px target) + Delta Journal Branding + Section Title */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden min-w-[44px] min-h-[44px] rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition shrink-0 active:scale-95 flex items-center justify-center"
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo emblem */}
          <div className="w-8 h-8 rounded-lg bg-black border border-emerald-500/30 p-0.5 shrink-0 shadow-[0_0_8px_rgba(0,230,118,0.2)]">
            <img src="/logo-circle.png" alt="Delta Journal" className="w-full h-full object-contain" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight">
                Delta Journal
              </span>
              <span className="text-neutral-600 hidden sm:inline">•</span>
              <span className="text-xs sm:text-sm font-semibold text-neutral-300 truncate hidden xs:inline">
                {currentTabInfo.title}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden md:block truncate">
              {currentTabInfo.desc}
            </p>
          </div>
        </div>

        {/* Right: Install App Quick Action (for both Phone & Laptop) & Desktop Metric Ticker */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Install App Quick Action (min 44x44px touch target) */}
          <button
            onClick={onOpenInstallApp}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-emerald-500/40 text-emerald-400 text-xs font-bold transition active:scale-95 flex items-center space-x-1.5"
            title="Install Delta Journal App on Phone or Laptop"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Install App</span>
          </button>

          {/* Desktop-only ticker (NET chip removed from mobile header to prevent crowding) */}
          <div className="hidden md:flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs">
            <div>
              <span className="text-[10px] uppercase text-neutral-400 font-semibold tracking-wider">Net Realized: </span>
              <strong className={`font-black ${isNetProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                {formatINR(netPnL)}
              </strong>
            </div>
            <div className="h-3.5 w-px bg-neutral-800" />
            <div>
              <span className="text-[10px] uppercase text-neutral-400 font-semibold tracking-wider">Win Rate: </span>
              <strong className="text-white font-bold">{analytics?.winRate || 0}%</strong>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}