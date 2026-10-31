/**
 * Intelligent Broker Excel (.xlsx, .xls) & CSV Tradebook Parser
 * Supports: Zerodha, Groww, Angel One, Dhan, Upstox, Kotak, ICICI Direct, and standard journal spreadsheets
 */

import { calculateIndianCharges } from './chargesCalculator';

// Ensure XLSX is loaded in the window
export async function getXLSX() {
  if (typeof window !== 'undefined' && window.XLSX) {
    return window.XLSX;
  }
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window not available'));
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => {
      // Fallback mirror CDN
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      fallbackScript.onload = () => resolve(window.XLSX);
      fallbackScript.onerror = () => reject(new Error('Failed to load Excel parsing engine.'));
      document.head.appendChild(fallbackScript);
    };
    document.head.appendChild(script);
  });
}

/**
 * Read Excel file (.xlsx, .xls) and convert active sheet into JSON rows and CSV text
 */
export async function readExcelFile(file) {
  const isCSV = file.name.toLowerCase().endsWith('.csv');

  if (isCSV) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        resolve({
          sheetName: 'CSV Data',
          csvText: text,
          rows: parseCSVToRows(text),
        });
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file.'));
      reader.readAsText(file);
    });
  }

  const XLSX = await getXLSX();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        const csvText = XLSX.utils.sheet_to_csv(worksheet);

        resolve({
          sheetName,
          rows,
          csvText,
        });
      } catch (err) {
        reject(new Error(`Failed to parse Excel workbook: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file.'));
    reader.readAsArrayBuffer(file);
  });
}

// Fallback pure JS CSV parser for when XLSX isn't loaded
function parseCSVToRows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.replace(/^["']|["']$/g, '').trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Try client-side direct parsing of recognized broker tradebook structures
 * Matches Buy and Sell executions for the same instrument into complete round-trip trades
 */
export function matchTradebookExecutions(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Normalize column names
  const normalizedRows = rows.map((r) => {
    const norm = {};
    for (const key of Object.keys(r)) {
      const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
      norm[cleanKey] = r[key];
    }
    return norm;
  });

  // Check if this is already a closed trade sheet (has both entry/buy and exit/sell in same row)
  const isPreAggregated = normalizedRows.some(
    (r) =>
      (r.entryprice || r.buyprice || r.buyavg) &&
      (r.exitprice || r.sellprice || r.sellavg)
  );

  if (isPreAggregated) {
    return parsePreAggregatedRows(normalizedRows);
  }

  // Otherwise, match separate Buy and Sell execution rows (Zerodha, Groww, Angel One style)
  return matchSeparateLegs(normalizedRows);
}

function parsePreAggregatedRows(rows) {
  const trades = [];

  rows.forEach((r, idx) => {
    const rawDate = r.date || r.tradedate || r.entrydate || new Date().toISOString().slice(0, 10);
    const date = formatDate(rawDate);
    const symbol = (r.symbol || r.tradingsymbol || r.scripname || r.instrument || 'NIFTY').toUpperCase().trim();
    const entryPrice = parseFloat(r.entryprice || r.buyprice || r.buyavg || 0);
    const exitPrice = parseFloat(r.exitprice || r.sellprice || r.sellavg || 0);
    const quantity = parseInt(r.quantity || r.qty || 1, 10);

    if (entryPrice > 0 && exitPrice > 0 && quantity > 0) {
      const isCall = symbol.includes('CE') || r.type === 'Call' || r.tradetype === 'Call';
      const isPut = symbol.includes('PE') || r.type === 'Put' || r.tradetype === 'Put';
      const tradeType = isCall ? 'Call' : isPut ? 'Put' : 'Call';
      const underlying = symbol.includes('BANKNIFTY') ? 'BANKNIFTY' : 'NIFTY';

      const breakdown = calculateIndianCharges({
        segment: 'Options',
        direction: 'Long',
        entryPrice,
        exitPrice,
        quantity,
      });

      const grossPnL = Number(((exitPrice - entryPrice) * quantity).toFixed(2));
      const charges = parseFloat(r.charges || r.taxes) || breakdown.totalCharges;
      const netPnL = Number((grossPnL - charges).toFixed(2));

      trades.push({
        id: `TRD-XLS-${Date.now().toString().slice(-5)}-${idx}`,
        date,
        entryTime: r.entrytime || '09:30',
        exitTime: r.exittime || '10:15',
        symbol,
        underlying,
        exchange: 'NSE',
        segment: 'Options',
        direction: 'Long',
        optionType: isCall ? 'CE' : isPut ? 'PE' : null,
        optionAction: 'Buy',
        tradeType,
        strikePrice: parseFloat(symbol.replace(/\D/g, '')) || 25000,
        expiryDate: date,
        lotSize: underlying === 'BANKNIFTY' ? 15 : 25,
        lots: Math.max(1, Math.round(quantity / (underlying === 'BANKNIFTY' ? 15 : 25))),
        quantity,
        entryPrice,
        exitPrice,
        grossPnL,
        charges,
        netPnL,
        marginUsed: entryPrice * quantity,
        strategy: r.strategy || 'Intraday Options',
        ruleFollowed: true,
        ruleViolations: [],
        entryEmotion: 'Disciplined',
        exitEmotion: 'Disciplined',
        entryReason: r.entryreason || 'Excel Import',
        exitReason: r.exitreason || '',
        notes: `Imported from Excel: Gross ₹${grossPnL} - Charges ₹${charges} = Net ₹${netPnL}.`,
        status: 'Closed',
        screenshots: [],
      });
    }
  });

  return trades;
}

function matchSeparateLegs(rows) {
  // Group executions by symbol and trade date
  const groups = {};

  rows.forEach((r) => {
    const rawDate = r.tradedate || r.date || r.orderdate || r.orderexecutiontime || '';
    const date = formatDate(rawDate);
    const symbol = (r.symbol || r.tradingsymbol || r.scripname || r.instrument || '').toUpperCase().trim();
    if (!symbol) return;

    const key = `${date}_${symbol}`;
    if (!groups[key]) groups[key] = { date, symbol, buys: [], sells: [] };

    const typeStr = (r.tradetype || r.type || r.side || r.transactiontype || '').toLowerCase();
    const price = parseFloat(r.price || r.tradeprice || r.avgprice || r.rate || 0);
    const qty = parseInt(r.quantity || r.qty || r.tradedqty || 0, 10);

    if (price > 0 && qty > 0) {
      if (typeStr.includes('buy') || typeStr === 'b') {
        groups[key].buys.push({ price, qty, time: r.orderexecutiontime || r.time || '09:30' });
      } else if (typeStr.includes('sell') || typeStr === 's') {
        groups[key].sells.push({ price, qty, time: r.orderexecutiontime || r.time || '10:15' });
      }
    }
  });

  const matchedTrades = [];
  let tradeIndex = 1;

  for (const key of Object.keys(groups)) {
    const { date, symbol, buys, sells } = groups[key];
    const totalBuyQty = buys.reduce((acc, b) => acc + b.qty, 0);
    const totalSellQty = sells.reduce((acc, s) => acc + s.qty, 0);

    const matchQty = Math.min(totalBuyQty, totalSellQty);
    if (matchQty > 0) {
      // Weighted average buy and sell prices
      const buyValue = buys.reduce((acc, b) => acc + b.price * b.qty, 0);
      const sellValue = sells.reduce((acc, s) => acc + s.price * s.qty, 0);

      const avgBuyPrice = totalBuyQty > 0 ? Number((buyValue / totalBuyQty).toFixed(2)) : 0;
      const avgSellPrice = totalSellQty > 0 ? Number((sellValue / totalSellQty).toFixed(2)) : 0;

      const isCall = symbol.includes('CE');
      const isPut = symbol.includes('PE');
      const tradeType = isCall ? 'Call' : isPut ? 'Put' : 'Call';
      const underlying = symbol.includes('BANKNIFTY')
        ? 'BANKNIFTY'
        : symbol.includes('FINNIFTY')
        ? 'FINNIFTY'
        : symbol.includes('SENSEX')
        ? 'SENSEX'
        : 'NIFTY';

      const breakdown = calculateIndianCharges({
        segment: 'Options',
        direction: 'Long',
        entryPrice: avgBuyPrice,
        exitPrice: avgSellPrice,
        quantity: matchQty,
      });

      const grossPnL = Number(((avgSellPrice - avgBuyPrice) * matchQty).toFixed(2));
      const charges = breakdown.totalCharges;
      const netPnL = Number((grossPnL - charges).toFixed(2));

      matchedTrades.push({
        id: `TRD-XLS-${Date.now().toString().slice(-5)}-${tradeIndex++}`,
        date,
        entryTime: buys[0]?.time || '09:30',
        exitTime: sells[0]?.time || '10:15',
        symbol,
        underlying,
        exchange: 'NSE',
        segment: 'Options',
        direction: 'Long',
        optionType: isCall ? 'CE' : isPut ? 'PE' : null,
        optionAction: 'Buy',
        tradeType,
        strikePrice: parseFloat(symbol.replace(/\D/g, '')) || 25000,
        expiryDate: date,
        lotSize: underlying === 'BANKNIFTY' ? 15 : 25,
        lots: Math.max(1, Math.round(matchQty / (underlying === 'BANKNIFTY' ? 15 : 25))),
        quantity: matchQty,
        entryPrice: avgBuyPrice,
        exitPrice: avgSellPrice,
        grossPnL,
        charges,
        netPnL,
        marginUsed: avgBuyPrice * matchQty,
        strategy: 'Intraday Options',
        ruleFollowed: true,
        ruleViolations: [],
        entryEmotion: 'Disciplined',
        exitEmotion: 'Disciplined',
        entryReason: 'Excel Tradebook Execution',
        exitReason: '',
        notes: `Excel Matched Trade: Gross ₹${grossPnL} - Charges ₹${charges} = Net ₹${netPnL}. (STT: ₹${breakdown.stt}, Stamp: ₹${breakdown.stampDuty}, NSE: ₹${breakdown.exchangeTurnover}, GST: ₹${breakdown.gst})`,
        status: 'Closed',
        screenshots: [],
      });
    }
  }

  return matchedTrades;
}

function formatDate(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  // Match DD-MM-YYYY or DD/MM/YYYY
  const parts = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (parts) {
    const day = parts[1].padStart(2, '0');
    const month = parts[2].padStart(2, '0');
    const year = parts[3];
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().slice(0, 10);
}
