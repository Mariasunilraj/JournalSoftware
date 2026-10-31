/**
 * Accurate Indian Brokerage and Statutory Charges Calculator
 * Reflected from: INDIA F&O OPTIONS TAX & CHARGES GUIDE (Rates from 1 April 2026 onwards)
 * Covers: NSE/BSE Options, Futures, Equity Intraday, and Equity Delivery
 */

export function calculateIndianCharges({
  segment = 'Options',
  direction = 'Long', // 'Long' (Option Buyer) or 'Short' (Option Seller)
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
      turnover: 0,
      buyTurnover: 0,
      sellTurnover: 0,
    };
  }

  // Premium Turnover: Traded option premium × quantity
  const buyTurnover = buyPrice * qty;
  const sellTurnover = sellPrice * qty;
  const totalTurnover = buyTurnover + sellTurnover;

  let brokerage = 0;
  let stt = 0;
  let exchangeTurnover = 0;
  let stampDuty = 0;

  const isOption = segment === 'Options' || segment.includes('Option');

  if (isOption) {
    // 1. Brokerage: ₹20 per executed order (round-trip = ₹40 flat for discount brokers)
    brokerage = brokeragePerOrder * 2;

    // 2. STT: 0.15% on option premium on every sell transaction (closing long or opening short)
    stt = sellTurnover * 0.0015;

    // 3. Stamp Duty: 0.003% on buy side only
    stampDuty = buyTurnover * 0.00003;

    // 4. NSE Options Transaction Charge: 0.03553% on total premium turnover (buy + sell)
    exchangeTurnover = totalTurnover * 0.0003553;
  } else if (segment === 'Futures') {
    // Futures: ₹20 flat per order = ₹40
    brokerage = brokeragePerOrder * 2;
    // STT: 0.02% on sell turnover
    stt = sellTurnover * 0.0002;
    // Stamp duty: 0.002% on buy turnover
    stampDuty = buyTurnover * 0.00002;
    // NSE Futures transaction charge: 0.00173%
    exchangeTurnover = totalTurnover * 0.0000173;
  } else if (segment === 'Equity Delivery') {
    // Delivery: ₹0 brokerage on discount brokers
    brokerage = 0;
    // STT: 0.1% on both buy and sell
    stt = totalTurnover * 0.001;
    // Stamp duty: 0.015% on buy
    stampDuty = buyTurnover * 0.00015;
    // NSE equity delivery charge: 0.00297%
    exchangeTurnover = totalTurnover * 0.0000297;
  } else {
    // Equity Intraday: ₹20 or 0.03% per executed order
    const buyBrokerage = Math.min(brokeragePerOrder, buyTurnover * 0.0003);
    const sellBrokerage = Math.min(brokeragePerOrder, sellTurnover * 0.0003);
    brokerage = buyBrokerage + sellBrokerage;
    // STT: 0.025% on sell only
    stt = sellTurnover * 0.00025;
    // Stamp duty: 0.003% on buy
    stampDuty = buyTurnover * 0.00003;
    // NSE intraday charge: 0.00297%
    exchangeTurnover = totalTurnover * 0.0000297;
  }

  // 5. SEBI turnover fee: ₹10 per crore (0.0001%) on total turnover
  const sebiCharges = totalTurnover * 0.000001;

  // 6. GST: 18% on (Brokerage + Exchange Transaction Charges + SEBI Fee).
  // Note: Never apply GST to STT or Stamp Duty (statutory government levies).
  const gst = (brokerage + exchangeTurnover + sebiCharges) * 0.18;

  // Exact 2-decimal rounded breakdown components as per official worked examples
  const roundedBrokerage = Number(brokerage.toFixed(2));
  const roundedStt = Number(stt.toFixed(2));
  const roundedExchange = Number(exchangeTurnover.toFixed(2));
  const roundedSebi = Number(sebiCharges.toFixed(2));
  const roundedStamp = Number(stampDuty.toFixed(2));
  const roundedGst = Number(gst.toFixed(2));

  // Sum of charges
  const totalCharges = Number(
    (
      roundedBrokerage +
      roundedStt +
      roundedExchange +
      roundedSebi +
      roundedStamp +
      roundedGst
    ).toFixed(2)
  );

  return {
    brokerage: roundedBrokerage,
    stt: roundedStt,
    exchangeTurnover: roundedExchange,
    sebiCharges: roundedSebi,
    stampDuty: roundedStamp,
    gst: roundedGst,
    totalCharges,
    turnover: Number(totalTurnover.toFixed(2)),
    buyTurnover: Number(buyTurnover.toFixed(2)),
    sellTurnover: Number(sellTurnover.toFixed(2)),
  };
}
