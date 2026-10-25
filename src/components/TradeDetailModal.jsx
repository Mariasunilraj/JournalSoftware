import React from 'react';
import {
  X,
  Edit3,
  Copy,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Camera,
} from 'lucide-react';
import { formatINR, formatPercent } from '../utils/calculations';

export default function TradeDetailModal({ isOpen, onClose, trade, onEdit, onDelete, onDuplicate }) {
  if (!isOpen || !trade) return null;

  const isProfit = Number(trade.netPnL) >= 0;
  const isCall = trade.tradeType === 'Call' || trade.optionType === 'CE' || trade.symbol?.includes('CE') || trade.direction === 'Long';
  const tradeType = trade.tradeType || (isCall ? 'Call' : 'Put');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#090909] border border-neutral-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-800 bg-black">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl shrink-0 ${isProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
              {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">{trade.symbol}</h2>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  tradeType === 'Call'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}>
                  {tradeType.toUpperCase()}
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800 font-semibold">
                  {trade.segment}
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-neutral-400 flex items-center space-x-2 sm:space-x-3 mt-0.5 font-medium">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{trade.date}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{trade.entryTime} - {trade.exitTime}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-1.5 sm:space-x-2 pt-2 sm:pt-0 border-t sm:border-0 border-neutral-850">
            <button
              onClick={() => onEdit(trade)}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 transition active:scale-95"
              title="Edit Trade"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDuplicate(trade)}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 transition active:scale-95"
              title="Duplicate Trade"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onDelete(trade);
                onClose();
              }}
              className="p-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-500/30 transition active:scale-95"
              title="Delete Trade"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 transition active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 text-xs sm:text-sm text-white touch-scroll">
          {/* Top Realized Results Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-black border border-neutral-800">
            <div>
              <span className="text-neutral-500 text-[11px] sm:text-xs uppercase font-bold tracking-wider">Net Realized Profit</span>
              <div className={`text-xl sm:text-2xl md:text-3xl font-black ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                {formatINR(trade.netPnL)}
              </div>
            </div>
            <div>
              <span className="text-neutral-500 text-[11px] sm:text-xs uppercase font-bold tracking-wider">Gross Profit</span>
              <div className={`text-sm sm:text-base lg:text-lg font-bold ${trade.grossPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {formatINR(trade.grossPnL)}
              </div>
            </div>
            <div>
              <span className="text-neutral-500 text-[11px] sm:text-xs uppercase font-bold tracking-wider">Recorded Charges</span>
              <div className="text-sm sm:text-base lg:text-lg font-bold text-amber-400">
                {formatINR(trade.charges)}
              </div>
            </div>
            <div>
              <span className="text-neutral-500 text-[11px] sm:text-xs uppercase font-bold tracking-wider">Realized Return %</span>
              <div className="text-sm sm:text-base lg:text-lg font-bold text-white">
                {formatPercent(trade.pnlPercent)}
              </div>
            </div>
          </div>

          {/* Execution Specs */}
          <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-3">
            <h4 className="font-bold text-neutral-400 uppercase tracking-wider text-xs sm:text-sm">Execution Details</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-neutral-500 text-xs sm:text-sm">Entry Price:</span>
                <div className="font-bold text-white text-xs sm:text-sm md:text-base">₹{trade.entryPrice}</div>
              </div>
              <div>
                <span className="text-neutral-500 text-xs sm:text-sm">Exit Price:</span>
                <div className="font-bold text-white text-xs sm:text-sm md:text-base">₹{trade.exitPrice}</div>
              </div>
              <div>
                <span className="text-neutral-500 text-xs sm:text-sm">Lots / Lot Size:</span>
                <div className="font-bold text-white text-xs sm:text-sm md:text-base">{trade.lots} Lots × {trade.lotSize}</div>
              </div>
              <div>
                <span className="text-neutral-500 text-xs sm:text-sm">Total Quantity:</span>
                <div className="font-bold text-white text-xs sm:text-sm md:text-base">{trade.quantity} Qty</div>
              </div>
            </div>
          </div>

          {/* Setup & Strategy */}
          <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-3">
            <h4 className="font-bold text-neutral-400 uppercase tracking-wider text-xs sm:text-sm">Setup & Strategy</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-neutral-500 text-xs sm:text-sm">Strategy / Setup:</span>
                <div className="font-bold text-white text-xs sm:text-sm md:text-base">{trade.strategy || 'Discretionary'}</div>
              </div>
              <div>
                <span className="text-neutral-500 text-xs sm:text-sm">Planned Stop Loss:</span>
                <div className="font-bold text-rose-500 text-xs sm:text-sm md:text-base">₹{trade.stopLoss || 'N/A'}</div>
              </div>
              <div>
                <span className="text-neutral-500 text-xs sm:text-sm">Planned Target:</span>
                <div className="font-bold text-emerald-400 text-xs sm:text-sm md:text-base">₹{trade.target || 'N/A'}</div>
              </div>
              <div>
                <span className="text-neutral-500 text-xs sm:text-sm">Planned R:R:</span>
                <div className="font-bold text-white text-xs sm:text-sm md:text-base">
                  {trade.riskRewardRatio > 0 ? `1 : ${trade.riskRewardRatio}` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Discipline & Psychology */}
          <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-3">
            <h4 className="font-bold text-neutral-400 uppercase tracking-wider text-[11px]">
              Discipline & Psychology Review
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-neutral-500">Trading Rules Followed:</span>
                <div className="mt-1">
                  {trade.ruleFollowed ? (
                    <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold">
                      <CheckCircle className="w-4 h-4" />
                      <span>Yes (100% Adherence)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-rose-500 font-bold">
                      <XCircle className="w-4 h-4" />
                      <span>No (Rule Breach)</span>
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-neutral-500">Pre-Trade Emotion:</span>
                <div className="font-bold text-white mt-1">{trade.entryEmotion || 'Normal'}</div>
              </div>
              <div>
                <span className="text-neutral-500">Post-Trade Emotion:</span>
                <div className="font-bold text-white mt-1">{trade.exitEmotion || 'Normal'}</div>
              </div>
            </div>

            {trade.ruleViolations && trade.ruleViolations.length > 0 && (
              <div className="pt-2 border-t border-neutral-800">
                <span className="text-rose-400 font-bold block mb-1">Mistake / Rule Violations:</span>
                <div className="flex flex-wrap gap-1.5">
                  {trade.ruleViolations.map((v, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/40 text-xs font-bold">
                      ⚠️ {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Entry Reason & Exit Reason & Notes */}
          <div className="space-y-3">
            {trade.entryReason && (
              <div className="p-3.5 rounded-xl bg-black border border-neutral-800">
                <div className="font-bold text-neutral-400 mb-1 text-[11px] uppercase tracking-wider">Entry Rationale / Context:</div>
                <p className="text-neutral-200 whitespace-pre-wrap">{trade.entryReason}</p>
              </div>
            )}

            {trade.exitReason && (
              <div className="p-3.5 rounded-xl bg-black border border-neutral-800">
                <div className="font-bold text-neutral-400 mb-1 text-[11px] uppercase tracking-wider">Exit Rationale & Outcome:</div>
                <p className="text-neutral-200 whitespace-pre-wrap">{trade.exitReason}</p>
              </div>
            )}

            {trade.notes && (
              <div className="p-3.5 rounded-xl bg-black border border-neutral-800">
                <div className="font-bold text-neutral-400 mb-1 text-[11px] uppercase tracking-wider">Lessons & Journal Notes:</div>
                <p className="text-neutral-200 whitespace-pre-wrap">{trade.notes}</p>
              </div>
            )}
          </div>

          {/* Attached Screenshots */}
          {trade.screenshots && trade.screenshots.length > 0 && (
            <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-3">
              <h4 className="font-bold text-neutral-400 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Chart Screenshots</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trade.screenshots.map((img, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-neutral-800">
                    <img src={img} alt={`Trade screenshot ${i + 1}`} className="w-full object-contain max-h-64" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
