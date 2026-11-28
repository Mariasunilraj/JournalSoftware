import React, { useState, useMemo } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Database,
  Trash2,
  RefreshCw,
  Printer,
  CheckCircle2,
  Wrench,
  ShieldCheck,
  Scale,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  exportTradesCSV,
  parseTradesCSV,
} from '../utils/storage';
import { SAMPLE_TRADES, SAMPLE_DIARY, SAMPLE_CAPITAL_LOGS } from '../utils/sampleData';
import { DEFAULT_RISK_SETTINGS, DEFAULT_EXCHANGE_RATES, DEFAULT_INDEX_EXPIRY_DAYS } from '../utils/constants';
import { formatIndianDate } from '../utils/calculations';
import { calculateIndianCharges } from '../utils/chargesCalculator';

export default function DataManagementView({
  trades = [],
  diary = [],
  capitalLogs = [],
  settings,
  onUpdateAllData,
  onOpenPrintReport,
  analytics,
}) {
  const [successMsg, setSuccessMsg] = useState('');

  // Accordion state: Exchange Tax Slabs (under one roof like Danger Zone)
  const [isTaxSlabOpen, setIsTaxSlabOpen] = useState(false);

  // Accordion state: Danger Zone
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);

  // Typed DELETE confirmation modal state
  const [deleteModalConfig, setDeleteModalConfig] = useState(null);
  const [typedConfirmation, setTypedConfirmation] = useState('');

  // CSV Import row validation result modal
  const [csvImportResult, setCsvImportResult] = useState(null);

  // Tax Repairing State
  const [isRepairingTaxes, setIsRepairingTaxes] = useState(false);

  // Exchange Rates editing state
  const [ratesForm, setRatesForm] = useState(() => {
    return settings?.exchangeRates || DEFAULT_EXCHANGE_RATES;
  });

  // Expiry days editing state
  const [expiryDaysForm, setExpiryDaysForm] = useState(() => {
    return settings?.expiryDays || DEFAULT_INDEX_EXPIRY_DAYS;
  });

  const notify = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Trade date range summary for CSV card
  const tradeDateRange = useMemo(() => {
    if (!trades || trades.length === 0) return 'No trades logged';
    const valid = trades.filter((t) => t?.date);
    if (valid.length === 0) return 'No dates available';
    const sorted = [...valid].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 1) return formatIndianDate(sorted[0].date);
    return `${formatIndianDate(sorted[0].date)} to ${formatIndianDate(sorted[sorted.length - 1].date)}`;
  }, [trades]);

  // Trades with ₹0 statutory charges
  const zeroChargeTradesCount = useMemo(() => {
    return (trades || []).filter((t) => !t.charges || Number(t.charges) === 0).length;
  }, [trades]);

  // 1. CSV Import with validation
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const errors = [];
        const validTrades = [];

        if (lines.length <= 1) {
          alert('The CSV file does not contain enough data rows.');
          return;
        }

        const imported = parseTradesCSV(text);
        if (imported.length === 0) {
          alert('No recognizable trade columns found in CSV.');
          return;
        }

        imported.forEach((row, idx) => {
          const rowNum = idx + 2;
          if (!row.symbol) {
            errors.push({ row: rowNum, message: 'Missing instrument / symbol' });
          } else if (!row.date) {
            errors.push({ row: rowNum, message: 'Missing trade date' });
          } else if (!row.quantity || Number(row.quantity) <= 0) {
            errors.push({ row: rowNum, message: `Invalid quantity (${row.quantity})` });
          } else {
            validTrades.push(row);
          }
        });

        if (errors.length > 0) {
          setCsvImportResult({
            validTrades,
            errors,
          });
        } else {
          commitImportedTrades(validTrades);
        }
      } catch (err) {
        alert('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const commitImportedTrades = (newTrades) => {
    const existingIds = new Set(trades.map((t) => t.id));
    const deduped = newTrades.filter((t) => !existingIds.has(t.id));
    onUpdateAllData({
      trades: [...deduped, ...trades],
      diary,
      capitalLogs,
      settings,
    });
    setCsvImportResult(null);
    notify(`Imported ${deduped.length} valid trades into your journal!`);
  };

  // 2. Indian F&O Statutory Charges Repair
  const handleRepairAllTaxes = () => {
    if (!trades || trades.length === 0) {
      alert('No trades found to repair.');
      return;
    }

    if (
      !confirm(
        `Recalculate statutory levies for all ${trades.length} trades according to current configurable rates?`
      )
    ) {
      return;
    }

    setIsRepairingTaxes(true);
    let count = 0;
    let newChargesSum = 0;

    const repairedTrades = trades.map((t) => {
      const entry = Number(t.entryPrice) || 0;
      const exit = Number(t.exitPrice) || 0;
      const qty = Number(t.quantity) || 0;
      const dir = t.direction || 'Long';

      const breakdown = calculateIndianCharges({
        segment: t.segment || 'Options',
        direction: dir,
        entryPrice: entry,
        exitPrice: exit,
        quantity: qty,
        brokeragePerOrder: Number(settings?.defaultBrokeragePerOrder) || 20,
        symbol: t.symbol || '',
        exchange: t.exchange || 'NSE',
        exchangeRates: settings?.exchangeRates || DEFAULT_EXCHANGE_RATES,
      });

      const gross = dir === 'Short' ? (entry - exit) * qty : (exit - entry) * qty;
      const grossPnL = Number(gross.toFixed(2));
      const netPnL = Number((grossPnL - breakdown.totalCharges).toFixed(2));

      newChargesSum += breakdown.totalCharges;
      count++;

      return {
        ...t,
        charges: breakdown.totalCharges,
        grossPnL,
        netPnL,
        notes: t.notes ? t.notes.replace(/Charges ₹[0-9.]+/g, `Charges ₹${breakdown.totalCharges}`) : t.notes,
        updatedAt: Date.now(),
      };
    });

    onUpdateAllData({
      trades: repairedTrades,
      diary,
      capitalLogs,
      settings,
    });

    setIsRepairingTaxes(false);
    notify(`Repaired charges for all ${count} trades! Total charges updated to ₹${newChargesSum.toFixed(2)}.`);
  };

  // 3. Save Configured Exchange Rates
  const handleSaveRatesSubmit = (e) => {
    e.preventDefault();
    const updatedRates = {
      ...ratesForm,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    const updatedSettings = {
      ...(settings || DEFAULT_RISK_SETTINGS),
      exchangeRates: updatedRates,
      expiryDays: expiryDaysForm,
    };
    onUpdateAllData({
      trades,
      diary,
      capitalLogs,
      settings: updatedSettings,
    });
    notify('Exchange tax rates and expiry schedules saved successfully!');
  };

  // 4. Request Wipe All Records (opens typed DELETE modal)
  const handleRequestWipeAll = () => {
    setTypedConfirmation('');
    setDeleteModalConfig({
      type: 'wipe',
      title: 'Wipe All Local Records',
      description:
        'This will PERMANENTLY erase all trade records, psychology diary entries, and capital logs stored locally on this device.',
      onConfirm: () => {
        onUpdateAllData({
          trades: [],
          diary: [],
          capitalLogs: [],
          settings: DEFAULT_RISK_SETTINGS,
        });
        notify('All local records have been permanently cleared.');
      },
    });
  };

  return (
    <div className="space-y-6 pb-28">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2.5 tracking-tight">
            <div className="p-2 rounded-xl bg-[#00e676]/10 border border-[#00e676]/20 text-[#00e676] shadow-[0_0_12px_rgba(0,230,118,0.2)]">
              <Database className="w-5 h-5" />
            </div>
            <span>Data Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            CSV tradebook import & export, statutory tax configuration, and system reset
          </p>
        </div>

        <button
          onClick={onOpenPrintReport}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0c0e10]/80 hover:bg-[#14181f] text-neutral-200 hover:text-white text-xs font-bold border border-white/[0.08] hover:border-white/[0.18] shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-md active:scale-95 transition-all self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-[#00e676]" />
          <span>Print / PDF Audit Report</span>
        </button>
      </div>

      {/* Notification Banner */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[#00e676]/10 border border-[#00e676]/30 text-[#00e676] text-xs sm:text-sm font-bold flex items-center space-x-2.5 shadow-[0_0_20px_rgba(0,230,118,0.15)] animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. CSV & Spreadsheet Integration Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0e10]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-5 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#00e676]/10 border border-[#00e676]/20 text-[#00e676]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                CSV Tradebook Integration
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Export trade history for spreadsheet analysis or import historical trades from CSV
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-neutral-300">
              <Layers className="w-3.5 h-3.5 text-[#00e676]" />
              <span>{trades.length} Trades Stored</span>
            </span>
          </div>
        </div>

        {/* Database Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
            <span className="text-neutral-500 text-[11px] uppercase font-bold tracking-wider block">
              Active Records
            </span>
            <div className="text-lg font-black text-white mt-1">
              {trades.length}{' '}
              <span className="text-xs font-medium text-neutral-400">trades</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
            <span className="text-neutral-500 text-[11px] uppercase font-bold tracking-wider block">
              Logged Date Range
            </span>
            <div className="text-xs sm:text-sm font-bold text-neutral-200 mt-1.5 truncate">
              {tradeDateRange}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
            <span className="text-neutral-500 text-[11px] uppercase font-bold tracking-wider block">
              Psychology Diary Entries
            </span>
            <div className="text-lg font-black text-white mt-1">
              {diary.length}{' '}
              <span className="text-xs font-medium text-neutral-400">notes</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => exportTradesCSV(trades)}
            disabled={trades.length === 0}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#00c853] via-[#00e676] to-[#00ff7f] text-black text-xs font-black shadow-[0_0_20px_rgba(0,230,118,0.25)] hover:shadow-[0_0_28px_rgba(0,230,118,0.4)] active:scale-95 transition-all disabled:opacity-40 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>Export Trades (CSV)</span>
          </button>

          <label className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 hover:text-white text-xs font-bold border border-white/[0.1] hover:border-white/[0.2] cursor-pointer active:scale-95 transition-all min-h-[44px]">
            <Upload className="w-4 h-4 text-[#00e676]" />
            <span>Import Trades (.csv)</span>
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
        </div>

        <p className="text-[11px] text-neutral-500">
          Compatible with standard Zerodha, Groww, AngelOne & customized trade CSV files. Duplicates are auto-detected and excluded.
        </p>
      </div>

      {/* 2. Statutory Tax Slabs & Exchange Charges (Accordion - Under One Roof) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e10]/80 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all">
        <button
          type="button"
          onClick={() => setIsTaxSlabOpen(!isTaxSlabOpen)}
          className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-white/[0.02] transition"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#00e676]/10 border border-[#00e676]/20 text-[#00e676]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Statutory Tax Slabs & Exchange Charges
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30 hidden sm:inline-block">
                  CONFIGURABLE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Configure NSE & BSE statutory levies (STT, Stamp Duty, Txn Fees, SEBI, GST & Expiry Schedules)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {zeroChargeTradesCount > 0 ? (
              <span className="hidden md:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{zeroChargeTradesCount} trades ₹0 fees</span>
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>All {trades.length} trades verified</span>
              </span>
            )}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-bold text-neutral-300">
              <span>{isTaxSlabOpen ? 'Hide' : 'Configure'}</span>
              {isTaxSlabOpen ? <ChevronUp className="w-4 h-4 text-[#00e676]" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </div>
          </div>
        </button>

        {isTaxSlabOpen && (
          <div className="p-5 sm:p-6 pt-0 space-y-5 border-t border-white/[0.06] mt-1">
            {/* Regulatory Advisory Note */}
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-amber-200">Regulatory Exchange Tariff Notice:</strong> Statutory levies and transaction charges are subject to circular revisions by NSE, BSE, and SEBI. Please verify current rates with your broker/exchange tariff card.
                <span className="text-neutral-400 ml-2">Last updated: <strong>{ratesForm?.lastUpdated || '2026-11-20'}</strong></span>
              </div>
            </div>

            {/* Rates Editing Form */}
            <form onSubmit={handleSaveRatesSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08]">
                  <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">
                    STT (Sell Side %)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={ratesForm.NSE?.optionsSttSellRate ?? 0.15}
                    onChange={(e) =>
                      setRatesForm({
                        ...ratesForm,
                        NSE: { ...ratesForm.NSE, optionsSttSellRate: parseFloat(e.target.value) || 0 },
                        BSE: { ...ratesForm.BSE, optionsSttSellRate: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-[#08090b] border border-white/[0.12] focus:border-[#00e676] rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#00e676]"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">Govt STT on option sell premium</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08]">
                  <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">
                    Stamp Duty (Buy Side %)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={ratesForm.NSE?.optionsStampDutyBuyRate ?? 0.003}
                    onChange={(e) =>
                      setRatesForm({
                        ...ratesForm,
                        NSE: { ...ratesForm.NSE, optionsStampDutyBuyRate: parseFloat(e.target.value) || 0 },
                        BSE: { ...ratesForm.BSE, optionsStampDutyBuyRate: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-[#08090b] border border-white/[0.12] focus:border-[#00e676] rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#00e676]"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">Govt stamp duty on buy side</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08]">
                  <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">
                    NSE Options Txn (%)
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={ratesForm.NSE?.optionsTxnRate ?? 0.03553}
                    onChange={(e) =>
                      setRatesForm({
                        ...ratesForm,
                        NSE: { ...ratesForm.NSE, optionsTxnRate: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-[#08090b] border border-white/[0.12] focus:border-[#00e676] rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#00e676]"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">NSE turnover transaction rate</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08]">
                  <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">
                    BSE Options Txn (%)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={ratesForm.BSE?.optionsTxnRate ?? 0.05}
                    onChange={(e) =>
                      setRatesForm({
                        ...ratesForm,
                        BSE: { ...ratesForm.BSE, optionsTxnRate: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-[#08090b] border border-white/[0.12] focus:border-[#00e676] rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#00e676]"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">BSE (SENSEX) turnover rate</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08]">
                  <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">
                    Brokerage (₹ / Order)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={ratesForm.brokeragePerOrder ?? 20}
                    onChange={(e) =>
                      setRatesForm({ ...ratesForm, brokeragePerOrder: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-[#08090b] border border-white/[0.12] focus:border-[#00e676] rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#00e676]"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">₹40 round-trip on discount brokers</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08]">
                  <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">
                    GST on Services (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={ratesForm.gstRate ?? 18}
                    onChange={(e) =>
                      setRatesForm({ ...ratesForm, gstRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-[#08090b] border border-white/[0.12] focus:border-[#00e676] rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#00e676]"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">18% on (Brokerage + Txn + SEBI)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08]">
                  <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">
                    NIFTY Expiry Day
                  </label>
                  <select
                    value={expiryDaysForm.NIFTY || 'Tuesday'}
                    onChange={(e) => setExpiryDaysForm({ ...expiryDaysForm, NIFTY: e.target.value })}
                    className="w-full bg-[#08090b] border border-white/[0.12] focus:border-[#00e676] rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                  <span className="text-[10px] text-neutral-500 mt-1 block">Weekly index expiry marker</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08]">
                  <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">
                    SENSEX Expiry Day
                  </label>
                  <select
                    value={expiryDaysForm.SENSEX || 'Thursday'}
                    onChange={(e) => setExpiryDaysForm({ ...expiryDaysForm, SENSEX: e.target.value })}
                    className="w-full bg-[#08090b] border border-white/[0.12] focus:border-[#00e676] rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                  <span className="text-[10px] text-neutral-500 mt-1 block">BSE weekly expiry day</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-bold border border-white/[0.12] hover:border-white/[0.2] transition min-h-[44px]"
                >
                  Save Custom Rates & Expiry
                </button>

                <button
                  type="button"
                  onClick={handleRepairAllTaxes}
                  disabled={isRepairingTaxes || trades.length === 0}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00c853] via-[#00e676] to-[#00ff7f] text-black text-xs font-black shadow-[0_0_20px_rgba(0,230,118,0.25)] hover:shadow-[0_0_28px_rgba(0,230,118,0.4)] active:scale-95 transition disabled:opacity-40 min-h-[44px]"
                >
                  <Wrench className="w-4 h-4" />
                  <span>{isRepairingTaxes ? 'Recalculating...' : 'Recalculate & Repair All Trade Taxes'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 3. Danger Zone / Advanced Reset (Accordion) */}
      <div className="rounded-2xl border border-rose-500/25 bg-[#0c0e10]/80 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all">
        <button
          type="button"
          onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
          className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-rose-500/[0.03] transition"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-rose-400 tracking-tight">
                Danger Zone & Advanced Reset
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Load authentic Indian F&O demo records or permanently wipe local browser storage
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-300">
            <span>{isDangerZoneOpen ? 'Hide' : 'Manage'}</span>
            {isDangerZoneOpen ? <ChevronUp className="w-4 h-4 text-rose-400" /> : <ChevronDown className="w-4 h-4 text-rose-400" />}
          </div>
        </button>

        {isDangerZoneOpen && (
          <div className="p-5 sm:p-6 pt-0 space-y-4 border-t border-rose-500/20 mt-1">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Actions in this section can overwrite or permanently erase your journal entries. Ensure your required records have been exported before resetting.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Load authentic Indian F&O sample trades? This will replace current records.')) {
                    onUpdateAllData({
                      trades: SAMPLE_TRADES,
                      diary: SAMPLE_DIARY,
                      capitalLogs: SAMPLE_CAPITAL_LOGS,
                      settings: DEFAULT_RISK_SETTINGS,
                    });
                    notify('Loaded authentic Indian F&O demo dataset!');
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 text-xs font-bold border border-white/[0.1] transition min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4 text-[#00e676]" />
                <span>Load Sample Indian F&O Trades</span>
              </button>

              <button
                type="button"
                onClick={handleRequestWipeAll}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold border border-rose-500/35 transition active:scale-95 min-h-[44px]"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Wipe All Local Records</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Typed Confirmation Modal (requires typing DELETE) */}
      {deleteModalConfig && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0e10] border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-base">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{deleteModalConfig.title}</span>
              </div>
              <button
                onClick={() => setDeleteModalConfig(null)}
                className="text-neutral-400 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-neutral-300 leading-relaxed">
              {deleteModalConfig.description}
            </p>

            <div>
              <label className="block text-neutral-300 mb-1.5 font-bold">
                Type <strong className="text-rose-400">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full bg-black border border-white/[0.15] focus:border-rose-500 rounded-xl px-3 py-2.5 text-white font-bold text-base focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalConfig(null)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={typedConfirmation.trim() !== 'DELETE'}
                onClick={() => {
                  deleteModalConfig.onConfirm();
                  setDeleteModalConfig(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black transition disabled:opacity-40 min-h-[44px]"
              >
                Confirm Erase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Row Validation & Error Report Modal */}
      {csvImportResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0e10] border border-white/[0.1] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>CSV Row Validation Report</span>
              </h3>
              <button onClick={() => setCsvImportResult(null)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-neutral-300">
              Found <strong>{csvImportResult.validTrades.length}</strong> valid rows and{' '}
              <strong className="text-rose-400">{csvImportResult.errors.length}</strong> rows with validation errors:
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-black border border-white/[0.08]">
              {csvImportResult.errors.map((err, i) => (
                <div key={i} className="text-xs text-rose-300 flex items-center justify-between">
                  <span>Row #{err.row}:</span>
                  <span className="text-neutral-400">{err.message}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCsvImportResult(null)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              {csvImportResult.validTrades.length > 0 && (
                <button
                  type="button"
                  onClick={() => commitImportedTrades(csvImportResult.validTrades)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00c853] via-[#00e676] to-[#00ff7f] text-black font-black min-h-[44px]"
                >
                  Import {csvImportResult.validTrades.length} Valid Rows
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Disclaimer */}
      <p className="text-center text-[10px] text-neutral-500 font-medium tracking-wider pt-6">
        Disclaimer: For personal trade journaling and analytical purposes only. Not SEBI registered advisory.
      </p>
    </div>
  );
}
