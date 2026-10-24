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

export const DEFAULT_RISK_SETTINGS = {
  initialCapital: 0,
  maxDailyLoss: 5000,
  maxDailyTrades: 5,
  maxRiskPerTradePercent: 2, // 2% of capital
  defaultBrokeragePerOrder: 20, // Zerodha flat ₹20
};
