import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  ArrowUpRight,
  Layers,
  Scale,
  Calendar,
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
import { formatINR, formatPercent } from '../utils/calculations';

export default function Dashboard({
  analytics,
  trades,
  settings,
  onOpenTradeModal,
  onViewTrade,
  onNavigateTab,
}) {
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
  } = analytics;

  // Calculate today's net P&L
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStats = dailyPnLMap[todayStr] || { netPnL: 0, trades: 0 };
  const dailyLossLimit = settings?.maxDailyLoss || 5000;
  const isDailyLimitBreached = todayStats.netPnL < -dailyLossLimit;
  const isDailyLimitWarning = todayStats.netPnL < -dailyLossLimit * 0.7 && !isDailyLimitBreached;

  // Monthly Chart data
  const monthlyData = Object.keys(monthlyPnLMap)
    .sort()
    .map((month) => ({
      month,
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
  const fnoPnL = (segmentStats['Options']?.netPnL || 0) + (segmentStats['Futures']?.netPnL || 0);
  const fnoTrades = (segmentStats['Options']?.trades || 0) + (segmentStats['Futures']?.trades || 0);
  const stockPnL = (segmentStats['Equity Intraday']?.netPnL || 0) + (segmentStats['Equity Delivery']?.netPnL || 0);
  const stockTrades = (segmentStats['Equity Intraday']?.trades || 0) + (segmentStats['Equity Delivery']?.trades || 0);

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
    <div className="space-y-6 pb-12">
      {/* Executive Branded Terminal Banner - Seamlessly Fitted for Fintech Environment */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d131a] via-[#090909] to-[#090909] border border-neutral-800 p-3.5 sm:p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-black border border-emerald-500/30 p-1 flex items-center justify-center shadow-[0_0_16px_rgba(0,230,118,0.25)] shrink-0">
            <img src="/logo-circle.png" alt="Delta Journal" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight">DELTA TRADING TERMINAL</span>
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
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition shadow-[0_0_12px_rgba(0,230,118,0.3)] active:scale-95"
          >
            + Log New Trade
          </button>
        </div>
      </div>

      {/* Daily Risk Limit Notification Banner */}
      {isDailyLimitBreached && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 text-rose-300">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <div className="font-black text-sm text-rose-200 uppercase tracking-wide">
                DAILY LOSS LIMIT BREACHED: {formatINR(todayStats.netPnL)}
              </div>
              <div className="text-xs text-rose-300/80">
                You have exceeded your max daily risk budget of {formatINR(dailyLossLimit)}. Stop trading for today to protect capital!
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

      {/* Top Core KPI Cards - Modern Fintech Pure Black Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net P&L Card */}
        <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-400">Net Realized P&L</span>
            <div className={`p-2 rounded-xl ${netPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
              {netPnL >= 0 ? <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" /> : <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl lg:text-4xl font-black ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
            {formatINR(netPnL)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs sm:text-sm text-neutral-400 pt-2 border-t border-neutral-800">
            <span>Gross: {formatINR(grossPnL)}</span>
            <span>Charges: <span className="text-amber-400 font-bold">{formatINR(totalCharges)}</span></span>
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-400">Win Rate</span>
            <div className="p-2 rounded-xl bg-neutral-800 text-white">
              <Target className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
            {winRate}%
          </div>
          <div className="mt-2 flex items-center justify-between text-xs sm:text-sm text-neutral-400 pt-2 border-t border-neutral-800">
            <span className="text-emerald-400 font-bold">{winningTrades} Wins</span>
            <span className="text-rose-500 font-bold">{losingTrades} Losses</span>
            <span>Total: {totalTrades}</span>
          </div>
        </div>

        {/* Profit Factor & Expectancy Card */}
        <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-400">Profit Factor</span>
            <div className="p-2 rounded-xl bg-neutral-800 text-neutral-300">
              <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
            {profitFactor}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs sm:text-sm text-neutral-400 pt-2 border-t border-neutral-800">
            <span>Expectancy: <strong className={expectancy >= 0 ? 'text-emerald-400' : 'text-rose-500'}>{formatINR(expectancy)}</strong></span>
            <span>Avg Win: {formatINR(avgWin)}</span>
          </div>
        </div>

        {/* Max Drawdown Card */}
        <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-400">Max Drawdown</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-rose-500">
            {formatINR(maxDrawdownAmount)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs sm:text-sm text-neutral-400 pt-2 border-t border-neutral-800">
            <span>Peak-to-Trough: -{maxDrawdownPercent}%</span>
            <span>Avg Loss: {formatINR(avgLoss)}</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs sm:text-sm text-neutral-400 font-medium">Largest Win</div>
          <div className="text-sm sm:text-base lg:text-lg font-black text-emerald-400 mt-0.5">{formatINR(largestWin)}</div>
        </div>
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs sm:text-sm text-neutral-400 font-medium">Largest Loss</div>
          <div className="text-sm sm:text-base lg:text-lg font-black text-rose-500 mt-0.5">{formatINR(largestLoss)}</div>
        </div>
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs sm:text-sm text-neutral-400 font-medium">Current Streak</div>
          <div className="text-sm sm:text-base lg:text-lg font-black text-white mt-0.5">
            {currentStreak.count > 0 ? (
              <span className={currentStreak.type === 'win' ? 'text-emerald-400' : 'text-rose-500'}>
                {currentStreak.count} {currentStreak.type === 'win' ? 'Wins' : 'Losses'}
              </span>
            ) : (
              'None'
            )}
          </div>
        </div>
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs sm:text-sm text-neutral-400 font-medium">Max Win Streak</div>
          <div className="text-sm sm:text-base lg:text-lg font-black text-emerald-400 mt-0.5">{maxConsecutiveWins} trades</div>
        </div>
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs sm:text-sm text-neutral-400 font-medium">Max Loss Streak</div>
          <div className="text-sm sm:text-base lg:text-lg font-black text-rose-500 mt-0.5">{maxConsecutiveLosses} trades</div>
        </div>
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800 text-center">
          <div className="text-xs sm:text-sm text-neutral-400 font-medium">Win/Loss Ratio</div>
          <div className="text-sm sm:text-base lg:text-lg font-black text-white mt-0.5">
            {avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve (2 cols on large screen) */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center space-x-2">
                <span>Journal Equity Curve</span>
                <span className="text-xs font-normal text-neutral-400 hidden sm:inline">(Account Growth)</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">Cumulative Net Profit over sequence of executed trades</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] sm:text-xs text-neutral-400">Current Capital</span>
              <div className="text-xs sm:text-sm font-black text-emerald-400">
                {formatINR(equityCurve[equityCurve.length - 1]?.equity || settings.initialCapital)}
              </div>
            </div>
          </div>

          <div className="h-56 sm:h-64 lg:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="tradeIndex" stroke="#525252" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#525252"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-black p-3 rounded-xl border border-neutral-800 shadow-2xl text-xs">
                          <div className="font-bold text-white">Trade #{data.tradeIndex}: {data.symbol || 'Start'}</div>
                          <div className="text-neutral-400">Date: {data.date}</div>
                          <div className="mt-1 pt-1 border-t border-neutral-800">
                            <div>Equity: <strong className="text-white">{formatINR(data.equity)}</strong></div>
                            <div>Cumulative: <strong className={data.cumulativePnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}>{formatINR(data.cumulativePnL)}</strong></div>
                            {data.netPnL !== undefined && (
                              <div>Trade P&L: <strong className={data.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}>{formatINR(data.netPnL)}</strong></div>
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
                  dataKey="equity"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#equityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Donut & Stocks vs F&O Comparison */}
        <div className="space-y-6">
          {/* Win/Loss Outcome Donut */}
          <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-2">Trade Outcomes</h3>
            <div className="h-44 w-full flex items-center justify-center">
              {totalTrades > 0 ? (
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

          {/* Stocks vs F&O Comparison Card */}
          <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span>Segment Breakdown</span>
              <Layers className="w-4 h-4 text-neutral-400" />
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-black border border-neutral-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-neutral-200">F&O (Options & Futures)</span>
                  <span className="text-neutral-500">{fnoTrades} trades</span>
                </div>
                <div className={`text-base font-black ${fnoPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {formatINR(fnoPnL)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black border border-neutral-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-neutral-200">Equities (Cash Intraday & Delivery)</span>
                  <span className="text-neutral-500">{stockTrades} trades</span>
                </div>
                <div className={`text-base font-black ${stockPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {formatINR(stockPnL)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Performance Bar Chart */}
      {monthlyData.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Monthly Net Profit</h3>
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
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="month" stroke="#525252" tick={{ fontSize: 11 }} />
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
                          <div className="font-bold text-white">{item.month}</div>
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
        </div>
      )}

      {/* Recent Trades Table */}
      <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Recent Activity</h3>
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

        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="text-[11px] uppercase tracking-wider text-neutral-400 bg-[#111111] border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Qty</th>
                <th className="py-2.5 px-3">Entry / Exit</th>
                <th className="py-2.5 px-3">Strategy</th>
                <th className="py-2.5 px-3 text-right">Net Profit</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {recentTrades.map((t) => {
                const isProfit = Number(t.netPnL) >= 0;
                const tradeType = getTradeType(t);
                return (
                  <tr
                    key={t.id}
                    onClick={() => onViewTrade(t)}
                    className="hover:bg-neutral-900/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 text-neutral-300 whitespace-nowrap">
                      <div>{t.date}</div>
                      <div className="text-[10px] text-neutral-500">{t.entryTime} - {t.exitTime}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                      {t.symbol}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        tradeType === 'Call'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {tradeType.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-200 whitespace-nowrap font-bold">
                      {t.quantity} <span className="text-[10px] text-neutral-500">({t.lots}L)</span>
                    </td>
                    <td className="py-3 px-3 text-neutral-300 whitespace-nowrap">
                      ₹{t.entryPrice} → ₹{t.exitPrice}
                    </td>
                    <td className="py-3 px-3 text-neutral-300 whitespace-nowrap">
                      <span className="text-neutral-300">{t.strategy || 'Discretionary'}</span>
                    </td>
                    <td className={`py-3 px-3 font-black text-right whitespace-nowrap ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {formatINR(t.netPnL)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTradeModal(t);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
