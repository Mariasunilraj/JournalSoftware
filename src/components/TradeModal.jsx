import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  Camera,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  INDIAN_UNDERLYINGS,
  SEGMENTS,
  STRATEGIES,
  EMOTIONS,
  RULE_VIOLATIONS,
  INDEX_CONFIG,
} from '../utils/constants';
import { calculateIndianCharges } from '../utils/chargesCalculator';
import { calculateTradePnL, formatINR, formatPercent } from '../utils/calculations';

export default function TradeModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTrade = null,
  defaultBrokerage = 20,
  settings = null,
}) {
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
      symbol: 'NIFTY 24800 CE',
      underlying: 'NIFTY',
      exchange: 'NSE',
      segment: 'Options',
      direction: 'Long',
      optionType: 'CE',
      optionAction: 'Buy',
      strikePrice: 24800,
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

  const [activeTab, setActiveTab] = useState('details');
  const [chargeBreakdown, setChargeBreakdown] = useState(null);

  // Parse strike from symbol
  useEffect(() => {
    if (formData.segment === 'Options' && formData.symbol) {
      const match = formData.symbol.match(/(?:CE|PE)?\s*(\d{4,6})\s*(?:CE|PE)?/i);
      if (match && match[1] && (!formData.strikePrice || formData.strikePrice === '')) {
        setFormData((prev) => ({ ...prev, strikePrice: match[1] }));
      }
    }
  }, [formData.symbol, formData.segment]);

  // Strike validation warning
  const strikeWarning = React.useMemo(() => {
    if (formData.segment !== 'Options') return null;
    const strike = Number(formData.strikePrice);
    if (!strike) return null;
    const under = formData.underlying?.toUpperCase();
    const cfg = INDEX_CONFIG[under];
    if (cfg) {
      if (strike < cfg.minStrike || strike > cfg.maxStrike) {
        if (strike > cfg.maxStrike && strike % 10 === 0) {
          const suggested = Math.round(strike / 10);
          return {
            text: `Strike ₹${strike} is abnormally outside normal ${under} range (${cfg.minStrike} - ${cfg.maxStrike}). Did you mean ₹${suggested}?`,
            suggested,
          };
        }
        return {
          text: `Strike ₹${strike} is outside normal ${under} range (${cfg.minStrike} - ${cfg.maxStrike}). Please check for extra zeros.`,
          suggested: null,
        };
      }
    }
    return null;
  }, [formData.strikePrice, formData.underlying, formData.segment]);

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
        newSymbol = `${underlyingName} ${prev.strikePrice || ''} ${prev.optionType || 'CE'}`;
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
        symbol: newSymbol.trim(),
      };
    });
  };

  // Auto calculate charges & PnL whenever prices, lots, or segment change
  useEffect(() => {
    const lots = parseInt(formData.lots, 10) || 1;
    const lotSize = parseInt(formData.lotSize, 10) || 1;
    const totalQty = formData.segment.startsWith('Equity')
      ? parseInt(formData.quantity, 10) || 0
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
        exchange: formData.exchange,
        rates: settings?.exchangeRates,
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
    formData.exchange,
    formData.autoCalculateCharges,
    defaultBrokerage,
    settings?.exchangeRates,
  ]);

  // Live PnL preview
  const livePnL = calculateTradePnL(formData);

  // Compute actual R-Multiple
  const actualRMultiple = React.useMemo(() => {
    if (!formData.stopLoss || !formData.entryPrice || !formData.exitPrice) return null;
    const riskPerUnit = Math.abs(Number(formData.entryPrice) - Number(formData.stopLoss));
    if (riskPerUnit <= 0) return null;
    const gainPerUnit = formData.direction === 'Short'
      ? Number(formData.entryPrice) - Number(formData.exitPrice)
      : Number(formData.exitPrice) - Number(formData.entryPrice);
    return (gainPerUnit / riskPerUnit).toFixed(2);
  }, [formData.entryPrice, formData.exitPrice, formData.stopLoss, formData.direction]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.symbol || !formData.date) {
      alert('Please fill symbol and trade date.');
      return;
    }

    if (!formData.quantity || Number(formData.quantity) <= 0) {
      alert('Quantity must be greater than zero. Please set valid lots and lot size.');
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
      actualRMultiple: actualRMultiple ? Number(actualRMultiple) : null,
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
            <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 text-emerald-400 flex items-center justify-center font-black shrink-0 text-sm">
              {formData.segment === 'Options' ? (formData.optionType || 'OP') : formData.segment === 'Futures' ? 'FU' : 'EQ'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {isEditing ? 'Edit Trade Record' : 'Log New Executed Trade'}
              </h2>
              <p className="text-xs text-neutral-400">
                Delta Journal • Indian F&O & Equity Execution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher inside Modal */}
        <div className="flex overflow-x-auto scrollbar-none border-b border-neutral-800 px-3 sm:px-6 bg-[#090909] space-x-2 sm:space-x-4 text-xs font-semibold whitespace-nowrap">
          {[
            { id: 'details', label: '1. Contract & Price' },
            { id: 'charges', label: '2. Charges & R:R' },
            { id: 'psychology', label: '3. Psychology & Rules' },
            { id: 'notes', label: '4. Notes & Charts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-2 border-b-2 transition min-h-[44px] flex items-center ${
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Quick Index / Stock Buttons */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-2">
                  Quick Indian Underlying Selector:
                </label>
                <div className="flex flex-wrap gap-2">
                  {INDIAN_UNDERLYINGS.map((item) => (
                    <button
                      type="button"
                      key={item.name}
                      onClick={() => handleUnderlyingChange(item.name)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                        formData.underlying === item.name
                          ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                          : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
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
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Segment</label>
                  <select
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-base sm:text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
                  >
                    {SEGMENTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Direction</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: 'Long' })}
                      className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition ${
                        formData.direction === 'Long'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-800'
                      }`}
                    >
                      LONG (Buy)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: 'Short' })}
                      className={`min-h-[44px] py-2 rounded-xl text-xs font-bold transition ${
                        formData.direction === 'Short'
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-800'
                      }`}
                    >
                      SHORT (Sell)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Exchange</label>
                  <select
                    value={formData.exchange}
                    onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                    className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-base sm:text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </div>
              </div>

              {/* Options Specific Fields */}
              {formData.segment === 'Options' && (
                <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-4">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Options Derivative Parameters
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-300 mb-1">Option Type</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, optionType: 'CE' })}
                          className={`min-h-[44px] py-1.5 rounded-lg text-xs font-bold ${
                            formData.optionType === 'CE' ? 'bg-emerald-500 text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                          }`}
                        >
                          CE (Call)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, optionType: 'PE' })}
                          className={`min-h-[44px] py-1.5 rounded-lg text-xs font-bold ${
                            formData.optionType === 'PE' ? 'bg-amber-500 text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                          }`}
                        >
                          PE (Put)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-300 mb-1">Option Action</label>
                      <select
                        value={formData.optionAction}
                        onChange={(e) => setFormData({ ...formData, optionAction: e.target.value })}
                        className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
                      >
                        <option value="Buy">Buying (Premium Decay Risk)</option>
                        <option value="Sell">Selling (Theta Decay Edge)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-300 mb-1">Strike Price</label>
                      <input
                        type="number"
                        value={formData.strikePrice}
                        onChange={(e) => setFormData({ ...formData, strikePrice: e.target.value })}
                        className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
                        placeholder="e.g. 24800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-300 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
                      />
                    </div>
                  </div>

                  {strikeWarning && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs text-amber-300">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{strikeWarning.text}</span>
                      </div>
                      {strikeWarning.suggested && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, strikePrice: strikeWarning.suggested })}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded text-xs font-semibold shrink-0"
                        >
                          Use {strikeWarning.suggested}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Symbol & Date / Time */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Trading Symbol / Contract</label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-base sm:text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 font-semibold"
                    placeholder="e.g. NIFTY 24800 CE"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Trade Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-base sm:text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Entry Time</label>
                    <input
                      type="time"
                      value={formData.entryTime}
                      onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-2 text-base sm:text-xs text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Exit Time</label>
                    <input
                      type="time"
                      value={formData.exitTime}
                      onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-2 text-base sm:text-xs text-neutral-100"
                    />
                  </div>
                </div>
              </div>

              {/* Execution: Lots, Lot size, Quantity, Entry Price, Exit Price */}
              <div className="p-4 rounded-xl bg-black border border-neutral-800">
                <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3">
                  Position & Price Execution
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Lots</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={formData.lots}
                      onChange={(e) => setFormData({ ...formData, lots: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Lot Size</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={formData.lotSize}
                      onChange={(e) => setFormData({ ...formData, lotSize: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Total Quantity (Units)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-emerald-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Entry Price (₹)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.05"
                      value={formData.entryPrice}
                      onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100 font-semibold"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Exit Price (₹)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.05"
                      value={formData.exitPrice}
                      onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100 font-semibold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      Margin Utilized (₹) <span className="text-[10px] text-neutral-500">(for Futures / Option selling)</span>
                    </label>
                    <input
                      type="number"
                      value={formData.marginUsed}
                      onChange={(e) => setFormData({ ...formData, marginUsed: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Trade Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
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
              <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                      Indian Statutory Charges & Taxes ({formData.exchange || 'NSE'})
                    </span>
                  </div>
                  <label className="flex items-center space-x-2 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoCalculateCharges}
                      onChange={(e) => setFormData({ ...formData, autoCalculateCharges: e.target.checked })}
                      className="rounded border-neutral-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Auto-calculate Indian Charges</span>
                  </label>
                </div>

                {chargeBreakdown && formData.autoCalculateCharges && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                      <span className="text-neutral-400 text-[11px]">Brokerage (Roundtrip):</span>
                      <div className="font-bold text-neutral-200">₹{chargeBreakdown.brokerage}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                      <span className="text-neutral-400 text-[11px]">STT (Govt Tax):</span>
                      <div className="font-bold text-neutral-200">₹{chargeBreakdown.stt}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                      <span className="text-neutral-400 text-[11px]">{formData.exchange || 'NSE'} Txn Charge:</span>
                      <div className="font-bold text-neutral-200">₹{chargeBreakdown.exchangeTurnover}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                      <span className="text-neutral-400 text-[11px]">GST (18% on Services):</span>
                      <div className="font-bold text-neutral-200">₹{chargeBreakdown.gst}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                      <span className="text-neutral-400 text-[11px]">Stamp Duty (State Buy):</span>
                      <div className="font-bold text-neutral-200">₹{chargeBreakdown.stampDuty}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                      <span className="text-neutral-400 text-[11px]">SEBI Fee:</span>
                      <div className="font-bold text-neutral-200">₹{chargeBreakdown.sebiCharges}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3 pt-2 border-t border-neutral-800">
                  <label className="text-xs font-semibold text-neutral-300">Total Deducted Charges (₹):</label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={formData.autoCalculateCharges}
                    value={formData.charges}
                    onChange={(e) => setFormData({ ...formData, charges: e.target.value })}
                    className="w-32 min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-base sm:text-xs text-amber-400 font-bold disabled:opacity-80"
                  />
                  {formData.autoCalculateCharges && (
                    <span className="text-[11px] text-emerald-400 font-medium">(Computed using {formData.exchange || 'NSE'} rates in settings)</span>
                  )}
                </div>
              </div>

              {/* Plan & Risk/Reward */}
              <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-4">
                <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Risk Management & Plan (R:R)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Strategy / Setup Tag</label>
                    <select
                      value={formData.strategy}
                      onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
                    >
                      {STRATEGIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Planned Stop Loss (₹)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={formData.stopLoss}
                      onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
                      placeholder="e.g. 100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Planned Target (₹)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
                      placeholder="e.g. 150"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-neutral-900 text-xs border border-neutral-800">
                  <div>
                    <span className="text-neutral-400">Planned Risk:</span>
                    <div className="font-bold text-rose-400">{formatINR(livePnL.plannedRisk)}</div>
                  </div>
                  <div>
                    <span className="text-neutral-400">Planned Reward:</span>
                    <div className="font-bold text-emerald-400">{formatINR(livePnL.plannedReward)}</div>
                  </div>
                  <div>
                    <span className="text-neutral-400">Planned R:R Ratio:</span>
                    <div className="font-bold text-cyan-400">
                      {livePnL.riskRewardRatio > 0 ? `1 : ${livePnL.riskRewardRatio}` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-400">Actual R Multiple:</span>
                    <div className={`font-bold ${actualRMultiple && Number(actualRMultiple) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {actualRMultiple ? `${actualRMultiple} R` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'psychology' && (
            <div className="space-y-6">
              {/* Rule Following Checklist */}
              <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                      Trading Discipline & Plan Adherence
                    </div>
                    <p className="text-xs text-neutral-400">Did you follow your pre-defined trading rules and plan?</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ruleFollowed: !formData.ruleFollowed, ruleViolations: [] })}
                    className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 ${
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
                  <div className="pt-2 border-t border-neutral-800">
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
                            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs transition ${
                              isSelected
                                ? 'bg-rose-600 text-white font-semibold'
                                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-800'
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
              <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-4">
                <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Trader Mindset & Emotions
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Emotion Before/During Entry</label>
                    <select
                      value={formData.entryEmotion}
                      onChange={(e) => setFormData({ ...formData, entryEmotion: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
                    >
                      {EMOTIONS.map((emo) => (
                        <option key={emo} value={emo}>{emo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Emotion Upon Exit</label>
                    <select
                      value={formData.exitEmotion}
                      onChange={(e) => setFormData({ ...formData, exitEmotion: e.target.value })}
                      className="w-full min-h-[44px] bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-neutral-100"
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
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Entry Reason & Setup Context</label>
                  <textarea
                    rows="3"
                    value={formData.entryReason}
                    onChange={(e) => setFormData({ ...formData, entryReason: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    placeholder="Why did you take this trade? Price action, VWAP, PCR, OI data, support/resistance..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Exit Reason & Review</label>
                  <textarea
                    rows="3"
                    value={formData.exitReason}
                    onChange={(e) => setFormData({ ...formData, exitReason: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    placeholder="Hit target? Hit SL? Trailed out? Premium decay?"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Lessons Learned & General Notes</label>
                <textarea
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-base sm:text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  placeholder="Key takeaways to improve your edge for tomorrow..."
                />
              </div>

              {/* Chart Screenshots */}
              <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Attach Chart Screenshot (TradingView / Terminal)</span>
                  </span>
                  <label className="cursor-pointer min-h-[44px] px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center">
                    Upload Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {formData.screenshots && formData.screenshots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {formData.screenshots.map((img, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-neutral-800">
                        <img src={img} alt={`Trade chart ${i}`} className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              screenshots: prev.screenshots.filter((_, idx) => idx !== i),
                            }));
                          }}
                          className="absolute top-1 right-1 bg-rose-600 p-1.5 rounded text-white opacity-0 group-hover:opacity-100 transition"
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
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 flex items-center justify-center"
                    title="Delete Trade"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-neutral-300 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center"
                    title="Duplicate Trade"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold border border-neutral-800 flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-black shadow-lg flex items-center justify-center"
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
