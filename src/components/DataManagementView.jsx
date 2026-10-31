import React, { useState, useMemo } from 'react';
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
  Sparkles,
  ShieldCheck,
  Scale,
  AlertTriangle,
} from 'lucide-react';
import {
  exportBackupJSON,
  exportTradesCSV,
  parseTradesCSV,
} from '../utils/storage';
import { SAMPLE_TRADES, SAMPLE_DIARY, SAMPLE_CAPITAL_LOGS } from '../utils/sampleData';
import { DEFAULT_RISK_SETTINGS } from '../utils/constants';
import { formatINR } from '../utils/calculations';
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

  const notify = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 1. JSON Backup
  const handleExportJSON = () => {
    exportBackupJSON(trades, diary, capitalLogs, settings);
    notify('JSON Backup downloaded successfully!');
  };

  // 2. JSON Restore
  const handleRestoreJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.trades && Array.isArray(parsed.trades)) {
          onUpdateAllData({
            trades: parsed.trades,
            diary: parsed.diary || [],
            capitalLogs: parsed.capitalLogs || [],
            settings: parsed.settings || DEFAULT_RISK_SETTINGS,
          });
          notify(`Restored ${parsed.trades.length} trades and configuration from JSON backup.`);
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 3. CSV Import
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = parseTradesCSV(event.target.result);
        if (imported.length > 0) {
          const existingIds = new Set(trades.map((t) => t.id));
          const newTrades = imported.filter((t) => !existingIds.has(t.id));
          onUpdateAllData({
            trades: [...newTrades, ...trades],
            diary,
            capitalLogs,
            settings,
          });
          notify(`Imported ${newTrades.length} new trades from CSV!`);
        } else {
          alert('No valid trade rows detected in CSV.');
        }
      } catch (err) {
        alert('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 4. Load Authentic Demo Data
  const handleLoadDemoData = () => {
    if (confirm('Load sample Indian Equity & F&O trades? Existing records will be supplemented with authentic demo trades.')) {
      onUpdateAllData({
        trades: SAMPLE_TRADES,
        diary: SAMPLE_DIARY,
        capitalLogs: SAMPLE_CAPITAL_LOGS,
        settings: DEFAULT_RISK_SETTINGS,
      });
      notify('Loaded authentic Indian F&O demo dataset!');
    }
  };

  // 5. Clear All Data
  const handleClearAll = () => {
    if (confirm('CAUTION: Are you sure you want to permanently wipe all trades and records? Make sure you have downloaded a JSON backup first!')) {
      if (confirm('Confirm permanent data wipe?')) {
        onUpdateAllData({
          trades: [],
          diary: [],
          capitalLogs: [],
          settings: DEFAULT_RISK_SETTINGS,
        });
        notify('All local journal records have been cleared.');
      }
    }
  };

  // 6. Indian F&O Government Tax & Charges Repair
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
        `Repair and recalculate statutory taxes for all ${trades.length} trades according to official Government F&O circulars (STT 0.15% on Sell, Stamp Duty 0.003% on Buy, NSE 0.03553%, SEBI 0.0001%, Brokerage ₹20/order, GST 18%)?`
      )
    ) {
      return;
    }

    setIsRepairingTaxes(true);
    let count = 0;
    let oldChargesSum = 0;
    let newChargesSum = 0;

    const repairedTrades = trades.map((t) => {
      const entry = Number(t.entryPrice) || 0;
      const exit = Number(t.exitPrice) || 0;
      const qty = Number(t.quantity) || 0;
      const dir = t.direction || (t.tradeType === 'Put' ? 'Long' : 'Long');

      const breakdown = calculateIndianCharges({
        segment: t.segment || 'Options',
        direction: dir,
        entryPrice: entry,
        exitPrice: exit,
        quantity: qty,
        brokeragePerOrder: Number(settings?.defaultBrokeragePerOrder) || 20,
      });

      const gross = dir === 'Short' ? (entry - exit) * qty : (exit - entry) * qty;
      const grossPnL = Number(gross.toFixed(2));
      const netPnL = Number((grossPnL - breakdown.totalCharges).toFixed(2));

      oldChargesSum += Number(t.charges) || 0;
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
    notify(`Repaired taxes for all ${count} trades! Total charges updated to ₹${newChargesSum.toFixed(2)}.`);
  };

  // Capital Math - Starting capital defaults to 0 when erased
  const initialCap = Number(settings?.initialCapital) || 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  capitalLogs.forEach((log) => {
    if (log.type === 'Deposit') totalDeposits += Number(log.amount) || 0;
    else if (log.type === 'Withdrawal') totalWithdrawals += Number(log.amount) || 0;
  });
  const currentEquity = initialCap + totalDeposits - totalWithdrawals + (analytics?.netPnL || 0);
  const netPnLVal = analytics?.netPnL || 0;
  const returnOnCapital = initialCap > 0 ? ((netPnLVal / initialCap) * 100).toFixed(1) : 0;

  // Erase initial capital to 0
  const handleEraseInitialCap = () => {
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
    notify('Initial Capital erased to ₹0.00!');
  };

  // Save customized initial capital
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
    notify(val === 0 ? 'Initial Capital erased to ₹0.00!' : `Initial Capital updated to ${formatINR(val)}!`);
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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <span>Data Management & Backups</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Export trades, restore system backups, and manage capital transactions
          </p>
        </div>
        <button
          onClick={onOpenPrintReport}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold border border-neutral-800 shadow"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Print / PDF Performance Audit</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Capital Ledger & Account Equity Tracking */}
      <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Trading Capital & Cash-Flow Ledger
            </h3>
          </div>
          <button
            onClick={() => setShowCapitalModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Cash In / Out</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs sm:text-sm">
          <div className="p-3 rounded-xl bg-black border border-neutral-800 relative group">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 text-[11px] sm:text-xs uppercase font-bold">Initial Capital:</span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setInputInitialCap(initialCap.toString());
                    setShowInitialCapModal(true);
                  }}
                  className="text-neutral-400 hover:text-white p-0.5 rounded transition"
                  title="Edit Starting Capital"
                >
                  <Edit2 className="w-3 h-3 text-emerald-400" />
                </button>
                {initialCap > 0 && (
                  <button
                    type="button"
                    onClick={handleEraseInitialCap}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 transition active:scale-95"
                    title="Erase Initial Capital to ₹0.00"
                  >
                    Erase
                  </button>
                )}
              </div>
            </div>
            <div className="text-base sm:text-lg lg:text-xl font-black text-white mt-0.5">{formatINR(initialCap)}</div>
          </div>
          <div className="p-3 rounded-xl bg-black border border-neutral-800">
            <span className="text-neutral-500 text-[11px] sm:text-xs uppercase font-bold">Fresh Deposits:</span>
            <div className="text-base sm:text-lg lg:text-xl font-black text-emerald-400 mt-0.5">+{formatINR(totalDeposits)}</div>
          </div>
          <div className="p-3 rounded-xl bg-black border border-neutral-800">
            <span className="text-neutral-500 text-[11px] sm:text-xs uppercase font-bold">Withdrawals:</span>
            <div className="text-base sm:text-lg lg:text-xl font-black text-rose-500 mt-0.5">-{formatINR(totalWithdrawals)}</div>
          </div>
          <div className="p-3 rounded-xl bg-black border border-neutral-800">
            <span className="text-neutral-500 text-[11px] sm:text-xs uppercase font-bold">Realized Net P&L:</span>
            <div className={`text-base sm:text-lg lg:text-xl font-black mt-0.5 ${netPnLVal >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {formatINR(netPnLVal)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40">
            <span className="text-emerald-400 font-bold text-[11px] sm:text-xs uppercase">Account Equity:</span>
            <div className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-300 mt-0.5">{formatINR(currentEquity)}</div>
            <div className="text-[11px] sm:text-xs text-neutral-400">RoC: {returnOnCapital}%</div>
          </div>
        </div>

        {/* Capital Log History Table */}
        {capitalLogs.length > 0 && (
          <div className="overflow-x-auto touch-scroll pt-2">
            <table className="w-full text-left text-xs sm:text-sm min-w-[500px]">
              <thead className="text-xs sm:text-sm uppercase tracking-wider text-neutral-400 bg-black border-b border-neutral-800">
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
                    <td className="py-2.5 px-3 text-neutral-300">{log.date}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black ${
                        log.type === 'Deposit' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{formatINR(log.amount)}</td>
                    <td className="py-2.5 px-3 text-neutral-400">{log.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Export & Import Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Full JSON System Backup */}
        <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white">Full JSON System Backup</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Download a 100% complete archive of all trades, psychology diary, and capital logs. You can store this backup on Google Drive, USB, or local disk.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleExportJSON}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-black transition shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup</span>
            </button>

            <label className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-800 cursor-pointer transition">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Restore from JSON File</span>
              <input type="file" accept=".json" onChange={handleRestoreJSON} className="hidden" />
            </label>
          </div>
        </div>

        {/* CSV Excel Export / Import */}
        <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">CSV & Microsoft Excel Integration</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Export your trades into CSV spreadsheet format for external analysis in Excel or Google Sheets, or import historical trades from a CSV file.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => exportTradesCSV(trades)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Export Trades to CSV</span>
            </button>

            <label className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-800 cursor-pointer transition">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import Trades from CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* 3. Government F&O Options Tax & Charges Engine */}
      <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Government F&O Options Tax & Charges Engine</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  FY 2026-27 GUIDE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Statutory levies for Indian NSE options: STT 0.15% (Sell), Stamp Duty 0.003% (Buy), NSE 0.03553%, SEBI ₹10/Cr, Brokerage ₹20/order, GST 18%.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {zeroChargeTradesCount > 0 ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{zeroChargeTradesCount} trades with ₹0 charges</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>All {trades.length} trades verified</span>
              </span>
            )}
          </div>
        </div>

        {/* Rates Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">STT (Sell Side)</span>
            <span className="text-white font-bold text-xs mt-0.5 block">0.15%</span>
            <span className="text-[10px] text-neutral-400">On option sell premium</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">Stamp Duty (Buy)</span>
            <span className="text-white font-bold text-xs mt-0.5 block">0.003%</span>
            <span className="text-[10px] text-neutral-400">On option buy premium</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">NSE Transaction</span>
            <span className="text-white font-bold text-xs mt-0.5 block">0.03553%</span>
            <span className="text-[10px] text-neutral-400">On total premium turnover</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">SEBI Turnover</span>
            <span className="text-white font-bold text-xs mt-0.5 block">0.0001%</span>
            <span className="text-[10px] text-neutral-400">₹10 per crore turnover</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">Brokerage</span>
            <span className="text-white font-bold text-xs mt-0.5 block">₹20 / order</span>
            <span className="text-[10px] text-neutral-400">₹40 round-trip executions</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">GST on Services</span>
            <span className="text-white font-bold text-xs mt-0.5 block">18%</span>
            <span className="text-[10px] text-neutral-400">Brokerage + NSE + SEBI</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-neutral-400">
            Clicking repair will recalculate exact statutory charges and true Net P&L for every trade in your journal.
          </p>

          <button
            onClick={handleRepairAllTaxes}
            disabled={isRepairingTaxes || trades.length === 0}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50"
          >
            <Wrench className="w-4 h-4" />
            <span>{isRepairingTaxes ? 'Recalculating...' : 'Recalculate & Repair All Trade Taxes'}</span>
          </button>
        </div>
      </div>

      {/* 3. Demo Data & Emergency Reset Controls */}
      <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 text-neutral-400" />
          <span>Demo Data & Storage Reset</span>
        </h3>
        <p className="text-xs text-neutral-400">
          Populate realistic demo Indian F&O & Equity trades to test the software, or wipe the local journal database.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleLoadDemoData}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-800 transition"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Load Authentic Indian F&O Sample Trades</span>
          </button>

          <button
            onClick={handleClearAll}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 text-xs font-semibold border border-rose-500/30 transition"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Wipe All Local Records</span>
          </button>
        </div>
      </div>

      {/* Cash In / Out Modal */}
      {showCapitalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090909] border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
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
                    className={`py-2 rounded-xl text-xs font-black ${
                      capitalForm.type === 'Deposit' ? 'bg-emerald-500 text-black' : 'bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    Deposit (Capital Added)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapitalForm({ ...capitalForm, type: 'Withdrawal' })}
                    className={`py-2 rounded-xl text-xs font-black ${
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
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={capitalForm.amount}
                  onChange={(e) => setCapitalForm({ ...capitalForm, amount: Number(e.target.value) })}
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2 text-white font-bold"
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
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCapitalModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Erase Initial Capital Modal */}
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

            <form onSubmit={handleSaveInitialCapSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-neutral-400">
                Set your actual trading account starting balance, or erase it to ₹0.00.
              </p>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Initial Capital Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={inputInitialCap}
                  onChange={(e) => setInputInitialCap(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#111111] border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-400"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-850">
                <button
                  type="button"
                  onClick={() => {
                    handleEraseInitialCap();
                    setShowInitialCapModal(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 transition"
                >
                  Erase to ₹0.00
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowInitialCapModal(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black"
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
