import React from 'react';
import { Download, User } from 'lucide-react';
import { formatINR } from '../utils/calculations';

function DeltaChartLogo({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* 4 Ascending Neon Green Bars */}
      <rect x="4" y="20" width="3.5" height="8" rx="1" fill="#00e676" />
      <rect x="10" y="15" width="3.5" height="13" rx="1" fill="#00e676" />
      <rect x="16" y="10" width="3.5" height="18" rx="1" fill="#00e676" />
      <rect x="22" y="5" width="3.5" height="23" rx="1" fill="#00e676" />
      {/* Upward curved arrow sweeping across the top */}
      <path
        d="M4 18 C 10 13, 17 8, 26 4 M 26 4 L 20 4 M 26 4 L 26 10"
        stroke="#00ff66"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Topbar({
  activeTab,
  onOpenMobileSidebar,
  analytics,
  currentUser,
  onOpenInstallApp,
}) {
  const netPnL = analytics?.netPnL || 0;
  const isNetProfit = netPnL >= 0;

  return (
    <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-neutral-800/80 text-white no-print px-3.5 sm:px-6 py-2.5 sm:py-3">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: Ascending Neon Chart Logo + DELTA JOURNAL + Track . Journal . Grow */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-black border border-emerald-500/30 flex items-center justify-center p-1 shrink-0 shadow-[0_0_12px_rgba(0,230,118,0.25)]">
            <DeltaChartLogo className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight uppercase leading-none">
              DELTA JOURNAL
            </h1>
            <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium tracking-wide mt-1">
              Track . Journal . Grow
            </p>
          </div>
        </div>

        {/* Right: User Profile Avatar with Online Neon Dot + Desktop Stats */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          {/* Desktop Metric Ticker */}
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

          {/* Install App Quick Action (Desktop & Tablet) */}
          <button
            onClick={onOpenInstallApp}
            className="hidden sm:flex min-h-[40px] px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-emerald-500/40 text-emerald-400 text-xs font-bold transition active:scale-95 items-center space-x-1.5"
            title="Install Delta Journal App"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Install</span>
          </button>

          {/* Circular Profile Avatar with Gold Silhouette & Neon Green Online Indicator */}
          <button
            onClick={onOpenMobileSidebar}
            className="relative w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700/80 flex items-center justify-center transition active:scale-95 hover:border-emerald-500/60 shadow-md group"
            title="Account & Navigation Menu"
            aria-label="Open User Menu"
          >
            {/* Minimalist golden/amber user silhouette inside */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/30 flex items-center justify-center text-amber-400">
              <User className="w-4 h-4 text-amber-400" />
            </div>

            {/* Neon Green Online / Active Status Dot pinned at bottom-right */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00ff66] rounded-full ring-2 ring-black shadow-[0_0_6px_#00ff66]" />
          </button>
        </div>
      </div>
    </header>
  );
}
