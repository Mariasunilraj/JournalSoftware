// Indian Market Presets & Constants

export const INDIAN_UNDERLYINGS = [
  { name: 'NIFTY', defaultLotSize: 65, exchange: 'NSE', type: 'Index' },
  { name: 'BANKNIFTY', defaultLotSize: 30, exchange: 'NSE', type: 'Index' },
  { name: 'FINNIFTY', defaultLotSize: 60, exchange: 'NSE', type: 'Index' },
  { name: 'SENSEX', defaultLotSize: 20, exchange: 'BSE', type: 'Index' },
  { name: 'MIDCPNIFTY', defaultLotSize: 120, exchange: 'NSE', type: 'Index' },
  { name: 'BANKEX', defaultLotSize: 30, exchange: 'BSE', type: 'Index' },
  { name: 'RELIANCE', defaultLotSize: 500, exchange: 'NSE', type: 'Stock' },
  { name: 'HDFCBANK', defaultLotSize: 650, exchange: 'NSE', type: 'Stock' },
  { name: 'ICICIBANK', defaultLotSize: 700, exchange: 'NSE', type: 'Stock' },
  { name: 'INFY', defaultLotSize: 400, exchange: 'NSE', type: 'Stock' },
  { name: 'TATAMOTORS', defaultLotSize: 550, exchange: 'NSE', type: 'Stock' },
  { name: 'SBIN', defaultLotSize: 750, exchange: 'NSE', type: 'Stock' },
  { name: 'TCS', defaultLotSize: 225, exchange: 'NSE', type: 'Stock' },
  { name: 'Custom', defaultLotSize: 1, exchange: 'NSE', type: 'Custom' },
];

/**
 * Standard Default Lot Sizes (Current Exchange Framework)
 */
export const DEFAULT_LOT_SIZES = {
  NIFTY: 65,
  BANKNIFTY: 30,
  FINNIFTY: 60,
  SENSEX: 20, // 25 for Jan 2027+ expiries
  MIDCPNIFTY: 120,
  BANKEX: 30,
  RELIANCE: 500,
  HDFCBANK: 650,
  ICICIBANK: 700,
  INFY: 400,
  TATAMOTORS: 550,
  SBIN: 750,
  TCS: 225,
};

/**
 * Historical Lot Size Schedule for Date-Effective Precision
 * - Effective 20 Nov 2024: SEBI Mandate & Rationalization (NIFTY 65, BANKNIFTY 30, FINNIFTY 60, etc.)
 * - Prior to 20 Nov 2024: Legacy contract sizes (NIFTY 25, BANKNIFTY 15, FINNIFTY 25, etc.)
 */
export const HISTORICAL_LOT_SIZES = [
  {
    effectiveFrom: '2024-11-20',
    description: 'SEBI Derivative Rationalization (Nov 2024 onwards)',
    lots: {
      NIFTY: 65,
      BANKNIFTY: 30,
      FINNIFTY: 60,
      SENSEX: 20,
      MIDCPNIFTY: 120,
      BANKEX: 30,
      RELIANCE: 500,
      HDFCBANK: 650,
      ICICIBANK: 700,
      INFY: 400,
      TATAMOTORS: 550,
      SBIN: 750,
      TCS: 225,
    },
  },
  {
    effectiveFrom: '1970-01-01',
    description: 'Legacy contract lot sizes (Prior to 20 Nov 2024)',
    lots: {
      NIFTY: 25,
      BANKNIFTY: 15,
      FINNIFTY: 25,
      SENSEX: 10,
      MIDCPNIFTY: 50,
      BANKEX: 15,
      RELIANCE: 250,
      HDFCBANK: 550,
      ICICIBANK: 700,
      INFY: 400,
      TATAMOTORS: 750,
      SBIN: 750,
      TCS: 175,
    },
  },
];

/**
 * Resolve effective lot size for an underlying, prioritizing user custom settings or trade date
 */
export function getEffectiveLotSize(underlying, tradeDate = null, userCustomLots = null) {
  const sym = (underlying || '').toUpperCase().trim();
  if (!sym || sym === 'CUSTOM') return 1;

  // 1. Check user custom lot size override in settings
  if (userCustomLots && typeof userCustomLots[sym] === 'number' && userCustomLots[sym] > 0) {
    return userCustomLots[sym];
  }

  // 2. Check date-effective historical schedule if tradeDate is provided
  if (tradeDate) {
    try {
      const d = new Date(tradeDate);
      if (!isNaN(d.getTime())) {
        const iso = d.toISOString().slice(0, 10);
        for (const schedule of HISTORICAL_LOT_SIZES) {
          if (iso >= schedule.effectiveFrom && schedule.lots[sym]) {
            return schedule.lots[sym];
          }
        }
      }
    } catch (e) {}
  }

  // 3. Fallback to current default lot size
  return DEFAULT_LOT_SIZES[sym] || 1;
}

export const SEGMENTS = [
  'Options',
  'Futures',
  'Equity Intraday',
  'Equity Delivery',
];

export const STRATEGIES = [
  'Breakout above resistance',
  '9:20 AM Straddle',
  'VWAP Pullback',
  'CPR Breakout',
  'Inside Bar Breakout',
  '15-Min ORB',
  'Hero-Zero Expiry',
  'Bull Call Spread',
  'Bear Put Spread',
  'Iron Condor',
  'Short Strangle',
  'Momentum Scalp',
  'Support & Resistance Bounce',
  'EMA Crossover (9/21)',
  'Gap Fill Strategy',
  'Swing Breakout',
  'Other / Discretionary',
];

export const EMOTIONS = [
  'Disciplined',
  'Calm & Focused',
  'Confident',
  'FOMO (Fear of Missing Out)',
  'Revenge Trading',
  'Greedy',
  'Fearful / Hesitant',
  'Impatient / Bored',
  'Overtrading Bias',
  'Euphoric / Overconfident',
];

export const RULE_VIOLATIONS = [
  'None - Followed Rules 100%',
  'Exited later than planned',
  'Exited Too Early (Fear)',
  'Chased the Price (FOMO)',
  'Moved Stop Loss Further Away',
  'Averaged Down a Losing Trade',
  'Traded Without Valid Setup',
  'Risked More than Planned',
  'Overtraded / Revenge Entry',
  'Traded Against Higher Trend',
  'Held Through Expiry Penalty',
];

export const DEFAULT_EXCHANGE_RATES = {
  lastUpdated: '2026-11-28',
  brokeragePerOrder: 20, // flat ₹20 per executed order
  gstRate: 18, // 18% on (Brokerage + Exchange Txn + SEBI)
  sebiTurnoverRate: 0.000001, // ₹10 per crore (0.0001%)
  NSE: {
    name: 'NSE (National Stock Exchange)',
    optionsTxnRate: 0.03553, // % on premium turnover
    optionsSttSellRate: 0.15, // % on option sell premium
    optionsStampDutyBuyRate: 0.003, // % on option buy premium
    futuresTxnRate: 0.00173, // % on futures turnover
    futuresSttSellRate: 0.05, // % on futures sell turnover (effective 1 April 2026)
    futuresStampDutyBuyRate: 0.002, // % on futures buy turnover
  },
  BSE: {
    name: 'BSE (Bombay Stock Exchange)',
    optionsTxnRate: 0.05, // % on premium turnover (BSE standard)
    optionsSttSellRate: 0.15, // % on option sell premium
    optionsStampDutyBuyRate: 0.003, // % on option buy premium
    futuresTxnRate: 0.00173, // % on futures turnover
    futuresSttSellRate: 0.05, // % on futures sell turnover (effective 1 April 2026)
    futuresStampDutyBuyRate: 0.002, // % on futures buy turnover
  },
};

/**
 * Historical Statutory STT Schedule for Date-Effective Precision
 * Effective 1 April 2026: Futures STT is 0.05% on sell turnover, Options STT is 0.15% on sell premium turnover
 * Prior to 1 April 2026: Futures STT was 0.02% on sell turnover
 */
export const HISTORICAL_STT_SCHEDULE = [
  {
    effectiveDate: '2026-04-01',
    futuresSttSellRate: 0.05,
    optionsSttSellRate: 0.15,
  },
  {
    effectiveDate: '1970-01-01',
    futuresSttSellRate: 0.02,
    optionsSttSellRate: 0.10,
  },
];

export const DEFAULT_INDEX_EXPIRY_DAYS = {
  NIFTY: 'Tuesday',
  BANKNIFTY: 'Wednesday',
  FINNIFTY: 'Tuesday',
  SENSEX: 'Thursday',
  MIDCPNIFTY: 'Monday',
  BANKEX: 'Monday',
};

export const INDEX_CONFIG = {
  NIFTY: {
    lotSize: 65,
    exchange: 'NSE',
    strikeStep: 50,
    minRealisticStrike: 15000,
    maxRealisticStrike: 35000,
    minStrike: 15000,
    maxStrike: 35000,
    expiryDay: 'Tuesday',
  },
  BANKNIFTY: {
    lotSize: 30,
    exchange: 'NSE',
    strikeStep: 100,
    minRealisticStrike: 35000,
    maxRealisticStrike: 65000,
    minStrike: 35000,
    maxStrike: 65000,
    expiryDay: 'Wednesday',
  },
  FINNIFTY: {
    lotSize: 60,
    exchange: 'NSE',
    strikeStep: 50,
    minRealisticStrike: 18000,
    maxRealisticStrike: 32000,
    minStrike: 18000,
    maxStrike: 32000,
    expiryDay: 'Tuesday',
  },
  SENSEX: {
    lotSize: 20,
    exchange: 'BSE',
    strikeStep: 100,
    minRealisticStrike: 60000,
    maxRealisticStrike: 105000,
    minStrike: 60000,
    maxStrike: 105000,
    expiryDay: 'Thursday',
  },
  MIDCPNIFTY: {
    lotSize: 120,
    exchange: 'NSE',
    strikeStep: 25,
    minRealisticStrike: 8000,
    maxRealisticStrike: 20000,
    minStrike: 8000,
    maxStrike: 20000,
    expiryDay: 'Monday',
  },
  BANKEX: {
    lotSize: 30,
    exchange: 'BSE',
    strikeStep: 100,
    minRealisticStrike: 45000,
    maxRealisticStrike: 75000,
    minStrike: 45000,
    maxStrike: 75000,
    expiryDay: 'Monday',
  },
};

export const DEFAULT_RISK_SETTINGS = {
  initialCapital: 0,
  maxDailyLoss: 5000,
  maxDailyTrades: 5,
  maxRiskPerTradePercent: 2, // 2% of capital
  defaultBrokeragePerOrder: 20, // Zerodha flat ₹20
  exchangeRates: DEFAULT_EXCHANGE_RATES,
  expiryDays: DEFAULT_INDEX_EXPIRY_DAYS,
  lotSizes: DEFAULT_LOT_SIZES,
};
