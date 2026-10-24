/**
 * Accurate Indian Brokerage and Statutory Charges Calculator
 * Covers: NSE/BSE Equity Delivery, Intraday, Futures, and Options
 */

export function calculateIndianCharges({
  segment = 'Options',
  direction = 'Long', // Long or Short
  optionAction = 'Buy', // 'Buy' or 'Sell'
  entryPrice = 0,
  exitPrice = 0,
  quantity = 0,
  brokeragePerOrder = 20,
}) {
  const buyPrice = direction === 'Long' ? Number(entryPrice) : Number(exitPrice);
  const sellPrice = direction === 'Long' ? Number(exitPrice) : Number(entryPrice);
  const qty = Number(quantity);

  if (qty <= 0 || buyPrice <= 0 || sellPrice <= 0) {
    return {
      brokerage: 0,
      stt: 0,
      exchangeTurnover: 0,
      sebiCharges: 0,
      stampDuty: 0,
      gst: 0,
      totalCharges: 0,
    };
  }

  const buyTurnover = buyPrice * qty;
  const sellTurnover = sellPrice * qty;
  const totalTurnover = buyTurnover + sellTurnover;

  let brokerage = 0;
  let stt = 0;
  let exchangeTurnover = 0;
  let stampDuty = 0;

  if (segment === 'Equity Delivery') {
    // Delivery: Brokerage typically 0 for discount brokers or nominal
    brokerage = 0; // Zerodha delivery is ₹0, discount brokers ₹0
    stt = Math.round(totalTurnover * 0.001); // 0.1% on both buy and sell
    exchangeTurnover = totalTurnover * 0.0000297; // 0.00297%
    stampDuty = Math.round(buyTurnover * 0.00015); // 0.015% on buy
  } else if (segment === 'Equity Intraday') {
    // Intraday: ₹20 or 0.03% per order
    const buyBrokerage = Math.min(brokeragePerOrder, buyTurnover * 0.0003);
    const sellBrokerage = Math.min(brokeragePerOrder, sellTurnover * 0.0003);
    brokerage = buyBrokerage + sellBrokerage;
    stt = Math.round(sellTurnover * 0.00025); // 0.025% on sell only
    exchangeTurnover = totalTurnover * 0.0000297; // 0.00297%
    stampDuty = Math.round(buyTurnover * 0.00003); // 0.003% on buy
  } else if (segment === 'Futures') {
    // Futures: ₹20 flat per order = ₹40
    brokerage = brokeragePerOrder * 2;
    stt = Math.round(sellTurnover * 0.0002); // 0.02% on sell
    exchangeTurnover = totalTurnover * 0.0000173; // 0.00173%
    stampDuty = Math.round(buyTurnover * 0.00002); // 0.002% on buy
  } else if (segment === 'Options') {
    // Options: ₹20 flat per executed order (round-trip = ₹40)
    brokerage = brokeragePerOrder * 2;
    // STT is charged on Sell side premium turnover at 0.1% (Budget 2024 revised from 0.0625%)
    stt = Math.round(sellTurnover * 0.001);
    // Exchange turnover charge is 0.03503% on premium turnover
    exchangeTurnover = totalTurnover * 0.0003503;
    // Stamp duty 0.003% on buy side premium turnover
    stampDuty = Math.round(buyTurnover * 0.00003);
  }

  // SEBI turnover charges: ₹10 per crore (0.0001%)
  const sebiCharges = totalTurnover * 0.000001;

  // GST: 18% on (Brokerage + Exchange Turnover + SEBI Charges)
  const gst = (brokerage + exchangeTurnover + sebiCharges) * 0.18;

  const totalCharges = Number(
    (brokerage + stt + exchangeTurnover + sebiCharges + stampDuty + gst).toFixed(2)
  );

  return {
    brokerage: Number(brokerage.toFixed(2)),
    stt: Number(stt.toFixed(2)),
    exchangeTurnover: Number(exchangeTurnover.toFixed(2)),
    sebiCharges: Number(sebiCharges.toFixed(2)),
    stampDuty: Number(stampDuty.toFixed(2)),
    gst: Number(gst.toFixed(2)),
    totalCharges,
    turnover: Number(totalTurnover.toFixed(2)),
  };
}
