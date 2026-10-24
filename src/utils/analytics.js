/**
 * Analytics Engine for Trading Performance
 */

export function calculateAnalytics(trades = [], initialCapital = 0) {
  const closedTrades = trades
    .filter(t => t.status !== 'Open')
    .sort((a, b) => new Date(`${a.date}T${a.entryTime || '09:15'}`) - new Date(`${b.date}T${b.entryTime || '09:15'}`));

  const totalTrades = closedTrades.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: 0,
      lossRate: 0,
      netPnL: 0,
      grossPnL: 0,
      totalCharges: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      avgPnL: 0,
      largestWin: 0,
      largestLoss: 0,
      expectancy: 0,
      maxDrawdownAmount: 0,
      maxDrawdownPercent: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      currentStreak: { type: 'none', count: 0 },
      equityCurve: [{ date: 'Start', equity: initialCapital, netPnL: 0, tradeIndex: 0 }],
      segmentStats: {},
      strategyStats: {},
      optionsStats: { cePnL: 0, pePnL: 0, buyingPnL: 0, sellingPnL: 0, expiryDayPnL: 0, nonExpiryDayPnL: 0 },
      disciplineStats: { followedPnL: 0, violatedPnL: 0, followedCount: 0, violatedCount: 0 },
      emotionStats: {},
      weekdayStats: { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 },
      timeSessionStats: { 'Morning (9:15-11:00)': 0, 'Mid-Day (11:00-13:30)': 0, 'Afternoon (13:30-15:30)': 0 },
      bestDay: null,
      worstDay: null,
      dailyPnLMap: {},
      monthlyPnLMap: {},
    };
  }

  let grossPnL = 0;
  let totalCharges = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;
  let largestWin = 0;
  let largestLoss = 0;

  let currentStreak = { type: 'none', count: 0 };
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  // Segment, strategy, options, emotion stats
  const segmentStats = {};
  const strategyStats = {};
  const emotionStats = {};
  const weekdayStats = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
  const timeSessionStats = {
    'Morning (9:15-11:00)': 0,
    'Mid-Day (11:00-13:30)': 0,
    'Afternoon (13:30-15:30)': 0,
  };

  const optionsStats = {
    cePnL: 0,
    ceTrades: 0,
    pePnL: 0,
    peTrades: 0,
    buyingPnL: 0,
    buyingTrades: 0,
    sellingPnL: 0,
    sellingTrades: 0,
    expiryDayPnL: 0,
    nonExpiryDayPnL: 0,
  };

  const disciplineStats = {
    followedPnL: 0,
    followedCount: 0,
    violatedPnL: 0,
    violatedCount: 0,
  };

  const dailyPnLMap = {};
  const monthlyPnLMap = {};

  // Running equity curve & peak tracking
  let runningEquity = initialCapital;
  let peakEquity = initialCapital;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercent = 0;

  const equityCurve = [
    {
      tradeIndex: 0,
      date: 'Start',
      equity: initialCapital,
      netPnL: 0,
      cumulativePnL: 0,
      drawdown: 0,
    },
  ];

  closedTrades.forEach((trade, idx) => {
    const net = Number(trade.netPnL) || 0;
    const gross = Number(trade.grossPnL) || 0;
    const charges = Number(trade.charges) || 0;

    grossPnL += gross;
    totalCharges += charges;

    if (net > 0) {
      winningTrades++;
      grossProfit += net;
      if (net > largestWin) largestWin = net;

      tempWinStreak++;
      tempLossStreak = 0;
      if (tempWinStreak > maxConsecutiveWins) maxConsecutiveWins = tempWinStreak;
    } else if (net < 0) {
      losingTrades++;
      grossLoss += Math.abs(net);
      if (net < largestLoss) largestLoss = net;

      tempLossStreak++;
      tempWinStreak = 0;
      if (tempLossStreak > maxConsecutiveLosses) maxConsecutiveLosses = tempLossStreak;
    } else {
      breakevenTrades++;
      tempWinStreak = 0;
      tempLossStreak = 0;
    }

    // Equity Curve & Drawdown
    runningEquity += net;
    if (runningEquity > peakEquity) {
      peakEquity = runningEquity;
    }
    const currentDrawdownAmount = peakEquity - runningEquity;
    const currentDrawdownPercent = peakEquity > 0 ? (currentDrawdownAmount / peakEquity) * 100 : 0;

    if (currentDrawdownAmount > maxDrawdownAmount) {
      maxDrawdownAmount = currentDrawdownAmount;
      maxDrawdownPercent = currentDrawdownPercent;
    }

    equityCurve.push({
      tradeIndex: idx + 1,
      date: trade.date,
      symbol: trade.symbol,
      netPnL: net,
      equity: Number(runningEquity.toFixed(2)),
      cumulativePnL: Number((runningEquity - initialCapital).toFixed(2)),
      drawdown: Number(currentDrawdownAmount.toFixed(2)),
      drawdownPercent: Number(currentDrawdownPercent.toFixed(2)),
    });

    // Daily & Monthly grouping
    const dateKey = trade.date;
    if (!dailyPnLMap[dateKey]) {
      dailyPnLMap[dateKey] = { netPnL: 0, trades: 0, date: dateKey };
    }
    dailyPnLMap[dateKey].netPnL += net;
    dailyPnLMap[dateKey].trades += 1;

    const monthKey = trade.date ? trade.date.substring(0, 7) : 'Unknown';
    if (!monthlyPnLMap[monthKey]) {
      monthlyPnLMap[monthKey] = { netPnL: 0, trades: 0, month: monthKey };
    }
    monthlyPnLMap[monthKey].netPnL += net;
    monthlyPnLMap[monthKey].trades += 1;

    // Segment stats
    const seg = trade.segment || 'Other';
    if (!segmentStats[seg]) {
      segmentStats[seg] = { netPnL: 0, trades: 0, wins: 0, losses: 0 };
    }
    segmentStats[seg].netPnL += net;
    segmentStats[seg].trades += 1;
    if (net > 0) segmentStats[seg].wins += 1;
    if (net < 0) segmentStats[seg].losses += 1;

    // Strategy stats
    const strat = trade.strategy || 'Unassigned';
    if (!strategyStats[strat]) {
      strategyStats[strat] = { netPnL: 0, trades: 0, wins: 0, losses: 0 };
    }
    strategyStats[strat].netPnL += net;
    strategyStats[strat].trades += 1;
    if (net > 0) strategyStats[strat].wins += 1;
    if (net < 0) strategyStats[strat].losses += 1;

    // Options breakdown
    if (trade.segment === 'Options') {
      if (trade.optionType === 'CE') {
        optionsStats.cePnL += net;
        optionsStats.ceTrades += 1;
      } else if (trade.optionType === 'PE') {
        optionsStats.pePnL += net;
        optionsStats.peTrades += 1;
      }

      if (trade.optionAction === 'Buy' || trade.direction === 'Long') {
        optionsStats.buyingPnL += net;
        optionsStats.buyingTrades += 1;
      } else {
        optionsStats.sellingPnL += net;
        optionsStats.sellingTrades += 1;
      }

      // Check expiry day
      if (trade.expiryDate && trade.date && trade.expiryDate === trade.date) {
        optionsStats.expiryDayPnL += net;
      } else {
        optionsStats.nonExpiryDayPnL += net;
      }
    }

    // Discipline stats
    if (trade.ruleFollowed) {
      disciplineStats.followedPnL += net;
      disciplineStats.followedCount += 1;
    } else {
      disciplineStats.violatedPnL += net;
      disciplineStats.violatedCount += 1;
    }

    // Emotion stats
    const emotion = trade.entryEmotion || 'Not Specified';
    if (!emotionStats[emotion]) {
      emotionStats[emotion] = { netPnL: 0, trades: 0, wins: 0, losses: 0 };
    }
    emotionStats[emotion].netPnL += net;
    emotionStats[emotion].trades += 1;
    if (net > 0) emotionStats[emotion].wins += 1;
    if (net < 0) emotionStats[emotion].losses += 1;

    // Weekday breakdown
    if (trade.date) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayIndex = new Date(trade.date).getDay();
      const dayName = dayNames[dayIndex];
      if (weekdayStats[dayName] !== undefined) {
        weekdayStats[dayName] += net;
      }
    }

    // Time session breakdown
    if (trade.entryTime) {
      const [h, m] = trade.entryTime.split(':').map(Number);
      const totalMinutes = h * 60 + (m || 0);
      if (totalMinutes < 11 * 60) {
        timeSessionStats['Morning (9:15-11:00)'] += net;
      } else if (totalMinutes < 13 * 60 + 30) {
        timeSessionStats['Mid-Day (11:00-13:30)'] += net;
      } else {
        timeSessionStats['Afternoon (13:30-15:30)'] += net;
      }
    }
  });

  const netPnL = grossProfit - grossLoss;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (losingTrades / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.9 : 0);
  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
  const avgPnL = totalTrades > 0 ? netPnL / totalTrades : 0;

  // Expectancy = (Win% * AvgWin) - (Loss% * AvgLoss)
  const expectancy = (winRate / 100) * avgWin - (lossRate / 100) * avgLoss;

  // Best and worst trading days
  const dailyList = Object.values(dailyPnLMap).sort((a, b) => b.netPnL - a.netPnL);
  const bestDay = dailyList.length > 0 ? dailyList[0] : null;
  const worstDay = dailyList.length > 0 ? dailyList[dailyList.length - 1] : null;

  // Current streak
  const lastTrade = closedTrades[closedTrades.length - 1];
  if (lastTrade) {
    const isWin = Number(lastTrade.netPnL) > 0;
    let count = 0;
    for (let i = closedTrades.length - 1; i >= 0; i--) {
      const tradeNet = Number(closedTrades[i].netPnL);
      if ((isWin && tradeNet > 0) || (!isWin && tradeNet < 0)) {
        count++;
      } else {
        break;
      }
    }
    currentStreak = { type: isWin ? 'win' : 'loss', count };
  }

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate: Number(winRate.toFixed(1)),
    lossRate: Number(lossRate.toFixed(1)),
    netPnL: Number(netPnL.toFixed(2)),
    grossPnL: Number(grossPnL.toFixed(2)),
    totalCharges: Number(totalCharges.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    avgPnL: Number(avgPnL.toFixed(2)),
    largestWin: Number(largestWin.toFixed(2)),
    largestLoss: Number(largestLoss.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
    maxConsecutiveWins,
    maxConsecutiveLosses,
    currentStreak,
    equityCurve,
    segmentStats,
    strategyStats,
    optionsStats,
    disciplineStats,
    emotionStats,
    weekdayStats,
    timeSessionStats,
    bestDay,
    worstDay,
    dailyPnLMap,
    monthlyPnLMap,
  };
}
