import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  CalendarDays,
  BarChart3,
  Zap,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import { formatINR, formatIndianDate } from '../utils/calculations';

// 1. Candlestick Watermark Silhouette for Large Win Hero Card
function CandlestickWatermark({ className = "w-36 sm:w-44 h-22 opacity-40" }) {
  return (
    <svg viewBox="0 0 180 85" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cwGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00e676" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00ff66" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Candle 1 */}
      <line x1="16" y1="48" x2="16" y2="72" stroke="#00e676" strokeWidth="1.2" opacity="0.3" />
      <rect x="13" y="52" width="6" height="12" rx="1" fill="#00e676" opacity="0.35" />

      {/* Candle 2 */}
      <line x1="36" y1="40" x2="36" y2="68" stroke="#00e676" strokeWidth="1.2" opacity="0.4" />
      <rect x="33" y="44" width="6" height="16" rx="1" fill="#00e676" opacity="0.45" />

      {/* Candle 3 (Pullback) */}
      <line x1="56" y1="46" x2="56" y2="66" stroke="#00e676" strokeWidth="1.2" opacity="0.45" />
      <rect x="53" y="48" width="6" height="12" rx="1" fill="#00e676" opacity="0.5" />

      {/* Candle 4 */}
      <line x1="76" y1="32" x2="76" y2="60" stroke="#00e676" strokeWidth="1.2" opacity="0.55" />
      <rect x="73" y="36" width="6" height="18" rx="1" fill="#00e676" opacity="0.6" />

      {/* Candle 5 */}
      <line x1="96" y1="26" x2="96" y2="54" stroke="#00e676" strokeWidth="1.2" opacity="0.65" />
      <rect x="93" y="30" width="6" height="16" rx="1" fill="#00e676" opacity="0.7" />

      {/* Candle 6 */}
      <line x1="116" y1="20" x2="116" y2="48" stroke="#00e676" strokeWidth="1.2" opacity="0.75" />
      <rect x="113" y="24" width="6" height="18" rx="1" fill="#00e676" opacity="0.8" />

      {/* Candle 7 */}
      <line x1="136" y1="12" x2="136" y2="42" stroke="#00ff66" strokeWidth="1.2" opacity="0.85" />
      <rect x="133" y="16" width="6" height="18" rx="1" fill="#00ff66" opacity="0.9" />

      {/* Candle 8 (Tall Breakout) */}
      <line x1="156" y1="4" x2="156" y2="34" stroke="#00ff66" strokeWidth="1.5" />
      <rect x="153" y="8" width="6" height="22" rx="1" fill="#00ff66" filter="drop-shadow(0 0 6px rgba(0,255,102,0.6))" />
    </svg>
  );
}

// 2. Smooth SVG Wave Sparkline with Glowing Right Endpoint
function SparklineWave({ className = "w-full h-12" }) {
  return (
    <svg viewBox="0 0 160 50" fill="none" className={className} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e676" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00e676" stopOpacity="0.0" />
        </linearGradient>
        <filter id="endpointGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00ff66" floodOpacity="0.9" />
        </filter>
      </defs>

      {/* Area Fill */}
      <path
        d="M 0 42 C 25 42, 35 34, 55 36 C 75 38, 85 28, 105 30 C 125 32, 138 18, 156 16 L 156 50 L 0 50 Z"
        fill="url(#waveFill)"
      />

      {/* Smooth Stroke Line */}
      <path
        d="M 0 42 C 25 42, 35 34, 55 36 C 75 38, 85 28, 105 30 C 125 32, 138 18, 156 16"
        stroke="#00e676"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Glowing Neon Endpoint */}
      <circle cx="156" cy="16" r="3.5" fill="#00ff66" filter="url(#endpointGlow)" />
      <circle cx="156" cy="16" r="1.5" fill="#ffffff" />
    </svg>
  );
}

// 3. Trade Outcome Donut Chart SVG
function OutcomeDonut({ winRate = 68 }) {
  const r = 24;
  const c = 2 * Math.PI * r; // ~150.796
  const safeWin = Math.max(0, Math.min(100, Number(winRate) || 0));
  const winStroke = (safeWin / 100) * c;
  const lossStroke = c - winStroke;

  return (
    <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
        {/* Background / Loss Ring (Red/Coral) */}
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
        {/* Foreground / Win Ring (Neon Green) */}
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
      {/* Center Text */}
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

// 4. Monthly Profit Mini Bar Chart SVG with Floating Highlight Pill
function MiniMonthlyBars({ activePnlText = "₹32.7K" }) {
  // Height profiles for 8 ascending/varied bars
  const bars = [16, 24, 20, 28, 22, 34, 26, 42];

  return (
    <div className="relative w-36 sm:w-44 h-16 shrink-0 flex items-end justify-end">
      {/* Floating Green Pill Badge right above the last bar */}
      <div className="absolute -top-3.5 right-0 bg-[#00e676] text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(0,230,118,0.7)] z-10 select-none">
        {activePnlText}
      </div>

      <svg viewBox="0 0 140 50" fill="none" className="w-full h-full" preserveAspectRatio="none">
        {bars.map((h, i) => {
          const isLast = i === bars.length - 1;
          const x = i * 17 + 4;
          const y = 50 - h;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width="8"
              height={h}
              rx="2.5"
              fill={isLast ? '#00e676' : '#08381c'}
              filter={isLast ? 'drop-shadow(0 0 6px rgba(0,230,118,0.7))' : undefined}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function Dashboard({
  analytics,
  trades = [],
  settings = {},
  onOpenTradeModal,
  onViewTrade,
  onNavigateTab,
}) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 Days');
  const [isRangeOpen, setIsRangeOpen] = useState(false);

  const hasTrades = trades && trades.length > 0;

  const {
    netPnL = 0,
    winRate = 0,
    totalTrades = 0,
    winningTrades = 0,
    losingTrades = 0,
    monthlyPnLMap = {},
    weekdayStats = [],
  } = analytics || {};

  const initialCap = Number(settings?.initialCapital) || 0;
  const currentEquity = initialCap + (netPnL || 0);

  // 1. Largest Winning Trade Spotlight
  const largestWinTrade = useMemo(() => {
    if (!hasTrades) return null;
    const wins = trades.filter((t) => Number(t.netPnL) > 0);
    if (!wins.length) return null;
    return [...wins].sort((a, b) => Number(b.netPnL) - Number(a.netPnL))[0];
  }, [hasTrades, trades]);

  // Fallbacks matching mockup when no user trades exist
  const displayLargeWinAmount = hasTrades
    ? largestWinTrade ? Number(largestWinTrade.netPnL) : 0
    : 12450.75;

  const displayLargeWinText = hasTrades
    ? largestWinTrade
      ? `On ${formatIndianDate(largestWinTrade.date)} • ${largestWinTrade.symbol}`
      : 'No winning trades yet'
    : 'On 24 Nov 2026 • NIFTY 25750 PE';

  // 2. Trade Equity Values
  const displayEquity = hasTrades ? currentEquity : 124850.50;

  // 3. Trade Outcome Values
  const displayWinRate = hasTrades
    ? totalTrades > 0 ? Math.round(winRate) : 0
    : 68;
  const displayLossRate = hasTrades
    ? totalTrades > 0 ? Math.max(0, 100 - displayWinRate) : 0
    : 32;

  // 4. Weekday Edge Data
  const weekdaysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekdayMap = useMemo(() => {
    if (!hasTrades) {
      // Mockup defaults
      return {
        Mon: { rate: 72, count: 5, isTop: true },
        Tue: { rate: 56, count: 4 },
        Wed: { rate: 69, count: 6 },
        Thu: { rate: 71, count: 5 },
        Fri: { rate: 63, count: 4 },
        Sat: { rate: null, count: 0 },
        Sun: { rate: null, count: 0 },
      };
    }
    const map = {};
    (weekdayStats || []).forEach((item) => {
      const short = item.day ? item.day.slice(0, 3) : '';
      const dayTrades = trades.filter((t) => {
        if (!t.date) return false;
        const dName = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' });
        return dName === short;
      });
      const winsCount = dayTrades.filter((t) => Number(t.netPnL) > 0).length;
      const rate = dayTrades.length > 0 ? Math.round((winsCount / dayTrades.length) * 100) : null;
      map[short] = {
        rate,
        count: dayTrades.length,
        pnl: item.pnl,
      };
    });
    return map;
  }, [hasTrades, weekdayStats, trades]);

  // Find day with highest win rate
  const bestDay = useMemo(() => {
    if (!hasTrades) return 'Mon';
    let topDay = null;
    let maxRate = -1;
    weekdaysList.forEach((d) => {
      const stat = weekdayMap[d];
      if (stat && stat.count > 0 && stat.rate !== null && stat.rate > maxRate) {
        maxRate = stat.rate;
        topDay = d;
      }
    });
    return topDay || 'Mon';
  }, [hasTrades, weekdayMap]);

  // 5. Monthly Net Profit
  const monthKeys = Object.keys(monthlyPnLMap || {}).sort();
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthPnL = hasTrades
    ? monthlyPnLMap[currentMonthKey]?.netPnL ?? (monthKeys.length > 0 ? monthlyPnLMap[monthKeys[monthKeys.length - 1]]?.netPnL ?? 0 : 0)
    : 32760.25;

  const displayMonthlyPnlText = hasTrades ? formatINR(currentMonthPnL) : '₹32,760.25';
  const displayMonthlyBadge = hasTrades
    ? currentMonthPnL >= 1000 || currentMonthPnL <= -1000
      ? `₹${(currentMonthPnL / 1000).toFixed(1)}K`
      : formatINR(currentMonthPnL)
    : '₹32.7K';

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
    return [...trades]
      .filter((t) => t.status !== 'Open')
      .sort((a, b) => new Date(`${b.date}T${b.entryTime || '09:15'}`) - new Date(`${a.date}T${a.entryTime || '09:15'}`))
      .slice(0, 3)
      .map((t) => {
        const pnl = Number(t.netPnL) || 0;
        let tType = 'CALL';
        if (t.optionType === 'PE' || t.symbol?.includes('PE')) tType = 'PUT';
        return {
          id: t.id,
          symbol: t.symbol,
          type: tType,
          date: formatIndianDate(t.date),
          time: t.entryTime || '09:30',
          netPnL: pnl,
          isProfit: pnl >= 0,
          raw: t,
        };
      });
  }, [hasTrades, trades]);

  return (
    <div className="space-y-3.5 pb-28 max-w-4xl mx-auto w-full min-w-0 px-0.5">
      {/* Top Title Bar: Dashboard + Time Filter Pill */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#00e676]">
            <LayoutGrid className="w-5 h-5 text-[#00e676]" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Dashboard
          </h2>
        </div>

        {/* Time Filter Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRangeOpen(!isRangeOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#0e1115] border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 font-semibold active:scale-95 transition shadow-sm"
          >
            <span>{selectedTimeRange}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {isRangeOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl bg-[#0c0e10] border border-neutral-800 py-1 shadow-2xl z-20 text-xs">
              {['Last 30 Days', 'This Month', 'Last 7 Days', 'All Time'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setSelectedTimeRange(r);
                    setIsRangeOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-neutral-800 transition ${
                    selectedTimeRange === r ? 'text-emerald-400 font-bold' : 'text-neutral-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
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
        {/* Candlestick Watermark Silhouette on Right */}
        <div className="absolute right-1 bottom-0.5 pointer-events-none select-none">
          <CandlestickWatermark />
        </div>

        <div className="flex items-center space-x-3.5 relative z-10">
          {/* Glowing Green Trophy Circle */}
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-950/80 border border-emerald-400/50 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(0,255,102,0.35)] p-3">
            <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-[#00ff66]" />
          </div>

          <div className="min-w-0 pr-16 sm:pr-0">
            <div className="flex items-center space-x-1.5 text-xs text-neutral-300 font-bold">
              <span>Large Win</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#00ff66]" />
            </div>

            <div className="text-xl sm:text-2xl md:text-3xl font-black text-[#00e676] tracking-tight mt-0.5">
              {formatINR(displayLargeWinAmount)}
            </div>

            <div className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate mt-0.5">
              {displayLargeWinText}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Two-Column Row on Mobile & Desktop: "Trade Equity Journal" & "Trade Outcome" */}
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

          {/* Smooth Glowing Green Area Wave Chart */}
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
            {/* SVG Donut Ring with Centered Text */}
            <OutcomeDonut winRate={displayWinRate} />

            {/* Right Legend */}
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

      {/* 3. Weekday Edge Card */}
      <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-3 sm:p-4 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <CalendarDays className="w-4 h-4 text-[#00e676]" />
            <span>Weekday Edge</span>
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

        {/* 7 Horizontal Weekday Chips */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center select-none">
          {weekdaysList.map((day) => {
            const stat = weekdayMap[day];
            const isTop = day === bestDay && stat && stat.rate !== null;
            const displayRate = stat && stat.rate !== null ? `${stat.rate}%` : '+';

            return (
              <div
                key={day}
                className={`py-2 px-1 rounded-xl transition flex flex-col items-center justify-center ${
                  isTop
                    ? 'border border-[#00e676] bg-[#042414] text-[#00e676] shadow-[0_0_12px_rgba(0,230,118,0.25)]'
                    : 'border border-neutral-800/80 bg-black/60 text-neutral-300'
                }`}
              >
                <span className="text-[10px] sm:text-[11px] font-bold block leading-none">
                  {day}
                </span>
                <span
                  className={`text-[10px] sm:text-xs font-black block mt-1.5 leading-none ${
                    isTop ? 'text-[#00e676]' : 'text-neutral-400'
                  }`}
                >
                  {displayRate}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Monthly Net Profit Card */}
      <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-3 sm:p-4 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <BarChart3 className="w-4 h-4 text-[#00e676]" />
            <span>Monthly Net Profit</span>
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

        <div className="flex items-end justify-between gap-3 pt-1">
          {/* Left Values */}
          <div>
            <div
              className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight ${
                currentMonthPnL >= 0 ? 'text-[#00e676]' : 'text-rose-500'
              }`}
            >
              {displayMonthlyPnlText}
            </div>
            <div className="text-[11px] text-[#00e676] font-semibold mt-0.5">
              ↑ +18.4% vs last month
            </div>
          </div>

          {/* Right Mini Bar Chart with Pin Tooltip */}
          <MiniMonthlyBars activePnlText={displayMonthlyBadge} />
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
                {/* Left: Icon + Symbol + CALL/PUT + Timestamp */}
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

                {/* Right: Net P&L + Chevron */}
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
    </div>
  );
}
