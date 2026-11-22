import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Database,
  Trash2,
  RefreshCw,
  Printer,
  Plus,
  Wallet,
  CheckCircle2,
  Edit2,
  Wrench,
  ShieldCheck,
  Scale,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Calendar,
  Clock,
  Info,
} from 'lucide-react';
import {
  exportBackupJSON,
  exportTradesCSV,
  parseTradesCSV,
} from '../utils/storage';
import { SAMPLE_TRADES, SAMPLE_DIARY, SAMPLE_CAPITAL_LOGS } from '../utils/sampleData';
import { DEFAULT_RISK_SETTINGS, DEFAULT_EXCHANGE_RATES, DEFAULT_INDEX_EXPIRY_DAYS } from '../utils/constants';
import { formatINR, formatIndianDate } from '../utils/calculations';
import { calculateIndianCharges } from '../utils/chargesCalculator';

export default function DataManagementView({
  trades,
  diary,
  capitalLogs,
  settings,
  onUpdateAllData,
  onAddCapitalLog,
  onOpenPrintReport,
  analytics,
}) {
  const [successMsg, setSuccessMsg] = useState('');
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [showInitialCapModal, setShowInitialCapModal] = useState(false);
  const [inputInitialCap, setInputInitialCap] = useState('');
  const [capitalForm, setCapitalForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'Deposit',
    amount: 50000,
    note: '',
  });

  // Danger Zone Accordion state
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);

  // Typed DELETE confirmation modal state
  const [deleteModalConfig, setDeleteModalConfig] = useState(null); // { type: 'wipe' | 'erase_cap', title: string, description: string, onConfirm: function }
  const [typedConfirmation, setTypedConfirmation] = useState('');

  // JSON Restore Preview Modal state
  const [restorePreview, setRestorePreview] = useState(null); // { tradesCount, dateRange, netPnL, parsedData }

  // Exchange Rates editing state
  const [ratesForm, setRatesForm] = useState(() => {
    return settings?.exchangeRates || DEFAULT_EXCHANGE_RATES;
  });

  // Expiry days editing state
  const [expiryDaysForm, setExpiryDaysForm] = useState(() => {
    return settings?.expiryDays || DEFAULT_INDEX_EXPIRY_DAYS;
  });

  // Last Backup tracker
  const [lastBackupDaysAgo, setLastBackupDaysAgo] = useState(null);

  useEffect(() => {
    const lastBackupTime = localStorage.getItem('delta_last_backup_time');
    if (lastBackupTime) {
      const diffMs = Date.now() - Number(lastBackupTime);
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      setLastBackupDaysAgo(days);
    }
  }, []);

  const recordBackupTimestamp = () => {
    localStorage.setItem('delta_last_backup_time', String(Date.now()));
    setLastBackupDaysAgo(0);
  };

  const notify = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 1. JSON Backup Export
  const handleExportJSON = () => {
    exportBackupJSON(trades, diary, capitalLogs, settings);
    recordBackupTimestamp();
    notify('JSON Backup downloaded successfully!');
  };

  // 2. JSON Restore with schema validation & preview
  const handleRestoreFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || !Array.isArray(parsed.trades)) {
          alert('Invalid backup file: Missing or corrupted trades array.');
          return;
        }

        // Compute preview metrics
        const validTrades = parsed.trades.filter((t) => t && t.date);
        let minDate = '-';
        let maxDate = '-';
        let previewNet = 0;

        if (validTrades.length > 0) {
          const sorted = [...validTrades].sort((a, b) => a.date.localeCompare(b.date));
          minDate = formatIndianDate(sorted[0].date);
          maxDate = formatIndianDate(sorted[sorted.length - 1].date);
          previewNet = validTrades.reduce((acc, t) => acc + (Number(t.netPnL) || 0), 0);
        }

        setRestorePreview({
          tradesCount: validTrades.length,
          dateRange: `${minDate} to ${maxDate}`,
          netPnL: previewNet,
          diaryCount: Array.isArray(parsed.diary) ? parsed.diary.length : 0,
          capitalLogsCount: Array.isArray(parsed.capitalLogs) ? parsed.capitalLogs.length : 0,
          parsedData: parsed,
        });
      } catch (err) {
        alert('Failed to parse backup JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = () => {
    if (!restorePreview || !restorePreview.parsedData) return;
    const parsed = restorePreview.parsedData;
    onUpdateAllData({
      trades: parsed.trades || [],
      diary: parsed.diary || [],
      capitalLogs: parsed.capitalLogs || [],
      settings: parsed.settings || settings || DEFAULT_RISK_SETTINGS,
    });
    setRestorePreview(null);
    notify(`Successfully restored ${parsed.trades.length} trades and account data!`);
  };

  // 3. CSV Import with row validation and error reporting
  const [csvImportResult, setCsvImportResult] = useState(null); // { validRows, errors, fileData }

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

        // Validate each parsed row
        imported.forEach((row, idx) => {
          const rowNum = idx + 2; // header is row 1
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
          // All rows valid, import directly
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

  // 4. Indian F&O Statutory Charges Repair
  const [isRepairingTaxes, setIsRepairingTaxes] = useState(false);

  const zeroChargeTradesCount = useMemo(() => {
    return (trades || []).filter((t) => !t.charges || Number(t.charges) === 0).length;
  }, [trades]);

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

  // 5. Save Configured Exchange Rates
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

  // Capital Calculations
  const initialCap = Number(settings?.initialCapital) || 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  capitalLogs.forEach((log) => {
    if (log.type === 'Deposit') totalDeposits += Number(log.amount) || 0;
    else if (log.type === 'Withdrawal') totalWithdrawals += Number(log.amount) || 0;
  });
  const currentEquity = initialCap + totalDeposits - totalWithdrawals + (analytics?.netPnL || 0);
  const netPnLVal = analytics?.netPnL || 0;
  const returnOnCapital = initialCap > 0 ? ((netPnLVal / initialCap) * 100).toFixed(1) : 'N/A';

  // Request Erase Initial Capital (opens typed DELETE modal)
  const handleRequestEraseInitialCap = () => {
    setTypedConfirmation('');
    setDeleteModalConfig({
      type: 'erase_cap',
      title: 'Erase Starting Capital',
      description: 'This will reset your starting capital balance to ₹0.00. Your trade records will not be deleted.',
      onConfirm: () => {
        const updated = {
          ...(settings || DEFAULT_RISK_SETTINGS),
          initialCapital: 0,
        };
        onUpdateAllData({
          trades,
          diary,
          capitalLogs,
          settings: updated,
        });
        notify('Starting capital erased to ₹0.00!');
      },
    });
  };

  // Request Wipe All Records (opens typed DELETE modal)
  const handleRequestWipeAll = () => {
    setTypedConfirmation('');
    setDeleteModalConfig({
      type: 'wipe',
      title: 'Wipe All Local Records',
      description: 'This will PERMANENTLY erase all trade records, psychology diary entries, and capital transactions from this device.',
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

  // Save Initial Capital
  const handleSaveInitialCapSubmit = (e) => {
    e.preventDefault();
    const val = Math.max(0, parseFloat(inputInitialCap) || 0);
    const updated = {
      ...(settings || DEFAULT_RISK_SETTINGS),
      initialCapital: val,
    };
    onUpdateAllData({
      trades,
      diary,
      capitalLogs,
      settings: updated,
    });
    setShowInitialCapModal(false);
    notify(val === 0 ? 'Starting capital erased to ₹0.00!' : `Starting capital updated to ${formatINR(val)}!`);
  };

  const handleAddCapitalSubmit = (e) => {
    e.preventDefault();
    if (!capitalForm.amount) return;
    onAddCapitalLog({
      id: `CAP-${Date.now()}`,
      ...capitalForm,
    });
    setShowCapitalModal(false);
    notify(`${capitalForm.type} of ${formatINR(capitalForm.amount)} recorded!`);
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <span>Data Management & Backups</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-0.5">
            Full system backups, CSV/Excel integration, statutory tax configuration, and capital ledger
          </p>
        </div>
        <button
          onClick={onOpenPrintReport}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold border border-neutral-800 shadow"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Print / PDF Performance Audit</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Backup Age Status & Reminder Banner */}
      <div className="p-4 rounded-xl bg-[#090909] border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center space-x-2.5">
          <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-neutral-300">
            {lastBackupDaysAgo === null ? (
              <strong className="text-amber-400 font-bold">No backup downloaded yet on this browser.</strong>
            ) : lastBackupDaysAgo === 0 ? (
              <span>Last backup: <strong className="text-emerald-400 font-bold">Today</strong></span>
            ) : (
              <span>Last backup: <strong className="text-neutral-200 font-bold">{lastBackupDaysAgo} days ago</strong></span>
            )}
            <span className="text-neutral-500 ml-2 hidden sm:inline">• Browser data is stored locally. Download regular backups!</span>
          </span>
        </div>
        <button
          onClick={handleExportJSON}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-black transition self-start sm:self-auto"
        >
          Download Backup Now
        </button>
      </div>

      {/* 1. Capital Ledger & Account Equity Tracking */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Trading Capital & Cash-Flow Ledger
            </h3>
          </div>
          <button
            onClick={() => setShowCapitalModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Cash In / Out</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs sm:text-sm">
          <div className="p-3 rounded-xl bg-black border border-neutral-800 relative group">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px] sm:text-xs uppercase font-bold">Starting Capital:</span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setInputInitialCap(initialCap.toString());
                    setShowInitialCapModal(true);
                  }}
                  className="text-neutral-300 hover:text-white p-0.5 rounded transition"
                  title="Edit Starting Capital"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                </button>
                {initialCap > 0 && (
                  <button
                    type="button"
                    onClick={handleRequestEraseInitialCap}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 transition active:scale-95"
                    title="Erase Initial Capital to ₹0.00"
                  >
                    Erase
                  </button>
                )}
              </div>
            </div>
            <div className="text-base sm:text-lg lg:text-xl font-black text-white mt-1">{formatINR(initialCap)}</div>
          </div>
          <div className="p-3 rounded-xl bg-black border border-neutral-800">
            <span className="text-neutral-400 text-[11px] sm:text-xs uppercase font-bold">Fresh Deposits:</span>
            <div className="text-base sm:text-lg lg:text-xl font-black text-emerald-400 mt-1">
              {totalDeposits > 0 ? `+${formatINR(totalDeposits)}` : formatINR(0)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-black border border-neutral-800">
            <span className="text-neutral-400 text-[11px] sm:text-xs uppercase font-bold">Withdrawals:</span>
            <div className="text-base sm:text-lg lg:text-xl font-black text-rose-500 mt-1">
              {totalWithdrawals > 0 ? `-${formatINR(totalWithdrawals)}` : formatINR(0)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-black border border-neutral-800">
            <span className="text-neutral-400 text-[11px] sm:text-xs uppercase font-bold">Cumulative Net P&L:</span>
            <div className={`text-base sm:text-lg lg:text-xl font-black mt-1 ${netPnLVal >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {formatINR(netPnLVal)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40">
            <span className="text-emerald-400 font-bold text-[11px] sm:text-xs uppercase">Account Equity:</span>
            <div className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-300 mt-1">{formatINR(currentEquity)}</div>
            <div className="text-[11px] sm:text-xs text-neutral-300 mt-0.5">RoC: {returnOnCapital === 'N/A' ? 'N/A' : `${returnOnCapital}%`}</div>
          </div>
        </div>

        {/* Capital Log History Table */}
        {capitalLogs.length > 0 && (
          <div className="overflow-x-auto touch-scroll pt-2">
            <table className="w-full text-left text-xs sm:text-sm min-w-[500px]">
              <thead className="text-xs uppercase tracking-wider text-neutral-400 bg-black border-b border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Note / Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-xs sm:text-sm">
                {capitalLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-900/40">
                    <td className="py-2.5 px-3 text-neutral-300">{formatIndianDate(log.date)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                        log.type === 'Deposit' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{formatINR(log.amount)}</td>
                    <td className="py-2.5 px-3 text-neutral-300">{log.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Unified Export & Import Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Full JSON System Backup */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-3">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white">Full JSON System Backup</h3>
          </div>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Download a 100% complete archive containing all trade records, psychology diary entries, capital logs, and system settings.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleExportJSON}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-black transition shadow-md min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup</span>
            </button>

            <label className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-800 cursor-pointer transition min-h-[44px]">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Restore from JSON File</span>
              <input type="file" accept=".json" onChange={handleRestoreFileSelected} className="hidden" />
            </label>
          </div>
        </div>

        {/* CSV Integration */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-3">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">CSV & Spreadsheet Integration</h3>
          </div>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Export trades to CSV for spreadsheet software (Excel, Google Sheets), or import historical trades from a CSV file.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => exportTradesCSV(trades)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition shadow-md min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Export Trades to CSV</span>
            </button>

            <label className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-800 cursor-pointer transition min-h-[44px]">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import Trades (.csv)</span>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* 3. Configurable Exchange Tax & Statutory Charges Engine */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Exchange Statutory Tax & Charges Settings</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  EDITABLE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 mt-0.5">
                Configure exchange-specific levies for NSE and BSE (STT, Stamp Duty, Transaction Charges, SEBI fee, GST, and Brokerage)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {zeroChargeTradesCount > 0 ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{zeroChargeTradesCount} trades with ₹0 charges</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>All {trades.length} trades verified</span>
              </span>
            )}
          </div>
        </div>

        {/* Regulatory Advisory Note */}
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Broker & Exchange Tariff Notice:</strong> Statutory levies and transaction charges are subject to circular revisions by NSE, BSE, and SEBI. Please verify current rates with your broker/exchange.
            <span className="text-neutral-400 ml-2">Last updated: <strong>{ratesForm?.lastUpdated || '2026-11-20'}</strong></span>
          </div>
        </div>

        {/* Rates Editing Form */}
        <form onSubmit={handleSaveRatesSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">STT (Sell Side %)</label>
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
                className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-sm"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Govt STT on option sell premium</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">Stamp Duty (Buy Side %)</label>
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
                className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-sm"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Govt stamp duty on buy side</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">NSE Options Txn (%)</label>
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
                className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-sm"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">NSE turnover transaction rate</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">BSE Options Txn (%)</label>
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
                className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-sm"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">BSE (SENSEX) turnover rate</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">Brokerage (₹ / Order)</label>
              <input
                type="number"
                step="1"
                value={ratesForm.brokeragePerOrder ?? 20}
                onChange={(e) =>
                  setRatesForm({ ...ratesForm, brokeragePerOrder: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-sm"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">₹40 round-trip on discount brokers</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">GST on Services (%)</label>
              <input
                type="number"
                step="1"
                value={ratesForm.gstRate ?? 18}
                onChange={(e) =>
                  setRatesForm({ ...ratesForm, gstRate: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-sm"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">18% on (Brokerage + Txn + SEBI)</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">NIFTY Expiry Day</label>
              <select
                value={expiryDaysForm.NIFTY || 'Tuesday'}
                onChange={(e) => setExpiryDaysForm({ ...expiryDaysForm, NIFTY: e.target.value })}
                className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs"
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
              </select>
              <span className="text-[10px] text-neutral-400 mt-1 block">Weekly index expiry marker</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <label className="text-neutral-400 text-[11px] uppercase font-bold block mb-1">SENSEX Expiry Day</label>
              <select
                value={expiryDaysForm.SENSEX || 'Thursday'}
                onChange={(e) => setExpiryDaysForm({ ...expiryDaysForm, SENSEX: e.target.value })}
                className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs"
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
              </select>
              <span className="text-[10px] text-neutral-400 mt-1 block">BSE weekly expiry day</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-neutral-700 transition"
            >
              Save Custom Rates & Expiry
            </button>

            <button
              type="button"
              onClick={handleRepairAllTaxes}
              disabled={isRepairingTaxes || trades.length === 0}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50 min-h-[44px]"
            >
              <Wrench className="w-4 h-4" />
              <span>{isRepairingTaxes ? 'Recalculating...' : 'Recalculate & Repair All Trade Taxes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. Danger Zone / Advanced Section (Collapsed by Default) */}
      <div className="rounded-2xl border border-rose-950/80 bg-black/60 overflow-hidden shadow-xl">
        <button
          type="button"
          onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-rose-950/10 transition"
        >
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-rose-400">Danger Zone & Advanced Reset</h3>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Load sample demo data or permanently wipe browser storage records
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-neutral-400">
            <span>{isDangerZoneOpen ? 'Hide' : 'Show'}</span>
            {isDangerZoneOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isDangerZoneOpen && (
          <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-rose-950/80 mt-2">
            <p className="text-xs text-neutral-400">
              Actions in this section can overwrite or permanently erase your journal. Please make sure to download a JSON backup first.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Load authentic Indian F&O & Equity sample trades? This will replace current records.')) {
                    onUpdateAllData({
                      trades: SAMPLE_TRADES,
                      diary: SAMPLE_DIARY,
                      capitalLogs: SAMPLE_CAPITAL_LOGS,
                      settings: DEFAULT_RISK_SETTINGS,
                    });
                    notify('Loaded authentic Indian F&O demo dataset!');
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-800 transition min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Load Sample Indian F&O Trades</span>
              </button>

              <button
                type="button"
                onClick={handleRequestWipeAll}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 text-xs font-bold border border-rose-500/40 transition active:scale-95 min-h-[44px]"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090909] border border-rose-500/50 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
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

            {/* Offer to download backup first */}
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400 text-xs">Save your data first:</span>
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download JSON Backup</span>
              </button>
            </div>

            <div>
              <label className="block text-neutral-300 mb-1.5 font-bold">
                Type <strong className="text-rose-400">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full bg-black border border-neutral-700 rounded-xl px-3 py-2.5 text-white font-bold text-base focus:outline-none focus:border-rose-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalConfig(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold min-h-[44px]"
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

      {/* JSON Restore Preview Modal */}
      {restorePreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090909] border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <span>Backup Archive Preview</span>
              </h3>
              <button onClick={() => setRestorePreview(null)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-neutral-300">
              Please inspect the archive contents before restoring. This will overwrite current records on this browser.
            </p>

            <div className="space-y-2 p-3.5 rounded-xl bg-black border border-neutral-800">
              <div className="flex justify-between">
                <span className="text-neutral-400">Total Trades:</span>
                <strong className="text-white font-bold">{restorePreview.tradesCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Date Range:</span>
                <strong className="text-white font-bold">{restorePreview.dateRange}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Cumulative Net P&L:</span>
                <strong className={restorePreview.netPnL >= 0 ? 'text-emerald-400 font-black' : 'text-rose-500 font-black'}>
                  {formatINR(restorePreview.netPnL)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Psychology Notes:</span>
                <span className="text-neutral-200">{restorePreview.diaryCount} entries</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Capital Ledger:</span>
                <span className="text-neutral-200">{restorePreview.capitalLogsCount} logs</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRestorePreview(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black min-h-[44px]"
              >
                Confirm Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Row Validation & Error Report Modal */}
      {csvImportResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090909] border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
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

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-black border border-neutral-800">
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
                className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              {csvImportResult.validTrades.length > 0 && (
                <button
                  type="button"
                  onClick={() => commitImportedTrades(csvImportResult.validTrades)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black min-h-[44px]"
                >
                  Import {csvImportResult.validTrades.length} Valid Rows
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cash In / Out Modal */}
      {showCapitalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090909] border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white">Record Capital Cash Flow</h3>
              <button onClick={() => setShowCapitalModal(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCapitalSubmit} className="space-y-4">
              <div>
                <label className="block text-neutral-400 mb-1">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCapitalForm({ ...capitalForm, type: 'Deposit' })}
                    className={`py-2 rounded-xl text-xs font-black min-h-[44px] ${
                      capitalForm.type === 'Deposit' ? 'bg-emerald-500 text-black' : 'bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    Deposit (Capital Added)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapitalForm({ ...capitalForm, type: 'Withdrawal' })}
                    className={`py-2 rounded-xl text-xs font-black min-h-[44px] ${
                      capitalForm.type === 'Withdrawal' ? 'bg-rose-500 text-white' : 'bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    Withdrawal (Profit Taken)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Date</label>
                <input
                  type="date"
                  value={capitalForm.date}
                  onChange={(e) => setCapitalForm({ ...capitalForm, date: e.target.value })}
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2.5 text-white text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={capitalForm.amount}
                  onChange={(e) => setCapitalForm({ ...capitalForm, amount: Number(e.target.value) })}
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2.5 text-white font-bold text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Note / Description</label>
                <input
                  type="text"
                  value={capitalForm.note}
                  onChange={(e) => setCapitalForm({ ...capitalForm, note: e.target.value })}
                  placeholder="e.g. Bank transfer, profit sweep"
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2.5 text-white text-base"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCapitalModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black min-h-[44px]"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Starting Capital Modal */}
      {showInitialCapModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090909] border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-black">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Configure Starting Capital</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInitialCapModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInitialCapSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
              <p className="text-neutral-300">
                Set your actual trading account starting balance, or erase it to ₹0.00.
              </p>

              <div>
                <label className="block text-neutral-300 mb-1 font-bold">Starting Capital Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={inputInitialCap}
                  onChange={(e) => setInputInitialCap(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2.5 text-base text-white font-bold focus:outline-none focus:border-emerald-400"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowInitialCapModal(false);
                    handleRequestEraseInitialCap();
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 transition min-h-[44px]"
                >
                  Erase to ₹0.00
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowInitialCapModal(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black min-h-[44px]"
                  >
                    Save Capital
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}