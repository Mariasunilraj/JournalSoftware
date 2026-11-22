import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Eye,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Sparkles,
  BookOpen,
  Calendar,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { RULE_VIOLATIONS, INDEX_CONFIG } from '../utils/constants';
import { formatINR, formatIndianDate, parseToISODate } from '../utils/calculations';
import { exportTradesCSV } from '../utils/storage';
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
  // Mobile check: default to card view and collapse form on mobile
  const [viewMode, setViewMode] = useState('cards');
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [userEditedCharges, setUserEditedCharges] = useState(false);

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

    // Standard pattern: INDEX/STOCK + STRIKE + CE/PE
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

  // Planned Risk:Reward and Actual R Multiple
  const riskRewardMetrics = useMemo(() => {
    const entry = parseFloat(quickForm.entryPrice) || 0;
    const exit = parseFloat(quickForm.exitPrice) || 0;
    const sl = parseFloat(quickForm.stopLoss) || 0;
    const tgt = parseFloat(quickForm.target) || 0;
    const qty = parseFloat(quickForm.quantity) || 0;

    let plannedRisk = 0;
    let plannedReward = 0;
    let plannedRR = '-';
    let actualR = '-';

    if (entry > 0 && sl > 0) {
      const riskPerShare = Math.abs(entry - sl);
      plannedRisk = riskPerShare * qty;

      if (tgt > 0) {
        const rewardPerShare = Math.abs(tgt - entry);
        plannedReward = rewardPerShare * qty;
        if (riskPerShare > 0) {
          plannedRR = `1:${(rewardPerShare / riskPerShare).toFixed(2)}`;
        }
      }

      if (exit > 0 && riskPerShare > 0) {
        const actualDiff = exit - entry;
        const rVal = (actualDiff / riskPerShare).toFixed(2);
        actualR = `${Number(rVal) > 0 ? '+' : ''}${rVal}R`;
      }
    }

    return { plannedRisk, plannedReward, plannedRR, actualR };
  }, [quickForm.entryPrice, quickForm.exitPrice, quickForm.stopLoss, quickForm.target, quickForm.quantity]);

  // Handle Quick Form field changes with auto-calculations
  const handleQuickFormChange = (field, val) => {
    setQuickForm((prev) => {
      const updated = { ...prev, [field]: val };

      if (field === 'charges') {
        setUserEditedCharges(true);
      }

      // Auto update symbol CE / PE if tradeType changes
      if (field === 'tradeType' && prev.symbol) {
        if (val === 'Call') {
          updated.symbol = prev.symbol.replace(/PE/g, 'CE');
          if (!updated.symbol.includes('CE')) updated.symbol = `${prev.symbol} CE`;
        } else if (val === 'Put') {
          updated.symbol = prev.symbol.replace(/CE/g, 'PE');
          if (!updated.symbol.includes('PE')) updated.symbol = `${prev.symbol} PE`;
        }
      }

      // Auto-fill lot size and strike when symbol changes
      if (field === 'symbol') {
        const symUpper = (val || '').toUpperCase();
        let defaultLot = 25;
        if (symUpper.includes('BANKNIFTY')) defaultLot = 15;
        else if (symUpper.includes('SENSEX')) defaultLot = 10;
        else if (symUpper.includes('FINNIFTY')) defaultLot = 25;
        else if (symUpper.includes('MIDCPNIFTY')) defaultLot = 50;
        else if (symUpper.includes('BANKEX')) defaultLot = 15;
        updated.lotSize = defaultLot;

        // Auto parse strike
        const numMatch = symUpper.match(/\d{4,6}/);
        if (numMatch) {
          updated.strikePrice = numMatch[0];
        }

        // Auto-update qty if lots is set
        if (updated.lots && Number(updated.lots) > 0) {
          updated.quantity = Number(updated.lots) * defaultLot;
        }
      }

      // If lots change, update quantity = lots * lotSize
      if (field === 'lots') {
        const lts = parseFloat(val) || 0;
        const lSize = parseFloat(prev.lotSize) || 25;
        updated.quantity = lts > 0 ? lts * lSize : '';
      }

      // If lotSize changes, update quantity = lots * lotSize
      if (field === 'lotSize') {
        const lSize = parseFloat(val) || 1;
        const lts = parseFloat(prev.lots) || 0;
        if (lts > 0) {
          updated.quantity = lts * lSize;
        }
      }

      // If quantity changes manually, update lots = qty / lotSize
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

      // P&L calculation: (Exit - Entry) * Qty for options
      if (entry > 0 && exit > 0 && qty > 0) {
        const gross = (exit - entry) * qty;

        if (field !== 'charges' && !userEditedCharges) {
          const breakdown = calculateIndianCharges({
            segment: 'Options',
            direction: 'Long',
            optionAction: 'Buy',
            entryPrice: entry,
            exitPrice: exit,
            quantity: qty,
            symbol: updated.symbol,
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
        segment: 'Options',
        direction: 'Long',
        optionAction: 'Buy',
        entryPrice: entry,
        exitPrice: exit,
        quantity: qty,
        symbol: quickForm.symbol,
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
      entryTime: '09:30',
      exitTime: '10:15',
      symbol: quickForm.symbol.trim(),
      underlying,
      exchange,
      segment: 'Options',
      direction: 'Long',
      optionType: isCall ? 'CE' : 'PE',
      optionAction: 'Buy',
      tradeType: quickForm.tradeType,
      strikePrice: parseFloat(quickForm.strikePrice) || (parseFloat(quickForm.symbol.replace(/\D/g, '')) || 25000),
      expiryDate: quickForm.expiryDate || quickForm.date,
      lotSize: Number(quickForm.lotSize) || 25,
      lots: Number(quickForm.lots) || 1,
      quantity: qty,
      entryPrice: entry,
      exitPrice: exit,
      stopLoss: parseFloat(quickForm.stopLoss) || 0,
      target: parseFloat(quickForm.target) || 0,
      grossPnL: gross,
      charges: charges,
      netPnL: net,
      marginUsed: entry * qty || 0,
      strategy: quickForm.strategy || quickForm.entryReason || 'Intraday Options',
      ruleFollowed: !isMistake,
      ruleViolations: isMistake ? [quickForm.mistake] : [],
      entryEmotion: 'Confident',
      exitEmotion: 'Disciplined',
      entryReason: quickForm.entryReason,
      exitReason: quickForm.exitReason,
      notes: `Gross ₹${gross} - Charges ₹${charges} = Net ₹${net}. ${isMistake ? `Mistake: ${quickForm.mistake}.` : ''}`,
      status: 'Closed',
      screenshots: [],
    };

    if (onSaveTrade) {
      onSaveTrade(newTrade);
    }

    // Reset quick form
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
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Multi-select state
  const [selectedTradeIds, setSelectedTradeIds] = useState([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);

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
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'date') {
          valA = new Date(`${a.date}T${a.entryTime || '09:15'}`);
          valB = new Date(`${b.date}T${b.entryTime || '09:15'}`);
        } else if (sortField === 'netPnL' || sortField === 'grossPnL' || sortField === 'quantity') {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [trades, searchQuery, selectedTradeType, selectedOutcome, selectedDiscipline, selectedDateRange, sortField, sortOrder]);

  const toggleSelectTrade = (id) => {
    setSelectedTradeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedTradeIds.length === filteredTrades.length) {
      setSelectedTradeIds([]);
    } else {
      setSelectedTradeIds(filteredTrades.map((t) => t.id));
    }
  };

  const isAllSelected = filteredTrades.length > 0 && selectedTradeIds.length === filteredTrades.length;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-32">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#090909] border border-neutral-800 p-3.5 sm:p-4 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-black text-white">Trading Journal</h2>
            <span className="text-xs text-neutral-400 font-semibold">({trades.length} Total Trades)</span>
          </div>
          <p className="text-xs text-neutral-300 mt-0.5">
            Log options executions, verify statutory charges, track planned vs actual risk
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle form button */}
          <button
            type="button"
            onClick={() => setShowQuickEntry(!showQuickEntry)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>{showQuickEntry ? 'Hide Trade Form' : '+ Log Trade'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenContractNoteModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-bold border border-neutral-800 transition min-h-[44px]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden xs:inline">Import Broker File</span>
          </button>
        </div>
      </div>

      {/* Collapsible Journal Entry Form */}
      {showQuickEntry && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Log Trade Execution</span>
            </h3>
            <button
              onClick={() => setShowQuickEntry(false)}
              className="text-neutral-400 hover:text-white text-xs"
            >
              Close ✕
            </button>
          </div>

          <form onSubmit={handleQuickSubmit} className="space-y-4 text-xs sm:text-sm">
            {/* Section 1: Trade Details */}
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
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white font-semibold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Instrument / Contract</label>
                  <input
                    type="text"
                    value={quickForm.symbol}
                    onChange={(e) => handleQuickFormChange('symbol', e.target.value)}
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. NIFTY 24900 CE"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Option Type</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#111111] p-1 rounded-xl border border-neutral-700">
                    <button
                      type="button"
                      onClick={() => handleQuickFormChange('tradeType', 'Call')}
                      className={`py-2 rounded-lg text-xs font-black transition active:scale-95 ${
                        quickForm.tradeType === 'Call' ? 'bg-emerald-500 text-black shadow' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Call (CE)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFormChange('tradeType', 'Put')}
                      className={`py-2 rounded-lg text-xs font-black transition active:scale-95 ${
                        quickForm.tradeType === 'Put' ? 'bg-rose-500 text-white shadow' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Put (PE)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Expiry Date</label>
                  <input
                    type="date"
                    value={quickForm.expiryDate}
                    onChange={(e) => handleQuickFormChange('expiryDate', e.target.value)}
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white font-semibold focus:outline-none focus:border-emerald-500"
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

              {/* Unrealistic Strike Warning Banner */}
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
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Lot Size</label>
                  <input
                    type="number"
                    min="1"
                    value={quickForm.lotSize}
                    onChange={(e) => handleQuickFormChange('lotSize', e.target.value)}
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Total Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quickForm.quantity}
                    onChange={(e) => handleQuickFormChange('quantity', e.target.value)}
                    placeholder="Lots × Size"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-emerald-400 font-black"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Prices, Risk:Reward & Levies */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                2. Execution Prices & Risk Parameters
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Entry Price (₹)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.05"
                    value={quickForm.entryPrice}
                    onChange={(e) => handleQuickFormChange('entryPrice', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Exit Price (₹)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.05"
                    value={quickForm.exitPrice}
                    onChange={(e) => handleQuickFormChange('exitPrice', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Stop-Loss (₹)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.05"
                    value={quickForm.stopLoss}
                    onChange={(e) => handleQuickFormChange('stopLoss', e.target.value)}
                    placeholder="e.g. 180"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Target (₹)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.05"
                    value={quickForm.target}
                    onChange={(e) => handleQuickFormChange('target', e.target.value)}
                    placeholder="e.g. 260"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white"
                  />
                </div>
              </div>

              {/* R:R Preview pill */}
              <div className="flex items-center space-x-3 text-xs bg-black p-2.5 rounded-xl border border-neutral-850">
                <span className="text-neutral-400">Planned R:R: <strong className="text-white">{riskRewardMetrics.plannedRR}</strong></span>
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-400">Actual R Multiple: <strong className={riskRewardMetrics.actualR.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}>{riskRewardMetrics.actualR}</strong></span>
              </div>
            </div>

            {/* Section 3: Reasoning & Mistakes */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                3. Trade Reasoning & Discipline
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Entry Reason</label>
                  <input
                    type="text"
                    value={quickForm.entryReason}
                    onChange={(e) => handleQuickFormChange('entryReason', e.target.value)}
                    placeholder="e.g. VWAP bounce, breakout"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Exit Reason</label>
                  <input
                    type="text"
                    value={quickForm.exitReason}
                    onChange={(e) => handleQuickFormChange('exitReason', e.target.value)}
                    placeholder="e.g. Target reached, trailing SL hit"
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-semibold text-xs">Discipline / Mistakes</label>
                  <select
                    value={quickForm.mistake}
                    onChange={(e) => handleQuickFormChange('mistake', e.target.value)}
                    className="w-full bg-[#111111] border border-neutral-700 rounded-xl px-3 py-2.5 text-base text-white"
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
            <div className="sticky bottom-16 sm:bottom-0 z-10 p-3 sm:p-4 rounded-xl bg-black/95 backdrop-blur-md border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl">
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
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">Net P&L</span>
                  <div className={`font-black text-base sm:text-lg ${quickForm.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {formatINR(quickForm.netProfit)}
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickEntry(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition min-h-[44px]"
                >
                  Save Trade Record
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter and View-Mode Control Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#090909] border border-neutral-800 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol, strategy, reasons..."
              className="w-full bg-[#111111] border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center space-x-1 bg-black p-1 rounded-xl border border-neutral-800 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                viewMode === 'cards' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                viewMode === 'table' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <select
            value={selectedTradeType}
            onChange={(e) => setSelectedTradeType(e.target.value)}
            className="bg-[#111111] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white min-h-[36px]"
          >
            <option value="All">All Types (Call & Put)</option>
            <option value="Call">Call (CE) Only</option>
            <option value="Put">Put (PE) Only</option>
          </select>

          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="bg-[#111111] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white min-h-[36px]"
          >
            <option value="All">All Outcomes</option>
            <option value="Wins">Profit Only</option>
            <option value="Losses">Loss Only</option>
            <option value="Breakeven">Breakeven Only</option>
          </select>

          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="bg-[#111111] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white min-h-[36px]"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="thisMonth">This Month</option>
          </select>

          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="bg-[#111111] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white min-h-[36px]"
          >
            <option value="All">All Disciplines</option>
            <option value="Followed">No Mistakes</option>
            <option value="Violated">With Mistakes</option>
          </select>

          {(searchQuery || selectedTradeType !== 'All' || selectedOutcome !== 'All' || selectedDateRange !== 'All' || selectedDiscipline !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTradeType('All');
                setSelectedOutcome('All');
                setSelectedDateRange('All');
                setSelectedDiscipline('All');
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 min-h-[36px]"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Selection Control & Bulk Delete Action Bar */}
      {filteredTrades.length > 0 && (
        <div className="p-3 rounded-2xl bg-[#090909] border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer font-bold text-white select-none hover:text-emerald-400 transition min-h-[36px]">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span>Select All Trades ({filteredTrades.length})</span>
            </label>

            {selectedTradeIds.length > 0 && (
              <span className="text-neutral-400 text-xs">
                • <strong className="text-emerald-400 font-bold">{selectedTradeIds.length}</strong> selected
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {selectedTradeIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedTradeIds([])}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold border border-neutral-800 transition text-xs min-h-[36px]"
                >
                  Deselect All
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmBulkDeleteOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 font-bold shadow-sm transition active:scale-95 text-xs min-h-[36px]"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Selected ({selectedTradeIds.length})</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Journal Content: Cards or Pinned Table */}
      {viewMode === 'cards' ? (
        /* Journal Card View (Default on Mobile) */
        <div className="space-y-3">
          {filteredTrades.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#090909] border border-neutral-800 text-neutral-400 space-y-2">
              <div className="text-sm font-bold text-white">
                {trades.length === 0 ? 'No trades logged yet' : 'No matching trades'}
              </div>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                {trades.length === 0
                  ? 'Use the + Log Trade button above to record your first options or equity execution.'
                  : 'No entries match your search query or selected filter criteria.'}
              </p>
            </div>
          ) : (
            filteredTrades.map((trade) => {
              const isProfit = Number(trade.netPnL) >= 0;
              const hasMistake = !trade.ruleFollowed || (trade.ruleViolations && trade.ruleViolations.length > 0);
              const mistakeText = trade.ruleViolations && trade.ruleViolations.length > 0
                ? trade.ruleViolations.join(', ')
                : (hasMistake ? 'Rule Violated' : null);
              const tradeType = getTradeType(trade);
              const isSelected = selectedTradeIds.includes(trade.id);

              return (
                <div
                  key={trade.id}
                  onClick={() => onViewTrade(trade)}
                  className={`p-4 rounded-2xl bg-[#090909] border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'border-emerald-500/70 bg-emerald-500/[0.04] shadow-xl'
                      : 'border-neutral-800 hover:border-neutral-700 shadow-xl'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTrade(trade.id)}
                          className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 cursor-pointer"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-black text-white text-sm sm:text-base">{trade.symbol}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            tradeType === 'Call' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {tradeType.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {formatIndianDate(trade.date)} • {trade.entryTime || '09:15'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-black text-base sm:text-lg ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {formatINR(trade.netPnL)}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        Gross: {formatINR(trade.grossPnL)} • Chgs: {formatINR(trade.charges)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] p-2 rounded-xl bg-black border border-neutral-850">
                    <div>
                      <span className="text-neutral-500 block">Quantity</span>
                      <strong className="text-white font-bold">{trade.quantity}</strong>
                      {trade.lots ? <span className="text-neutral-500 text-[10px] ml-1">({trade.lots}L)</span> : null}
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Execution</span>
                      <strong className="text-neutral-200">₹{trade.entryPrice} → ₹{trade.exitPrice}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Strategy</span>
                      <span className="text-neutral-300 truncate block">{trade.strategy || 'Discretionary'}</span>
                    </div>
                  </div>

                  {mistakeText && (
                    <div className="text-[11px] text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                      Discipline: {mistakeText}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Pinned Table View: Date & Instrument pinned left, Net P&L pinned right */
        <div className="rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl overflow-hidden">
          {/* Horizontal scroll notice */}
          <div className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between sm:hidden">
            <span>Scroll horizontally for full execution details</span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          </div>

          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left text-xs sm:text-sm min-w-[750px]">
              <thead className="text-[11px] uppercase tracking-wider text-neutral-400 bg-[#111111] border-b border-neutral-800 select-none">
                <tr>
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500"
                    />
                  </th>
                  {/* Pinned Left: Date */}
                  <th
                    onClick={() => handleSort('date')}
                    className="sticky left-0 bg-[#111111] z-20 py-3 px-3.5 cursor-pointer hover:text-white whitespace-nowrap shadow-[1px_0_0_0_#262626]"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  {/* Pinned Left: Instrument */}
                  <th className="sticky left-24 sm:left-28 bg-[#111111] z-20 py-3 px-3.5 whitespace-nowrap shadow-[1px_0_0_0_#262626]">
                    Instrument
                  </th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Type</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Qty</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Entry</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Exit</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Gross</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Charges</th>
                  {/* Pinned Right: Net P&L */}
                  <th
                    onClick={() => handleSort('netPnL')}
                    className="sticky right-0 bg-[#111111] z-20 py-3 px-3.5 text-right cursor-pointer hover:text-white whitespace-nowrap shadow-[-1px_0_0_0_#262626]"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Net P&L</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-xs">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-10 text-center text-neutral-400">
                      No trades found.
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => {
                    const isProfit = Number(trade.netPnL) >= 0;
                    const tradeType = getTradeType(trade);
                    const isSelected = selectedTradeIds.includes(trade.id);

                    return (
                      <tr
                        key={trade.id}
                        onClick={() => onViewTrade(trade)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-500/10' : 'hover:bg-neutral-900/50'
                        }`}
                      >
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTrade(trade.id)}
                            className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500"
                          />
                        </td>
                        {/* Pinned Date column */}
                        <td className="sticky left-0 bg-[#090909] z-10 py-3 px-3.5 text-neutral-300 whitespace-nowrap font-semibold shadow-[1px_0_0_0_#262626]">
                          {formatIndianDate(trade.date)}
                        </td>
                        {/* Pinned Instrument column */}
                        <td className="sticky left-24 sm:left-28 bg-[#090909] z-10 py-3 px-3.5 font-bold text-white whitespace-nowrap shadow-[1px_0_0_0_#262626]">
                          {trade.symbol}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            tradeType === 'Call' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {tradeType.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-neutral-200 whitespace-nowrap font-bold">
                          {trade.quantity}
                        </td>
                        <td className="py-3 px-3.5 text-neutral-300 whitespace-nowrap">
                          ₹{trade.entryPrice}
                        </td>
                        <td className="py-3 px-3.5 text-neutral-300 whitespace-nowrap">
                          ₹{trade.exitPrice}
                        </td>
                        <td className={`py-3 px-3.5 font-semibold whitespace-nowrap ${trade.grossPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {formatINR(trade.grossPnL)}
                        </td>
                        <td className="py-3 px-3.5 text-amber-400 whitespace-nowrap">
                          {formatINR(trade.charges)}
                        </td>
                        {/* Pinned Net P&L column */}
                        <td className={`sticky right-0 bg-[#090909] z-10 py-3 px-3.5 text-right font-black whitespace-nowrap shadow-[-1px_0_0_0_#262626] ${
                          isProfit ? 'text-emerald-400' : 'text-rose-500'
                        }`}>
                          {formatINR(trade.netPnL)}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onViewTrade(trade)}
                              className="p-1 rounded text-neutral-400 hover:text-white"
                              title="View"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenTradeModal(trade)}
                              className="p-1 rounded text-neutral-400 hover:text-white"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTrade(trade);
                              }}
                              className="p-1 rounded text-neutral-400 hover:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={() => {
          if (onDeleteMultipleTrades) {
            onDeleteMultipleTrades(selectedTradeIds);
          } else {
            selectedTradeIds.forEach((id) => onDeleteTrade(id));
          }
          setSelectedTradeIds([]);
          setIsConfirmBulkDeleteOpen(false);
        }}
        title="Delete Selected Trades"
        itemName={`${selectedTradeIds.length} Trades Selected`}
        message={`Are you sure you want to permanently delete these ${selectedTradeIds.length} selected trades from your journal?`}
      />
    </div>
  );
}