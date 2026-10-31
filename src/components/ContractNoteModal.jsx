import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Key,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Shield,
  FileCheck,
  Table,
} from 'lucide-react';
import { formatINR } from '../utils/calculations';
import { readExcelFile, matchTradebookExecutions } from '../utils/excelParser';

export default function ContractNoteModal({
  isOpen,
  onClose,
  onImportTrades,
  currentUser,
}) {
  if (!isOpen) return null;

  const fileInputRef = useRef(null);

  // States
  const [file, setFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [fileCsvText, setFileCsvText] = useState('');
  const [fileType, setFileType] = useState('excel'); // 'excel' | 'csv' | 'pdf'
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'reading' | 'parsing' | 'review'
  const [error, setError] = useState(null);

  // Gemini API Key management
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('delta_gemini_api_key') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Parsed Trades Data
  const [parsedData, setParsedData] = useState({
    broker: '',
    tradeDate: '',
    totalCharges: 0,
    trades: [],
    sourceType: 'excel',
  });

  // Selected trade IDs for import
  const [selectedIndices, setSelectedIndices] = useState([]);

  // Save API key to localStorage when updated
  const handleSaveApiKey = (val) => {
    setApiKey(val);
    if (val.trim()) {
      localStorage.setItem('delta_gemini_api_key', val.trim());
    } else {
      localStorage.removeItem('delta_gemini_api_key');
    }
  };

  // Process File (Excel .xlsx / .xls, .csv, or .pdf)
  const processFile = async (selectedFile) => {
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');
    const isPdf = fileName.endsWith('.pdf');

    if (!isExcel && !isCsv && !isPdf) {
      setError('Please upload a valid Excel file (.xlsx, .xls), CSV (.csv), or broker PDF.');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('File size exceeds 25MB limit. Please upload a standard broker export.');
      return;
    }

    setError(null);
    setFile(selectedFile);

    if (isExcel || isCsv) {
      setFileType(isExcel ? 'excel' : 'csv');
      setStatus('reading');
      try {
        const { rows, csvText } = await readExcelFile(selectedFile);
        setFileCsvText(csvText);

        // Try direct client-side smart matching
        const matched = matchTradebookExecutions(rows);
        if (matched && matched.length > 0) {
          // Detected broker
          let detectedBroker = 'Broker Tradebook Excel';
          const lowerName = fileName.toLowerCase();
          if (lowerName.includes('zerodha') || lowerName.includes('tradebook')) detectedBroker = 'Zerodha Tradebook';
          else if (lowerName.includes('groww')) detectedBroker = 'Groww Tradebook';
          else if (lowerName.includes('angel')) detectedBroker = 'Angel One Tradebook';
          else if (lowerName.includes('dhan')) detectedBroker = 'Dhan Tradebook';
          else if (lowerName.includes('upstox')) detectedBroker = 'Upstox Tradebook';

          const totalCharges = matched.reduce((acc, t) => acc + (Number(t.charges) || 0), 0);

          setParsedData({
            broker: detectedBroker,
            tradeDate: matched[0]?.date || new Date().toISOString().slice(0, 10),
            totalCharges: Number(totalCharges.toFixed(2)),
            trades: matched,
            sourceType: isExcel ? 'excel' : 'csv',
          });
          setSelectedIndices(matched.map((_, i) => i));
          setStatus('review');
        } else {
          // If direct rule-matching didn't find pairs, give user option to parse with AI
          setStatus('idle');
          setError('Excel file loaded. Click "AI Enhanced Parse" to extract and match all trade executions.');
        }
      } catch (err) {
        setStatus('idle');
        setError(`Failed to read Excel file: ${err.message}`);
      }
    } else if (isPdf) {
      setFileType('pdf');
      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result);
      };
      reader.onerror = () => {
        setError('Failed to read the PDF file.');
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Trigger AI Parsing via Serverless API for complex or PDF files
  const handleParseWithAI = async () => {
    setStatus('parsing');
    setError(null);

    try {
      let payload = {};

      if (fileType === 'pdf') {
        if (!fileBase64) {
          setError('Please choose a file to parse.');
          setStatus('idle');
          return;
        }
        payload = {
          fileBase64,
          mimeType: 'application/pdf',
          apiKey: apiKey.trim() || undefined,
        };
      } else {
        // For Excel / CSV, send the extracted CSV tabular text encoded as base64
        if (!fileCsvText) {
          setError('Please select an Excel or CSV file.');
          setStatus('idle');
          return;
        }
        const b64Csv = btoa(unescape(encodeURIComponent(fileCsvText.slice(0, 50000))));
        payload = {
          fileBase64: `data:text/csv;base64,${b64Csv}`,
          mimeType: 'text/csv',
          apiKey: apiKey.trim() || undefined,
        };
      }

      const res = await fetch('/api/ai/parse-contract-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsApiKey) {
          setShowKeyInput(true);
        }
        throw new Error(data.error || 'Failed to parse file with AI.');
      }

      if (!data.trades || !Array.isArray(data.trades) || data.trades.length === 0) {
        throw new Error('No completed trade executions were detected in this document.');
      }

      // Standardize and stamp each trade
      const formattedTrades = data.trades.map((t, idx) => {
        const entry = Number(t.entryPrice) || 0;
        const exit = Number(t.exitPrice) || 0;
        const qty = Number(t.quantity) || 0;
        const gross = Number(t.grossPnL) || (exit - entry) * qty;
        const charges = Number(t.charges) || 0;
        const net = Number(t.netPnL) || gross - charges;
        const isCall = t.tradeType === 'Call' || t.optionType === 'CE' || t.symbol?.includes('CE');

        return {
          id: `TRD-AI-${Date.now().toString().slice(-6)}-${idx}`,
          date: t.date || data.tradeDate || new Date().toISOString().slice(0, 10),
          entryTime: t.entryTime || '09:30',
          exitTime: t.exitTime || '10:15',
          symbol: t.symbol || 'NIFTY OPTION',
          underlying: t.underlying || 'NIFTY',
          exchange: 'NSE',
          segment: t.segment || 'Options',
          direction: t.direction || 'Long',
          optionType: isCall ? 'CE' : 'PE',
          optionAction: 'Buy',
          tradeType: isCall ? 'Call' : 'Put',
          strikePrice: Number(t.strikePrice) || 25000,
          expiryDate: t.expiryDate || t.date || new Date().toISOString().slice(0, 10),
          lotSize: (t.underlying === 'BANKNIFTY' ? 15 : 25),
          lots: Math.max(1, Math.round(qty / (t.underlying === 'BANKNIFTY' ? 15 : 25))),
          quantity: qty,
          entryPrice: entry,
          exitPrice: exit,
          grossPnL: Number(gross.toFixed(2)),
          charges: Number(charges.toFixed(2)),
          netPnL: Number(net.toFixed(2)),
          marginUsed: entry * qty,
          stopLoss: 0,
          target: 0,
          strategy: t.strategy || 'Intraday Options',
          ruleFollowed: true,
          ruleViolations: [],
          entryEmotion: 'Disciplined',
          exitEmotion: 'Disciplined',
          entryReason: 'AI Extracted Execution',
          exitReason: '',
          notes: t.notes || `AI Parsed: Gross ₹${gross.toFixed(2)} - Charges ₹${charges.toFixed(2)} = Net ₹${net.toFixed(2)}.`,
          status: 'Closed',
          screenshots: [],
        };
      });

      setParsedData({
        broker: data.broker || 'Broker Export',
        tradeDate: data.tradeDate || formattedTrades[0]?.date || new Date().toISOString().slice(0, 10),
        totalCharges: Number(data.totalCharges) || formattedTrades.reduce((acc, t) => acc + t.charges, 0),
        trades: formattedTrades,
        sourceType: fileType,
      });

      setSelectedIndices(formattedTrades.map((_, i) => i));
      setStatus('review');
    } catch (err) {
      console.error('AI Parse error:', err);
      setError(err.message);
      setStatus('idle');
    }
  };

  const toggleSelect = (idx) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIndices.length === parsedData.trades.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(parsedData.trades.map((_, i) => i));
    }
  };

  // Perform Final Import
  const handleConfirmImport = () => {
    const selectedTrades = parsedData.trades.filter((_, idx) => selectedIndices.includes(idx));
    if (selectedTrades.length === 0) {
      setError('Please select at least one trade to import.');
      return;
    }

    onImportTrades(selectedTrades);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setFileBase64('');
    setFileCsvText('');
    setStatus('idle');
    setError(null);
    setParsedData({ broker: '', tradeDate: '', totalCharges: 0, trades: [], sourceType: 'excel' });
    setSelectedIndices([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Review Aggregates
  const reviewAggregates = React.useMemo(() => {
    const sel = parsedData.trades.filter((_, idx) => selectedIndices.includes(idx));
    const gross = sel.reduce((acc, t) => acc + (Number(t.grossPnL) || 0), 0);
    const charges = sel.reduce((acc, t) => acc + (Number(t.charges) || 0), 0);
    const net = sel.reduce((acc, t) => acc + (Number(t.netPnL) || 0), 0);
    return {
      count: sel.length,
      gross: Number(gross.toFixed(2)),
      charges: Number(charges.toFixed(2)),
      net: Number(net.toFixed(2)),
    };
  }, [parsedData.trades, selectedIndices]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#090909] border border-neutral-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Import Broker Excel Tradebook
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  EXCEL & CSV READY
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Upload broker Excel (.xlsx, .xls), CSV, or PDF from Zerodha, Groww, Angel One, Dhan, or Upstox
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1 font-medium">{error}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD SCREEN */}
          {status === 'idle' && (
            <div className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-neutral-800 hover:border-neutral-700 bg-black/40'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 shadow-inner">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {file ? file.name : 'Click to select or drag & drop your Excel file here'}
                  </p>
                  <p className="text-xs text-neutral-400">
                    Supports <strong className="text-emerald-400">.xlsx</strong>, <strong className="text-emerald-400">.xls</strong>, <strong className="text-emerald-400">.csv</strong>, or broker <strong className="text-neutral-300">.pdf</strong>
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Excel (.xlsx, .xls)
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    CSV (.csv)
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                    PDF (.pdf)
                  </span>
                </div>
              </div>

              {/* Action Buttons if file selected */}
              {file && (
                <div className="p-3.5 rounded-xl bg-black border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{file.name}</p>
                      <p className="text-[11px] text-neutral-400">
                        {(file.size / 1024).toFixed(1)} KB • Ready for extraction
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold transition"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleParseWithAI}
                      className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black shadow-lg shadow-emerald-500/20 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extract & Match Trades</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Supported Brokers List */}
              <div className="p-3.5 rounded-xl bg-black border border-neutral-800/80 space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Tested with major Indian brokers
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Zerodha Console Tradebook',
                    'Groww P&L Excel',
                    'Angel One Tradebook',
                    'Dhan Past Trades',
                    'Upstox Tradebook',
                    'Kotak Neo',
                    'Shoonya',
                    'Fyers',
                    'ICICI Direct',
                  ].map((b) => (
                    <span
                      key={b}
                      className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 font-medium"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Gemini API Key Collapsible */}
              <div className="p-3 rounded-xl bg-neutral-900/30 border border-neutral-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    AI Engine Key (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    className="text-[11px] text-emerald-400 hover:text-white font-semibold"
                  >
                    {showKeyInput ? 'Hide' : apiKey ? 'Edit Key' : 'Add Key'}
                  </button>
                </div>

                {showKeyInput && (
                  <div className="space-y-2 pt-1 animate-in fade-in">
                    <p className="text-[11px] text-neutral-400">
                      Standard Excel matching works 100% offline. For complex layouts, Gemini AI is used:
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={apiKey}
                        onChange={(e) => handleSaveApiKey(e.target.value)}
                        className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-emerald-400 transition"
                      >
                        <span>Free Key</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: READING / PARSING LOADER */}
          {(status === 'reading' || status === 'parsing') && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse">
                  <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">
                  {status === 'reading' ? 'Reading Excel Workbook...' : 'Matching & Calculating Taxes...'}
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Applying official Government STT (0.15%), Stamp Duty, NSE Options fees, and computing true Net P&L.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW TRADES */}
          {status === 'review' && (
            <div className="space-y-4">
              {/* Summary Strip */}
              <div className="p-4 rounded-xl bg-black border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white uppercase">{parsedData.broker}</span>
                    <span className="text-[10px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded font-mono">
                      {parsedData.tradeDate}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">
                      {parsedData.sourceType}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Extracted {parsedData.trades.length} round-trip trade executions
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">Selected Net P&L</span>
                    <span className={`text-base font-black ${reviewAggregates.net >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {formatINR(reviewAggregates.net)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-neutral-800" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">Taxes & Charges</span>
                    <span className="text-base font-bold text-amber-400">
                      {formatINR(reviewAggregates.charges)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Table of Parsed Trades */}
              <div className="rounded-xl border border-neutral-800 overflow-hidden">
                <div className="p-2.5 bg-neutral-900/60 border-b border-neutral-800 flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer select-none text-xs font-bold text-neutral-300">
                    <input
                      type="checkbox"
                      checked={selectedIndices.length === parsedData.trades.length && parsedData.trades.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0"
                    />
                    <span>Select All ({selectedIndices.length} / {parsedData.trades.length})</span>
                  </label>
                  <span className="text-[11px] text-neutral-500">Uncheck any trades you don't wish to log</span>
                </div>

                <div className="divide-y divide-neutral-850 max-h-[380px] overflow-y-auto">
                  {parsedData.trades.map((t, idx) => {
                    const isSelected = selectedIndices.includes(idx);
                    const isCall = t.tradeType === 'Call' || t.optionType === 'CE' || t.symbol?.includes('CE');
                    const isProfit = Number(t.netPnL) >= 0;

                    return (
                      <div
                        key={t.id || idx}
                        onClick={() => toggleSelect(idx)}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected ? 'bg-neutral-900/30 hover:bg-neutral-900/50' : 'opacity-40 hover:opacity-70 bg-black'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-white text-xs sm:text-sm truncate">
                                {t.symbol}
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                isCall
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}>
                                {isCall ? 'CALL' : 'PUT'}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-400 flex items-center space-x-2 mt-0.5">
                              <span>Qty: <strong className="text-white">{t.quantity}</strong></span>
                              <span>•</span>
                              <span>Buy: ₹{t.entryPrice}</span>
                              <span>•</span>
                              <span>Sell: ₹{t.exitPrice}</span>
                              <span>•</span>
                              <span>Charges: ₹{t.charges}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-sm font-black ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {formatINR(t.netPnL)}
                          </span>
                          <span className="text-[10px] text-neutral-500 block">
                            Gross: {formatINR(t.grossPnL)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold border border-neutral-800 transition"
                >
                  Upload Another File
                </button>

                <div className="flex items-center space-x-3">
                  <span className="text-xs text-neutral-400">
                    Ready to log <strong className="text-white">{reviewAggregates.count}</strong> trades
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={reviewAggregates.count === 0}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import Selected Trades</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
