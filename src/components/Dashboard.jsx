import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Scale,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatINR, formatPercent, formatIndianDate } from '../utils/calculations';

export default function Dashboard({
  analytics,
  trades,
  settings,
  onOpenTradeModal,
  onViewTrade,
  onNavigateTab,
}) {
  const [equityMode, setEquityMode] = useState('net'); // 'net' | 'gross'
  const {
    netPnL,
    grossPnL,
    totalCharges,
    grossProfit,
    grossLoss,
    winRate,
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    profitFactor,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    expectancy,
    maxDrawdownAmount,
    maxDrawdownPercent,
    currentStreak,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    equityCurve,
    segmentStats,
    monthlyPnLMap,
    dailyPnLMap,
    weekdayStats,
    weekdayCounts,
    chargesInsight,
  } = analytics;

  // Account Equity = Initial Capital + Realized Net P&L
  const initialCap = Number(settings?.initialCapital) || 0;
  const currentEquity = initialCap + (netPnL || 0);

  // Compute dynamic domain min/max with padding to prevent any chart clipping
  const yValues = (equityCurve || []).map((pt) =>
    equityMode === 'gross' ? (pt.grossEquity ?? pt.equity ?? 0) : (pt.equity ?? 0)
  );
  const minVal = yValues.length > 0 ? Math.min(...yValues, 0) : 0;
  const maxVal = yValues.length > 0 ? Math.max(...yValues, 0) : 1000;
  const range = Math.max(Math.abs(maxVal - minVal), 2000);
  const padding = range * 0.15;
  const yMin = Math.floor((minVal - padding) / 1000) * 1000;
  const yMax = Math.ceil((maxVal + padding) / 1000) * 1000;

  // Calculate today's net P&L
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStats = dailyPnLMap[todayStr] || { netPnL: 0, trades: 0 };
  const dailyLossLimit = settings?.maxDailyLoss || 5000;
  const isDailyLimitBreached = todayStats.netPnL < -dailyLossLimit;
  const isDailyLimitWarning = todayStats.netPnL < -dailyLossLimit * 0.7 && !isDailyLimitBreached;

  // Monthly Chart data with abbreviated months (never skip months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatMonthAbbr = (mKey) => {
    if (!mKey || mKey === 'Unknown') return mKey;
    const parts = mKey.split('-');
    if (parts.length === 2) {
      const idx = parseInt(parts[1], 10) - 1;
      return `${monthNames[idx] || parts[1]} '${parts[0].slice(2)}`;
    }
    return mKey;
  };

  const monthlyData = Object.keys(monthlyPnLMap || {})
    .sort()
    .map((month) => ({
      month,
      monthLabel: formatMonthAbbr(month),
      pnl: monthlyPnLMap[month].netPnL,
      trades: monthlyPnLMap[month].trades,
    }));

  // Outcome Donut Data
  const outcomeData = [
    { name: 'Wins', value: winningTrades, color: '#10b981' },
    { name: 'Losses', value: losingTrades, color: '#ef4444' },
    { name: 'Breakeven', value: breakevenTrades, color: '#525252' },
  ].filter((d) => d.value > 0);

  // Segment comparison: F&O vs Stocks
  const fnoPnL = (segmentStats?.['Options']?.netPnL || 0) + (segmentStats?.['Futures']?.netPnL || 0);
  const fnoTrades = (segmentStats?.['Options']?.trades || 0) + (segmentStats?.['Futures']?.trades || 0);
  const stockPnL = (segmentStats?.['Equity Intraday']?.netPnL || 0) + (segmentStats?.['Equity Delivery']?.netPnL || 0);
  const stockTrades = (segmentStats?.['Equity Intraday']?.trades || 0) + (segmentStats?.['Equity Delivery']?.trades || 0);

  // Helper for Call / Put
  const getTradeType = (t) => {
    if (t.tradeType) return t.tradeType;
    if (t.optionType === 'CE' || t.symbol?.includes('CE') || t.direction === 'Long') return 'Call';
    if (t.optionType === 'PE' || t.symbol?.includes('PE')) return 'Put';
    return 'Call';
  };

  // Recent 5 trades
  const recentTrades = [...trades]
    .filter((t) => t.status !== 'Open')
    .sort((a, b) => new Date(`${b.date}T${b.entryTime || '09:15'}`) - new Date(`${a.date}T${a.entryTime || '09:15'}`))
    .slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6 pb-32">
      {/* Executive Branded Terminal Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d131a] via-[#090909] to-[#090909] border border-neutral-800 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-black border border-emerald-500/30 p-1 flex items-center justify-center shadow-[0_0_12px_rgba(0,230,118,0.25)] shrink-0">
            <img src="/logo-circle.png" alt="Delta Journal" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight">DELTA JOURNAL</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">LIVE</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-0.5 font-medium">
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Track • Analyze • Grow</span>
              <span className="text-neutral-700 hidden sm:inline">•</span>
              <span className="hidden sm:inline">NSE / BSE Derivatives & Equity Analytics</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => onNavigateTab('trades')}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition shadow-[0_0_12px_rgba(0,230,118,0.3)] active:scale-95"
          >
            + Log New Trade
          </button>
        </div>
      </div>

      {/* Negative Account Equity Warning Banner */}
      {currentEquity < 0 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-950/40 border border-rose-500/60 text-rose-300 shadow-xl">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-black text-sm text-rose-200">
                Account equity below zero
              </div>
              <div className="text-xs text-rose-300/90 mt-0.5">
                Current account equity is <strong>{formatINR(currentEquity)}</strong> on starting capital of {formatINR(initialCap)}. Avoid taking fresh positions until capital is replenished.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Risk Limit Notification Banner */}
      {isDailyLimitBreached && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 text-rose-300">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-sm text-rose-200">
                Daily Max Loss Limit Breached!
              </div>
              <div className="text-xs text-rose-300/80">
                Today's realized net loss is {formatINR(todayStats.netPnL)}. Your risk limit is {formatINR(dailyLossLimit)}. System strongly advises stopping all trading.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('trades')}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow"
          >
            Review Journal
          </button>
        </div>
      )}

      {isDailyLimitWarning && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 text-amber-300">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-sm text-amber-200">
                Daily Risk Warning: Approaching Daily Max Loss
              </div>
              <div className="text-xs text-amber-300/80">
                Today's loss is {formatINR(todayStats.netPnL)}. Your max daily limit is {formatINR(dailyLossLimit)}. Exercise discipline!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Core KPI Cards - Tightened Spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Cumulative Net Realized P&L Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-400">Cumulative Net P&L</span>
            <div className={`p-2 rounded-xl ${netPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
              {netPnL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
            {formatINR(netPnL)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800">
            <span>Gross: {formatINR(grossPnL)}</span>
            <span>Charges: <span className="text-amber-400 font-bold">{formatINR(totalCharges)}</span></span>
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-400">Win Rate</span>
            <div className="p-2 rounded-xl bg-neutral-800 text-white">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {winRate}%
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800">
            <span className="text-emerald-400 font-bold">{winningTrades} Wins</span>
            <span className="text-rose-500 font-bold">{losingTrades} Losses</span>
            <span>Total: {totalTrades}</span>
          </div>
        </div>

        {/* Profit Factor & Expectancy Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-400">Profit Factor</span>
            <div className="p-2 rounded-xl bg-neutral-800 text-neutral-300">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {profitFactor}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800">
            <span>Expectancy: <strong className={expectancy >= 0 ? 'text-emerald-400' : 'text-rose-500'}>{formatINR(expectancy)}</strong></span>
            <span>Avg Win: {formatINR(avgWin)}</span>
          </div>
        </div>

        {/* Max Drawdown Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-400">Max Drawdown</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-500">
            {formatINR(maxDrawdownAmount)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800">
            <span>
              Peak-to-Trough: {maxDrawdownPercent !== null && maxDrawdownPercent !== undefined ? `-${maxDrawdownPercent}%` : 'N/A'}
            </span>
            <span>Avg Loss: {formatINR(avgLoss)}</span>
          </div>
        </div>
      </div>

      {/* Charges vs Gross Edge Insight Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">Charges vs Gross Profit Edge</h3>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            F&O COST IMPACT
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-black border border-neutral-800">
            <span className="text-neutral-400 text-[11px] uppercase font-semibold block">Charges as % of Gross</span>
            <div className="text-lg font-black text-amber-400 mt-0.5">
              {chargesInsight?.chargesToGrossPercent !== null && chargesInsight?.chargesToGrossPercent !== undefined
                ? `${chargesInsight.chargesToGrossPercent}%`
                : 'N/A'}
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              {grossProfit > 0 ? `${formatINR(totalCharges)} paid out of ${formatINR(grossProfit)} gross` : 'Gross profit is zero or negative'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-black border border-neutral-800">
            <span className="text-neutral-400 text-[11px] uppercase font-semibold block">Avg Charges / Trade</span>
            <div className="text-lg font-black text-white mt-0.5">
              {formatINR(chargesInsight?.chargesPerTrade || 0)}
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              Round-trip statutory taxes & broker fees
            </p>
          </div>
          <div className="p-3 rounded-xl bg-black border border-neutral-800">
            <span className="text-neutral-400 text-[11px] uppercase font-semibold block">Break-even Points Needed</span>
            <div className="text-lg font-black text-emerald-400 mt-0.5">
              {chargesInsight?.breakevenPointsPerTrade || 0} pts
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              Points needed per trade just to cover levies
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <div className="p-3 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs text-neutral-400 font-medium">Largest Win</div>
          <div className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">{formatINR(largestWin)}</div>
        </div>
        <div className="p-3 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs text-neutral-400 font-medium">Largest Loss</div>
          <div className="text-sm sm:text-base font-black text-rose-500 mt-0.5">{formatINR(largestLoss)}</div>
        </div>
        <div className="p-3 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs text-neutral-400 font-medium">Current Streak</div>
          <div className="text-sm sm:text-base font-black text-white mt-0.5">
            {currentStreak?.count > 0 ? (
              <span className={currentStreak.type === 'win' ? 'text-emerald-400' : 'text-rose-500'}>
                {currentStreak.count} {currentStreak.type === 'win' ? 'Wins' : 'Losses'}
              </span>
            ) : (
              'None'
            )}
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs text-neutral-400 font-medium">Max Win Streak</div>
          <div className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">{maxConsecutiveWins} trades</div>
        </div>
        <div className="p-3 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs text-neutral-400 font-medium">Max Loss Streak</div>
          <div className="text-sm sm:text-base font-black text-rose-500 mt-0.5">{maxConsecutiveLosses} trades</div>
        </div>
        <div className="p-3 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs text-neutral-400 font-medium">Win/Loss Ratio</div>
          <div className="text-sm sm:text-base font-black text-white mt-0.5">
            {avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Equity Curve (2 cols on large screen) */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-black text-white">
                  Journal Equity Curve
                </h2>
                {/* Net vs Gross Toggle */}
                <div className="flex items-center space-x-1 bg-black p-0.5 rounded-lg border border-neutral-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setEquityMode('net')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                      equityMode === 'net' ? 'bg-emerald-500 text-black shadow' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Net
                  </button>
                  <button
                    type="button"
                    onClick={() => setEquityMode('gross')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                      equityMode === 'gross' ? 'bg-teal-500 text-black shadow' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Gross
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {equityMode === 'net' ? 'Account Equity after all charges & statutory taxes' : 'Gross Trading Equity before taxes'}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[11px] text-neutral-400 uppercase font-semibold">Account Equity</span>
              <div className={`text-xs sm:text-sm font-black ${currentEquity >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {formatINR(currentEquity)}
              </div>
            </div>
          </div>

          <div className="h-56 sm:h-64 lg:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={equityMode === 'gross' ? '#14b8a6' : '#10b981'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={equityMode === 'gross' ? '#14b8a6' : '#10b981'} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="tradeIndex" stroke="#525252" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#525252"
                  tick={{ fontSize: 11 }}
                  domain={[yMin, yMax]}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  position={{ y: 0 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-black/95 p-3 rounded-xl border border-neutral-700 shadow-2xl text-xs space-y-1">
                          <div className="font-bold text-white">Trade #{data.tradeIndex}: {data.symbol || 'Start'}</div>
                          <div className="text-neutral-400">Date: {formatIndianDate(data.date)}</div>
                          <div className="pt-1 border-t border-neutral-800 space-y-0.5">
                            <div>Account Equity: <strong className="text-white">{formatINR(data.equity)}</strong></div>
                            <div>Cumulative Net P&L: <strong className={data.cumulativePnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}>{formatINR(data.cumulativePnL)}</strong></div>
                            <div>Cumulative Gross P&L: <strong className={(data.cumulativeGrossPnL || 0) >= 0 ? 'text-teal-400' : 'text-rose-400'}>{formatINR(data.cumulativeGrossPnL || 0)}</strong></div>
                            {data.netPnL !== undefined && (
                              <div>Trade Net P&L: <strong className={data.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}>{formatINR(data.netPnL)}</strong></div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={equityMode === 'gross' ? 'grossEquity' : 'equity'}
                  stroke={equityMode === 'gross' ? '#14b8a6' : '#10b981'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#equityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Donut & Stocks vs F&O Comparison */}
        <div className="space-y-4 sm:space-y-6">
          {/* Win/Loss Outcome Donut with Centered Win Rate % */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-1">Trade Outcomes</h3>
            <div className="h-44 w-full flex items-center justify-center relative">
              {totalTrades > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={68}
                        paddingAngle={3}
                      >
                        {outcomeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0];
                            return (
                              <div className="bg-black px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-white">
                                {item.name}: <strong>{item.value}</strong> ({((item.value / totalTrades) * 100).toFixed(1)}%)
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Metric */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-white">{winRate}%</span>
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold">Win Rate</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-neutral-500">No trades recorded yet</div>
              )}
            </div>
            <div className="flex justify-around text-xs text-neutral-300 pt-2 border-t border-neutral-800">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Win ({winningTrades})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Loss ({losingTrades})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
                <span>BE ({breakevenTrades})</span>
              </div>
            </div>
          </div>

          {/* Weekday Breakdown with Trade Counts */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-2.5">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Weekday Edge Distribution</span>
              <span className="text-[10px] font-semibold text-neutral-400">P&L & Counts</span>
            </h3>
            <div className="space-y-1.5">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
                const dayPnl = weekdayStats?.[day] || 0;
                const count = weekdayCounts?.[day] || 0;
                return (
                  <div key={day} className="flex items-center justify-between p-2 rounded-xl bg-black border border-neutral-850 text-xs">
                    <span className="font-semibold text-neutral-300">{day}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-neutral-500 text-[10px]">{count} trades</span>
                      <span className={`font-black ${dayPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {formatINR(dayPnl)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Performance Bar Chart */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Monthly Net Profit</h3>
            <p className="text-xs text-neutral-400">Monthly profit & loss distribution across Indian market sessions</p>
          </div>
          <button
            onClick={() => onNavigateTab('calendar')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
          >
            <span>View Full Calendar</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {monthlyData.length > 0 ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="monthLabel" stroke="#525252" interval={0} tick={{ fontSize: 10 }} />
                <YAxis
                  stroke="#525252"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-black p-3 rounded-xl border border-neutral-800 text-xs">
                          <div className="font-bold text-white">{item.monthLabel} ({item.month})</div>
                          <div className="text-neutral-400">Trades: {item.trades}</div>
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
                  {monthlyData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-neutral-500 bg-black rounded-xl border border-neutral-850">
            No trades logged yet. Monthly performance will render here once you record your first trades.
          </div>
        )}
      </div>

      {/* Recent Trades Table */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Recent Activity</h3>
            <p className="text-xs text-neutral-400">Latest executed setups and trades</p>
          </div>
          <button
            onClick={() => onNavigateTab('trades')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
          >
            <span>View All Trades ({totalTrades})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTrades.length > 0 ? (
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="text-[11px] uppercase tracking-wider text-neutral-400 bg-[#111111] border-b border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Instrument</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Gross</th>
                  <th className="py-2.5 px-3">Charges</th>
                  <th className="py-2.5 px-3 text-right">Net Realized</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {recentTrades.map((t) => {
                  const isProfit = Number(t.netPnL) >= 0;
                  const tType = getTradeType(t);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onViewTrade(t)}
                      className="hover:bg-neutral-900/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 text-neutral-300">
                        {formatIndianDate(t.date)} <span className="text-neutral-500 text-[10px]">{t.entryTime}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{t.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          tType === 'Call' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {tType.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">{t.quantity}</td>
                      <td className={`py-2.5 px-3 font-semibold ${t.grossPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {formatINR(t.grossPnL)}
                      </td>
                      <td className="py-2.5 px-3 text-amber-400">{formatINR(t.charges)}</td>
                      <td className={`py-2.5 px-3 text-right font-black ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {formatINR(t.netPnL)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-neutral-500 bg-black rounded-xl border border-neutral-850">
            No trades logged yet. Use the Trade Journal to record your first execution.
          </div>
        )}
      </div>
    </div>
  );
}