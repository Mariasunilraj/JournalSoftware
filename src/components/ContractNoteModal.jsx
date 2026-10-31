import React, { useState, useRef, useEffect } from 'react';
import {
  X,
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
} from 'lucide-react';
import { formatINR } from '../utils/calculations';

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
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'parsing' | 'review'
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

  // Convert File to Base64
  const processFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF contract note.');
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('File size exceeds 15MB limit. Please upload a standard broker contract note PDF.');
      return;
    }

    setError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result);
    };
    reader.onerror = () => {
      setError('Failed to read the PDF file. Please try again.');
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Trigger AI Parsing via Serverless API
  const handleParsePDF = async () => {
    if (!fileBase64) {
      setError('Please choose a contract note PDF to upload.');
      return;
    }

    setStatus('parsing');
    setError(null);

    try {
      const res = await fetch('/api/ai/parse-contract-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          mimeType: 'application/pdf',
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsApiKey) {
          setShowKeyInput(true);
        }
        throw new Error(data.error || 'Failed to parse contract note.');
      }

      const trades = Array.isArray(data.trades) ? data.trades : [];
      if (trades.length === 0) {
        throw new Error('No executed trades were detected in this document. Please ensure you uploaded a contract note or tradebook PDF.');
      }

      // Map parsed trades with stable temporary IDs
      const mappedTrades = trades.map((t, idx) => ({
        ...t,
        tempId: `parsed_${Date.now()}_${idx}`,
        ruleFollowed: true,
        ruleViolations: [],
        entryEmotion: 'Disciplined',
        exitEmotion: 'Disciplined',
        status: 'Closed',
      }));

      setParsedData({
        broker: data.broker || 'Contract Note',
        tradeDate: data.tradeDate || new Date().toISOString().slice(0, 10),
        totalCharges: Number(data.totalCharges) || 0,
        trades: mappedTrades,
      });

      // Select all trades by default
      setSelectedIndices(mappedTrades.map((_, i) => i));
      setStatus('review');
    } catch (err) {
      setError(err.message || 'Error communicating with AI parser.');
      setStatus('idle');
    }
  };

  // Toggle selection
  const toggleSelect = (index) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIndices.length === parsedData.trades.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(parsedData.trades.map((_, i) => i));
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    const tradesToImport = parsedData.trades.filter((_, idx) =>
      selectedIndices.includes(idx)
    );

    if (tradesToImport.length === 0) {
      setError('Please select at least one trade to import.');
      return;
    }

    // Format trades for the Delta Journal schema
    const formatted = tradesToImport.map((t, idx) => {
      const now = Date.now() + idx;
      const isCall = t.tradeType === 'Call' || t.optionType === 'CE' || t.symbol?.includes('CE');
      const optionType = isCall ? 'CE' : t.optionType === 'PE' || t.symbol?.includes('PE') ? 'PE' : null;
      const segment = t.segment || (optionType ? 'Options' : 'Equity');
      const gross = Number(t.grossPnL) || (Number(t.exitPrice) - Number(t.entryPrice)) * Number(t.quantity);
      const charges = Number(t.charges) || 0;
      const net = Number(t.netPnL) || (gross - charges);

      return {
        id: `TRD-${now.toString().slice(-6)}`,
        date: t.date || parsedData.tradeDate || new Date().toISOString().slice(0, 10),
        entryTime: t.entryTime || '09:30',
        exitTime: t.exitTime || '10:15',
        symbol: t.symbol || 'NIFTY',
        underlying: t.underlying || 'NIFTY',
        exchange: 'NSE',
        segment,
        direction: 'Long',
        tradeType: isCall ? 'Call' : 'Put',
        optionType,
        optionAction: 'Buy',
        strikePrice: Number(t.strikePrice) || 0,
        expiryDate: t.expiryDate || t.date || new Date().toISOString().slice(0, 10),
        lotSize: 25,
        lots: Math.max(1, Math.round((Number(t.quantity) || 25) / 25)),
        quantity: Number(t.quantity) || 25,
        entryPrice: Number(t.entryPrice) || 0,
        exitPrice: Number(t.exitPrice) || 0,
        marginUsed: Number(t.entryPrice || 0) * Number(t.quantity || 0),
        grossPnL: Number(gross.toFixed(2)),
        charges: Number(charges.toFixed(2)),
        netPnL: Number(net.toFixed(2)),
        status: 'Closed',
        ruleFollowed: true,
        ruleViolations: [],
        entryEmotion: 'Disciplined',
        exitEmotion: 'Disciplined',
        strategy: t.strategy || 'Contract Note Import',
        notes: t.notes || `Imported from ${parsedData.broker} Contract Note (${parsedData.tradeDate})`,
        userId: currentUser?.id,
        createdAt: now,
        updatedAt: now,
      };
    });

    onImportTrades(formatted);
    onClose();
  };

  // Financial aggregates for reviewed trades
  const reviewAggregates = parsedData.trades.reduce(
    (acc, t, idx) => {
      if (selectedIndices.includes(idx)) {
        acc.gross += Number(t.grossPnL) || 0;
        acc.charges += Number(t.charges) || 0;
        acc.net += Number(t.netPnL) || 0;
        acc.count += 1;
      }
      return acc;
    },
    { gross: 0, charges: 0, net: 0, count: 0 }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-[#090909] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-black">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(0,230,118,0.2)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                AI Contract Note Import
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PDF OCR
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Upload broker contract note or tradebook PDF to auto-log your executions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-white touch-scroll">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-300 flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Error: </span>
                {error}
              </div>
            </div>
          )}

          {/* STEP 1: UPLOAD SCREEN */}
          {status === 'idle' && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-950/10'
                    : file
                    ? 'border-emerald-500/40 bg-neutral-900/40'
                    : 'border-neutral-800 hover:border-neutral-700 bg-black/40 hover:bg-black/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => e.target.files && processFile(e.target.files[0])}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 shadow-inner">
                  {file ? <FileCheck className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                </div>

                {file ? (
                  <div>
                    <span className="text-sm font-bold text-white block">{file.name}</span>
                    <span className="text-xs text-emerald-400 font-mono mt-0.5 block">
                      {(file.size / 1024).toFixed(1)} KB • Ready to parse
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-bold text-white block">
                      Drop your Contract Note PDF here, or <span className="text-emerald-400 underline">browse</span>
                    </span>
                    <span className="text-xs text-neutral-500 mt-1 block">
                      Supports Zerodha, Groww, Angel One, Dhan, Upstox, Kotak Neo & more
                    </span>
                  </div>
                )}
              </div>

              {/* Supported Brokers Strip */}
              <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Supported Broker Documents
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['Zerodha Kite', 'Groww', 'Angel One', 'Dhan', 'Upstox', 'Kotak Neo', 'Shoonya', 'Fyers', 'ICICI Direct'].map((b) => (
                    <span
                      key={b}
                      className="px-2 py-0.5 rounded-lg bg-black border border-neutral-800 text-[11px] text-neutral-300 font-medium"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Gemini API Key Collapsible / Config */}
              <div className="p-3.5 rounded-xl bg-neutral-900/30 border border-neutral-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    Google Gemini AI Key
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    className="text-[11px] text-emerald-400 hover:text-white font-semibold"
                  >
                    {showKeyInput ? 'Hide' : apiKey ? 'Edit Key' : 'Add Key (Optional)'}
                  </button>
                </div>

                {showKeyInput && (
                  <div className="space-y-2 pt-1 animate-in fade-in">
                    <p className="text-[11px] text-neutral-400">
                      You can paste your free Google Gemini API key below, or set <code className="text-emerald-400">GEMINI_API_KEY</code> in your Vercel project settings:
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
                        <span>Get Free Key</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PARSING LOADER */}
          {status === 'parsing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse">
                  <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">AI is Analyzing Your Contract Note...</h3>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Matching Buy and Sell executions, computing round-trip P&L, and calculating STT and statutory charges.
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
                  </div>
                  <p className="text-xs text-neutral-400">
                    Detected {parsedData.trades.length} round-trip trade executions
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
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">Charges</span>
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
                        key={t.tempId || idx}
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
                          <div className={`text-sm sm:text-base font-black ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {formatINR(t.netPnL)}
                          </div>
                          <span className="text-[10px] text-neutral-500">
                            Gross: {formatINR(t.grossPnL)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-black flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 transition"
          >
            Cancel
          </button>

          {status === 'idle' && (
            <button
              type="button"
              onClick={handleParsePDF}
              disabled={!file}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_14px_rgba(0,230,118,0.3)]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Parse Contract Note</span>
            </button>
          )}

          {status === 'review' && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 transition"
              >
                Upload Another
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedIndices.length === 0}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition active:scale-95 disabled:opacity-50 shadow-[0_0_14px_rgba(0,230,118,0.3)]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Import {selectedIndices.length} Trades to Journal</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
