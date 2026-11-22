import { DEFAULT_EXCHANGE_RATES } from './constants';

/**
 * Accurate Indian Brokerage and Statutory Charges Calculator
 * Supports configurable exchange-specific rates for NSE and BSE
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
  exchange = 'NSE',
  symbol = '',
  exchangeRates = null,
}) {
  const rates = exchangeRates || DEFAULT_EXCHANGE_RATES;
  const effectiveBrokerage = Number(brokeragePerOrder) || Number(rates?.brokeragePerOrder) || 20;

  // Detect exchange from symbol or underlying if not explicitly BSE
  let effectiveExchange = (exchange || 'NSE').toUpperCase();
  const symUpper = (symbol || '').toUpperCase();
  if (symUpper.includes('SENSEX') || symUpper.includes('BANKEX')) {
    effectiveExchange = 'BSE';
  }

  const exchangeConfig = rates[effectiveExchange] || rates.NSE || DEFAULT_EXCHANGE_RATES.NSE;
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
    brokerage = effectiveBrokerage * 2;

    // 2. STT: e.g. 0.15% on option premium on sell transaction
    const sttRate = (exchangeConfig.optionsSttSellRate ?? 0.15) / 100;
    stt = sellTurnover * sttRate;

    // 3. Stamp Duty: e.g. 0.003% on buy side only
    const stampRate = (exchangeConfig.optionsStampDutyBuyRate ?? 0.003) / 100;
    stampDuty = buyTurnover * stampRate;

    // 4. Exchange Transaction Charge: e.g. NSE: 0.03553%, BSE: 0.05%
    const txnRate = (exchangeConfig.optionsTxnRate ?? (effectiveExchange === 'BSE' ? 0.05 : 0.03553)) / 100;
    exchangeTurnover = totalTurnover * txnRate;
  } else if (segment === 'Futures') {
    // Futures: ₹20 flat per order = ₹40
    brokerage = effectiveBrokerage * 2;
    const sttRate = (exchangeConfig.futuresSttSellRate ?? 0.02) / 100;
    stt = sellTurnover * sttRate;
    const stampRate = (exchangeConfig.futuresStampDutyBuyRate ?? 0.002) / 100;
    stampDuty = buyTurnover * stampRate;
    const txnRate = (exchangeConfig.futuresTxnRate ?? 0.00173) / 100;
    exchangeTurnover = totalTurnover * txnRate;
  } else if (segment === 'Equity Delivery') {
    // Delivery: ₹0 brokerage on discount brokers
    brokerage = 0;
    stt = totalTurnover * 0.001;
    stampDuty = buyTurnover * 0.00015;
    exchangeTurnover = totalTurnover * 0.0000297;
  } else {
    // Equity Intraday: ₹20 or 0.03% per executed order
    const buyBrokerage = Math.min(effectiveBrokerage, buyTurnover * 0.0003);
    const sellBrokerage = Math.min(effectiveBrokerage, sellTurnover * 0.0003);
    brokerage = buyBrokerage + sellBrokerage;
    stt = sellTurnover * 0.00025;
    stampDuty = buyTurnover * 0.00003;
    exchangeTurnover = totalTurnover * 0.0000297;
  }

  // 5. SEBI turnover fee: ₹10 per crore (0.0001%) on total turnover
  const sebiRate = rates.sebiTurnoverRate ?? 0.000001;
  const sebiCharges = totalTurnover * sebiRate;

  // 6. GST: 18% on (Brokerage + Exchange Transaction Charges + SEBI Fee).
  const gstPercent = (rates.gstRate ?? 18) / 100;
  const gst = (brokerage + exchangeTurnover + sebiCharges) * gstPercent;

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
