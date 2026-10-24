/**
 * Trade Calculation & Formatting Helpers for Indian Markets
 */

export function calculateTradePnL(trade) {
  const entryPrice = parseFloat(trade.entryPrice) || 0;
  const exitPrice = parseFloat(trade.exitPrice) || 0;
  const lots = parseInt(trade.lots, 10) || 1;
  const lotSize = parseInt(trade.lotSize, 10) || 1;
  
  // Total units: for derivatives it is lots * lotSize; for cash it can be direct quantity
  const quantity = trade.segment === 'Equity Delivery' || trade.segment === 'Equity Intraday'
    ? (parseInt(trade.quantity, 10) || (lots * lotSize))
    : (lots * lotSize);

  let grossPnL = 0;
  if (entryPrice > 0 && exitPrice > 0 && quantity > 0) {
    if (trade.direction === 'Long') {
      grossPnL = (exitPrice - entryPrice) * quantity;
    } else {
      // Short trade
      grossPnL = (entryPrice - exitPrice) * quantity;
    }
  }

  const charges = parseFloat(trade.charges) || 0;
  const netPnL = (entryPrice > 0 && exitPrice > 0 && quantity > 0)
    ? grossPnL - charges
    : (grossPnL !== 0 ? grossPnL - charges : 0);

  // Capital/Outlay basis for ROI
  const totalCost = entryPrice * quantity;
  const marginUsed = parseFloat(trade.marginUsed) || 0;
  
  let pnlPercent = 0;
  if (marginUsed > 0) {
    pnlPercent = (netPnL / marginUsed) * 100;
  } else if (totalCost > 0) {
    pnlPercent = (netPnL / totalCost) * 100;
  }

  // Planned Risk / Reward
  const stopLoss = parseFloat(trade.stopLoss) || 0;
  const target = parseFloat(trade.target) || 0;
  let plannedRisk = 0;
  let plannedReward = 0;
  let riskRewardRatio = 0;

  if (stopLoss > 0 && entryPrice > 0) {
    plannedRisk = Math.abs(entryPrice - stopLoss) * quantity;
  }
  if (target > 0 && entryPrice > 0) {
    plannedReward = Math.abs(target - entryPrice) * quantity;
  }
  if (plannedRisk > 0 && plannedReward > 0) {
    riskRewardRatio = Number((plannedReward / plannedRisk).toFixed(2));
  }

  return {
    quantity,
    grossPnL: Number(grossPnL.toFixed(2)),
    netPnL: Number(netPnL.toFixed(2)),
    pnlPercent: Number(pnlPercent.toFixed(2)),
    plannedRisk: Number(plannedRisk.toFixed(2)),
    plannedReward: Number(plannedReward.toFixed(2)),
    riskRewardRatio,
    returnOnMargin: marginUsed > 0 ? Number(((netPnL / marginUsed) * 100).toFixed(2)) : null,
  };
}

/**
 * Format Indian Rupee currency (e.g. ₹1,50,000 or -₹3,420)
 */
export function formatINR(val, includeSymbol = true) {
  if (val === undefined || val === null || isNaN(val)) return includeSymbol ? '₹0.00' : '0.00';
  const num = Number(val);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  // Indian number formatting regex
  const parts = absNum.toFixed(2).split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree + '.' + parts[1];

  const prefix = includeSymbol ? (isNegative ? '-₹' : '₹') : (isNegative ? '-' : '');
  return `${prefix}${formatted}`;
}

export function formatPercent(val) {
  if (val === undefined || val === null || isNaN(val)) return '0.00%';
  const num = Number(val);
  const prefix = num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(2)}%`;
}

/**
 * Compact currency for mobile screens & tight calendar cells (e.g. +₹1.4k, -₹2.3k, +₹1.2L)
 */
export function formatINRCompact(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  const num = Number(val);
  if (num === 0) return '₹0';
  const isNegative = num < 0;
  const abs = Math.abs(num);

  let formatted = '';
  if (abs >= 10000000) {
    formatted = `${(abs / 10000000).toFixed(1)}Cr`;
  } else if (abs >= 100000) {
    formatted = `${(abs / 100000).toFixed(1)}L`;
  } else if (abs >= 1000) {
    formatted = `${(abs / 1000).toFixed(1)}k`;
  } else {
    formatted = abs.toFixed(0);
  }

  const prefix = isNegative ? '-₹' : '+₹';
  return `${prefix}${formatted}`;
}
