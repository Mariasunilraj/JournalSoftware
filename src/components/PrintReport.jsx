import React from 'react';
import { Printer, X, TrendingUp, TrendingDown } from 'lucide-react';
import { formatINR, formatPercent } from '../utils/calculations';

export default function PrintReport({ isOpen, onClose, analytics, trades, settings }) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const {
    netPnL,
    grossPnL,
    totalCharges,
    winRate,
    profitFactor,
    totalTrades,
    winningTrades,
    losingTrades,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    expectancy,
    maxDrawdownAmount,
    maxDrawdownPercent,
    segmentStats,
    strategyStats,
  } = analytics;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-sm flex justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-6 py-3 bg-slate-900 text-slate-100 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold">Printable Performance Audit Statement</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-800 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center space-x-3.5">
              <img
                src="/logo-light.png"
                alt="Delta Journal"
                className="w-12 h-12 rounded-xl object-contain border border-slate-200 shrink-0"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                  DELTA JOURNAL • TRADING PERFORMANCE STATEMENT
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Indian Stock Market & Futures & Options (F&O) Execution Audit
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-600 shrink-0">
              <div>Statement Date: <strong>{new Date().toLocaleDateString('en-IN')}</strong></div>
              <div>Account Starting Capital: <strong>{formatINR(settings.initialCapital)}</strong></div>
            </div>
          </div>

          {/* Core Performance Overview */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-slate-100 border border-slate-300">
            <div>
              <span className="text-slate-600 text-[10px] uppercase font-bold">Total Net Realized P&L</span>
              <div className={`text-xl font-extrabold ${netPnL >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatINR(netPnL)}
              </div>
              <div className="text-[10px] text-slate-500">Gross: {formatINR(grossPnL)}</div>
            </div>

            <div>
              <span className="text-slate-600 text-[10px] uppercase font-bold">Win Rate & Trades</span>
              <div className="text-xl font-extrabold text-slate-900">
                {winRate}%
              </div>
              <div className="text-[10px] text-slate-600">
                {winningTrades}W / {losingTrades}L ({totalTrades} Total)
              </div>
            </div>

            <div>
              <span className="text-slate-600 text-[10px] uppercase font-bold">Profit Factor & Edge</span>
              <div className="text-xl font-extrabold text-slate-900">
                {profitFactor}
              </div>
              <div className="text-[10px] text-slate-600">Expectancy: {formatINR(expectancy)}</div>
            </div>

            <div>
              <span className="text-slate-600 text-[10px] uppercase font-bold">Indian Charges & Tax</span>
              <div className="text-xl font-extrabold text-amber-700">
                {formatINR(totalCharges)}
              </div>
              <div className="text-[10px] text-slate-600">Max DD: -{formatINR(maxDrawdownAmount)} ({maxDrawdownPercent}%)</div>
            </div>
          </div>

          {/* Segment Summary */}
          <div>
            <h3 className="text-sm font-bold text-slate-950 uppercase border-b border-slate-300 pb-1 mb-2">
              Segment Performance Breakdown
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {Object.keys(segmentStats).map((seg) => {
                const s = segmentStats[seg];
                return (
                  <div key={seg} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-bold text-slate-800 text-[11px] block">{seg}</span>
                    <div className={`font-extrabold text-sm ${s.netPnL >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatINR(s.netPnL)}
                    </div>
                    <div className="text-[10px] text-slate-500">{s.trades} trades • {s.wins} wins</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strategy Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-slate-950 uppercase border-b border-slate-300 pb-1 mb-2">
              Strategy & Setup Attribution
            </h3>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 uppercase text-[10px]">
                  <th className="py-1.5">Strategy</th>
                  <th className="py-1.5 text-center">Trades</th>
                  <th className="py-1.5 text-center">Win Rate</th>
                  <th className="py-1.5 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {Object.keys(strategyStats).map((name) => {
                  const s = strategyStats[name];
                  const wr = s.trades > 0 ? ((s.wins / s.trades) * 100).toFixed(0) : 0;
                  return (
                    <tr key={name}>
                      <td className="py-1.5 font-semibold text-slate-900">{name}</td>
                      <td className="py-1.5 text-center">{s.trades}</td>
                      <td className="py-1.5 text-center">{wr}%</td>
                      <td className={`py-1.5 text-right font-bold ${s.netPnL >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatINR(s.netPnL)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Trade Execution Audit Log */}
          <div>
            <h3 className="text-sm font-bold text-slate-950 uppercase border-b border-slate-300 pb-1 mb-2">
              Executed Trades Audit Log ({trades.length} records)
            </h3>
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-700 uppercase font-bold">
                  <th className="py-1">Date</th>
                  <th className="py-1">Symbol</th>
                  <th className="py-1">Side</th>
                  <th className="py-1">Qty</th>
                  <th className="py-1">Entry</th>
                  <th className="py-1">Exit</th>
                  <th className="py-1">Charges</th>
                  <th className="py-1 text-right">Net P&L</th>
                  <th className="py-1 text-center">Rules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {trades.map((t) => (
                  <tr key={t.id}>
                    <td className="py-1 text-slate-600">{t.date}</td>
                    <td className="py-1 font-semibold text-slate-900">{t.symbol}</td>
                    <td className="py-1">{t.direction}</td>
                    <td className="py-1">{t.quantity}</td>
                    <td className="py-1">₹{t.entryPrice}</td>
                    <td className="py-1">₹{t.exitPrice}</td>
                    <td className="py-1 text-amber-800">₹{t.charges}</td>
                    <td className={`py-1 text-right font-bold ${Number(t.netPnL) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatINR(t.netPnL)}
                    </td>
                    <td className="py-1 text-center">
                      {t.ruleFollowed ? 'Followed' : 'Violated'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-300 text-[10px] text-slate-500 flex justify-between">
            <span>Generated by DELTA JOURNAL — F&O Professional Trading Journal</span>
            <span>Confidential Personal Trading Audit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
