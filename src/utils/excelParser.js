/**
 * Intelligent Broker Excel (.xlsx, .xls) & CSV Tradebook Parser
 * Supports: Groww, Zerodha, Angel One, Dhan, Upstox, Kotak Neo, Shoonya, ICICI Direct, and standard journal spreadsheets
 * 100% Client-side, fast, deterministic, and requires NO external AI API key.
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
 * Universal grid and CSV scanner that finds trade headers, bypasses metadata banners,
 * extracts all trade records across single or multi-table sheets (e.g. Futures & Options),
 * and detects official broker charges from summary blocks.
 */
export function parseGridOrCsv(rawGrid, text = '') {
  let detectedCharges = 0;
  let detectedBroker = null;

  const lowerText = text.toLowerCase();
  if (lowerText.includes('groww') || lowerText.includes('realised trades (trade level)')) {
    detectedBroker = 'Groww F&O P&L';
  } else if (lowerText.includes('zerodha') || lowerText.includes('console')) {
    detectedBroker = 'Zerodha Console Tradebook';
  } else if (lowerText.includes('angel')) {
    detectedBroker = 'Angel One Tradebook';
  } else if (lowerText.includes('dhan')) {
    detectedBroker = 'Dhan Tradebook';
  } else if (lowerText.includes('upstox')) {
    detectedBroker = 'Upstox Tradebook';
  }

  // Detect total charges from summary blocks if present (e.g. Groww summary table)
  if (rawGrid && rawGrid.length > 0) {
    for (let i = 0; i < Math.min(rawGrid.length, 35); i++) {
      const row = rawGrid[i] || [];
      const cell0 = String(row[0] || '').trim().toLowerCase();
      if (cell0 === 'charges' || cell0.includes('charges')) {
        for (let j = i + 1; j < Math.min(rawGrid.length, i + 15); j++) {
          const subRow = rawGrid[j] || [];
          const subCell0 = String(subRow[0] || '').trim().toLowerCase();
          if (subCell0 === 'total') {
            const val = parseFloat(subRow[1]);
            if (val > 0) detectedCharges = val;
            break;
          }
        }
      }
    }
  }

  // Scan rawGrid for all table header rows and their child trade rows
  const rows = [];
  let currentHeaders = null;

  if (rawGrid && rawGrid.length > 0) {
    for (let i = 0; i < rawGrid.length; i++) {
      const rowArr = rawGrid[i] || [];
      if (!rowArr || rowArr.length === 0 || rowArr.every((c) => String(c !== undefined && c !== null ? c : '').trim() === '')) {
        continue;
      }

      const rowStrings = rowArr.map((v) => String(v !== undefined && v !== null ? v : '').trim());
      const lowerStrings = rowStrings.map((v) => v.toLowerCase().replace(/[\s_.\-&/]+/g, ''));

      // Check if this row is a trade table header
      const matchCount = [
        'symbol', 'tradingsymbol', 'scripname', 'scrip', 'instrument', 'contract', 'particulars',
        'tradedate', 'date', 'orderdate', 'buyprice', 'buyavg', 'buyrate', 'sellprice', 'sellavg',
        'sellrate', 'realizedpnl', 'realisedpnl', 'quantity', 'qty', 'tradedqty'
      ].filter((k) => lowerStrings.some((cell) => cell.includes(k))).length;

      if (matchCount >= 2) {
        currentHeaders = rowStrings;
        continue;
      }

      if (currentHeaders && currentHeaders.length > 0) {
        const firstCell = String(rowArr[0] || '').trim().toLowerCase();

        // Skip metadata / total / summary / disclaimer rows
        if (
          firstCell === 'total' ||
          firstCell.startsWith('disclaimer') ||
          firstCell.startsWith('sub total') ||
          firstCell === 'summary' ||
          firstCell === 'charges'
        ) {
          continue;
        }

        // Skip standalone section headers like "Options", "Futures", "Equity"
        const nonEmpties = rowArr.filter((c) => String(c !== undefined && c !== null ? c : '').trim() !== '');
        if (nonEmpties.length === 1 && (firstCell === 'futures' || firstCell === 'options' || firstCell === 'equity')) {
          continue;
        }

        const obj = {};
        let hasVal = false;
        currentHeaders.forEach((h, colIdx) => {
          if (h) {
            const val = rowArr[colIdx] !== undefined && rowArr[colIdx] !== null ? rowArr[colIdx] : '';
            obj[h] = val;
            if (String(val).trim() !== '') hasVal = true;
          }
        });

        // Ensure row has at least an instrument name or price
        if (hasVal) {
          rows.push(obj);
        }
      }
    }
  }

  return { rows, summaryCharges: detectedCharges, detectedBroker };
}

/**
 * Read Excel file (.xlsx, .xls) and convert active sheet into JSON rows and CSV text
 * Scans all sheets in the workbook and selects the sheet with the most trade records
 */
export async function readExcelFile(file) {
  const isCSV = file.name.toLowerCase().endsWith('.csv');

  if (isCSV) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || '';
        const lines = text.split(/\r?\n/).map((l) => l.split(','));
        const { rows, summaryCharges, detectedBroker } = parseGridOrCsv(lines, text);
        resolve({
          sheetName: 'CSV Data',
          csvText: text,
          rows: rows.length > 0 ? rows : parseCSVToRows(text),
          summaryCharges,
          detectedBroker,
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

        let bestRows = [];
        let bestCsvText = '';
        let bestSheetName = workbook.SheetNames[0] || 'Sheet1';
        let detectedCharges = 0;
        let detectedBrokerName = null;

        // Iterate through all sheets to find trades
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const sheetCsv = XLSX.utils.sheet_to_csv(worksheet);
          const rawGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          const { rows, summaryCharges, detectedBroker } = parseGridOrCsv(rawGrid, sheetCsv);

          if (rows.length > bestRows.length) {
            bestRows = rows;
            bestCsvText = sheetCsv;
            bestSheetName = sheetName;
            if (summaryCharges) detectedCharges = summaryCharges;
            if (detectedBroker) detectedBrokerName = detectedBroker;
          }
        }

        // If no rows found through multi-section scanner, fallback to standard sheet_to_json
        if (bestRows.length === 0 && workbook.SheetNames[0]) {
          const ws = workbook.Sheets[workbook.SheetNames[0]];
          bestRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
          bestCsvText = XLSX.utils.sheet_to_csv(ws);
        }

        resolve({
          sheetName: bestSheetName,
          rows: bestRows,
          csvText: bestCsvText,
          summaryCharges: detectedCharges,
          detectedBroker: detectedBrokerName,
        });
      } catch (err) {
        reject(new Error(`Failed to parse Excel workbook: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file.'));
    reader.readAsArrayBuffer(file);
  });
}

// Fallback pure JS CSV parser
function parseCSVToRows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const lLower = lines[i].toLowerCase();
    if (
      lLower.includes('symbol') ||
      lLower.includes('scrip') ||
      lLower.includes('instrument') ||
      lLower.includes('trade date') ||
      lLower.includes('buy')
    ) {
      headerIdx = i;
      break;
    }
  }

  const headers = lines[headerIdx].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.replace(/^["']|["']$/g, '').trim());
    if (values.every((v) => v === '')) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Intelligent trade matching: Matches P&L reports (Fno_Pnl_Report.xlsx) or Tradebook executions
 */
export function matchTradebookExecutions(rows, options = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Normalize column names
  const normalizedRows = rows.map((r) => {
    const norm = {};
    for (const key of Object.keys(r)) {
      const cleanKey = key.trim().toLowerCase().replace(/[\s_.\-&/]+/g, '');
      norm[cleanKey] = r[key];
    }
    return norm;
  });

  // Check if this is a closed trade / P&L sheet (has both Buy and Sell or Realized P&L in same row)
  const isPreAggregated = normalizedRows.some(
    (r) =>
      (r.entryprice || r.buyprice || r.buyavg || r.buyrate || r.buyvalue || r.buyavgprice) &&
      (r.exitprice || r.sellprice || r.sellavg || r.sellrate || r.sellvalue || r.sellavgprice || r.realizedpnl !== undefined || r.realisedpnl !== undefined)
  );

  if (isPreAggregated) {
    return parsePreAggregatedRows(normalizedRows, options);
  }

  // Otherwise, match separate Buy and Sell execution rows (Tradebook format)
  return matchSeparateLegs(normalizedRows);
}

function parsePreAggregatedRows(rows, options = {}) {
  const trades = [];

  rows.forEach((r, idx) => {
    const rawDate =
      r.selldate ||
      r.buydate ||
      r.date ||
      r.tradedate ||
      r.entrydate ||
      r.exitdate ||
      r.closedate ||
      new Date().toISOString().slice(0, 10);

    const date = formatDate(rawDate);

    const symbol = (
      r.scripname ||
      r.symbol ||
      r.tradingsymbol ||
      r.scrip ||
      r.instrument ||
      r.contract ||
      r.particulars ||
      ''
    ).toUpperCase().trim();

    if (!symbol || symbol === 'TOTAL' || symbol.startsWith('SUB TOTAL')) return;

    const quantity = parseInt(
      r.quantity || r.qty || r.tradedqty || r.netqty || r.lotsize || 0,
      10
    );

    let entryPrice = parseFloat(r.entryprice || r.buyprice || r.buyavg || r.buyrate || r.buyavgprice || 0);
    let exitPrice = parseFloat(r.exitprice || r.sellprice || r.sellavg || r.sellrate || r.sellavgprice || 0);

    // If prices not directly stated, derive from Buy Value / Sell Value / Qty
    const buyVal = parseFloat(r.buyvalue || r.buyval || 0);
    const sellVal = parseFloat(r.sellvalue || r.sellval || 0);

    if (entryPrice <= 0 && buyVal > 0 && quantity > 0) {
      entryPrice = Number((buyVal / quantity).toFixed(2));
    }
    if (exitPrice <= 0 && sellVal > 0 && quantity > 0) {
      exitPrice = Number((sellVal / quantity).toFixed(2));
    }

    const realizedPnL = parseFloat(r.realizedpnl || r.realisedpnl || r.pnl || r.grosspnl || 0);

    if (quantity > 0 && (entryPrice > 0 || exitPrice > 0 || realizedPnL !== 0)) {
      // If one price is 0 but we have realizedPnL and the other price, derive the missing price
      if (entryPrice > 0 && exitPrice <= 0 && realizedPnL !== 0) {
        exitPrice = Number((entryPrice + realizedPnL / quantity).toFixed(2));
      } else if (exitPrice > 0 && entryPrice <= 0 && realizedPnL !== 0) {
        entryPrice = Number((exitPrice - realizedPnL / quantity).toFixed(2));
      }

      if (entryPrice <= 0) entryPrice = 100;
      if (exitPrice <= 0) exitPrice = entryPrice + (realizedPnL / quantity || 0);

      const isCall = symbol.includes('CE') || symbol.includes('CALL') || r.type === 'Call' || r.tradetype === 'Call';
      const isPut = symbol.includes('PE') || symbol.includes('PUT') || r.type === 'Put' || r.tradetype === 'Put';
      const tradeType = isCall ? 'Call' : isPut ? 'Put' : 'Call';

      let underlying = 'NIFTY';
      if (symbol.includes('BANKNIFTY')) underlying = 'BANKNIFTY';
      else if (symbol.includes('FINNIFTY')) underlying = 'FINNIFTY';
      else if (symbol.includes('SENSEX')) underlying = 'SENSEX';
      else if (symbol.includes('MIDCPNIFTY')) underlying = 'MIDCPNIFTY';

      // Parse strike price cleanly from symbol (e.g. "NIFTY 28 APR 26 23800 Put" -> 23800)
      let strikePrice = 25000;
      const strikeMatch = symbol.match(/\b(\d{4,5})\s*(?:CE|PE|CALL|PUT)\b/i) || symbol.match(/\s+(\d{4,5})\s+/i);
      if (strikeMatch) {
        strikePrice = parseFloat(strikeMatch[1]);
      } else {
        const nums = symbol.match(/\b\d{4,5}\b/g);
        if (nums && nums.length > 0) {
          strikePrice = parseFloat(nums[nums.length - 1]);
        }
      }

      // Parse option expiry date from symbol if present (e.g. "28 APR 26" -> 2026-04-28)
      let expiryDate = date;
      const expMatch = symbol.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/i);
      if (expMatch) {
        expiryDate = formatDate(`${expMatch[1]} ${expMatch[2]} ${expMatch[3].length === 2 ? '20' + expMatch[3] : expMatch[3]}`);
      }

      const breakdown = calculateIndianCharges({
        segment: 'Options',
        direction: 'Long',
        entryPrice,
        exitPrice,
        quantity,
      });

      const grossPnL = realizedPnL !== 0
        ? Number(realizedPnL.toFixed(2))
        : Number(((exitPrice - entryPrice) * quantity).toFixed(2));

      const charges = parseFloat(r.charges || r.taxes || r.totalcharges || 0) || breakdown.totalCharges;
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
        strikePrice,
        expiryDate,
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
        entryReason: 'P&L Report Import',
        exitReason: '',
        notes: `Excel P&L: Gross ₹${grossPnL} - Charges ₹${charges} = Net ₹${netPnL}. (STT: ₹${breakdown.stt}, Stamp: ₹${breakdown.stampDuty}, NSE: ₹${breakdown.exchangeTurnover}, GST: ₹${breakdown.gst})`,
        status: 'Closed',
        screenshots: [],
      });
    }
  });

  return trades;
}

function matchSeparateLegs(rows) {
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
      const buyValue = buys.reduce((acc, b) => acc + b.price * b.qty, 0);
      const sellValue = sells.reduce((acc, s) => acc + s.price * s.qty, 0);

      const avgBuyPrice = totalBuyQty > 0 ? Number((buyValue / totalBuyQty).toFixed(2)) : 0;
      const avgSellPrice = totalSellQty > 0 ? Number((sellValue / totalSellQty).toFixed(2)) : 0;

      const isCall = symbol.includes('CE') || symbol.includes('CALL');
      const isPut = symbol.includes('PE') || symbol.includes('PUT');
      const tradeType = isCall ? 'Call' : isPut ? 'Put' : 'Call';
      const underlying = symbol.includes('BANKNIFTY')
        ? 'BANKNIFTY'
        : symbol.includes('FINNIFTY')
        ? 'FINNIFTY'
        : symbol.includes('SENSEX')
        ? 'SENSEX'
        : 'NIFTY';

      // Parse strike price cleanly from symbol
      let strikePrice = 25000;
      const strikeMatch = symbol.match(/\b(\d{4,5})\s*(?:CE|PE|CALL|PUT)\b/i) || symbol.match(/\s+(\d{4,5})\s+/i);
      if (strikeMatch) {
        strikePrice = parseFloat(strikeMatch[1]);
      } else {
        const nums = symbol.match(/\b\d{4,5}\b/g);
        if (nums && nums.length > 0) {
          strikePrice = parseFloat(nums[nums.length - 1]);
        }
      }

      // Parse option expiry date from symbol
      let expiryDate = date;
      const expMatch = symbol.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/i);
      if (expMatch) {
        expiryDate = formatDate(`${expMatch[1]} ${expMatch[2]} ${expMatch[3].length === 2 ? '20' + expMatch[3] : expMatch[3]}`);
      }

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
        strikePrice,
        expiryDate,
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

export function formatDate(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }

  // Handle Excel numeric date serials (e.g. 46136)
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }

  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  // e.g. "24 Apr 2026" or "24-Apr-2026"
  const m1 = str.match(/^(\d{1,2})[\s\-]+([A-Za-z]{3})[\s\-]+(\d{2,4})/);
  if (m1) {
    const day = m1[1].padStart(2, '0');
    const mon = months[m1[2].toLowerCase()] || '01';
    const yr = m1[3].length === 2 ? `20${m1[3]}` : m1[3];
    return `${yr}-${mon}-${day}`;
  }

  // e.g. "24/04/2026" or "24-04-2026"
  const m2 = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (m2) {
    const day = m2[1].padStart(2, '0');
    const mon = m2[2].padStart(2, '0');
    const yr = m2[3].length === 2 ? `20${m2[3]}` : m2[3];
    return `${yr}-${mon}-${day}`;
  }

  return new Date().toISOString().slice(0, 10);
}
