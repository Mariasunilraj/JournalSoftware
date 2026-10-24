import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Database,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  Download,
} from 'lucide-react';
import { formatINR } from '../utils/calculations';

export default function Sidebar({
  activeTab,
  setActiveTab,
  analytics,
  isOpenMobile,
  setIsOpenMobile,
  currentUser,
  onLogout,
  onOpenInstallApp,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [marketStatus, setMarketStatus] = useState({ isOpen: false, text: 'CLOSED' });

  // Indian market status checker (NSE/BSE runs 9:15 AM to 3:30 PM IST Mon-Fri)
  useEffect(() => {
    const checkMarket = () => {
      const now = new Date();
      // UTC to IST (+5:30)
      const istTime = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
      const day = istTime.getDay(); // 0 is Sun, 6 is Sat
      const hours = istTime.getHours();
      const minutes = istTime.getMinutes();
      const totalMin = hours * 60 + minutes;

      const isWeekday = day >= 1 && day <= 5;
      const isOpen = isWeekday && totalMin >= 9 * 60 + 15 && totalMin <= 15 * 60 + 30;

      if (isOpen) {
        setMarketStatus({ isOpen: true, text: 'NSE / BSE LIVE' });
      } else {
        setMarketStatus({ isOpen: false, text: 'MARKET CLOSED' });
      }
    };

    checkMarket();
    const interval = setInterval(checkMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Nav Items: Analytics & F&O and Risk Calculator removed
  const navItems = [
    {
      id: 'trades',
      label: 'Trading Journal',
      sublabel: 'Main Activity Log',
      icon: BookOpen,
      badge: analytics.totalTrades,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      sublabel: 'Overview & Growth',
      icon: LayoutDashboard,
    },
    {
      id: 'calendar',
      label: 'Trading Calendar',
      sublabel: 'Monthly P&L Heatmap',
      icon: CalendarDays,
    },
    {
      id: 'diary',
      label: 'Psychology Diary',
      sublabel: 'Mindset & Discipline',
      icon: Sparkles,
    },
    {
      id: 'data',
      label: 'Backup & Export',
      sublabel: 'CSV, JSON & Ledger',
      icon: Database,
    },
  ];

  const netPnL = analytics.netPnL || 0;
  const isNetProfit = netPnL >= 0;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity duration-200"
        />
      )}

      {/* Side Navigation Bar - Fintech Modern Jet Black (Hardware accelerated) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-black border-r border-neutral-800 flex flex-col justify-between transition-[width,transform] duration-200 ease-out will-change-transform no-print ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header Section with High-Precision Brand Logo */}
        {isCollapsed ? (
          <div className="py-4 px-2 border-b border-neutral-800/80 flex flex-col items-center justify-center gap-2">
            {/* Centered Brand Logo Button (Click to Expand) */}
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-10 rounded-xl bg-black border border-emerald-500/40 hover:border-emerald-400 p-0.5 flex items-center justify-center shadow-[0_0_14px_rgba(0,230,118,0.3)] transition active:scale-95 group relative"
              title="Expand Delta Journal Sidebar"
            >
              <img
                src="/logo-circle.png"
                alt="Delta Journal"
                className="w-full h-full object-contain transition-transform group-hover:scale-110"
              />
              {/* Market Status Micro-Dot */}
              <span
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-black ${
                  marketStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
                title={marketStatus.text}
              />
            </button>
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="p-3.5 border-b border-neutral-800/80 flex items-center justify-between min-w-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              {/* Brand Logo Emblem */}
              <div className="w-10 h-10 rounded-xl bg-black border border-emerald-500/40 p-0.5 flex items-center justify-center shadow-[0_0_14px_rgba(0,230,118,0.3)] shrink-0">
                <img
                  src="/logo-circle.png"
                  alt="Delta Journal"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 truncate">
                <div className="flex items-center space-x-1.5">
                  <span className="font-black text-sm tracking-tight text-white truncate">
                    DELTA JOURNAL
                  </span>
                </div>
                <div className="text-[9.5px] uppercase font-black text-emerald-400 tracking-wider flex items-center space-x-1">
                  <span>TRACK</span>
                  <span className="text-neutral-600">•</span>
                  <span>ANALYZE</span>
                  <span className="text-neutral-600">•</span>
                  <span>GROW</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[11px] text-neutral-400 mt-0.5 font-medium">
                  <span
                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                      marketStatus.isOpen ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#00e676]' : 'bg-rose-500'
                    }`}
                  />
                  <span className="truncate">{marketStatus.text}</span>
                </div>
              </div>
            </div>

            {/* Desktop Collapse Button */}
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition border border-transparent hover:border-neutral-800 shrink-0 ml-1"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpenMobile(false)}
              className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 shrink-0 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation Links (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-4 space-y-1.5 scrollbar-none">
          <div className={`text-[11px] sm:text-xs font-bold uppercase tracking-widest text-neutral-500 ${isCollapsed ? 'text-center px-1' : 'px-3'} py-1`}>
            {!isCollapsed ? 'Navigation' : 'Menu'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (setIsOpenMobile) setIsOpenMobile(false);
                }}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-3 py-2.5'
                } rounded-xl text-left transition-colors duration-150 group ${
                  isActive
                    ? 'bg-neutral-900 text-white font-bold border border-neutral-700/80 shadow-[0_0_12px_rgba(0,0,0,0.5)] relative'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60 border border-transparent'
                }`}
                title={item.label}
              >
                {/* Active Indicator Bar with neon accent */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-400 rounded-r-full shadow-[0_0_8px_#00e676]" />
                )}

                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-neutral-500 group-hover:text-neutral-200'
                  }`}
                />

                {!isCollapsed && (
                  <div className="flex-1 truncate">
                    <div className="text-xs sm:text-sm font-semibold leading-tight">{item.label}</div>
                    <div className="text-[11px] sm:text-xs text-neutral-500 truncate leading-tight mt-0.5">
                      {item.sublabel}
                    </div>
                  </div>
                )}

                {!isCollapsed && item.badge !== undefined && (
                  <span
                    className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom P&L & Account Widget - Clean Fintech Monochrome */}
        {!isCollapsed ? (
          <div className="p-3 m-2.5 rounded-2xl bg-[#090909] border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-400">
              <span className="uppercase tracking-widest font-semibold text-[10px] sm:text-xs">Net Realized</span>
              <span className={`font-extrabold text-sm sm:text-base ${isNetProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                {formatINR(netPnL)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] sm:text-xs text-neutral-400 pt-1.5 border-t border-neutral-800/80">
              <span>Win Rate: <strong className="text-white">{analytics.winRate}%</strong></span>
              <span>Profit Factor: <strong className="text-white">{analytics.profitFactor}</strong></span>
            </div>

            {/* Install App on Phone & Laptop Button */}
            <button
              type="button"
              onClick={onOpenInstallApp}
              className="w-full py-2 px-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-emerald-500/40 text-neutral-200 hover:text-emerald-400 text-xs font-bold flex items-center justify-between transition group"
              title="Install Delta Journal App on Phone or Laptop"
            >
              <div className="flex items-center space-x-2">
                <Download className="w-3.5 h-3.5 text-emerald-400 transition-transform group-hover:scale-110" />
                <span>Install App (Phone & PC)</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">PWA</span>
            </button>

            {/* User Account & Logout Strip */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-1.5">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center font-black text-[11px] text-emerald-400 shrink-0">
                  {(currentUser?.name || currentUser?.username || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 truncate">
                  <div className="text-xs font-bold text-white truncate leading-none">
                    {currentUser?.name || 'Trader'}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate leading-none mt-1">
                    {currentUser?.username || 'Individual Account'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 transition border border-transparent hover:border-neutral-800 shrink-0"
                title="Sign Out of Account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-neutral-800 flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenInstallApp}
              className="p-2 rounded-xl text-emerald-400 hover:text-white hover:bg-neutral-900 transition border border-transparent hover:border-neutral-800"
              title="Install App on Phone or PC"
            >
              <Download className="w-4 h-4" />
            </button>
            <div
              className={`w-3 h-3 rounded-full ${isNetProfit ? 'bg-emerald-400 shadow-[0_0_6px_#00e676]' : 'bg-rose-500 shadow-[0_0_6px_#ff3b57]'}`}
              title={`Net P&L: ${formatINR(netPnL)}`}
            />
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
