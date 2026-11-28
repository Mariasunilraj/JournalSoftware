import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Box,
  Play,
  Target,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  FileSpreadsheet,
  AlertTriangle,
  Trash2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { RULE_VIOLATIONS, INDEX_CONFIG } from '../utils/constants';
import { formatINR, formatIndianDate } from '../utils/calculations';
import { calculateIndianCharges } from '../utils/chargesCalculator';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function TradeLog({
  trades,
  onOpenTradeModal,
  onViewTrade,
  onDeleteTrade,
  onDeleteMultipleTrades,
  onDuplicateTrade,
  onSaveTrade,
  onOpenContractNoteModal,
}) {
  // Mobile first default to cards view
  const [viewMode, setViewMode] = useState('cards');
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [userEditedCharges, setUserEditedCharges] = useState(false);

  // Exact 3-entry scroll tracking
  const scrollContainerRef = useRef(null);
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);

  const CARD_HEIGHT = 120; // px
  const CARD_GAP = 10; // px
  const STEP = CARD_HEIGHT + CARD_GAP; // 130px

  const handleScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    const idx = Math.round(scrollTop / STEP);
    setCurrentVisibleIndex(idx);
  };

  const handleScrollStep = (direction) => {
    if (!scrollContainerRef.current) return;
    const delta = direction === 'down' ? STEP : -STEP;
    scrollContainerRef.current.scrollBy({ top: delta, behavior: 'smooth' });
  };

  // Quick form state with Lots, Lot size, SL, Target, Expiry, Strike
  const [quickForm, setQuickForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    symbol: '',
    tradeType: 'Call', // 'Call' or 'Put'
    lots: '',
    lotSize: 25,
    quantity: '',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    target: '',
    expiryDate: new Date().toISOString().slice(0, 10),
    strikePrice: '',
    grossProfit: 0,
    charges: 0,
    netProfit: 0,
    entryReason: '',
    exitReason: '',
    mistake: 'None - Followed Rules 100%',
    strategy: '',
  });

  // Autocomplete suggestions for common instruments
  const instrumentSuggestions = ['NIFTY 25000 CE', 'NIFTY 25000 PE', 'BANKNIFTY 52000 CE', 'BANKNIFTY 52000 PE', 'SENSEX 80000 CE', 'FINNIFTY 23500 CE'];

  // Instrument validation and unrealistic strike sanity check
  const instrumentAnalysis = useMemo(() => {
    const sym = (quickForm.symbol || '').trim().toUpperCase();
    if (!sym) return { isValid: false, warning: null, suggested: null, underlying: 'NIFTY' };

    const match = sym.match(/^([A-Z]+)\s*(\d{4,6})\s*(CE|PE)$/i);
    let underlying = 'NIFTY';
    if (sym.includes('BANKNIFTY')) underlying = 'BANKNIFTY';
    else if (sym.includes('FINNIFTY')) underlying = 'FINNIFTY';
    else if (sym.includes('SENSEX')) underlying = 'SENSEX';
    else if (sym.includes('MIDCPNIFTY')) underlying = 'MIDCPNIFTY';
    else if (sym.includes('BANKEX')) underlying = 'BANKEX';

    if (!match) {
      return {
        isValid: false,
        warning: 'Format should be: INDEX + STRIKE + CE/PE (e.g. NIFTY 24900 CE)',
        suggested: null,
        underlying,
      };
    }

    const matchedUnderlying = match[1];
    const strike = parseInt(match[2], 10);
    const optType = match[3];

    let warning = null;
    let suggested = null;

    if (matchedUnderlying === 'NIFTY') {
      if (strike > 35000 || strike < 15000) {
        if (strike > 100000 && String(strike).endsWith('0')) {
          suggested = Math.round(strike / 10);
          warning = `Unrealistic NIFTY strike ${strike}! Typo detected. Did you mean ${suggested}?`;
        } else {
          warning = `Unrealistic NIFTY strike ${strike}. Typical range is 18,000 to 30,000.`;
        }
      }
    } else if (matchedUnderlying === 'BANKNIFTY') {
      if (strike > 70000 || strike < 30000) {
        if (strike > 200000 && String(strike).endsWith('0')) {
          suggested = Math.round(strike / 10);
          warning = `Unrealistic BANKNIFTY strike ${strike}! Typo detected. Did you mean ${suggested}?`;
        } else {
          warning = `Unrealistic BANKNIFTY strike ${strike}. Typical range is 40,000 to 60,000.`;
        }
      }
    } else if (matchedUnderlying === 'SENSEX') {
      if (strike > 110000 || strike < 55000) {
        if (strike > 500000 && String(strike).endsWith('0')) {
          suggested = Math.round(strike / 10);
          warning = `Unrealistic SENSEX strike ${strike}! Typo detected. Did you mean ${suggested}?`;
        } else {
          warning = `Unrealistic SENSEX strike ${strike}. Typical range is 65,000 to 95,000.`;
        }
      }
    }

    return {
      isValid: true,
      underlying: matchedUnderlying,
      strike,
      optType,
      warning,
      suggested,
    };
  }, [quickForm.symbol]);

  // Duplicate trade detection warning
  const duplicateWarning = useMemo(() => {
    if (!quickForm.symbol || !quickForm.date || !quickForm.entryPrice || !quickForm.exitPrice || !quickForm.quantity) {
      return null;
    }
    const entry = parseFloat(quickForm.entryPrice);
    const exit = parseFloat(quickForm.exitPrice);
    const qty = parseFloat(quickForm.quantity);
    const sym = quickForm.symbol.trim().toUpperCase();

    const match = trades.find(
      (t) =>
        t.date === quickForm.date &&
        t.symbol?.trim().toUpperCase() === sym &&
        t.tradeType === quickForm.tradeType &&
        Math.abs(Number(t.entryPrice) - entry) < 0.01 &&
        Math.abs(Number(t.exitPrice) - exit) < 0.01 &&
        Number(t.quantity) === qty
    );

    if (match) {
      return `Duplicate trade detected: An identical ${quickForm.symbol} (${quickForm.tradeType}) trade on ${formatIndianDate(quickForm.date)} with qty ${qty} already exists in your journal.`;
    }
    return null;
  }, [quickForm, trades]);

  // Handle Quick Form field changes with auto-calculations
  const handleQuickFormChange = (field, val) => {
    setQuickForm((prev) => {
      const updated = { ...prev, [field]: val };

      if (field === 'charges') {
        setUserEditedCharges(true);
      }

      if (field === 'tradeType' && prev.symbol) {
        if (val === 'Call') {
          updated.symbol = prev.symbol.replace(/PE/g, 'CE');
          if (!updated.symbol.includes('CE')) updated.symbol = `${prev.symbol} CE`;
        } else if (val === 'Put') {
          updated.symbol = prev.symbol.replace(/CE/g, 'PE');
          if (!updated.symbol.includes('PE')) updated.symbol = `${prev.symbol} PE`;
        }
      }

      if (field === 'symbol') {
        const symUpper = (val || '').toUpperCase();
        let defaultLot = 25;
        if (symUpper.includes('BANKNIFTY')) defaultLot = 15;
        else if (symUpper.includes('SENSEX')) defaultLot = 10;
        else if (symUpper.includes('FINNIFTY')) defaultLot = 25;
        else if (symUpper.includes('MIDCPNIFTY')) defaultLot = 50;
        else if (symUpper.includes('BANKEX')) defaultLot = 15;
        updated.lotSize = defaultLot;

        const numMatch = symUpper.match(/\d{4,6}/);
        if (numMatch) {
          updated.strikePrice = numMatch[0];
        }

        if (updated.lots && Number(updated.lots) > 0) {
          updated.quantity = Number(updated.lots) * defaultLot;
        }
      }

      if (field === 'lots') {
        const lts = parseFloat(val) || 0;
        const lSize = parseFloat(prev.lotSize) || 25;
        updated.quantity = lts > 0 ? lts * lSize : '';
      }

      if (field === 'lotSize') {
        const lSize = parseFloat(val) || 1;
        const lts = parseFloat(prev.lots) || 0;
        if (lts > 0) {
          updated.quantity = lts * lSize;
        }
      }

      if (field === 'quantity') {
        const qty = parseFloat(val) || 0;
        const lSize = parseFloat(prev.lotSize) || 25;
        if (qty > 0 && lSize > 0) {
          updated.lots = Math.round(qty / lSize);
        } else {
          updated.lots = '';
        }
      }

      const entry = parseFloat(field === 'entryPrice' ? val : prev.entryPrice) || 0;
      const exit = parseFloat(field === 'exitPrice' ? val : prev.exitPrice) || 0;
      const qty = parseFloat(field === 'quantity' ? val : updated.quantity) || 0;
      let chgs = parseFloat(field === 'charges' ? val : prev.charges) || 0;

      if (entry > 0 && exit > 0 && qty > 0) {
        const gross = (exit - entry) * qty;

        if (field !== 'charges' && !userEditedCharges) {
          const breakdown = calculateIndianCharges({
            segment: updated.segment || 'Options',
            direction: updated.direction || 'Long',
            optionAction: updated.optionAction || 'Buy',
            entryPrice: entry,
            exitPrice: exit,
            quantity: qty,
            symbol: updated.symbol,
            date: updated.date,
          });
          chgs = breakdown.totalCharges;
          updated.charges = chgs;
        }

        const net = gross - chgs;
        if (field !== 'grossProfit') updated.grossProfit = Number(gross.toFixed(2));
        if (field !== 'netProfit') updated.netProfit = Number(net.toFixed(2));
      } else {
        if (field !== 'charges' && !userEditedCharges) {
          chgs = 0;
          updated.charges = 0;
        }
        if (field !== 'grossProfit') updated.grossProfit = 0;
        updated.netProfit = field === 'charges' && userEditedCharges ? -chgs : 0;
      }

      return updated;
    });
  };

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!quickForm.symbol || !quickForm.date) {
      alert('Please enter instrument symbol and date.');
      return;
    }

    const qty = parseFloat(quickForm.quantity);
    if (!qty || qty <= 0) {
      alert('Quantity must be greater than 0. Please specify lots and lot size.');
      return;
    }

    const entry = parseFloat(quickForm.entryPrice) || 0;
    const exit = parseFloat(quickForm.exitPrice) || 0;
    let charges = parseFloat(quickForm.charges) || 0;

    if ((charges === 0 || !userEditedCharges) && entry > 0 && exit > 0 && qty > 0) {
      const breakdown = calculateIndianCharges({
        segment: quickForm.segment || 'Options',
        direction: quickForm.direction || 'Long',
        optionAction: quickForm.optionAction || 'Buy',
        entryPrice: entry,
        exitPrice: exit,
        quantity: qty,
        symbol: quickForm.symbol,
        date: quickForm.date,
      });
      charges = breakdown.totalCharges;
    }

    const gross = parseFloat(quickForm.grossProfit) || Number(((exit - entry) * qty).toFixed(2));
    const net = Number((gross - charges).toFixed(2));
    const isCall = quickForm.tradeType === 'Call';
    const isMistake = quickForm.mistake && !quickForm.mistake.includes('None');

    const underlying = instrumentAnalysis.underlying || 'NIFTY';
    const exchange = underlying === 'SENSEX' || underlying === 'BANKEX' ? 'BSE' : 'NSE';

    const newTrade = {
      id: `TRD-${Date.now().toString().slice(-6)}`,
      date: quickForm.date,
      entryTime: '09:20',
      exitTime: '10:00',
      symbol: quickForm.symbol.trim().toUpperCase(),
      underlying,
      exchange,
      segment: 'Options',
      direction: 'Long',
      optionType: isCall ? 'CE' : 'PE',
      optionAction: 'Buy',
      tradeType: quickForm.tradeType,
      strikePrice: quickForm.strikePrice || null,
      expiryDate: quickForm.expiryDate,
      lotSize: Number(quickForm.lotSize) || 25,
      lots: Number(quickForm.lots) || 1,
      quantity: qty,
      entryPrice: entry,
      exitPrice: exit,
      grossPnL: gross,
      charges: charges,
      netPnL: net,
      stopLoss: quickForm.stopLoss ? Number(quickForm.stopLoss) : null,
      target: quickForm.target ? Number(quickForm.target) : null,
      strategy: quickForm.strategy || 'Discretionary',
      ruleFollowed: !isMistake,
      ruleViolations: isMistake ? [quickForm.mistake] : [],
      entryEmotion: 'Disciplined',
      exitEmotion: isCall && net >= 0 ? 'Satisfied' : 'Disciplined',
      entryReason: quickForm.entryReason || '',
      exitReason: quickForm.exitReason || '',
      notes: '',
      status: 'Closed',
      screenshots: [],
    };

    onSaveTrade(newTrade);

    // Reset Form
    setQuickForm({
      date: new Date().toISOString().slice(0, 10),
      symbol: '',
      tradeType: 'Call',
      lots: '',
      lotSize: 25,
      quantity: '',
      entryPrice: '',
      exitPrice: '',
      stopLoss: '',
      target: '',
      expiryDate: new Date().toISOString().slice(0, 10),
      strikePrice: '',
      grossProfit: 0,
      charges: 0,
      netProfit: 0,
      entryReason: '',
      exitReason: '',
      mistake: 'None - Followed Rules 100%',
      strategy: '',
    });
    setUserEditedCharges(false);
    setShowQuickEntry(false);
  };

  const getTradeType = (trade) => {
    if (trade.tradeType) return trade.tradeType;
    if (trade.optionType === 'CE' || trade.symbol?.includes('CE') || trade.direction === 'Long') return 'Call';
    if (trade.optionType === 'PE' || trade.symbol?.includes('PE')) return 'Put';
    return 'Call';
  };

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTradeType, setSelectedTradeType] = useState('All');
  const [selectedOutcome, setSelectedOutcome] = useState('All');
  const [selectedDiscipline, setSelectedDiscipline] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('All');

  // Multi-select state
  const [selectedTradeIds, setSelectedTradeIds] = useState([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = searchQuery || selectedTradeType !== 'All' || selectedOutcome !== 'All' || selectedDateRange !== 'All' || selectedDiscipline !== 'All';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedTradeType('All');
    setSelectedOutcome('All');
    setSelectedDateRange('All');
    setSelectedDiscipline('All');
  };

  // Filter logic
  const filteredTrades = useMemo(() => {
    return trades
      .filter((trade) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            trade.symbol?.toLowerCase().includes(q) ||
            trade.strategy?.toLowerCase().includes(q) ||
            trade.notes?.toLowerCase().includes(q) ||
            trade.entryReason?.toLowerCase().includes(q) ||
            trade.exitReason?.toLowerCase().includes(q) ||
            (trade.ruleViolations && trade.ruleViolations.some((v) => v.toLowerCase().includes(q)));
          if (!matches) return false;
        }

        if (selectedTradeType !== 'All') {
          const type = getTradeType(trade);
          if (type !== selectedTradeType) return false;
        }

        if (selectedOutcome === 'Wins' && trade.netPnL <= 0) return false;
        if (selectedOutcome === 'Losses' && trade.netPnL >= 0) return false;
        if (selectedOutcome === 'Breakeven' && trade.netPnL !== 0) return false;

        if (selectedDiscipline === 'Followed' && !trade.ruleFollowed) return false;
        if (selectedDiscipline === 'Violated' && trade.ruleFollowed) return false;

        if (selectedDateRange !== 'All') {
          const tradeDate = new Date(trade.date);
          const today = new Date();
          if (selectedDateRange === 'Today') {
            if (trade.date !== today.toISOString().slice(0, 10)) return false;
          } else if (selectedDateRange === '7days') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 7);
            if (tradeDate < sevenDaysAgo) return false;
          } else if (selectedDateRange === 'thisMonth') {
            const currentMonth = today.toISOString().slice(0, 7);
            if (!trade.date.startsWith(currentMonth)) return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(`${b.date}T${b.entryTime || '09:15'}`) - new Date(`${a.date}T${a.entryTime || '09:15'}`));
  }, [trades, searchQuery, selectedTradeType, selectedOutcome, selectedDiscipline, selectedDateRange]);

  const toggleSelectTrade = (id, e) => {
    e?.stopPropagation();
    setSelectedTradeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-32 max-w-4xl mx-auto w-full min-w-0">
      {/* 1. Neon Hero Banner Card ("Trading Journal") */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#041d0e] via-[#092e18] to-[#051109] border border-emerald-500/30 p-3.5 sm:p-4 shadow-2xl">
        {/* Subtle background ambient mesh glow */}
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Left circular icon badge */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,255,102,0.25)]">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-tight">
                Trading Journal
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-300/90 leading-tight mt-0.5 line-clamp-2">
                Record your option trade and grow with the journal
              </p>
            </div>
          </div>

          {/* Right Action Controls: Plus CTA & CSV Import */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {/* Glowing + CTA Button */}
            <button
              type="button"
              onClick={() => setShowQuickEntry(!showQuickEntry)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/70 border-2 border-[#00ff66] text-[#00ff66] flex items-center justify-center shadow-[0_0_14px_rgba(0,255,102,0.45)] hover:scale-105 active:scale-95 transition"
              title={showQuickEntry ? 'Close Form' : 'Log New Trade'}
              aria-label="Add Trade"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </button>

            {/* CSV Broker File Import Icon */}
            <button
              type="button"
              onClick={onOpenContractNoteModal}
              className="w-9 h-10 sm:w-10 sm:h-11 rounded-lg bg-emerald-950/70 border border-emerald-500/40 hover:border-emerald-400 text-white flex flex-col items-center justify-center relative p-1 active:scale-95 transition shadow-sm"
              title="Import Broker CSV / Excel"
              aria-label="Import CSV"
            >
              <div className="text-[8px] sm:text-[9px] font-black text-emerald-400 leading-none">CSV</div>
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 mt-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Collapsible Quick Entry Form */}
      {showQuickEntry && (
        <div className="p-4 rounded-2xl bg-[#0b0d0e] border border-emerald-500/40 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Log Trade Execution</span>
            </h3>
            <button
              onClick={() => setShowQuickEntry(false)}
              className="text-neutral-400 hover:text-white text-xs px-2 py-1 rounded"
            >
              Close ✕
            </button>
          </div>

          <form onSubmit={handleQuickSubmit} className="space-y-4 text-xs sm:text-sm">
            {/* Section 1: Contract & Quantity */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                1. Contract & Quantity Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Trade Date</label>
                  <input
                    type="date"
                    value={quickForm.date}
                    onChange={(e) => handleQuickFormChange('date', e.target.value)}
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Instrument / Contract</label>
                  <input
                    type="text"
                    value={quickForm.symbol}
                    onChange={(e) => handleQuickFormChange('symbol', e.target.value)}
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2 text-base sm:text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. NIFTY 25750 PE"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Option Type</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#111111] p-1 rounded-xl border border-neutral-700">
                    <button
                      type="button"
                      onClick={() => handleQuickFormChange('tradeType', 'Call')}
                      className={`py-1.5 rounded-lg text-xs font-black transition active:scale-95 ${
                        quickForm.tradeType === 'Call' ? 'bg-[#064e27] text-white shadow' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      CALL (CE)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFormChange('tradeType', 'Put')}
                      className={`py-1.5 rounded-lg text-xs font-black transition active:scale-95 ${
                        quickForm.tradeType === 'Put' ? 'bg-[#3b1112] text-white shadow' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      PUT (PE)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Expiry Date</label>
                  <input
                    type="date"
                    value={quickForm.expiryDate}
                    onChange={(e) => handleQuickFormChange('expiryDate', e.target.value)}
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Suggestions strip */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-neutral-500">Suggestions:</span>
                {instrumentSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleQuickFormChange('symbol', s)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Strike Warning Banner */}
              {instrumentAnalysis.warning && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{instrumentAnalysis.warning}</span>
                  </div>
                  {instrumentAnalysis.suggested && (
                    <button
                      type="button"
                      onClick={() => {
                        const fixed = `${instrumentAnalysis.underlying} ${instrumentAnalysis.suggested} ${instrumentAnalysis.optType}`;
                        handleQuickFormChange('symbol', fixed);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-bold text-[11px]"
                    >
                      Fix to {instrumentAnalysis.suggested}
                    </button>
                  )}
                </div>
              )}

              {/* Lots & Lot Size Calculator */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Lots</label>
                  <input
                    type="number"
                    min="1"
                    value={quickForm.lots}
                    onChange={(e) => handleQuickFormChange('lots', e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Lot Size</label>
                  <input
                    type="number"
                    min="1"
                    value={quickForm.lotSize}
                    onChange={(e) => handleQuickFormChange('lotSize', e.target.value)}
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Total Quantity</label>
                  <input
                    type="number"
                    value={quickForm.quantity}
                    onChange={(e) => handleQuickFormChange('quantity', e.target.value)}
                    placeholder="lots × size"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2 text-base sm:text-xs text-emerald-400 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Prices & Execution */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                2. Execution Prices & Setup
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Entry Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={quickForm.entryPrice}
                    onChange={(e) => handleQuickFormChange('entryPrice', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Exit Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={quickForm.exitPrice}
                    onChange={(e) => handleQuickFormChange('exitPrice', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Strategy</label>
                  <input
                    type="text"
                    value={quickForm.strategy}
                    onChange={(e) => handleQuickFormChange('strategy', e.target.value)}
                    placeholder="e.g. BREAKOUT"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Discipline</label>
                  <select
                    value={quickForm.mistake}
                    onChange={(e) => handleQuickFormChange('mistake', e.target.value)}
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                  >
                    {RULE_VIOLATIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Duplicate Detection Warning */}
            {duplicateWarning && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/50 text-amber-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            {/* Sticky Live P&L Preview & Submit Footer */}
            <div className="p-3 sm:p-4 rounded-xl bg-black border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl">
              <div className="flex items-center space-x-6 text-xs sm:text-sm">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Gross P&L</span>
                  <div className={`font-black text-sm sm:text-base ${quickForm.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {formatINR(quickForm.grossProfit)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Charges (₹)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={quickForm.charges}
                    onChange={(e) => handleQuickFormChange('charges', e.target.value)}
                    className="w-16 bg-[#111111] border border-neutral-700 rounded px-1.5 py-0.5 text-xs font-bold text-amber-400"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Net Realized</span>
                  <div className={`font-black text-base sm:text-lg ${quickForm.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {formatINR(quickForm.netProfit)}
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickEntry(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                >
                  Save Trade Record
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 3. Search & Equalizer Filter Row */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          {/* Search Input Container */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trades, symbols..."
              className="w-full bg-[#0c0e10] border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Equalizer Sliders Filter Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`w-11 h-11 rounded-xl bg-[#0c0e10] border flex items-center justify-center shrink-0 active:scale-95 transition ${
              hasActiveFilters
                ? 'border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(0,230,118,0.3)]'
                : 'border-neutral-800 text-[#00e676] hover:border-neutral-700'
            }`}
            title="Filter Trades"
            aria-label="Filter Trades"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Expandable Filter Drawer */}
        {showFilters && (
          <div className="p-3.5 rounded-xl bg-[#0c0e10] border border-neutral-800 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Filter Trades</span>
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">Option Type</label>
                <select
                  value={selectedTradeType}
                  onChange={(e) => setSelectedTradeType(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs"
                >
                  <option value="All">All Types</option>
                  <option value="Call">Call (CE)</option>
                  <option value="Put">Put (PE)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">Outcome</label>
                <select
                  value={selectedOutcome}
                  onChange={(e) => setSelectedOutcome(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs"
                >
                  <option value="All">All Outcomes</option>
                  <option value="Wins">Profit Only</option>
                  <option value="Losses">Loss Only</option>
                  <option value="Breakeven">Breakeven</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">Time Range</label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs"
                >
                  <option value="All">All Time</option>
                  <option value="Today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="thisMonth">This Month</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">Discipline</label>
                <select
                  value={selectedDiscipline}
                  onChange={(e) => setSelectedDiscipline(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs"
                >
                  <option value="All">All Trades</option>
                  <option value="Followed">No Mistakes</option>
                  <option value="Violated">With Mistakes</option>
                </select>
              </div>
            </div>

            {/* View Switcher: Cards vs Table */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
              <span className="text-neutral-400 text-[11px]">Display Mode:</span>
              <div className="flex items-center space-x-1 bg-black p-0.5 rounded-lg border border-neutral-800">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1 ${
                    viewMode === 'cards' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>Cards</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1 ${
                    viewMode === 'table' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
                  }`}
                >
                  <List className="w-3 h-3" />
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Select Action Bar (shown when items are selected) */}
      {selectedTradeIds.length > 0 && (
        <div className="p-3 rounded-2xl bg-[#0b0d0e] border border-neutral-800 flex items-center justify-between text-xs shadow-md animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <span className="text-neutral-300 font-bold">
              <strong className="text-emerald-400">{selectedTradeIds.length}</strong> trades selected
            </span>
            <button
              onClick={() => setSelectedTradeIds([])}
              className="text-neutral-400 hover:text-white underline ml-2"
            >
              Deselect
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsConfirmBulkDeleteOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 font-bold active:scale-95 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* 4. Trade Cards List — Exactly 3 Entries Visible with Snap-by-Snap Scrolling */}
      {viewMode === 'cards' ? (
        <div className="space-y-2">
          {filteredTrades.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#0c0e10] border border-neutral-800/80 text-neutral-400 space-y-2">
              <div className="text-sm font-bold text-white">
                {trades.length === 0 ? 'No trades recorded yet' : 'No matching trades'}
              </div>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                {trades.length === 0
                  ? 'Tap the glowing + button above to log your first trade execution.'
                  : 'No entries match your search query or selected filter criteria.'}
              </p>
            </div>
          ) : (
            <>
              {/* Stepper Status Bar (Showing Entries X–Y of N with Up/Down Controls) */}
              <div className="flex items-center justify-between px-1 text-xs text-neutral-400">
                <span className="font-semibold text-[11px] text-neutral-400">
                  Showing entries{' '}
                  <strong className="text-white font-bold">
                    {currentVisibleIndex + 1}
                    –
                    {Math.min(currentVisibleIndex + 3, filteredTrades.length)}
                  </strong>{' '}
                  of <strong className="text-emerald-400 font-bold">{filteredTrades.length}</strong>
                </span>

                {filteredTrades.length > 3 && (
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={currentVisibleIndex <= 0}
                      onClick={() => handleScrollStep('up')}
                      className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 disabled:opacity-25 disabled:cursor-not-allowed hover:bg-neutral-800 text-neutral-200 flex items-center justify-center transition active:scale-95"
                      title="Scroll Up (Previous Entry)"
                      aria-label="Previous Entry"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentVisibleIndex >= filteredTrades.length - 3}
                      onClick={() => handleScrollStep('down')}
                      className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 disabled:opacity-25 disabled:cursor-not-allowed hover:bg-neutral-800 text-neutral-200 flex items-center justify-center transition active:scale-95"
                      title="Scroll Down (Next Entry)"
                      aria-label="Next Entry"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Exact 3-Entry Scroll Container (Snaps card by card, never cuts off an entry) */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="overflow-y-auto snap-y snap-mandatory scroll-smooth space-y-2.5 rounded-2xl scrollbar-none touch-pan-y overscroll-contain pr-0.5"
                style={{
                  height: filteredTrades.length <= 3
                    ? `${filteredTrades.length * CARD_HEIGHT + Math.max(0, filteredTrades.length - 1) * CARD_GAP}px`
                    : `${3 * CARD_HEIGHT + 2 * CARD_GAP}px`, // exactly 380px fits 3 cards without cutting any entry in half
                  scrollSnapType: 'y mandatory',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {filteredTrades.map((trade) => {
                  const isProfit = Number(trade.netPnL) >= 0;
                  const tradeType = getTradeType(trade);
                  const isCall = tradeType === 'Call';
                  const isSelected = selectedTradeIds.includes(trade.id);
                  const lotCount = trade.lots || Math.round(Number(trade.quantity) / (trade.lotSize || 25)) || 1;

                  return (
                    <div
                      key={trade.id}
                      onClick={() => onViewTrade(trade)}
                      className={`snap-start snap-always shrink-0 relative bg-[#0c0e10] border rounded-2xl p-3 sm:p-3.5 transition-all duration-150 cursor-pointer hover:border-neutral-700 active:scale-[0.99] shadow-lg overflow-hidden flex flex-col justify-between select-none ${
                        isSelected ? 'border-emerald-500/80 bg-emerald-500/[0.04]' : 'border-neutral-800/80'
                      }`}
                      style={{
                        height: `${CARD_HEIGHT}px`,
                        minHeight: `${CARD_HEIGHT}px`,
                        maxHeight: `${CARD_HEIGHT}px`,
                      }}
                    >
                      {/* Signature Left Neon Green Glowing Edge Accent */}
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#00ff66] rounded-r shadow-[0_0_8px_#00ff66]" />

                      {/* Row 1: Option Badge + Symbol on Left, P&L Pill + Chevron on Right */}
                      <div className="flex items-center justify-between gap-2 pl-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          {/* Selection checkbox if multi-select active */}
                          {selectedTradeIds.length > 0 && (
                            <div onClick={(e) => toggleSelectTrade(trade.id, e)} className="shrink-0 mr-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-900 text-emerald-500 cursor-pointer"
                              />
                            </div>
                          )}

                          {/* CALL / PUT Badge */}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase shrink-0 leading-none ${
                              isCall ? 'bg-[#064e27] text-white' : 'bg-[#3b1112] text-white'
                            }`}
                          >
                            {isCall ? 'CALL' : 'PUT'}
                          </span>

                          {/* Contract Symbol */}
                          <h3 className="text-xs sm:text-sm font-black text-white truncate tracking-tight leading-none">
                            {trade.symbol}
                          </h3>
                        </div>

                        {/* Right: P&L Pill & Chevron */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <div
                            className={`px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold flex items-center space-x-0.5 leading-none ${
                              isProfit
                                ? 'bg-[#042f1a] border border-[#16a34a]/60 text-[#00ff7f]'
                                : 'bg-[#3b0d0c] border border-[#991b1b]/60 text-[#ff6b6b]'
                            }`}
                          >
                            <span>{formatINR(Math.abs(trade.netPnL))}</span>
                            {isProfit ? (
                              <TrendingUp className="w-3 h-3 inline ml-0.5 text-[#00ff7f]" />
                            ) : (
                              <TrendingDown className="w-3 h-3 inline ml-0.5 text-[#ff6b6b]" />
                            )}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        </div>
                      </div>

                      {/* Row 2: Date & Time with Calendar Icon */}
                      <div className="flex items-center space-x-1.5 text-[11px] text-neutral-400 pl-2 font-medium leading-none">
                        <Calendar className="w-3 h-3 text-neutral-500 shrink-0" />
                        <span>
                          {formatIndianDate(trade.date)} • {trade.entryTime || '09:30'}
                        </span>
                      </div>

                      {/* Row 3: 3-Column Execution Footer with Vertical Dividers */}
                      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-neutral-800/80 pl-2">
                        {/* Column 1: Qty */}
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1 text-[10px] text-neutral-400 font-medium mb-0.5 leading-none">
                            <Box className="w-2.5 h-2.5 text-neutral-500 shrink-0" />
                            <span>Qty</span>
                          </div>
                          <div className="text-[11px] sm:text-xs font-bold text-white truncate leading-none">
                            {trade.quantity}{' '}
                            <span className="text-neutral-400 font-normal text-[10px]">
                              ({lotCount}L)
                            </span>
                          </div>
                        </div>

                        {/* Column 2: Execution */}
                        <div className="min-w-0 border-l border-neutral-800/80 pl-2">
                          <div className="flex items-center space-x-1 text-[10px] text-neutral-400 font-medium mb-0.5 leading-none">
                            <Play className="w-2.5 h-2.5 text-neutral-500 shrink-0" />
                            <span>Execution</span>
                          </div>
                          <div className="text-[11px] sm:text-xs font-semibold text-neutral-200 truncate leading-none">
                            ₹{trade.entryPrice} → ₹{trade.exitPrice}
                          </div>
                        </div>

                        {/* Column 3: Strategy */}
                        <div className="min-w-0 border-l border-neutral-800/80 pl-2">
                          <div className="flex items-center space-x-1 text-[10px] text-neutral-400 font-medium mb-0.5 leading-none">
                            <Target className="w-2.5 h-2.5 text-neutral-500 shrink-0" />
                            <span>Strategy</span>
                          </div>
                          <div className="text-[11px] sm:text-xs font-bold text-white uppercase truncate leading-none">
                            {trade.strategy || 'BREAKOUT'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Pinned Table View Fallback */
        <div className="rounded-2xl bg-[#0c0e10] border border-neutral-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-xs text-left">
              <thead className="bg-black text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-3 sticky left-0 z-20 bg-black font-bold">Date</th>
                  <th className="py-3 px-3 font-bold">Type</th>
                  <th className="py-3 px-3 font-bold">Instrument</th>
                  <th className="py-3 px-3 font-bold">Qty</th>
                  <th className="py-3 px-3 font-bold">Entry</th>
                  <th className="py-3 px-3 font-bold">Exit</th>
                  <th className="py-3 px-3 font-bold">Charges</th>
                  <th className="py-3 px-3 sticky right-0 z-20 bg-black font-bold text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-medium">
                {filteredTrades.map((trade) => {
                  const isProfit = Number(trade.netPnL) >= 0;
                  const tradeType = getTradeType(trade);
                  return (
                    <tr
                      key={trade.id}
                      onClick={() => onViewTrade(trade)}
                      className="hover:bg-neutral-900/60 cursor-pointer transition"
                    >
                      <td className="py-3 px-3 whitespace-nowrap sticky left-0 z-10 bg-[#0c0e10] font-semibold text-neutral-300">
                        {formatIndianDate(trade.date)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                            tradeType === 'Call' ? 'bg-[#064e27] text-white' : 'bg-[#3b1112] text-white'
                          }`}
                        >
                          {tradeType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white whitespace-nowrap">{trade.symbol}</td>
                      <td className="py-3 px-3 text-neutral-300">{trade.quantity}</td>
                      <td className="py-3 px-3 text-neutral-300">₹{trade.entryPrice}</td>
                      <td className="py-3 px-3 text-neutral-300">₹{trade.exitPrice}</td>
                      <td className="py-3 px-3 text-amber-400">₹{trade.charges}</td>
                      <td
                        className={`py-3 px-3 whitespace-nowrap sticky right-0 z-10 bg-[#0c0e10] text-right font-black ${
                          isProfit ? 'text-emerald-400' : 'text-rose-500'
                        }`}
                      >
                        {formatINR(trade.netPnL)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Delete */}
      {isConfirmBulkDeleteOpen && (
        <ConfirmDeleteModal
          isOpen={isConfirmBulkDeleteOpen}
          onClose={() => setIsConfirmBulkDeleteOpen(false)}
          onConfirm={() => {
            onDeleteMultipleTrades(selectedTradeIds);
            setSelectedTradeIds([]);
            setIsConfirmBulkDeleteOpen(false);
          }}
          title={`Delete ${selectedTradeIds.length} Selected Trades?`}
          description="Are you sure you want to permanently delete these selected trades? This action cannot be undone."
        />
      )}
    </div>
  );
}
