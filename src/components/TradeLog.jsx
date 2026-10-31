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
} from 'lucide-react';
import { RULE_VIOLATIONS } from '../utils/constants';
import { formatINR } from '../utils/calculations';
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
  // Trade Journal Entry Form State: Trade Type is Call or Put
  const [showQuickEntry, setShowQuickEntry] = useState(true);
  const [userEditedCharges, setUserEditedCharges] = useState(false);
  const [quickForm, setQuickForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    symbol: '',
    tradeType: 'Call', // 'Call' or 'Put'
    entryPrice: '',
    exitPrice: '',
    quantity: '',
    grossProfit: 0,
    charges: 0,
    netProfit: 0,
    entryReason: '',
    exitReason: '',
    mistake: 'None - Followed Rules 100%',
    strategy: '',
  });

  // Automatically compute Gross and Net profit in Quick Form when prices/qty/charges change
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

      const entry = parseFloat(field === 'entryPrice' ? val : prev.entryPrice) || 0;
      const exit = parseFloat(field === 'exitPrice' ? val : prev.exitPrice) || 0;
      const qty = parseFloat(field === 'quantity' ? val : prev.quantity) || 0;
      let chgs = parseFloat(field === 'charges' ? val : prev.charges) || 0;

      // P&L calculation: (Exit - Entry) * Qty for options
      if (entry > 0 && exit > 0 && qty > 0) {
        const gross = (exit - entry) * qty;

        // Auto compute standard statutory charges if not manually modified by the user
        if (field !== 'charges' && !userEditedCharges) {
          const breakdown = calculateIndianCharges({
            segment: 'Options',
            direction: 'Long',
            optionAction: 'Buy',
            entryPrice: entry,
            exitPrice: exit,
            quantity: qty,
          });
          chgs = breakdown.totalCharges;
          updated.charges = chgs;
        }

        const net = gross - chgs;
        if (field !== 'grossProfit') updated.grossProfit = Number(gross.toFixed(2));
        if (field !== 'netProfit') updated.netProfit = Number(net.toFixed(2));
      } else {
        // If entry/exit/quantity are blank or 0, do NOT show phantom charges or negative net loss
        if (field !== 'charges' && !userEditedCharges) {
          chgs = 0;
          updated.charges = 0;
        }
        if (field !== 'grossProfit') updated.grossProfit = 0;

        if (field === 'charges' && userEditedCharges) {
          updated.netProfit = -chgs;
        } else {
          updated.netProfit = 0;
        }
      }

      return updated;
    });
  };

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!quickForm.symbol || !quickForm.date) {
      alert('Please fill symbol and trade date.');
      return;
    }

    const entry = parseFloat(quickForm.entryPrice) || 0;
    const exit = parseFloat(quickForm.exitPrice) || 0;
    const qty = parseFloat(quickForm.quantity) || 0;
    let charges = parseFloat(quickForm.charges) || 0;

    // Auto-calculate exact government statutory charges if 0 or unedited
    if ((charges === 0 || !userEditedCharges) && entry > 0 && exit > 0 && qty > 0) {
      const breakdown = calculateIndianCharges({
        segment: 'Options',
        direction: 'Long',
        optionAction: 'Buy',
        entryPrice: entry,
        exitPrice: exit,
        quantity: qty,
      });
      charges = breakdown.totalCharges;
    }

    const gross = parseFloat(quickForm.grossProfit) || Number(((exit - entry) * qty).toFixed(2));
    const net = Number((gross - charges).toFixed(2));

    const isCall = quickForm.tradeType === 'Call';
    const isMistake = quickForm.mistake && !quickForm.mistake.includes('None');

    // Detect underlying
    let underlying = 'NIFTY';
    const symUpper = (quickForm.symbol || '').toUpperCase();
    if (symUpper.includes('BANKNIFTY')) underlying = 'BANKNIFTY';
    else if (symUpper.includes('FINNIFTY')) underlying = 'FINNIFTY';
    else if (symUpper.includes('SENSEX')) underlying = 'SENSEX';
    else if (symUpper.includes('MIDCPNIFTY')) underlying = 'MIDCPNIFTY';

    const newTrade = {
      id: `TRD-${Date.now().toString().slice(-6)}`,
      date: quickForm.date,
      entryTime: '09:30',
      exitTime: '10:15',
      symbol: quickForm.symbol,
      underlying,
      exchange: 'NSE',
      segment: 'Options',
      direction: 'Long',
      optionType: isCall ? 'CE' : 'PE',
      optionAction: 'Buy',
      tradeType: quickForm.tradeType, // 'Call' or 'Put'
      strikePrice: parseFloat(quickForm.symbol.replace(/\D/g, '')) || 25000,
      expiryDate: quickForm.date,
      lotSize: underlying === 'BANKNIFTY' ? 15 : 25,
      lots: Math.max(1, Math.round(qty / (underlying === 'BANKNIFTY' ? 15 : 25))),
      quantity: qty,
      entryPrice: entry,
      exitPrice: exit,
      grossPnL: gross,
      charges: charges,
      netPnL: net,
      marginUsed: (entry * qty) || 0,
      stopLoss: 0,
      target: 0,
      strategy: quickForm.strategy || quickForm.entryReason || 'Intraday Options',
      ruleFollowed: !isMistake,
      ruleViolations: isMistake ? [quickForm.mistake] : [],
      entryEmotion: 'Confident',
      exitEmotion: 'Disciplined',
      entryReason: quickForm.entryReason,
      exitReason: quickForm.exitReason,
      notes: `Logged via Trade Journal Entry: Gross ₹${gross} - Charges ₹${charges} = Net ₹${net}. ${isMistake ? `Mistake: ${quickForm.mistake}.` : ''}`,
      status: 'Closed',
      screenshots: [],
    };

    if (onSaveTrade) {
      onSaveTrade(newTrade);
    }

    // Reset quick form to clean state
    setQuickForm({
      date: new Date().toISOString().slice(0, 10),
      symbol: '',
      tradeType: 'Call',
      entryPrice: '',
      exitPrice: '',
      quantity: '',
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

  // Helper to determine if a trade is Call or Put
  const getTradeType = (trade) => {
    if (trade.tradeType) return trade.tradeType;
    if (trade.optionType === 'CE' || trade.symbol?.includes('CE') || trade.direction === 'Long') return 'Call';
    if (trade.optionType === 'PE' || trade.symbol?.includes('PE')) return 'Put';
    return 'Call';
  };

  // View Mode: 'cards' or 'table'
  const [viewMode, setViewMode] = useState('cards');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTradeType, setSelectedTradeType] = useState('All'); // 'All', 'Call', 'Put'
  const [selectedOutcome, setSelectedOutcome] = useState('All');
  const [selectedDiscipline, setSelectedDiscipline] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('All');
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter logic
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      // Search
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

      // Trade Type filter (Call or Put)
      if (selectedTradeType !== 'All') {
        const type = getTradeType(trade);
        if (type !== selectedTradeType) return false;
      }

      // Outcome
      if (selectedOutcome === 'Wins' && trade.netPnL <= 0) return false;
      if (selectedOutcome === 'Losses' && trade.netPnL >= 0) return false;
      if (selectedOutcome === 'Breakeven' && trade.netPnL !== 0) return false;

      // Discipline
      if (selectedDiscipline === 'Followed' && !trade.ruleFollowed) return false;
      if (selectedDiscipline === 'Violated' && trade.ruleFollowed) return false;

      // Date range
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
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'date') {
        valA = new Date(`${a.date}T${a.entryTime || '09:15'}`);
        valB = new Date(`${b.date}T${b.entryTime || '09:15'}`);
      } else if (sortField === 'netPnL' || sortField === 'grossPnL' || sortField === 'quantity') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [
    trades,
    searchQuery,
    selectedTradeType,
    selectedOutcome,
    selectedDiscipline,
    selectedDateRange,
    sortField,
    sortOrder,
  ]);

  // Aggregate stats for filtered trades
  const filteredStats = useMemo(() => {
    let totalPnL = 0;
    let totalGross = 0;
    let totalCharges = 0;
    let wins = 0;
    let mistakesCount = 0;
    filteredTrades.forEach((t) => {
      totalPnL += Number(t.netPnL) || 0;
      totalGross += Number(t.grossPnL) || 0;
      totalCharges += Number(t.charges) || 0;
      if (Number(t.netPnL) > 0) wins++;
      if (!t.ruleFollowed) mistakesCount++;
    });
    const winRate = filteredTrades.length > 0 ? ((wins / filteredTrades.length) * 100).toFixed(1) : 0;
    return {
      totalPnL,
      totalGross,
      totalCharges,
      wins,
      mistakesCount,
      count: filteredTrades.length,
      winRate,
    };
  }, [filteredTrades]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Bulk Trade Selection & Mass Deletion
  const [selectedTradeIds, setSelectedTradeIds] = useState([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);

  const filteredIds = useMemo(() => filteredTrades.map((t) => t.id), [filteredTrades]);
  const isAllSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedTradeIds.includes(id));

  const handleToggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedTradeIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedTradeIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  }, [isAllSelected, filteredIds]);

  const toggleSelectTrade = useCallback((tradeId) => {
    setSelectedTradeIds((prev) =>
      prev.includes(tradeId) ? prev.filter((id) => id !== tradeId) : [...prev, tradeId]
    );
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              TRADING JOURNAL
            </h1>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              MAIN ACTIVITY
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-medium">
            Personal record for executions, Call/Put trades, charges, net profit, reasons & mistakes
          </p>
        </div>

        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {onOpenContractNoteModal && (
            <button
              onClick={onOpenContractNoteModal}
              title="Upload Broker Excel (.xlsx, .xls), CSV, or PDF (Zerodha, Groww, Angel One, Dhan, Upstox)"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-600/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 shadow-sm transition active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import Excel (.xlsx)</span>
            </button>
          )}

          <button
            onClick={() => exportTradesCSV(filteredTrades)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-bold border border-neutral-800 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Trade Journal Entry Form Card - Modern Jet Black Fintech Style */}
      <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-white">
              Trade Journal Entry
            </span>
            <span className="text-[10px] text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded font-medium">
              Log Call or Put Trade
            </span>
          </div>
          <button
            onClick={() => setShowQuickEntry(!showQuickEntry)}
            className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1 font-medium"
          >
            <span>{showQuickEntry ? 'Hide Form' : 'Show Form'}</span>
            {showQuickEntry ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showQuickEntry && (
          <form onSubmit={handleQuickSubmit} className="space-y-4 text-xs sm:text-sm">
            {/* Row 1: Date, Instrument, Trade Type (Call, Put), Entry price, Exit price, Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1 font-semibold text-xs sm:text-sm">Date</label>
                <input
                  type="date"
                  value={quickForm.date}
                  onChange={(e) => handleQuickFormChange('date', e.target.value)}
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm md:text-base text-white font-semibold focus:outline-none focus:border-neutral-600"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold text-xs sm:text-sm">Instrument</label>
                <input
                  type="text"
                  value={quickForm.symbol}
                  onChange={(e) => handleQuickFormChange('symbol', e.target.value)}
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm md:text-base text-white font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. NIFTY 25000 CE"
                  required
                />
              </div>

              {/* Trade Type changed to Call / Put */}
              <div>
                <label className="block text-neutral-400 mb-1 font-semibold text-xs sm:text-sm">Trade Type</label>
                <div className="grid grid-cols-2 gap-1 bg-[#111111] p-1 rounded-xl border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => handleQuickFormChange('tradeType', 'Call')}
                    className={`py-2 rounded-lg text-xs sm:text-sm font-black transition active:scale-95 ${
                      quickForm.tradeType === 'Call'
                        ? 'bg-emerald-500 text-black shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Call
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFormChange('tradeType', 'Put')}
                    className={`py-2 rounded-lg text-xs sm:text-sm font-black transition active:scale-95 ${
                      quickForm.tradeType === 'Put'
                        ? 'bg-rose-500 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Put
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold text-xs sm:text-sm">Entry Price (₹)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.05"
                  value={quickForm.entryPrice}
                  onChange={(e) => handleQuickFormChange('entryPrice', e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm md:text-base text-white font-semibold focus:outline-none focus:border-neutral-600"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold text-xs sm:text-sm">Exit Price (₹)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.05"
                  value={quickForm.exitPrice}
                  onChange={(e) => handleQuickFormChange('exitPrice', e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm md:text-base text-white font-semibold focus:outline-none focus:border-neutral-600"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold text-xs sm:text-sm">Quantity</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={quickForm.quantity}
                  onChange={(e) => handleQuickFormChange('quantity', e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm md:text-base text-white font-semibold focus:outline-none focus:border-neutral-600"
                  required
                />
              </div>
            </div>

            {/* Row 2: Reasons & Mistakes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1 font-semibold text-xs sm:text-sm">Entry Reason</label>
                <input
                  type="text"
                  value={quickForm.entryReason}
                  onChange={(e) => handleQuickFormChange('entryReason', e.target.value)}
                  placeholder="e.g. Breakout above resistance"
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold text-xs sm:text-sm">Exit Reason</label>
                <input
                  type="text"
                  value={quickForm.exitReason}
                  onChange={(e) => handleQuickFormChange('exitReason', e.target.value)}
                  placeholder="e.g. Target achieved"
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold text-xs sm:text-sm">Mistake / Rule Violation</label>
                <select
                  value={quickForm.mistake}
                  onChange={(e) => handleQuickFormChange('mistake', e.target.value)}
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-neutral-600"
                >
                  {RULE_VIOLATIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Live P&L Preview & Submit */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-black border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6">
                <div>
                  <span className="text-[11px] sm:text-xs text-neutral-500 uppercase font-bold tracking-wider block">Gross Profit</span>
                  <div className={`text-sm sm:text-base md:text-lg lg:text-xl font-extrabold mt-0.5 ${quickForm.grossProfit > 0 ? 'text-emerald-400' : quickForm.grossProfit < 0 ? 'text-rose-500' : 'text-neutral-400'}`}>
                    {formatINR(quickForm.grossProfit)}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] sm:text-xs text-neutral-500 uppercase font-bold tracking-wider block">Charges</span>
                  <div className="flex items-center space-x-1 mt-0.5">
                    <span className="text-amber-400 font-bold text-xs sm:text-sm">₹</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={quickForm.charges}
                      onChange={(e) => handleQuickFormChange('charges', e.target.value)}
                      className="w-14 sm:w-16 bg-[#111111] border border-neutral-800 rounded px-1.5 py-0.5 text-xs sm:text-sm text-amber-400 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] sm:text-xs text-neutral-500 uppercase font-bold tracking-wider block">Net Profit</span>
                  <div className={`text-base sm:text-lg md:text-xl lg:text-2xl font-black mt-0.5 ${quickForm.netProfit > 0 ? 'text-emerald-400' : quickForm.netProfit < 0 ? 'text-rose-500' : 'text-neutral-300'}`}>
                    {formatINR(quickForm.netProfit)}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm md:text-base shadow-lg transition transform active:scale-95"
              >
                Save Trade to Journal
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 3. Journal Summary Strip - High-Contrast Fintech Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 text-xs sm:text-sm">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800">
          <span className="text-neutral-400 font-medium text-xs sm:text-sm">Journal Net Profit:</span>
          <div className={`text-base sm:text-lg md:text-xl lg:text-2xl font-black mt-0.5 ${filteredStats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
            {formatINR(filteredStats.totalPnL)}
          </div>
          <div className="text-[11px] sm:text-xs text-neutral-500">Gross: {formatINR(filteredStats.totalGross)}</div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800">
          <span className="text-neutral-400 font-medium text-xs sm:text-sm">Total Charges Paid:</span>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-amber-400 mt-0.5">
            {formatINR(filteredStats.totalCharges)}
          </div>
          <div className="text-[11px] sm:text-xs text-neutral-500">Brokerage & STT</div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800">
          <span className="text-neutral-400 font-medium text-xs sm:text-sm">Win Rate:</span>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-white mt-0.5">
            {filteredStats.winRate}%
          </div>
          <div className="text-[11px] sm:text-xs text-neutral-500">{filteredStats.wins}W / {filteredStats.count - filteredStats.wins}L</div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800">
          <span className="text-neutral-400 font-medium text-xs sm:text-sm">Total Trades:</span>
          <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-cyan-400 mt-0.5">
            {filteredStats.count}
          </div>
          <div className="text-[11px] sm:text-xs text-neutral-500">In current filter</div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#090909] border border-neutral-800 col-span-2 sm:col-span-1">
          <span className="text-neutral-400 font-medium text-xs sm:text-sm">Rule Mistakes:</span>
          <div className={`text-base sm:text-lg md:text-xl lg:text-2xl font-black mt-0.5 ${filteredStats.mistakesCount > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
            {filteredStats.mistakesCount}
          </div>
          <div className="text-[11px] sm:text-xs text-neutral-500">Violations flagged</div>
        </div>
      </div>

      {/* 4. Filter Bar & View Mode Toggle */}
      <div className="p-4 rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol, reason, mistake..."
              className="w-full pl-9 pr-4 py-2 bg-[#111111] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center space-x-1 p-1 bg-[#111111] rounded-xl border border-neutral-800 text-xs font-semibold">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'cards'
                  ? 'bg-neutral-800 text-white font-bold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Journal Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'table'
                  ? 'bg-neutral-800 text-white font-bold shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Trade Type Filter: Call or Put */}
          <select
            value={selectedTradeType}
            onChange={(e) => setSelectedTradeType(e.target.value)}
            className="bg-[#111111] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="All">All Types (Call & Put)</option>
            <option value="Call">Call (CE) Only</option>
            <option value="Put">Put (PE) Only</option>
          </select>

          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="bg-[#111111] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="All">All Outcomes</option>
            <option value="Wins">Profit Only</option>
            <option value="Losses">Loss Only</option>
            <option value="Breakeven">Breakeven Only</option>
          </select>

          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="bg-[#111111] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="All">All Time</option>
            <option value="Today">Today (23 Oct)</option>
            <option value="7days">Last 7 Days</option>
            <option value="thisMonth">This Month</option>
          </select>

          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="bg-[#111111] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
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
              className="text-xs text-rose-500 hover:text-rose-400 font-bold px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Selection Control & Bulk Delete Action Bar */}
      {filteredTrades.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#090909] border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer font-bold text-white select-none hover:text-emerald-400 transition">
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
            {selectedTradeIds.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedTradeIds([])}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold border border-neutral-800 transition text-xs"
                >
                  Deselect All
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmBulkDeleteOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600/30 to-red-600/30 hover:from-rose-600/40 hover:to-red-600/40 text-rose-300 border border-rose-500/40 font-bold shadow-sm transition active:scale-95 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Selected ({selectedTradeIds.length})</span>
                </button>
              </>
            ) : (
              <span className="text-[11px] text-neutral-500 hidden sm:inline">
                Check boxes near any trade to select & delete
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5. Main Journal Entries Content */}
      {viewMode === 'cards' ? (
        /* JOURNAL CARD VIEW - Fintech Jet Black with Crisp Lines */
        <div className="space-y-4">
          {filteredTrades.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#090909] border border-neutral-800 text-neutral-400 space-y-2">
              <div className="text-sm font-bold text-white">
                {trades.length === 0 ? 'Welcome to your Clean Trading Journal' : 'No matching trades'}
              </div>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                {trades.length === 0
                  ? 'Your individual account is fresh with zero entries and private Row-Level Security. Fill the Trade Journal Entry form above to log your first Call or Put execution.'
                  : 'No journal entries match your search query or selected filter criteria.'}
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
                  className={`p-5 rounded-2xl bg-[#090909] border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'border-emerald-500/70 bg-emerald-500/[0.04] shadow-emerald-500/10 shadow-xl'
                      : 'border-neutral-800 hover:border-neutral-700 shadow-xl'
                  }`}
                >
                  {/* Top Bar: Checkbox, Date, Instrument, Call/Put, Net Profit */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectTrade(trade.id);
                        }}
                        className="p-1 rounded-lg hover:bg-neutral-800 cursor-pointer flex items-center justify-center mr-0.5"
                        title={isSelected ? 'Deselect trade' : 'Select trade'}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0 cursor-pointer pointer-events-none"
                        />
                      </div>

                      <div className="flex items-center space-x-1.5 text-neutral-300 text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 rounded-lg bg-[#111111] border border-neutral-800">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
                        <span>{trade.date}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="font-black text-white text-base sm:text-lg md:text-xl tracking-tight">{trade.symbol}</span>
                        {/* Call or Put Badge */}
                        <span className={`text-[10px] sm:text-xs font-black px-2.5 sm:px-3 py-0.5 rounded-full ${
                          tradeType === 'Call'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}>
                          {tradeType.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-4">
                      <div className="text-left sm:text-right">
                        <div className="text-[11px] sm:text-xs text-neutral-500 uppercase font-bold tracking-wider">Net Profit</div>
                        <div className={`text-xl sm:text-2xl md:text-3xl font-black ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {formatINR(trade.netPnL)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenTradeModal(trade)}
                          className="p-2 rounded-xl text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 active:scale-95 transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </button>
                        <button
                          onClick={() => onDuplicateTrade(trade)}
                          className="p-2 rounded-xl text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 active:scale-95 transition"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTrade(trade);
                          }}
                          className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 bg-neutral-900 border border-neutral-800 hover:border-rose-500/30 active:scale-95 transition"
                          title="Delete Trade"
                        >
                          <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Middle Grid: Execution Numbers */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-black border border-neutral-800 text-xs sm:text-sm">
                    <div>
                      <span className="text-neutral-500 text-xs sm:text-sm font-medium">Entry Price:</span>
                      <div className="font-bold text-white text-xs sm:text-sm md:text-base">₹{trade.entryPrice}</div>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-xs sm:text-sm font-medium">Exit Price:</span>
                      <div className="font-bold text-white text-xs sm:text-sm md:text-base">₹{trade.exitPrice}</div>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-xs sm:text-sm font-medium">Quantity:</span>
                      <div className="font-bold text-white text-xs sm:text-sm md:text-base">{trade.quantity} Qty</div>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-xs sm:text-sm font-medium">Gross Profit:</span>
                      <div className={`font-bold text-xs sm:text-sm md:text-base ${trade.grossPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {formatINR(trade.grossPnL)}
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-xs sm:text-sm font-medium">Charges:</span>
                      <div className="font-bold text-amber-400 text-xs sm:text-sm md:text-base">
                        {formatINR(trade.charges)}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Entry Reason, Exit Reason, Mistake */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm pt-1">
                    {trade.entryReason && (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-[#111111] border border-neutral-800">
                        <span className="text-neutral-500 font-bold block text-[11px] sm:text-xs uppercase tracking-wider">Entry Reason:</span>
                        <p className="text-neutral-200 text-xs sm:text-sm mt-0.5">{trade.entryReason}</p>
                      </div>
                    )}

                    {trade.exitReason && (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-[#111111] border border-neutral-800">
                        <span className="text-neutral-500 font-bold block text-[11px] sm:text-xs uppercase tracking-wider">Exit Reason:</span>
                        <p className="text-neutral-200 text-xs sm:text-sm mt-0.5">{trade.exitReason}</p>
                      </div>
                    )}

                    <div className="p-2.5 sm:p-3 rounded-xl bg-[#111111] border border-neutral-800">
                      <span className="text-neutral-500 font-bold block text-[11px] sm:text-xs uppercase tracking-wider">Mistake / Lesson:</span>
                      {hasMistake ? (
                        <div className="flex items-center space-x-1.5 mt-0.5 text-rose-400 font-bold text-xs sm:text-sm">
                          <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          <span>{mistakeText}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 mt-0.5 text-emerald-400 font-bold text-xs sm:text-sm">
                          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          <span>None (Followed Plan 100%)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {trade.notes && (
                    <div className="text-xs sm:text-sm text-neutral-400 italic pt-1 border-t border-neutral-800/80">
                      "{trade.notes}"
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* TABLE VIEW - Fintech Jet Black with Crisp Lines */
        <div className="rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left text-xs sm:text-sm min-w-[850px]">
              <thead className="text-xs sm:text-sm uppercase tracking-wider text-neutral-400 bg-[#111111] border-b border-neutral-800 select-none">
                <tr>
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0 cursor-pointer"
                      title="Select All Trades"
                    />
                  </th>
                  <th onClick={() => handleSort('date')} className="py-3 px-4 cursor-pointer hover:text-white whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">Instrument</th>
                  <th className="py-3 px-4 whitespace-nowrap">Type (Call/Put)</th>
                  <th onClick={() => handleSort('quantity')} className="py-3 px-4 cursor-pointer hover:text-white whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <span>Qty</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">Entry</th>
                  <th className="py-3 px-4 whitespace-nowrap">Exit</th>
                  <th onClick={() => handleSort('grossPnL')} className="py-3 px-4 cursor-pointer hover:text-white whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <span>Gross Profit</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">Charges</th>
                  <th onClick={() => handleSort('netPnL')} className="py-3 px-4 cursor-pointer hover:text-white text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1">
                      <span>Net Profit</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">Entry Reason</th>
                  <th className="py-3 px-4 whitespace-nowrap">Exit Reason</th>
                  <th className="py-3 px-4 whitespace-nowrap">Mistake</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-xs sm:text-sm">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="py-12 text-center text-neutral-500">
                      {trades.length === 0
                        ? 'No trades logged yet in this account. Use the Trade Journal Entry form above to record your first execution!'
                        : 'No journal entries match the current filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => {
                  const isProfit = Number(trade.netPnL) >= 0;
                  const hasMistake = !trade.ruleFollowed || (trade.ruleViolations && trade.ruleViolations.length > 0);
                  const mistakeText = trade.ruleViolations && trade.ruleViolations.length > 0
                    ? trade.ruleViolations.join(', ')
                    : (hasMistake ? 'Violated' : 'None');
                  const tradeType = getTradeType(trade);
                  const isSelected = selectedTradeIds.includes(trade.id);

                  return (
                    <tr
                      key={trade.id}
                      onClick={() => onViewTrade(trade)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                          : 'hover:bg-neutral-900/50'
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTrade(trade.id)}
                          className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0 cursor-pointer"
                          title={isSelected ? 'Deselect trade' : 'Select trade'}
                        />
                      </td>
                      <td className="py-3 px-4 text-neutral-300 whitespace-nowrap font-semibold">
                        {trade.date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-white">
                        {trade.symbol}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black ${
                          tradeType === 'Call'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}>
                          {tradeType.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-200 whitespace-nowrap font-bold">
                        {trade.quantity}
                      </td>
                      <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">
                        ₹{trade.entryPrice}
                      </td>
                      <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">
                        ₹{trade.exitPrice}
                      </td>
                      <td className={`py-3 px-4 font-semibold whitespace-nowrap ${trade.grossPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {formatINR(trade.grossPnL)}
                      </td>
                      <td className="py-3 px-4 text-amber-400 font-medium whitespace-nowrap">
                        {formatINR(trade.charges)}
                      </td>
                      <td className={`py-3 px-4 font-black text-right whitespace-nowrap text-xs sm:text-sm md:text-base ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {formatINR(trade.netPnL)}
                      </td>
                      <td className="py-3 px-4 text-neutral-300 max-w-xs truncate">
                        {trade.entryReason || '-'}
                      </td>
                      <td className="py-3 px-4 text-neutral-300 max-w-xs truncate">
                        {trade.exitReason || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasMistake ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] sm:text-xs font-bold">
                            {mistakeText}
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-[10px] sm:text-xs font-semibold">
                            None
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
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
                            onClick={() => onDuplicateTrade(trade)}
                            className="p-1 rounded text-neutral-400 hover:text-white"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTrade(trade);
                            }}
                            className="p-1 rounded text-neutral-400 hover:text-rose-400"
                            title="Delete Trade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Bar for Bulk Selection */}
      {selectedTradeIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-3.5 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs font-bold text-neutral-200 whitespace-nowrap">
            <strong className="text-emerald-400">{selectedTradeIds.length}</strong> trades selected
          </span>
          <div className="h-4 w-px bg-neutral-700" />
          <button
            type="button"
            onClick={() => setSelectedTradeIds([])}
            className="text-xs text-neutral-400 hover:text-white underline font-medium"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setIsConfirmBulkDeleteOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 transition active:scale-95 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected</span>
          </button>
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
        message={`Are you sure you want to permanently delete these ${selectedTradeIds.length} selected trades from your journal? This will remove the executions from your journal, recalculate your P&L, and sync across your devices.`}
      />
    </div>
  );
}
