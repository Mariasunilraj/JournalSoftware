/**
 * Intelligent Broker Excel (.xlsx, .xls) & CSV Tradebook Parser
 * Supports: Zerodha, Groww, Angel One, Dhan, Upstox, Kotak Neo, Shoonya, ICICI Direct, and standard journal spreadsheets
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
 * Scans all sheets and handles metadata header rows automatically
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

        // Find the best sheet (prioritize F&O, Trades, P&L, Derivatives)
        let chosenSheetName = workbook.SheetNames[0];
        const fnoSheet = workbook.SheetNames.find((s) => {
          const l = s.toLowerCase();
          return l.includes('f&o') || l.includes('fno') || l.includes('derivative') || l.includes('trade') || l.includes('position');
        });
        if (fnoSheet) {
          chosenSheetName = fnoSheet;
        }

        const worksheet = workbook.Sheets[chosenSheetName];

        // 1. Convert to 2D array of raw rows to locate true header row (bypassing metadata banners)
        const rawGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        let headerRowIdx = -1;

        const headerKeywords = [
          'symbol', 'tradingsymbol', 'scrip', 'instrument', 'contract', 'particulars',
          'trade date', 'tradedate', 'date', 'order date', 'buy avg', 'buy price',
          'buy rate', 'sell avg', 'sell price', 'realized p&l', 'realised p&l', 'p&l',
        ];

        for (let i = 0; i < Math.min(rawGrid.length, 25); i++) {
          const rowValues = (rawGrid[i] || []).map((v) => String(v).trim().toLowerCase());
          const matchCount = headerKeywords.filter((k) =>
            rowValues.some((cell) => cell.includes(k) || k.includes(cell) && cell.length > 2)
          ).length;

          if (matchCount >= 2) {
            headerRowIdx = i;
            break;
          }
        }

        let rows = [];
        if (headerRowIdx >= 0) {
          const headers = (rawGrid[headerRowIdx] || []).map((h) => String(h || '').trim());
          for (let r = headerRowIdx + 1; r < rawGrid.length; r++) {
            const rowArr = rawGrid[r];
            if (!rowArr || rowArr.length === 0 || rowArr.every((c) => c === '')) continue;
            const obj = {};
            headers.forEach((h, colIdx) => {
              if (h) obj[h] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : '';
            });
            rows.push(obj);
          }
        } else {
          rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        }

        const csvText = XLSX.utils.sheet_to_csv(worksheet);

        resolve({
          sheetName: chosenSheetName,
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

// Fallback pure JS CSV parser
function parseCSVToRows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
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
export function matchTradebookExecutions(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Normalize column names
  const normalizedRows = rows.map((r) => {
    const norm = {};
    for (const key of Object.keys(r)) {
      const cleanKey = key.trim().toLowerCase().replace(/[\s_.-]+/g, '');
      norm[cleanKey] = r[key];
    }
    return norm;
  });

  // Check if this is a closed trade / P&L sheet (has both Buy and Sell or Realized P&L in same row)
  const isPreAggregated = normalizedRows.some(
    (r) =>
      (r.entryprice || r.buyprice || r.buyavg || r.buyrate || r.buyvalue || r.buyavgprice) &&
      (r.exitprice || r.sellprice || r.sellavg || r.sellrate || r.sellvalue || r.sellavgprice || r.realizedpnl !== undefined)
  );

  if (isPreAggregated) {
    return parsePreAggregatedRows(normalizedRows);
  }

  // Otherwise, match separate Buy and Sell execution rows (Tradebook format)
  return matchSeparateLegs(normalizedRows);
}

function parsePreAggregatedRows(rows) {
  const trades = [];

  rows.forEach((r, idx) => {
    const rawDate = r.date || r.tradedate || r.entrydate || r.exitdate || r.closedate || new Date().toISOString().slice(0, 10);
    const date = formatDate(rawDate);

    const symbol = (
      r.symbol ||
      r.tradingsymbol ||
      r.scripname ||
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

      const isCall = symbol.includes('CE') || r.type === 'Call' || r.tradetype === 'Call';
      const isPut = symbol.includes('PE') || r.type === 'Put' || r.tradetype === 'Put';
      const tradeType = isCall ? 'Call' : isPut ? 'Put' : 'Call';

      let underlying = 'NIFTY';
      if (symbol.includes('BANKNIFTY')) underlying = 'BANKNIFTY';
      else if (symbol.includes('FINNIFTY')) underlying = 'FINNIFTY';
      else if (symbol.includes('SENSEX')) underlying = 'SENSEX';
      else if (symbol.includes('MIDCPNIFTY')) underlying = 'MIDCPNIFTY';

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
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const parts = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (parts) {
    const day = parts[1].padStart(2, '0');
    const month = parts[2].padStart(2, '0');
    const year = parts[3];
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().slice(0, 10);
}
