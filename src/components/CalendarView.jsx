import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { formatINR, formatINRCompact, formatIndianDate } from '../utils/calculations';
import { DEFAULT_INDEX_EXPIRY_DAYS } from '../utils/constants';

export default function CalendarView({ trades, onViewTrade, onOpenTradeModal, settings }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateTrades, setSelectedDateTrades] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const expiryDaysConfig = settings?.expiryDays || DEFAULT_INDEX_EXPIRY_DAYS;

  // Aggregate trades by date string YYYY-MM-DD
  const dailyData = useMemo(() => {
    const map = {};
    trades.forEach((trade) => {
      if (!trade.date) return;
      if (!map[trade.date]) {
        map[trade.date] = {
          netPnL: 0,
          grossPnL: 0,
          charges: 0,
          trades: [],
        };
      }
      map[trade.date].netPnL += Number(trade.netPnL) || 0;
      map[trade.date].grossPnL += Number(trade.grossPnL) || 0;
      map[trade.date].charges += Number(trade.charges) || 0;
      map[trade.date].trades.push(trade);
    });
    return map;
  }, [trades]);

  // Calendar cells generation for current month
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    // Padding before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ type: 'empty', id: `empty-${i}` });
    }

    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayStats = dailyData[dateStr] || null;
      cells.push({
        type: 'day',
        dayNumber: day,
        dateStr,
        stats: dayStats,
      });
    }

    return cells;
  }, [year, month, dailyData]);

  // Monthly summary stats
  const monthSummary = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let totalPnL = 0;
    let winningDays = 0;
    let losingDays = 0;
    let totalMonthTrades = 0;

    Object.keys(dailyData).forEach((dateStr) => {
      if (dateStr.startsWith(monthPrefix)) {
        const pnl = dailyData[dateStr].netPnL;
        totalPnL += pnl;
        totalMonthTrades += dailyData[dateStr].trades.length;
        if (pnl > 0) winningDays++;
        else if (pnl < 0) losingDays++;
      }
    });

    const activeDays = winningDays + losingDays;
    const winDayRate = activeDays > 0 ? ((winningDays / activeDays) * 100).toFixed(1) : 0;

    return {
      totalPnL,
      winningDays,
      losingDays,
      totalMonthTrades,
      winDayRate,
    };
  }, [year, month, dailyData]);

  // Weekday distribution
  const weekdayData = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const pnlMap = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
    const tradeCount = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };

    trades.forEach((t) => {
      if (!t.date) return;
      const dIndex = new Date(t.date).getDay();
      const dName = days[dIndex];
      if (pnlMap[dName] !== undefined) {
        pnlMap[dName] += Number(t.netPnL) || 0;
        tradeCount[dName] += 1;
      }
    });

    const shortLabels = {
      Monday: 'Mon',
      Tuesday: 'Tue',
      Wednesday: 'Wed',
      Thursday: 'Thu',
      Friday: 'Fri',
    };

    const initialLabels = {
      Monday: 'M',
      Tuesday: 'T',
      Wednesday: 'W',
      Thursday: 'T',
      Friday: 'F',
    };

    return Object.keys(pnlMap).map((day) => ({
      day,
      shortDay: shortLabels[day],
      initial: initialLabels[day],
      pnl: pnlMap[day],
      trades: tradeCount[day],
    }));
  }, [trades]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Helper to test if a day of the week matches any configured index expiry
  const getExpiryDayIndices = (dayName) => {
    const matched = [];
    Object.entries(expiryDaysConfig).forEach(([indexName, expDay]) => {
      if (expDay && expDay.toLowerCase() === dayName.toLowerCase()) {
        matched.push(indexName);
      }
    });
    return matched;
  };

  const tuesdayExpiries = getExpiryDayIndices('Tuesday');
  const wednesdayExpiries = getExpiryDayIndices('Wednesday');
  const thursdayExpiries = getExpiryDayIndices('Thursday');

  return (
    <div className="space-y-3 sm:space-y-4 pb-32 w-full min-w-0">
      {/* Calendar Unified Fintech Box */}
      <div className="rounded-2xl bg-[#090909] border border-neutral-800 shadow-2xl w-full min-w-0 overflow-hidden">
        {/* Top Header: Month Title & Fast Steppers */}
        <div className="bg-black/40 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-neutral-800 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-emerald-400 shrink-0">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h2 className="text-sm sm:text-lg font-black text-white truncate">
                  {monthNames[month]} {year}
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                  F&O Session
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden xs:block">
                Monthly P&L heat map & trade logs
              </p>
            </div>
          </div>

          {/* Month Steppers */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={prevMonth}
              className="p-1 sm:p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition active:scale-95 min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold border border-neutral-800 transition active:scale-95 min-h-[38px] flex items-center justify-center"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1 sm:p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition active:scale-95 min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Body: Summary Cards, Day Headers & Calendar Grid */}
        <div className="p-2.5 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
          {/* Monthly Key Metrics Banner - Sits fully visible below header */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full min-w-0">
            <div className="p-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-black border border-neutral-800 text-center sm:text-left min-w-0">
              <span className="text-neutral-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wider block truncate">
                <span className="sm:hidden">Net:</span>
                <span className="hidden sm:inline">Month Net:</span>
              </span>
              <div className={`text-xs sm:text-base lg:text-xl font-black truncate mt-0.5 ${monthSummary.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                <span className="hidden sm:inline">{formatINR(monthSummary.totalPnL)}</span>
                <span className="sm:hidden">{formatINRCompact(monthSummary.totalPnL)}</span>
              </div>
            </div>
            <div className="p-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-black border border-neutral-800 text-center sm:text-left min-w-0">
              <span className="text-neutral-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wider block truncate">
                <span className="sm:hidden">Win:</span>
                <span className="hidden sm:inline">Win Rate:</span>
              </span>
              <div className="text-xs sm:text-base lg:text-xl font-black text-white truncate mt-0.5">
                {monthSummary.winDayRate}%
              </div>
            </div>
            <div className="p-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-black border border-neutral-800 text-center sm:text-left min-w-0">
              <span className="text-neutral-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wider block truncate">
                <span className="sm:hidden">Trades:</span>
                <span className="hidden sm:inline">Total Trades:</span>
              </span>
              <div className="text-xs sm:text-base lg:text-xl font-black text-cyan-400 truncate mt-0.5">
                {monthSummary.totalMonthTrades}
              </div>
            </div>
          </div>

          {/* Day Name Headers - 7 Columns with configurable Expiry Markers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 select-none w-full min-w-0 pt-1">
            <div className="text-neutral-600"><span className="hidden sm:inline">Sun</span><span className="sm:hidden">S</span></div>
            <div><span className="hidden sm:inline">Mon</span><span className="sm:hidden">M</span></div>
            <div className={tuesdayExpiries.length > 0 ? 'text-emerald-400 font-black' : ''}>
              <span className="hidden sm:inline">Tue {tuesdayExpiries.length > 0 ? `(${tuesdayExpiries.join('/')} Exp)` : ''}</span>
              <span className="sm:hidden">T{tuesdayExpiries.length > 0 ? '*' : ''}</span>
            </div>
            <div className={wednesdayExpiries.length > 0 ? 'text-emerald-400 font-black' : ''}>
              <span className="hidden sm:inline">Wed {wednesdayExpiries.length > 0 ? `(${wednesdayExpiries.join('/')} Exp)` : ''}</span>
              <span className="sm:hidden">W{wednesdayExpiries.length > 0 ? '*' : ''}</span>
            </div>
            <div className={thursdayExpiries.length > 0 ? 'text-emerald-400 font-black' : ''}>
              <span className="hidden sm:inline">Thu {thursdayExpiries.length > 0 ? `(${thursdayExpiries.join('/')} Exp)` : ''}</span>
              <span className="sm:hidden">T{thursdayExpiries.length > 0 ? '*' : ''}</span>
            </div>
            <div><span className="hidden sm:inline">Fri</span><span className="sm:hidden">F</span></div>
            <div className="text-neutral-600"><span className="hidden sm:inline">Sat</span><span className="sm:hidden">S</span></div>
          </div>

          {/* Days Cells - Small, Simple, Fits Box Area */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 w-full min-w-0">
            {calendarCells.map((cell) => {
              if (cell.type === 'empty') {
                return (
                  <div
                    key={cell.id}
                    className="min-w-0 h-12 xs:h-14 sm:h-20 md:h-24 lg:h-28 rounded-lg sm:rounded-xl bg-black/40 border border-neutral-900/50"
                  />
                );
              }

              const { dayNumber, dateStr, stats } = cell;
              const hasTrades = stats && stats.trades.length > 0;
              const isProfit = hasTrades && stats.netPnL > 0;
              const isLoss = hasTrades && stats.netPnL < 0;

              const isToday = dateStr === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    if (hasTrades) {
                      setSelectedDateTrades({ date: dateStr, stats });
                    }
                  }}
                  className={`min-w-0 h-12 xs:h-14 sm:h-20 md:h-24 lg:h-28 rounded-lg sm:rounded-xl p-1 sm:p-2 flex flex-col justify-between transition-all duration-150 border overflow-hidden select-none ${
                    hasTrades
                      ? isProfit
                        ? 'bg-emerald-950/25 border-emerald-500/50 hover:border-emerald-400 cursor-pointer shadow-sm active:scale-95'
                        : isLoss
                        ? 'bg-rose-950/25 border-rose-500/50 hover:border-rose-400 cursor-pointer shadow-sm active:scale-95'
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 cursor-pointer active:scale-95'
                      : 'bg-black/60 border-neutral-850'
                  } ${isToday ? 'ring-1 sm:ring-2 ring-emerald-400' : ''}`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between w-full min-w-0 leading-none">
                    <span className={`text-[10px] sm:text-xs font-bold leading-none ${
                      isToday
                        ? 'text-emerald-400 font-black'
                        : hasTrades
                        ? 'text-white'
                        : 'text-neutral-500'
                    }`}>
                      {dayNumber}
                    </span>
                    {hasTrades && (
                      <>
                        {/* Mobile count */}
                        <span className="sm:hidden text-[8px] font-bold text-neutral-400">
                          {stats.trades.length}t
                        </span>
                        {/* Tablet / Desktop badge */}
                        <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                          {stats.trades.length} {stats.trades.length === 1 ? 'trade' : 'trades'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Day P&L - Clean, compact & bold */}
                  {hasTrades ? (
                    <div className="text-center my-auto sm:my-0 w-full min-w-0 overflow-hidden leading-none">
                      <div className={`font-black truncate ${isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-500' : 'text-neutral-300'}`}>
                        <span className="hidden sm:inline text-xs sm:text-sm md:text-base">{formatINR(stats.netPnL)}</span>
                        <span className="sm:hidden text-[9px] xs:text-[10px] tracking-tight leading-none font-black block truncate">
                          {formatINRCompact(stats.netPnL)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:block text-center text-[10px] text-neutral-800 my-auto">-</div>
                  )}

                  {/* Charges indicator on tablet/desktop */}
                  {hasTrades && (
                    <div className="hidden sm:block text-[10px] text-neutral-500 text-right truncate">
                      ₹{stats.charges.toFixed(0)} chgs
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Micro-Legend inside the Box */}
          <div className="pt-2 border-t border-neutral-900 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs text-neutral-400 select-none">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                <span className="text-neutral-300">Profit</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                <span className="text-neutral-300">Loss</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="text-emerald-400 font-bold">*</span>
                <span className="text-neutral-300">Expiry (Configurable in Settings)</span>
              </span>
            </div>
            <span className="text-neutral-400 text-[10px]">Tap active day for trades</span>
          </div>
        </div>
      </div>

      {/* Weekday Performance Analysis Bar Chart (Tightened Height & Reduced Empty Area) */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl overflow-hidden w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white">Weekday Edge Distribution</h3>
            <p className="text-[10px] sm:text-xs text-neutral-400">Total Net Profit across trading days of the week</p>
          </div>
          <span className="text-xs text-emerald-400 font-bold hidden sm:inline">Expiry Analysis</span>
        </div>

        <div className="h-32 sm:h-44 w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis
                dataKey="shortDay"
                stroke="#525252"
                tick={{ fontSize: 10 }}
                tickFormatter={(v, i) => (typeof window !== 'undefined' && window.innerWidth < 450 ? weekdayData[i]?.initial || v : v)}
              />
              <YAxis
                stroke="#525252"
                tick={{ fontSize: 9 }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-black p-2.5 rounded-xl border border-neutral-800 text-xs shadow-xl">
                        <div className="font-bold text-white">{item.day}</div>
                        <div className="text-neutral-400">Executed Trades: {item.trades}</div>
                        <div className="mt-1">
                          Net Profit: <strong className={item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}>{formatINR(item.pnl)}</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {weekdayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#00e676' : '#ff3b57'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Selected Day Inspector Modal */}
      {selectedDateTrades && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#090909] border border-neutral-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
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
                onClick={() => setSelectedDateTrades(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
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
