// Indian Market Presets & Constants

export const INDIAN_UNDERLYINGS = [
  { name: 'NIFTY', defaultLotSize: 25, exchange: 'NSE', type: 'Index' },
  { name: 'BANKNIFTY', defaultLotSize: 15, exchange: 'NSE', type: 'Index' },
  { name: 'FINNIFTY', defaultLotSize: 25, exchange: 'NSE', type: 'Index' },
  { name: 'SENSEX', defaultLotSize: 10, exchange: 'BSE', type: 'Index' },
  { name: 'MIDCPNIFTY', defaultLotSize: 50, exchange: 'NSE', type: 'Index' },
  { name: 'BANKEX', defaultLotSize: 15, exchange: 'BSE', type: 'Index' },
  { name: 'RELIANCE', defaultLotSize: 250, exchange: 'NSE', type: 'Stock' },
  { name: 'HDFCBANK', defaultLotSize: 550, exchange: 'NSE', type: 'Stock' },
  { name: 'ICICIBANK', defaultLotSize: 700, exchange: 'NSE', type: 'Stock' },
  { name: 'INFY', defaultLotSize: 400, exchange: 'NSE', type: 'Stock' },
  { name: 'TATAMOTORS', defaultLotSize: 750, exchange: 'NSE', type: 'Stock' },
  { name: 'SBIN', defaultLotSize: 750, exchange: 'NSE', type: 'Stock' },
  { name: 'TCS', defaultLotSize: 175, exchange: 'NSE', type: 'Stock' },
  { name: 'Custom', defaultLotSize: 1, exchange: 'NSE', type: 'Custom' },
];

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
  lastUpdated: '2026-11-20',
  brokeragePerOrder: 20, // flat ₹20 per executed order
  gstRate: 18, // 18% on (Brokerage + Exchange Txn + SEBI)
  sebiTurnoverRate: 0.000001, // ₹10 per crore (0.0001%)
  NSE: {
    name: 'NSE (National Stock Exchange)',
    optionsTxnRate: 0.03553, // % on premium turnover
    optionsSttSellRate: 0.15, // % on option sell premium
    optionsStampDutyBuyRate: 0.003, // % on option buy premium
    futuresTxnRate: 0.00173, // % on futures turnover
    futuresSttSellRate: 0.02, // % on futures sell turnover
    futuresStampDutyBuyRate: 0.002, // % on futures buy turnover
  },
  BSE: {
    name: 'BSE (Bombay Stock Exchange)',
    optionsTxnRate: 0.05, // % on premium turnover (BSE standard)
    optionsSttSellRate: 0.15, // % on option sell premium
    optionsStampDutyBuyRate: 0.003, // % on option buy premium
    futuresTxnRate: 0.00173, // % on futures turnover
    futuresSttSellRate: 0.02, // % on futures sell turnover
    futuresStampDutyBuyRate: 0.002, // % on futures buy turnover
  },
};

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
    lotSize: 25,
    exchange: 'NSE',
    strikeStep: 50,
    minRealisticStrike: 15000,
    maxRealisticStrike: 35000,
    expiryDay: 'Tuesday',
  },
  BANKNIFTY: {
    lotSize: 15,
    exchange: 'NSE',
    strikeStep: 100,
    minRealisticStrike: 35000,
    maxRealisticStrike: 65000,
    expiryDay: 'Wednesday',
  },
  FINNIFTY: {
    lotSize: 25,
    exchange: 'NSE',
    strikeStep: 50,
    minRealisticStrike: 18000,
    maxRealisticStrike: 32000,
    expiryDay: 'Tuesday',
  },
  SENSEX: {
    lotSize: 10,
    exchange: 'BSE',
    strikeStep: 100,
    minRealisticStrike: 60000,
    maxRealisticStrike: 105000,
    expiryDay: 'Thursday',
  },
  MIDCPNIFTY: {
    lotSize: 50,
    exchange: 'NSE',
    strikeStep: 25,
    minRealisticStrike: 8000,
    maxRealisticStrike: 20000,
    expiryDay: 'Monday',
  },
  BANKEX: {
    lotSize: 15,
    exchange: 'BSE',
    strikeStep: 100,
    minRealisticStrike: 45000,
    maxRealisticStrike: 75000,
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
};
