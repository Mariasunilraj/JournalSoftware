import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  Trophy,
  TrendingDown,
  TrendingUp,
  Target,
  BarChart3,
  Zap,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import { formatINR, formatIndianDate, formatINRCompact } from '../utils/calculations';

// 1. Candlestick Watermark Silhouette for Large Win (Ascending Green)
function CandlestickWatermarkUp({ className = "w-36 sm:w-44 h-20 opacity-40" }) {
  return (
    <svg viewBox="0 0 180 85" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <line x1="16" y1="48" x2="16" y2="72" stroke="#00e676" strokeWidth="1.2" opacity="0.3" />
      <rect x="13" y="52" width="6" height="12" rx="1" fill="#00e676" opacity="0.35" />

      <line x1="36" y1="40" x2="36" y2="68" stroke="#00e676" strokeWidth="1.2" opacity="0.4" />
      <rect x="33" y="44" width="6" height="16" rx="1" fill="#00e676" opacity="0.45" />

      <line x1="56" y1="46" x2="56" y2="66" stroke="#00e676" strokeWidth="1.2" opacity="0.45" />
      <rect x="53" y="48" width="6" height="12" rx="1" fill="#00e676" opacity="0.5" />

      <line x1="76" y1="32" x2="76" y2="60" stroke="#00e676" strokeWidth="1.2" opacity="0.55" />
      <rect x="73" y="36" width="6" height="18" rx="1" fill="#00e676" opacity="0.6" />

      <line x1="96" y1="26" x2="96" y2="54" stroke="#00e676" strokeWidth="1.2" opacity="0.65" />
      <rect x="93" y="30" width="6" height="16" rx="1" fill="#00e676" opacity="0.7" />

      <line x1="116" y1="20" x2="116" y2="48" stroke="#00e676" strokeWidth="1.2" opacity="0.75" />
      <rect x="113" y="24" width="6" height="18" rx="1" fill="#00e676" opacity="0.8" />

      <line x1="136" y1="12" x2="136" y2="42" stroke="#00ff66" strokeWidth="1.2" opacity="0.85" />
      <rect x="133" y="16" width="6" height="18" rx="1" fill="#00ff66" opacity="0.9" />

      <line x1="156" y1="4" x2="156" y2="34" stroke="#00ff66" strokeWidth="1.5" />
      <rect x="153" y="8" width="6" height="22" rx="1" fill="#00ff66" />
    </svg>
  );
}

// 2. Candlestick Watermark Silhouette for Large Loss (Descending Red)
function CandlestickWatermarkDown({ className = "w-36 sm:w-44 h-20 opacity-40" }) {
  return (
    <svg viewBox="0 0 180 85" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <line x1="16" y1="6" x2="16" y2="30" stroke="#ef4444" strokeWidth="1.2" opacity="0.8" />
      <rect x="13" y="10" width="6" height="16" rx="1" fill="#ef4444" opacity="0.85" />

      <line x1="36" y1="14" x2="36" y2="40" stroke="#ef4444" strokeWidth="1.2" opacity="0.75" />
      <rect x="33" y="18" width="6" height="18" rx="1" fill="#ef4444" opacity="0.8" />

      <line x1="56" y1="18" x2="56" y2="38" stroke="#ef4444" strokeWidth="1.2" opacity="0.7" />
      <rect x="53" y="20" width="6" height="14" rx="1" fill="#ef4444" opacity="0.7" />

      <line x1="76" y1="28" x2="76" y2="52" stroke="#ef4444" strokeWidth="1.2" opacity="0.65" />
      <rect x="73" y="32" width="6" height="16" rx="1" fill="#ef4444" opacity="0.65" />

      <line x1="96" y1="34" x2="96" y2="58" stroke="#ef4444" strokeWidth="1.2" opacity="0.6" />
      <rect x="93" y="38" width="6" height="16" rx="1" fill="#ef4444" opacity="0.6" />

      <line x1="116" y1="42" x2="116" y2="66" stroke="#ef4444" strokeWidth="1.2" opacity="0.5" />
      <rect x="113" y="46" width="6" height="16" rx="1" fill="#ef4444" opacity="0.5" />

      <line x1="136" y1="50" x2="136" y2="74" stroke="#ef4444" strokeWidth="1.2" opacity="0.45" />
      <rect x="133" y="54" width="6" height="16" rx="1" fill="#ef4444" opacity="0.45" />

      <line x1="156" y1="56" x2="156" y2="82" stroke="#f43f5e" strokeWidth="1.5" />
      <rect x="153" y="60" width="6" height="18" rx="1" fill="#f43f5e" />
    </svg>
  );
}

// 3. Smooth SVG Wave Sparkline with Glowing Right Endpoint
function SparklineWave({ className = "w-full h-12" }) {
  return (
    <svg viewBox="0 0 160 50" fill="none" className={className} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e676" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00e676" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <path
        d="M 0 42 C 25 42, 35 34, 55 36 C 75 38, 85 28, 105 30 C 125 32, 138 18, 156 16 L 156 50 L 0 50 Z"
        fill="url(#waveFill)"
      />
      <path
        d="M 0 42 C 25 42, 35 34, 55 36 C 75 38, 85 28, 105 30 C 125 32, 138 18, 156 16"
        stroke="#00e676"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="156" cy="16" r="3.5" fill="#00ff66" />
      <circle cx="156" cy="16" r="1.5" fill="#ffffff" />
    </svg>
  );
}

// 4. Trade Outcome Donut Chart SVG
function OutcomeDonut({ winRate = 68 }) {
  const r = 24;
  const c = 2 * Math.PI * r; // ~150.796
  const safeWin = Math.max(0, Math.min(100, Number(winRate) || 0));
  const winStroke = (safeWin / 100) * c;
  const lossStroke = c - winStroke;

  return (
    <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
        <circle
          cx="30"
          cy="30"
          r={r}
          stroke="#ef4444"
          strokeWidth="6.5"
          fill="none"
          strokeDasharray={`${lossStroke} ${c}`}
          strokeDashoffset={-winStroke}
          strokeLinecap="round"
        />
        <circle
          cx="30"
          cy="30"
          r={r}
          stroke="#00e676"
          strokeWidth="6.5"
          fill="none"
          strokeDasharray={`${winStroke} ${c}`}
          strokeDashoffset="0"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
        <span className="text-[12px] sm:text-sm font-black text-white leading-none tracking-tight">
          {safeWin}%
        </span>
        <span className="text-[7px] text-neutral-400 font-semibold uppercase mt-0.5 leading-none">
          Win Rate
        </span>
      </div>
    </div>
  );
}

export default function Dashboard({
  analytics = {},
  trades = [],
  settings = {},
  onOpenTradeModal,
  onViewTrade,
  onNavigateTab,
}) {
  const safeTrades = Array.isArray(trades) ? trades : [];
  const hasTrades = safeTrades.length > 0;

  const {
    netPnL = 0,
    winRate = 0,
    totalTrades = 0,
    monthlyPnLMap = {},
  } = analytics || {};

  const initialCap = Number(settings?.initialCapital) || 0;
  const currentEquity = initialCap + (netPnL || 0);

  // 1. Largest Winning Trade
  const largestWinTrade = useMemo(() => {
    if (!hasTrades) return null;
    const wins = safeTrades.filter((t) => t && Number(t.netPnL) > 0);
    if (!wins.length) return null;
    return [...wins].sort((a, b) => Number(b.netPnL) - Number(a.netPnL))[0];
  }, [hasTrades, safeTrades]);

  const displayLargeWinAmount = hasTrades
    ? largestWinTrade ? Number(largestWinTrade.netPnL) : 0
    : 12450.75;

  const displayLargeWinText = hasTrades
    ? largestWinTrade
      ? `On ${formatIndianDate(largestWinTrade.date)} • ${largestWinTrade.symbol || 'NIFTY'}`
      : 'No winning trades yet'
    : 'On 24 Nov 2026 • NIFTY 25750 PE';

  // 2. Largest Loss Trade (New Requirement: Displayed under Largest Win)
  const largestLossTrade = useMemo(() => {
    if (!hasTrades) return null;
    const losses = safeTrades.filter((t) => t && Number(t.netPnL) < 0);
    if (!losses.length) return null;
    // Sort ascending: most negative number first
    return [...losses].sort((a, b) => Number(a.netPnL) - Number(b.netPnL))[0];
  }, [hasTrades, safeTrades]);

  const displayLargeLossAmount = hasTrades
    ? largestLossTrade ? Number(largestLossTrade.netPnL) : 0
    : -8250.00;

  const displayLargeLossText = hasTrades
    ? largestLossTrade
      ? `On ${formatIndianDate(largestLossTrade.date)} • ${largestLossTrade.symbol || 'BANKNIFTY'}`
      : 'No loss trades recorded'
    : 'On 18 Nov 2026 • BANKNIFTY 56200 CE';

  // 3. Trade Equity Values
  const displayEquity = hasTrades ? currentEquity : 124850.50;

  // 4. Trade Outcome Values
  const displayWinRate = hasTrades
    ? totalTrades > 0 ? Math.round(winRate) : 0
    : 68;
  const displayLossRate = hasTrades
    ? totalTrades > 0 ? Math.max(0, 100 - displayWinRate) : 0
    : 32;

  // 5. Monthly Net Income Data & Interactive Bar Selection
  const monthlyList = useMemo(() => {
    if (!hasTrades) {
      // Realistic demo dataset with both profit and loss months for demonstration
      return [
        { key: '2026-04', label: 'Apr', year: '2026', netPnL: 14200.00, trades: 12 },
        { key: '2026-05', label: 'May', year: '2026', netPnL: -6450.00, trades: 15 },
        { key: '2026-06', label: 'Jun', year: '2026', netPnL: 22800.00, trades: 20 },
        { key: '2026-07', label: 'Jul', year: '2026', netPnL: -3120.00, trades: 8 },
        { key: '2026-08', label: 'Aug', year: '2026', netPnL: 18900.00, trades: 16 },
        { key: '2026-09', label: 'Sep', year: '2026', netPnL: 27400.00, trades: 22 },
        { key: '2026-10', label: 'Oct', year: '2026', netPnL: -11500.00, trades: 19 },
        { key: '2026-11', label: 'Nov', year: '2026', netPnL: 32760.25, trades: 25 },
      ];
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const safeMonthlyMap = monthlyPnLMap && typeof monthlyPnLMap === 'object' ? monthlyPnLMap : {};
    const keys = Object.keys(safeMonthlyMap).sort();

    // If user has recorded months, use the last 8
    if (keys.length > 0) {
      return keys.slice(-8).map((k) => {
        const item = safeMonthlyMap[k] || {};
        const [yearStr, monthNum] = k.split('-');
        const mIdx = parseInt(monthNum, 10) - 1;
        const mLabel = mIdx >= 0 && mIdx < 12 ? monthNames[mIdx] : k;
        return {
          key: k,
          label: mLabel,
          year: yearStr || '2026',
          netPnL: Number(item.netPnL) || 0,
          trades: item.trades || 0,
        };
      });
    }

    // Default current month
    const now = new Date();
    const currKey = now.toISOString().slice(0, 7);
    return [
      {
        key: currKey,
        label: monthNames[now.getMonth()],
        year: String(now.getFullYear()),
        netPnL: 0,
        trades: 0,
      },
    ];
  }, [hasTrades, monthlyPnLMap]);

  // Selected Month State (defaults to the latest month in the list)
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);

  const activeMonth = useMemo(() => {
    if (!monthlyList.length) return { key: 'none', label: 'Current', netPnL: 0, trades: 0 };
    if (selectedMonthKey) {
      const found = monthlyList.find((m) => m.key === selectedMonthKey);
      if (found) return found;
    }
    return monthlyList[monthlyList.length - 1];
  }, [monthlyList, selectedMonthKey]);

  const activeMonthPnL = activeMonth.netPnL;
  const isMonthProfit = activeMonthPnL >= 0;

  // Max absolute PnL to compute normalized bar heights
  const maxAbsPnL = useMemo(() => {
    const maxVal = Math.max(...monthlyList.map((m) => Math.abs(m.netPnL)), 1);
    return maxVal;
  }, [monthlyList]);

  // 6. Recent 3 executed trades
  const recentTrades = useMemo(() => {
    if (!hasTrades) {
      return [
        {
          id: 'demo-1',
          symbol: 'NIFTY 25750 PE',
          type: 'PUT',
          date: '24 Nov 2026',
          time: '09:30',
          netPnL: 12450.75,
          isProfit: true,
        },
        {
          id: 'demo-2',
          symbol: 'NIFTY 25600 CE',
          type: 'CALL',
          date: '23 Nov 2026',
          time: '14:20',
          netPnL: -2143.26,
          isProfit: false,
        },
        {
          id: 'demo-3',
          symbol: 'BANKNIFTY 56700 CE',
          type: 'CALL',
          date: '22 Nov 2026',
          time: '11:15',
          netPnL: 3210.50,
          isProfit: true,
        },
      ];
    }
    return [...safeTrades]
      .filter((t) => t && t.status !== 'Open')
      .sort((a, b) => {
        try {
          const dateA = a.date || '2000-01-01';
          const dateB = b.date || '2000-01-01';
          return new Date(`${dateB}T${b.entryTime || '09:15'}`) - new Date(`${dateA}T${a.entryTime || '09:15'}`);
        } catch (e) {
          return 0;
        }
      })
      .slice(0, 3)
      .map((t) => {
        const pnl = Number(t?.netPnL) || 0;
        let tType = 'CALL';
        if (t?.optionType === 'PE' || t?.symbol?.includes('PE')) tType = 'PUT';
        return {
          id: t?.id || Math.random().toString(),
          symbol: t?.symbol || 'Options Contract',
          type: tType,
          date: formatIndianDate(t?.date),
          time: t?.entryTime || '09:30',
          netPnL: pnl,
          isProfit: pnl >= 0,
          raw: t,
        };
      });
  }, [hasTrades, safeTrades]);

  return (
    <div className="space-y-3.5 pb-0 max-w-4xl mx-auto w-full min-w-0 px-0.5">
      {/* Top Title Bar: Dashboard (Time filter pill removed per request) */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#00e676]">
            <LayoutGrid className="w-5 h-5 text-[#00e676]" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Dashboard
          </h2>
        </div>
      </div>

      {/* Safety Rule: Negative Account Equity Warning Banner */}
      {hasTrades && currentEquity < 0 && (
        <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-300 shadow-xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-rose-200">Account equity below zero: </span>
            Current equity is <strong>{formatINR(currentEquity)}</strong>. Please manage position sizing carefully.
          </div>
        </div>
      )}

      {/* 1. Hero Spotlight Card: "Large Win" */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#031d0e] via-[#072a16] to-[#041209] border border-emerald-500/30 p-4 sm:p-5 shadow-2xl">
        <div className="absolute right-1 bottom-0.5 pointer-events-none select-none">
          <CandlestickWatermarkUp />
        </div>

        <div className="flex items-center space-x-3.5 relative z-10">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-950/80 border border-emerald-400/50 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(0,255,102,0.35)] p-3">
            <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-[#00ff66]" />
          </div>

          <div className="min-w-0 pr-16 sm:pr-0">
            <div className="flex items-center space-x-1.5 text-xs text-neutral-300 font-bold">
              <span>Large Win</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#00ff66]" />
            </div>

            <div className="text-xl sm:text-2xl md:text-3xl font-black text-[#00e676] tracking-tight mt-0.5">
              +{formatINR(displayLargeWinAmount)}
            </div>

            <div className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate mt-0.5">
              {displayLargeWinText}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hero Spotlight Card: "Large Loss" (Rendered directly under Large Win) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1f0507] via-[#2d090d] to-[#140305] border border-rose-500/30 p-4 sm:p-5 shadow-2xl">
        <div className="absolute right-1 bottom-0.5 pointer-events-none select-none">
          <CandlestickWatermarkDown />
        </div>

        <div className="flex items-center space-x-3.5 relative z-10">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-400 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(244,63,94,0.35)] p-3">
            <TrendingDown className="w-7 h-7 sm:w-8 sm:h-8 text-[#ff4d6d]" />
          </div>

          <div className="min-w-0 pr-16 sm:pr-0">
            <div className="flex items-center space-x-1.5 text-xs text-neutral-300 font-bold">
              <span>Large Loss</span>
              <ArrowDownRight className="w-3.5 h-3.5 text-[#ff4d6d]" />
            </div>

            <div className="text-xl sm:text-2xl md:text-3xl font-black text-rose-500 tracking-tight mt-0.5">
              {formatINR(displayLargeLossAmount)}
            </div>

            <div className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate mt-0.5">
              {displayLargeLossText}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Two-Column Row on Mobile & Desktop: "Trade Equity Journal" & "Trade Outcome" */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* Left Card: Trade Equity Journal */}
        <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-3 sm:p-4 shadow-xl flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold text-white truncate">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00e676] shrink-0" />
              <span className="truncate">Trade Equity Journal</span>
            </div>

            <div className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight mt-1.5 truncate">
              {formatINR(displayEquity)}
            </div>

            <div className="text-[9px] sm:text-[10px] text-[#00e676] font-semibold mt-0.5 truncate">
              ↑ +12.6% vs last month
            </div>
          </div>

          <div className="w-full mt-2 -mb-1">
            <SparklineWave />
          </div>
        </div>

        {/* Right Card: Trade Outcome (Centered Donut + Legend) */}
        <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-3 sm:p-4 shadow-xl flex flex-col justify-between overflow-hidden">
          <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold text-white truncate">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00e676] shrink-0" />
            <span className="truncate">Trade Outcome</span>
          </div>

          <div className="flex items-center justify-between gap-1 mt-1.5 pt-0.5">
            <OutcomeDonut winRate={displayWinRate} />

            <div className="flex flex-col space-y-1.5 text-xs min-w-0 pr-0.5">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00e676] shrink-0 shadow-[0_0_6px_#00e676]" />
                <div className="text-[10px] sm:text-[11px] leading-tight">
                  <span className="text-neutral-400 font-medium block">Wins</span>
                  <strong className="text-white font-bold block">{displayWinRate}%</strong>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ef4444] shrink-0 shadow-[0_0_6px_#ef4444]" />
                <div className="text-[10px] sm:text-[11px] leading-tight">
                  <span className="text-neutral-400 font-medium block">Losses</span>
                  <strong className="text-white font-bold block">{displayLossRate}%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Monthly Net Income Card (Interactive Month Selector + Red on Loss) */}
      <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-3.5 sm:p-4 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <BarChart3 className={`w-4 h-4 ${isMonthProfit ? 'text-[#00e676]' : 'text-rose-500'}`} />
            <span>Monthly Net Income</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('calendar')}
            className="flex items-center space-x-0.5 text-xs text-neutral-400 hover:text-white transition"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selected Month Amount & Subtitle */}
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div
              className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight transition-colors duration-150 ${
                isMonthProfit ? 'text-[#00e676]' : 'text-rose-500'
              }`}
            >
              {isMonthProfit && activeMonthPnL > 0 ? `+${formatINR(activeMonthPnL)}` : formatINR(activeMonthPnL)}
            </div>
            <div className="text-[11px] text-neutral-400 font-medium mt-0.5 flex items-center space-x-1.5">
              <span className={`font-bold ${isMonthProfit ? 'text-[#00e676]' : 'text-rose-400'}`}>
                {activeMonth.label} {activeMonth.year}
              </span>
              <span>•</span>
              <span>{activeMonth.trades} {activeMonth.trades === 1 ? 'trade' : 'trades'}</span>
              <span>•</span>
              <span className={isMonthProfit ? 'text-emerald-400' : 'text-rose-400'}>
                {isMonthProfit ? 'Net Profit' : 'Net Loss'}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold hidden sm:block">
            Tap a bar to inspect
          </div>
        </div>

        {/* Interactive Month Bar Chart */}
        <div className="pt-4 pb-1">
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2 items-end h-24">
            {monthlyList.map((m) => {
              const isSelected = m.key === activeMonth.key;
              const isProfit = m.netPnL >= 0;
              const absPnL = Math.abs(m.netPnL);
              // Calculate normalized height between 18% and 92%
              const heightPercent = Math.max(18, Math.round((absPnL / maxAbsPnL) * 90));

              return (
                <div
                  key={m.key}
                  onClick={() => setSelectedMonthKey(m.key)}
                  className="flex flex-col items-center justify-end h-full cursor-pointer group select-none relative"
                >
                  {/* Floating Pill Badge over the Selected Month Bar */}
                  {isSelected && (
                    <div
                      className={`absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg z-10 transition-all ${
                        isProfit
                          ? 'bg-[#00e676] text-black shadow-[0_0_10px_rgba(0,230,118,0.7)]'
                          : 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.7)]'
                      }`}
                    >
                      {formatINRCompact(m.netPnL)}
                    </div>
                  )}

                  {/* Vertical Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[28px] rounded-t-md transition-all duration-150 ${
                      isSelected
                        ? isProfit
                          ? 'bg-[#00e676] shadow-[0_0_12px_rgba(0,230,118,0.8)] scale-y-105'
                          : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)] scale-y-105'
                        : isProfit
                        ? 'bg-[#08381c] hover:bg-[#0c4e28]'
                        : 'bg-[#3b1216] hover:bg-[#52191f]'
                    }`}
                  />

                  {/* Month Label */}
                  <span
                    className={`text-[9px] sm:text-[10px] mt-1.5 transition-colors leading-none ${
                      isSelected
                        ? isProfit
                          ? 'text-[#00e676] font-black'
                          : 'text-rose-400 font-black'
                        : 'text-neutral-400 group-hover:text-white font-medium'
                    }`}
                  >
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Recent Activity Card */}
      <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-3 sm:p-4 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <Zap className="w-4 h-4 text-[#00e676]" />
            <span>Recent Activity</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('trades')}
            className="flex items-center space-x-0.5 text-xs text-neutral-400 hover:text-white transition"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List of 3 Recent Trades */}
        <div className="space-y-2">
          {recentTrades.map((t) => {
            const isProfit = t.isProfit;
            const isCall = t.type === 'CALL';

            return (
              <div
                key={t.id}
                onClick={() => t.raw && onViewTrade && onViewTrade(t.raw)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-black/60 hover:bg-neutral-900 border border-neutral-800/80 transition cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isProfit
                        ? 'bg-[#042414] border border-[#00e676]/30 text-[#00ff7f]'
                        : 'bg-[#2a0e0e] border border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {isProfit ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-white truncate">
                        {t.symbol}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          isCall
                            ? isProfit
                              ? 'bg-[#064e27] text-[#00ff66]'
                              : 'bg-[#3b1112] text-[#ff7b7b]'
                            : 'bg-[#064e27] text-[#00ff66]'
                        }`}
                      >
                        {t.type}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-neutral-400 font-medium mt-0.5">
                      {t.date} • {t.time}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`text-xs sm:text-sm font-black ${
                      isProfit ? 'text-[#00e676]' : 'text-rose-400'
                    }`}
                  >
                    {isProfit ? `+${formatINR(t.netPnL)}` : formatINR(t.netPnL)}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer Line directly below Recent Activity */}
      <div className="pt-2 pb-20 text-center select-none px-2">
        <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">
          ⚠️ Disclaimer: Futures &amp; Options trading involves substantial risk of loss. For journaling &amp; performance tracking only.
        </p>
      </div>
    </div>
  );
}
