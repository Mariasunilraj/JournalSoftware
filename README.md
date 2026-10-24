# DELTA JOURNAL — Professional Indian Equity & F&O Trading Journal

A personal trading records and analytics software built specifically for Indian traders active in **NSE/BSE Equities, Intraday, Futures, and Options (NIFTY, BANKNIFTY, FINNIFTY, SENSEX, MIDCPNIFTY, and Stock F&O)**.

---

## 🚀 Key Features

### 1. Dashboard & Core KPIs
- **Net Realized P&L**: Transparent profit & loss calculation after subtracting all statutory charges.
- **Win Rate & Expectancy**: Math-based edge calculator `(Win% * Avg Win) - (Loss% * Avg Loss)`.
- **Profit Factor & Max Drawdown**: Peak-to-trough decline monitoring in ₹ and %.
- **Cumulative Equity Curve**: Dynamic chart tracking account growth over executed trades.
- **Monthly P&L & Outcome Donut**: Visual performance breakdowns.
- **Daily Loss Limiter Alerts**: Real-time visual warning banners when approaching or exceeding your configured daily max loss budget.

### 2. Indian F&O Derivative Engine
- **Index & Stock Presets**: 1-click selectors for NIFTY (25), BANKNIFTY (15), FINNIFTY (25), SENSEX (10), MIDCPNIFTY (50), RELIANCE, HDFCBANK, etc.
- **Options Analytics**:
  - Call (CE) vs Put (PE) edge breakdown.
  - Option Buying vs Option Selling (Theta decay vs Delta momentum).
  - Expiry Day (0DTE) vs Non-Expiry session profitability.
- **Futures & Margin Tracking**: Total quantity math (`Lots × Lot Size`), margin utilization, and Return on Margin (RoM %).

### 3. Accurate Indian Statutory Charges Calculator
Built-in automated calculator applying updated Indian tax & turnover regulations:
- **Brokerage**: Configurable (e.g., flat ₹20/order or 0.03% for intraday equity).
- **STT (Securities Transaction Tax)**: 0.1% on options sell premium turnover; 0.02% on futures sell turnover; 0.025% on intraday equity sell; 0.1% on delivery buy/sell.
- **Exchange Turnover Charges**: NSE cash (~0.00297%), NSE Futures (~0.00173%), NSE Options (~0.03503% on premium).
- **SEBI Charges**: ₹10 per crore (0.0001%).
- **Stamp Duty**: Buy side state stamp charges.
- **GST (18%)**: 18% on (Brokerage + Exchange Turnover + SEBI Turnover).
- **Breakeven Points**: Calculates exact points needed to overcome slippage & taxes.

### 4. Trading Psychology & Discipline Audit
- **Rule Adherence Tracking**: Tag trades as "Plan Followed" or "Rule Violated".
- **Violation Tags**: Track FOMO, moving stop-loss, averaging down, revenge trades, and chasing candles.
- **The Cost of Indiscipline**: Automatically computes the exact ₹ difference between disciplined trades and rule-breaching trades.
- **Daily Mindset Diary**: Record market sentiment, emotional state, lessons learned, and discipline scores (1 to 10).

### 5. Interactive Trading Calendar
- Monthly heat map with green (profitable), red (loss), and neutral days.
- Daily trade counts & net P&L badges.
- Click any date to inspect all trades taken on that day.
- **Weekday Edge Analysis**: Monday through Friday distribution to pinpoint which expiry day is your most profitable.

### 6. Risk Management & Position Sizing Calculator
- Position Sizer calculating exact lot limits from account capital, risk %, and stop-loss distance.
- Daily Max Loss and Daily Max Trade count rules.

### 7. Data Management & Local Persistence
- **100% Offline & Private**: Data stored locally in browser storage.
- **Full JSON Backup**: 1-click download of all trades, diary notes, settings, and capital logs.
- **JSON Restore**: Instant state recovery from backup file.
- **CSV Export & Import**: Compatible with Microsoft Excel and Google Sheets.
- **Capital Ledger**: Track initial capital, deposits, and profit withdrawals without distorting trading P&L stats.
- **Printable Audit Statement**: Print / Save as PDF formal performance reports.

---

## 🛠️ Running the Software Locally

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Open in browser
http://localhost:5173/
```
