import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  Camera,
  Trash2,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import {
  INDIAN_UNDERLYINGS,
  SEGMENTS,
  STRATEGIES,
  EMOTIONS,
  RULE_VIOLATIONS,
} from '../utils/constants';
import { calculateIndianCharges } from '../utils/chargesCalculator';
import { calculateTradePnL, formatINR, formatPercent } from '../utils/calculations';

export default function TradeModal({ isOpen, onClose, onSave, onDelete, initialTrade = null, defaultBrokerage = 20 }) {
  if (!isOpen) return null;

  const isEditing = Boolean(initialTrade && initialTrade.id);

  // Form State
  const [formData, setFormData] = useState(() => {
    if (initialTrade) {
      return {
        ...initialTrade,
        autoCalculateCharges: initialTrade.autoCalculateCharges ?? true,
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: `TRD-${Date.now().toString().slice(-6)}`,
      date: today,
      entryTime: '09:20',
      exitTime: '10:00',
      symbol: 'NIFTY 25000 CE',
      underlying: 'NIFTY',
      exchange: 'NSE',
      segment: 'Options',
      direction: 'Long',
      optionType: 'CE',
      optionAction: 'Buy',
      strikePrice: 25000,
      expiryDate: today,
      lotSize: 25,
      lots: 1,
      quantity: 25,
      entryPrice: '',
      exitPrice: '',
      marginUsed: 0,
      charges: 0,
      autoCalculateCharges: true,
      stopLoss: '',
      target: '',
      strategy: '',
      ruleFollowed: true,
      ruleViolations: [],
      entryEmotion: 'Disciplined',
      exitEmotion: 'Satisfied',
      entryReason: '',
      exitReason: '',
      notes: '',
      status: 'Closed',
      screenshots: [],
    };
  });

  const [activeTab, setActiveTab] = useState('details'); // details, charges, psychology, notes
  const [chargeBreakdown, setChargeBreakdown] = useState(null);

  // When underlying changes, update default lot size and symbol suggestion
  const handleUnderlyingChange = (underlyingName) => {
    const found = INDIAN_UNDERLYINGS.find((u) => u.name === underlyingName);
    const newLotSize = found ? found.defaultLotSize : 1;
    const newExchange = found ? found.exchange : 'NSE';

    setFormData((prev) => {
      const isOption = prev.segment === 'Options';
      const isFutures = prev.segment === 'Futures';
      let newSymbol = prev.symbol;

      if (isOption) {
        newSymbol = `${underlyingName} ${prev.strikePrice || ''} ${prev.optionType}`;
      } else if (isFutures) {
        newSymbol = `${underlyingName} FUT`;
      } else {
        newSymbol = underlyingName;
      }

      const lots = prev.lots || 1;
      const quantity = prev.segment.startsWith('Equity') ? prev.quantity : lots * newLotSize;

      return {
        ...prev,
        underlying: underlyingName,
        exchange: newExchange,
        lotSize: newLotSize,
        quantity,
        symbol: newSymbol,
      };
    });
  };

  // Auto calculate charges & PnL whenever prices, lots, or segment change
  useEffect(() => {
    const lots = parseInt(formData.lots, 10) || 1;
    const lotSize = parseInt(formData.lotSize, 10) || 1;
    const totalQty = formData.segment.startsWith('Equity')
      ? parseInt(formData.quantity, 10) || 1
      : lots * lotSize;

    let computedCharges = parseFloat(formData.charges) || 0;

    if (formData.autoCalculateCharges) {
      const breakdown = calculateIndianCharges({
        segment: formData.segment,
        direction: formData.direction,
        optionAction: formData.optionAction,
        entryPrice: formData.entryPrice,
        exitPrice: formData.exitPrice,
        quantity: totalQty,
        brokeragePerOrder: defaultBrokerage,
      });
      setChargeBreakdown(breakdown);
      computedCharges = breakdown.totalCharges;
    }

    setFormData((prev) => ({
      ...prev,
      quantity: totalQty,
      charges: prev.autoCalculateCharges ? computedCharges : prev.charges,
    }));
  }, [
    formData.entryPrice,
    formData.exitPrice,
    formData.lots,
    formData.lotSize,
    formData.segment,
    formData.direction,
    formData.optionAction,
    formData.autoCalculateCharges,
    defaultBrokerage,
  ]);

  // Live PnL preview
  const livePnL = calculateTradePnL(formData);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.symbol || !formData.date) {
      alert('Please fill symbol and trade date.');
      return;
    }

    const finalTrade = {
      ...formData,
      quantity: livePnL.quantity,
      grossPnL: livePnL.grossPnL,
      netPnL: livePnL.netPnL,
      pnlPercent: livePnL.pnlPercent,
      plannedRisk: livePnL.plannedRisk,
      plannedReward: livePnL.plannedReward,
      riskRewardRatio: livePnL.riskRewardRatio,
      returnOnMargin: livePnL.returnOnMargin,
    };

    onSave(finalTrade);
    onClose();
  };

  const handleDuplicate = () => {
    const duplicated = {
      ...formData,
      id: `TRD-${Date.now().toString().slice(-6)}`,
      symbol: `${formData.symbol} (Copy)`,
    };
    onSave(duplicated);
    onClose();
  };

  const toggleRuleViolation = (violation) => {
    setFormData((prev) => {
      const exists = prev.ruleViolations.includes(violation);
      const newViolations = exists
        ? prev.ruleViolations.filter((v) => v !== violation)
        : [...prev.ruleViolations, violation];
      return {
        ...prev,
        ruleViolations: newViolations,
        ruleFollowed: newViolations.length === 0,
      };
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        screenshots: [...(prev.screenshots || []), reader.result],
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#090909] border border-neutral-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-800 bg-black">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 text-emerald-400 flex items-center justify-center font-black shrink-0">
              {formData.segment === 'Options' ? (formData.optionType || 'OP') : formData.segment === 'Futures' ? 'FU' : 'EQ'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {isEditing ? 'Edit Trade Record' : 'Log New Executed Trade'}
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">
                Indian Stock Market & F&O Execution Journal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher inside Modal */}
        <div className="flex overflow-x-auto scrollbar-none border-b border-neutral-800 px-3 sm:px-6 bg-[#090909] space-x-2 sm:space-x-4 text-xs font-semibold whitespace-nowrap">
          {[
            { id: 'details', label: '1. Execution' },
            { id: 'charges', label: '2. Indian Charges & R:R' },
            { id: 'psychology', label: '3. Psychology & Rules' },
            { id: 'notes', label: '4. Notes & Charts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-emerald-400 font-bold'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 touch-scroll">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Quick Index / Stock Buttons */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Quick Indian Underlying Selector:
                </label>
                <div className="flex flex-wrap gap-2">
                  {INDIAN_UNDERLYINGS.map((item) => (
                    <button
                      type="button"
                      key={item.name}
                      onClick={() => handleUnderlyingChange(item.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        formData.underlying === item.name
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {item.name} {item.defaultLotSize > 1 ? `(${item.defaultLotSize})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Segment, Direction, Exchange */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Segment</label>
                  <select
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {SEGMENTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Direction</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: 'Long' })}
                      className={`py-2 rounded-xl text-xs font-bold transition ${
                        formData.direction === 'Long'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      LONG (Buy)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: 'Short' })}
                      className={`py-2 rounded-xl text-xs font-bold transition ${
                        formData.direction === 'Short'
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      SHORT (Sell)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Exchange</label>
                  <select
                    value={formData.exchange}
                    onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </div>
              </div>

              {/* Options Specific Fields */}
              {formData.segment === 'Options' && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-4">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Options Derivative Parameters
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Option Type</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, optionType: 'CE' })}
                          className={`py-1.5 rounded-lg text-xs font-bold ${
                            formData.optionType === 'CE' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          CE (Call)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, optionType: 'PE' })}
                          className={`py-1.5 rounded-lg text-xs font-bold ${
                            formData.optionType === 'PE' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          PE (Put)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Option Action</label>
                      <select
                        value={formData.optionAction}
                        onChange={(e) => setFormData({ ...formData, optionAction: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                      >
                        <option value="Buy">Buying (Premium Decay Risk)</option>
                        <option value="Sell">Selling (Theta Decay Edge)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Strike Price</label>
                      <input
                        type="number"
                        value={formData.strikePrice}
                        onChange={(e) => setFormData({ ...formData, strikePrice: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                        placeholder="e.g. 24800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Symbol & Date / Time */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Trading Symbol / Contract</label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                    placeholder="e.g. NIFTY 24800 CE"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Trade Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Entry Time</label>
                    <input
                      type="time"
                      value={formData.entryTime}
                      onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Exit Time</label>
                    <input
                      type="time"
                      value={formData.exitTime}
                      onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Execution: Lots, Lot size, Quantity, Entry Price, Exit Price */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Position & Price Execution
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Lots</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={formData.lots}
                      onChange={(e) => setFormData({ ...formData, lots: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Lot Size</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={formData.lotSize}
                      onChange={(e) => setFormData({ ...formData, lotSize: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Total Quantity (Units)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-bold text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Entry Price (₹)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.05"
                      value={formData.entryPrice}
                      onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Exit Price (₹)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.05"
                      value={formData.exitPrice}
                      onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Margin Utilized (₹) <span className="text-[10px] text-slate-500">(for Futures / Option selling)</span>
                    </label>
                    <input
                      type="number"
                      value={formData.marginUsed}
                      onChange={(e) => setFormData({ ...formData, marginUsed: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Trade Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      <option value="Closed">Closed (Executed)</option>
                      <option value="Open">Open Position</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'charges' && (
            <div className="space-y-6">
              {/* Indian Statutory Charges Box */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Indian Statutory Charges & Taxes
                    </span>
                  </div>
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoCalculateCharges}
                      onChange={(e) => setFormData({ ...formData, autoCalculateCharges: e.target.checked })}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Auto-calculate Indian Charges</span>
                  </label>
                </div>

                {chargeBreakdown && formData.autoCalculateCharges && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-slate-400 text-[11px]">Brokerage (Roundtrip):</span>
                      <div className="font-bold text-slate-200">₹{chargeBreakdown.brokerage}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-slate-400 text-[11px]">STT (0.15% Sell Govt Tax):</span>
                      <div className="font-bold text-slate-200">₹{chargeBreakdown.stt}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-slate-400 text-[11px]">NSE Options (0.03553%):</span>
                      <div className="font-bold text-slate-200">₹{chargeBreakdown.exchangeTurnover}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-slate-400 text-[11px]">GST (18% on Services):</span>
                      <div className="font-bold text-slate-200">₹{chargeBreakdown.gst}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-slate-400 text-[11px]">Stamp Duty (0.003% Buy):</span>
                      <div className="font-bold text-slate-200">₹{chargeBreakdown.stampDuty}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-slate-400 text-[11px]">SEBI Fee (₹10/Cr):</span>
                      <div className="font-bold text-slate-200">₹{chargeBreakdown.sebiCharges}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3 pt-2 border-t border-slate-700">
                  <label className="text-xs font-semibold text-slate-300">Total Deducted Charges (₹):</label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={formData.autoCalculateCharges}
                    value={formData.charges}
                    onChange={(e) => setFormData({ ...formData, charges: e.target.value })}
                    className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-400 font-bold disabled:opacity-80"
                  />
                  {formData.autoCalculateCharges && (
                    <span className="text-[11px] text-emerald-400 font-medium">(Computed automatically based on SEBI & Indian tax slabs)</span>
                  )}
                </div>
              </div>

              {/* Plan & Risk/Reward */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-4">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Risk Management & Plan (R:R)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Strategy / Setup Tag</label>
                    <select
                      value={formData.strategy}
                      onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      {STRATEGIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Planned Stop Loss (₹)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={formData.stopLoss}
                      onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                      placeholder="e.g. 100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Planned Target (₹)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                      placeholder="e.g. 150"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400">Planned Risk:</span>
                    <div className="font-bold text-rose-400">{formatINR(livePnL.plannedRisk)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Planned Reward:</span>
                    <div className="font-bold text-emerald-400">{formatINR(livePnL.plannedReward)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Planned R:R Ratio:</span>
                    <div className="font-bold text-cyan-400">
                      {livePnL.riskRewardRatio > 0 ? `1 : ${livePnL.riskRewardRatio}` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'psychology' && (
            <div className="space-y-6">
              {/* Rule Following Checklist */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Trading Discipline & Plan Adherence
                    </div>
                    <p className="text-xs text-slate-400">Did you follow your pre-defined trading rules and plan?</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ruleFollowed: !formData.ruleFollowed, ruleViolations: [] })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 ${
                      formData.ruleFollowed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{formData.ruleFollowed ? 'Followed Rules 100%' : 'Rules Were Violated'}</span>
                  </button>
                </div>

                {!formData.ruleFollowed && (
                  <div className="pt-2 border-t border-slate-700/80">
                    <label className="block text-xs font-semibold text-rose-300 mb-2">
                      Select Rule Violation Tags:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {RULE_VIOLATIONS.filter((v) => !v.includes('None')).map((violation) => {
                        const isSelected = formData.ruleViolations.includes(violation);
                        return (
                          <button
                            type="button"
                            key={violation}
                            onClick={() => toggleRuleViolation(violation)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition ${
                              isSelected
                                ? 'bg-rose-600 text-white font-semibold'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {violation}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Psychological & Emotional State */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-4">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Trader Mindset & Emotions
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Emotion Before/During Entry</label>
                    <select
                      value={formData.entryEmotion}
                      onChange={(e) => setFormData({ ...formData, entryEmotion: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      {EMOTIONS.map((emo) => (
                        <option key={emo} value={emo}>{emo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Emotion Upon Exit</label>
                    <select
                      value={formData.exitEmotion}
                      onChange={(e) => setFormData({ ...formData, exitEmotion: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      <option value="Disciplined">Disciplined</option>
                      <option value="Satisfied">Satisfied / Peaceful</option>
                      <option value="Frustrated">Frustrated / Annoyed</option>
                      <option value="Panicked">Panicked Cut</option>
                      <option value="Regret">Regret / Cut Too Early</option>
                      <option value="Relieved">Relieved (Dodged Loss)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Entry Reason & Setup Context</label>
                  <textarea
                    rows="3"
                    value={formData.entryReason}
                    onChange={(e) => setFormData({ ...formData, entryReason: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    placeholder="Why did you take this trade? Price action, VWAP, PCR, OI data, support/resistance..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Exit Reason & Review</label>
                  <textarea
                    rows="3"
                    value={formData.exitReason}
                    onChange={(e) => setFormData({ ...formData, exitReason: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    placeholder="Hit target? Hit SL? Trailed out? Premium decay?"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Lessons Learned & General Notes</label>
                <textarea
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="Key takeaways to improve your edge for tomorrow..."
                />
              </div>

              {/* Chart Screenshots */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Attach Chart Screenshot (TradingView / Terminal)</span>
                  </span>
                  <label className="cursor-pointer px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">
                    Upload Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {formData.screenshots && formData.screenshots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {formData.screenshots.map((img, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-700">
                        <img src={img} alt={`Trade chart ${i}`} className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              screenshots: prev.screenshots.filter((_, idx) => idx !== i),
                            }));
                          }}
                          className="absolute top-1 right-1 bg-rose-600 p-1 rounded text-white opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live P&L Bottom Bar - Fintech Pure Black */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-black border border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:space-x-6 text-xs sm:text-sm">
              <div>
                <span className="text-neutral-500 uppercase text-[11px] sm:text-xs font-bold">Total Units:</span>
                <div className="font-bold text-white text-xs sm:text-sm md:text-base">{livePnL.quantity} Qty</div>
              </div>
              <div>
                <span className="text-neutral-500 uppercase text-[11px] sm:text-xs font-bold">Gross Profit:</span>
                <div className={`font-bold text-xs sm:text-sm md:text-base ${livePnL.grossPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {formatINR(livePnL.grossPnL)}
                </div>
              </div>
              <div>
                <span className="text-neutral-500 uppercase text-[11px] sm:text-xs font-bold">Charges:</span>
                <div className="font-bold text-amber-400 text-xs sm:text-sm md:text-base">{formatINR(formData.charges)}</div>
              </div>
              <div>
                <span className="text-neutral-500 uppercase text-[11px] sm:text-xs font-bold">Net Realized:</span>
                <div className={`text-base sm:text-lg md:text-xl font-black ${livePnL.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {formatINR(livePnL.netPnL)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 sm:pt-0 border-t sm:border-0 border-neutral-800">
              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(formData);
                      onClose();
                    }}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/30"
                    title="Delete Trade"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="p-2 rounded-xl text-neutral-300 hover:bg-neutral-800 border border-neutral-800"
                    title="Duplicate Trade"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold border border-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-black shadow-lg"
              >
                {isEditing ? 'Save Changes' : 'Record Trade'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
