import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Trophy,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react';
import { formatINR, formatINRCompact, formatIndianDate } from '../utils/calculations';

// Demo sample data matching reference mockup when no user trades exist
const DEMO_MONTH_DATA = {
  profit: 8732.15,
  loss: -2430.75,
  netProfit: 6301.40,
  profitPercent: 14.2,
  lossPercent: -5.7,
  netPercent: 8.6,
  totalTrades: 24,
  winRate: 66.7,
  avgProfit: 412.87,
  avgLoss: 243.21,
  days: {
    3: { pnl: -1200, trades: 1 },
    5: { pnl: -549, trades: 1 },
    6: { pnl: 1420, trades: 2 },
    9: { pnl: 1300, trades: 1 },
    11: { pnl: -819, trades: 2 },
    12: { pnl: 307, trades: 1 },
    13: { pnl: 534, trades: 1 },
    17: { pnl: 1200, trades: 2 },
    18: { pnl: 564, trades: 1 },
    19: { pnl: 1000, trades: 2 },
    20: { pnl: 2100, trades: 3 },
    23: { pnl: -665, trades: 1 },
    25: { pnl: 2700, trades: 2 },
    26: { pnl: 5700, trades: 3 },
    27: { pnl: -2000, trades: 1 },
  },
  performanceSets: {
    'This Month': [
      { day: 'Mon', pnl: 1200 },
      { day: 'Tue', pnl: 3400 },
      { day: 'Wed', pnl: -819 },
      { day: 'Thu', pnl: 1500 },
      { day: 'Fri', pnl: 4100 },
      { day: 'Sat', pnl: 800 },
      { day: 'Sun', pnl: -249 },
    ],
    'This Week': [
      { day: 'Mon', pnl: 650 },
      { day: 'Tue', pnl: 1850 },
      { day: 'Wed', pnl: -420 },
      { day: 'Thu', pnl: 920 },
      { day: 'Fri', pnl: 2100 },
      { day: 'Sat', pnl: 0 },
      { day: 'Sun', pnl: -150 },
    ],
    'Last Month': [
      { day: 'Mon', pnl: -950 },
      { day: 'Tue', pnl: 2100 },
      { day: 'Wed', pnl: 1400 },
      { day: 'Thu', pnl: -1250 },
      { day: 'Fri', pnl: 3600 },
      { day: 'Sat', pnl: 450 },
      { day: 'Sun', pnl: -600 },
    ],
  },
};

export default function CalendarView({ trades = [], onViewTrade, onOpenTradeModal, settings = {} }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [weeklyFilter, setWeeklyFilter] = useState('This Month'); // 'This Month' | 'This Week' | 'Last Month'
  const [selectedDateTrades, setSelectedDateTrades] = useState(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const safeTrades = Array.isArray(trades) ? trades : [];
  const hasTrades = safeTrades.length > 0;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Aggregate user trades by date string YYYY-MM-DD
  const dailyData = useMemo(() => {
    const map = {};
    safeTrades.forEach((trade) => {
      if (!trade?.date) return;
      let dateKey = String(trade.date).trim();
      // Normalize DD-MM-YYYY to YYYY-MM-DD
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateKey)) {
        const parts = dateKey.split(/[-/]/);
        dateKey = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      if (!map[dateKey]) {
        map[dateKey] = {
          netPnL: 0,
          grossPnL: 0,
          charges: 0,
          trades: [],
        };
      }
      map[dateKey].netPnL += Number(trade.netPnL) || 0;
      map[dateKey].grossPnL += Number(trade.grossPnL) || 0;
      map[dateKey].charges += Number(trade.charges) || 0;
      map[dateKey].trades.push(trade);
    });
    return map;
  }, [safeTrades]);

  // Current Month Summary Stats (Profit, Loss, Net)
  const monthStats = useMemo(() => {
    if (!hasTrades) {
      return {
        profit: DEMO_MONTH_DATA.profit,
        loss: DEMO_MONTH_DATA.loss,
        netProfit: DEMO_MONTH_DATA.netProfit,
        profitPercent: DEMO_MONTH_DATA.profitPercent,
        lossPercent: DEMO_MONTH_DATA.lossPercent,
        netPercent: DEMO_MONTH_DATA.netPercent,
        totalTrades: DEMO_MONTH_DATA.totalTrades,
        winRate: DEMO_MONTH_DATA.winRate,
        avgProfit: DEMO_MONTH_DATA.avgProfit,
        avgLoss: DEMO_MONTH_DATA.avgLoss,
      };
    }

    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let profit = 0;
    let loss = 0;
    let totalTradesCount = 0;
    let winningTradesCount = 0;
    let losingTradesCount = 0;

    Object.keys(dailyData).forEach((dateStr) => {
      if (dateStr.startsWith(monthPrefix)) {
        const day = dailyData[dateStr];
        day.trades.forEach((t) => {
          totalTradesCount += 1;
          const pnl = Number(t.netPnL) || 0;
          if (pnl > 0) {
            profit += pnl;
            winningTradesCount += 1;
          } else if (pnl < 0) {
            loss += pnl;
            losingTradesCount += 1;
          }
        });
      }
    });

    const netProfit = profit + loss;
    const winRate = totalTradesCount > 0 ? ((winningTradesCount / totalTradesCount) * 100).toFixed(1) : 0;
    const avgProfit = winningTradesCount > 0 ? (profit / winningTradesCount).toFixed(2) : 0;
    const avgLoss = losingTradesCount > 0 ? (Math.abs(loss) / losingTradesCount).toFixed(2) : 0;

    return {
      profit,
      loss,
      netProfit,
      profitPercent: 12.4,
      lossPercent: -4.8,
      netPercent: netProfit >= 0 ? 8.2 : -8.2,
      totalTrades: totalTradesCount,
      winRate: Number(winRate),
      avgProfit: Number(avgProfit),
      avgLoss: Number(avgLoss),
    };
  }, [hasTrades, year, month, dailyData]);

  // Calendar cells generation for current month
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    // Padding before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ type: 'empty', id: `empty-${i}` });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr || (!hasTrades && day === 28);

      let stats = dailyData[dateStr] || null;
      if (!hasTrades && DEMO_MONTH_DATA.days[day]) {
        stats = {
          netPnL: DEMO_MONTH_DATA.days[day].pnl,
          trades: new Array(DEMO_MONTH_DATA.days[day].trades).fill({}),
          isDemo: true,
        };
      }

      cells.push({
        type: 'day',
        dayNumber: day,
        dateStr,
        stats,
        isToday,
      });
    }

    return cells;
  }, [year, month, dailyData, hasTrades]);

  // Performance Bar Chart Data dynamically filtered by 'This Month' | 'This Week' | 'Last Month'
  const weeklyBarsData = useMemo(() => {
    const daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (!hasTrades) {
      return DEMO_MONTH_DATA.performanceSets[weeklyFilter] || DEMO_MONTH_DATA.performanceSets['This Month'];
    }

    const now = new Date();
    // Calculate 'This Week' bounds (Monday to Sunday)
    const currentDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ...
    const distToMon = (currentDayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distToMon);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Calculate 'Last Month' bounds
    const prevMonthDate = new Date(year, month - 1, 1);
    const lastMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const filtered = safeTrades.filter((t) => {
      if (!t.date) return false;
      let dateKey = String(t.date).trim();
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateKey)) {
        const parts = dateKey.split(/[-/]/);
        dateKey = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      if (weeklyFilter === 'This Week') {
        const tDate = new Date(dateKey);
        return tDate >= monday && tDate <= sunday;
      }
      if (weeklyFilter === 'Last Month') {
        return dateKey.startsWith(lastMonthPrefix);
      }
      // 'This Month'
      return dateKey.startsWith(thisMonthPrefix);
    });

    const pnlMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    filtered.forEach((t) => {
      try {
        let dateKey = String(t.date).trim();
        if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateKey)) {
          const parts = dateKey.split(/[-/]/);
          dateKey = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        const d = new Date(dateKey);
        if (isNaN(d.getTime())) return;
        const shortName = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (pnlMap[shortName] !== undefined) {
          pnlMap[shortName] += Number(t.netPnL) || 0;
        }
      } catch (e) {}
    });

    return daysList.map((d) => ({
      day: d,
      pnl: pnlMap[d] || 0,
    }));
  }, [hasTrades, safeTrades, weeklyFilter, year, month]);

  // Max absolute value for performance chart scale
  const maxWeeklyAbs = useMemo(() => {
    const maxVal = Math.max(...weeklyBarsData.map((b) => Math.abs(b.pnl)), 500);
    return maxVal;
  }, [weeklyBarsData]);

  // Dynamic Y-axis scale labels based on max value
  const yScaleLabels = useMemo(() => {
    const top = maxWeeklyAbs;
    const mid = Math.round(top / 2);
    return {
      top: formatINRCompact(top),
      mid: formatINRCompact(mid),
      zero: '0',
      bottom: formatINRCompact(-mid),
    };
  }, [maxWeeklyAbs]);

  // Today's day index (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const todayDayIndex = new Date().getDay();

  return (
    <div className="space-y-3.5 pb-20 max-w-4xl mx-auto w-full min-w-0 px-0.5">
      {/* 1. Top Controls Bar: Month Picker + Steppers (Today, <, >) */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {/* Month Selector Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
            className="flex items-center space-x-2 px-3 py-2 rounded-2xl bg-[#0c0e10] border border-neutral-800 hover:border-neutral-700 transition active:scale-95 shadow-sm"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#00e676]">
              <CalendarIcon className="w-4 h-4 text-[#00e676]" />
            </div>
            <span className="text-sm sm:text-base font-black text-white tracking-tight">
              {monthNames[month]} {year}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {/* Quick Month Dropdown */}
          {isMonthPickerOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-48 rounded-2xl bg-[#0c0e10] border border-neutral-800 p-2 shadow-2xl z-30 max-h-60 overflow-y-auto">
              {monthNames.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setCurrentDate(new Date(year, idx, 1));
                    setIsMonthPickerOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    idx === month ? 'bg-emerald-500/20 text-[#00e676]' : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {m} {year}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Steppers: < | Today | > */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={prevMonth}
            className="w-9 h-9 rounded-xl bg-[#0c0e10] border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-sm"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="px-3.5 h-9 rounded-xl bg-[#0c0e10] border border-neutral-800 hover:border-neutral-700 text-white font-bold text-xs flex items-center justify-center transition active:scale-95 shadow-sm"
          >
            Today
          </button>

          <button
            type="button"
            onClick={nextMonth}
            className="w-9 h-9 rounded-xl bg-[#0c0e10] border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-sm"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top 3 Summary Cards in a Row: PROFIT | LOSS | NET PROFIT */}
      <div className="grid grid-cols-3 gap-2">
        {/* Card 1: PROFIT */}
        <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-2.5 sm:p-3.5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Profit</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#00e676]" />
          </div>

          <div className="text-sm sm:text-lg md:text-xl font-black text-[#00e676] tracking-tight mt-1.5 truncate">
            +{formatINR(monthStats.profit)}
          </div>

          <div className="text-[9px] sm:text-[10px] text-[#00e676] font-semibold mt-0.5 truncate">
            ▲ +{monthStats.profitPercent}%
          </div>
        </div>

        {/* Card 2: LOSS */}
        <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-2.5 sm:p-3.5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Loss</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          </div>

          <div className="text-sm sm:text-lg md:text-xl font-black text-rose-500 tracking-tight mt-1.5 truncate">
            {formatINR(monthStats.loss)}
          </div>

          <div className="text-[9px] sm:text-[10px] text-rose-500 font-semibold mt-0.5 truncate">
            ▼ {monthStats.lossPercent}%
          </div>
        </div>

        {/* Card 3: NET PROFIT */}
        <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-2.5 sm:p-3.5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Net Profit</span>
          </div>

          <div className={`text-sm sm:text-lg md:text-xl font-black tracking-tight mt-1.5 truncate ${
            monthStats.netProfit >= 0 ? 'text-[#00e676]' : 'text-rose-500'
          }`}>
            {monthStats.netProfit >= 0 ? `+${formatINR(monthStats.netProfit)}` : formatINR(monthStats.netProfit)}
          </div>

          <div className={`text-[9px] sm:text-[10px] font-semibold mt-0.5 truncate ${
            monthStats.netProfit >= 0 ? 'text-[#00e676]' : 'text-rose-500'
          }`}>
            ▲ +{monthStats.netPercent}%
          </div>
        </div>
      </div>

      {/* 3. Calendar Grid Container */}
      <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-3 sm:p-4 shadow-xl space-y-2">
        {/* Weekday Headers: S M T W T F S */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center select-none pb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, i) => {
            const isTodayDay = i === todayDayIndex;
            return (
              <div key={i} className="flex flex-col items-center justify-center">
                <span className={`text-xs font-black uppercase ${
                  isTodayDay ? 'text-[#00e676]' : 'text-neutral-400'
                }`}>
                  {dayChar}
                </span>
                {isTodayDay && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] shadow-[0_0_6px_#00e676] mt-0.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Calendar Cells Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 select-none">
          {calendarCells.map((cell) => {
            if (cell.type === 'empty') {
              return (
                <div
                  key={cell.id}
                  className="h-13 sm:h-16 rounded-xl bg-black/40 border border-neutral-900/60"
                />
              );
            }

            const { dayNumber, dateStr, stats, isToday } = cell;
            const hasActivity = stats && (stats.trades?.length > 0 || stats.netPnL !== undefined);
            const isProfit = hasActivity && Number(stats.netPnL) > 0;
            const isLoss = hasActivity && Number(stats.netPnL) < 0;

            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (hasActivity && stats.trades && !stats.isDemo) {
                    setSelectedDateTrades({ date: dateStr, stats });
                  }
                }}
                className={`h-13 sm:h-16 rounded-xl p-1 sm:p-1.5 flex flex-col justify-between transition-all duration-150 border relative overflow-hidden ${
                  isToday
                    ? 'border-2 border-[#00e676] bg-emerald-950/20 shadow-[0_0_12px_rgba(0,230,118,0.3)]'
                    : isProfit
                    ? 'bg-[#041a0d] border-emerald-500/40 hover:border-emerald-400 cursor-pointer'
                    : isLoss
                    ? 'bg-[#200709] border-rose-500/40 hover:border-rose-400 cursor-pointer'
                    : 'bg-black/60 border-neutral-800/80 hover:border-neutral-700'
                } ${hasActivity ? 'active:scale-95' : ''}`}
              >
                {/* Top Row: Date Number + Corner Indicator Dot */}
                <div className="flex items-center justify-between w-full leading-none">
                  <span className={`text-[10px] sm:text-xs font-black ${
                    isToday ? 'text-white' : hasActivity ? 'text-white' : 'text-neutral-400'
                  }`}>
                    {dayNumber}
                  </span>

                  {/* Corner Status Dot */}
                  {isProfit && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] shadow-[0_0_4px_#00e676]" />
                  )}
                  {isLoss && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] shadow-[0_0_4px_#ef4444]" />
                  )}
                </div>

                {/* Center / Bottom: Amount or Today Center Dot */}
                <div className="text-center my-auto leading-none w-full truncate">
                  {hasActivity ? (
                    <span
                      className={`text-[9px] sm:text-[10px] font-black tracking-tight block truncate ${
                        isProfit ? 'text-[#00e676]' : isLoss ? 'text-rose-500' : 'text-neutral-300'
                      }`}
                    >
                      {formatINRCompact(stats.netPnL)}
                    </span>
                  ) : isToday ? (
                    <span className="w-2 h-2 rounded-full bg-[#00e676] inline-block shadow-[0_0_8px_#00e676]" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Legend Row (Filter button removed per request) */}
        <div className="pt-2 border-t border-neutral-900 flex items-center space-x-3 text-[11px] text-neutral-400 select-none">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00e676] shadow-[0_0_6px_#00e676]" />
            <span className="text-neutral-300 font-medium">Profit</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ef4444] shadow-[0_0_6px_#ef4444]" />
            <span className="text-neutral-300 font-medium">Loss</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#525252]" />
            <span className="text-neutral-400 font-medium">No Trades</span>
          </span>
        </div>
      </div>

      {/* 5. Summary for Month Section ("View Details" button removed per request) */}
      <div className="space-y-2">
        <div className="px-1">
          <h3 className="text-xs sm:text-sm font-bold text-white italic tracking-wide">
            Summary for {monthNames[month]}
          </h3>
        </div>

        {/* 4 Metrics in a Row: Total Trades | Win Rate | Avg Profit | Avg Loss */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {/* Total Trades */}
          <div className="rounded-xl bg-[#0c0e10] border border-neutral-800/80 p-2 sm:p-2.5 shadow-sm">
            <span className="text-[9px] sm:text-[10px] text-neutral-400 font-medium block truncate">
              Total Trades
            </span>
            <div className="flex items-center space-x-1.5 mt-1">
              <Briefcase className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <strong className="text-xs sm:text-sm font-black text-white truncate">
                {monthStats.totalTrades}
              </strong>
            </div>
          </div>

          {/* Win Rate */}
          <div className="rounded-xl bg-[#0c0e10] border border-neutral-800/80 p-2 sm:p-2.5 shadow-sm">
            <span className="text-[9px] sm:text-[10px] text-neutral-400 font-medium block truncate">
              Win Rate
            </span>
            <div className="flex items-center space-x-1.5 mt-1">
              <Trophy className="w-3.5 h-3.5 text-[#00e676] shrink-0" />
              <strong className="text-xs sm:text-sm font-black text-white truncate">
                {monthStats.winRate}%
              </strong>
            </div>
          </div>

          {/* Avg Profit */}
          <div className="rounded-xl bg-[#0c0e10] border border-neutral-800/80 p-2 sm:p-2.5 shadow-sm">
            <span className="text-[9px] sm:text-[10px] text-neutral-400 font-medium block truncate">
              Avg Profit
            </span>
            <div className="flex items-center space-x-1.5 mt-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#00e676] shrink-0" />
              <strong className="text-xs sm:text-sm font-black text-white truncate">
                ₹{monthStats.avgProfit}
              </strong>
            </div>
          </div>

          {/* Avg Loss */}
          <div className="rounded-xl bg-[#0c0e10] border border-neutral-800/80 p-2 sm:p-2.5 shadow-sm">
            <span className="text-[9px] sm:text-[10px] text-neutral-400 font-medium block truncate">
              Avg Loss
            </span>
            <div className="flex items-center space-x-1.5 mt-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <strong className="text-xs sm:text-sm font-black text-white truncate">
                ₹{monthStats.avgLoss}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Performance Card */}
      <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800/80 p-3 sm:p-4 shadow-xl space-y-3">
        {/* Card Header + Time Filter Pills */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-[#00e676]" />
            <h3 className="text-xs sm:text-sm font-black text-white tracking-tight">
              Performance
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 bg-black/60 p-0.5 rounded-full border border-neutral-800/80">
            {['This Month', 'This Week', 'Last Month'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setWeeklyFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                  weeklyFilter === f
                    ? 'bg-[#00e676] text-black shadow-[0_0_10px_rgba(0,230,118,0.5)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Performance Chart Container */}
        <div className="pt-2 pb-1 w-full overflow-hidden">
          <svg viewBox="0 0 320 138" fill="none" className="w-full h-36 sm:h-40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="greenGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00e676" floodOpacity="0.6" />
              </filter>
              <filter id="redGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#ef4444" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Horizontal Gridlines */}
            <line x1="38" y1="36" x2="315" y2="36" stroke="#262626" strokeDasharray="3 3" />
            <line x1="38" y1="58" x2="315" y2="58" stroke="#262626" strokeDasharray="3 3" />
            <line x1="38" y1="80" x2="315" y2="80" stroke="#404040" strokeWidth="1" />
            <line x1="38" y1="104" x2="315" y2="104" stroke="#262626" strokeDasharray="3 3" />

            {/* Y-axis Labels on Left */}
            <text x="32" y="39" textAnchor="end" fill="#737373" fontSize="8.5" fontFamily="monospace">{yScaleLabels.top}</text>
            <text x="32" y="61" textAnchor="end" fill="#737373" fontSize="8.5" fontFamily="monospace">{yScaleLabels.mid}</text>
            <text x="32" y="83" textAnchor="end" fill="#a3a3a3" fontSize="8.5" fontWeight="bold" fontFamily="monospace">0</text>
            <text x="32" y="107" textAnchor="end" fill="#737373" fontSize="8.5" fontFamily="monospace">{yScaleLabels.bottom}</text>

            {/* 7 Weekday Columns */}
            {weeklyBarsData.map((b, i) => {
              const colCenter = 56 + i * 37.5;
              const barWidth = 16;
              const barX = colCenter - barWidth / 2;
              const isPos = b.pnl >= 0;
              const absVal = Math.abs(b.pnl);
              const baselineY = 80;

              // Normalized bar heights
              const barHeight = absVal === 0
                ? 2
                : isPos
                ? Math.min(42, Math.max(6, Math.round((absVal / maxWeeklyAbs) * 40)))
                : Math.min(24, Math.max(6, Math.round((absVal / maxWeeklyAbs) * 22)));

              const barY = isPos ? baselineY - barHeight : baselineY;
              // Amount is ALWAYS positioned strictly above the candle with no overlap
              const labelY = barY - 5;

              return (
                <g key={b.day}>
                  {/* Amount Label above candle */}
                  {b.pnl !== 0 && (
                    <text
                      x={colCenter}
                      y={labelY}
                      textAnchor="middle"
                      fill={isPos ? '#00e676' : '#ef4444'}
                      fontSize="8.5"
                      fontWeight="900"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {isPos ? `+${formatINRCompact(b.pnl)}` : formatINRCompact(b.pnl)}
                    </text>
                  )}

                  {/* Candle / Bar */}
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    rx="3"
                    fill={isPos ? '#00e676' : '#ef4444'}
                    filter={isPos ? 'url(#greenGlow)' : 'url(#redGlow)'}
                  />

                  {/* X-axis Day Label */}
                  <text
                    x={colCenter}
                    y="126"
                    textAnchor="middle"
                    fill="#a3a3a3"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {b.day}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 7. Disclaimer Line neatly above Bottom Navigation Bar */}
      <div className="pt-2 pb-8 text-center select-none px-2">
        <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium tracking-wide">
          ⚠️ Disclaimer: Futures &amp; Options trading involves substantial risk of loss. For journaling &amp; performance tracking only.
        </p>
      </div>

      {/* Selected Day Inspector Modal */}
      {selectedDateTrades && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0c0e10] border border-neutral-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 bg-black">
              <div>
                <h3 className="text-base font-bold text-white">
                  Trades on {formatIndianDate(selectedDateTrades.date)}
                </h3>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Day Net Profit:{' '}
                  <strong className={selectedDateTrades.stats.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}>
                    {formatINR(selectedDateTrades.stats.netPnL)}
                  </strong>
                  {' '}• {selectedDateTrades.stats.trades.length} trades
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateTrades(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 min-h-[44px] min-w-[44px] flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 sm:p-6 space-y-2.5 sm:space-y-3 overflow-y-auto text-xs flex-1 touch-scroll">
              {selectedDateTrades.stats.trades.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedDateTrades(null);
                    onViewTrade(t);
                  }}
                  className="p-3 sm:p-3.5 rounded-xl bg-black hover:bg-neutral-900 border border-neutral-800 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition active:scale-98"
                >
                  <div>
                    <div className="font-bold text-white text-sm">{t.symbol}</div>
                    <div className="text-neutral-400 text-xs mt-0.5">
                      {t.entryTime} → {t.exitTime} • {t.quantity} qty
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-black text-sm ${t.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {formatINR(t.netPnL)}
                    </div>
                    <div className="text-neutral-500 text-[10px]">
                      {t.charges ? `Charges ${formatINR(t.charges)}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
