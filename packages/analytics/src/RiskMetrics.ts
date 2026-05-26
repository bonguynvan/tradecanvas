import type {
  ClosedTrade,
  EquityPoint,
  RiskMetrics,
} from './types.js';

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

export interface RiskMetricsOptions {
  /** Periods per year for Sharpe/Sortino annualization. Auto-detected from equity timestamps if omitted. */
  periodsPerYear?: number;
  /** Annual risk-free rate, default 0. */
  riskFreeRate?: number;
}

/**
 * Compute summary risk and return metrics from an equity curve and closed trades.
 *
 * Returns NaN/0 fallbacks for degenerate inputs (empty curve, single point, no losses)
 * so downstream UIs can render safely.
 */
export function computeRiskMetrics(
  initialCash: number,
  equityCurve: ReadonlyArray<EquityPoint>,
  trades: ReadonlyArray<ClosedTrade>,
  opts: RiskMetricsOptions = {},
): RiskMetrics {
  if (equityCurve.length < 2) {
    return emptyMetrics(initialCash, equityCurve, trades);
  }

  const finalEquity = equityCurve[equityCurve.length - 1].equity;
  const totalReturn = finalEquity - initialCash;
  const totalReturnPct = totalReturn / initialCash;

  const periodsPerYear =
    opts.periodsPerYear ?? inferPeriodsPerYear(equityCurve);
  const riskFreeRate = opts.riskFreeRate ?? 0;
  const periodRiskFree = riskFreeRate / periodsPerYear;

  const returns = periodReturns(equityCurve);
  const meanReturn = mean(returns);
  const stdDev = standardDeviation(returns, meanReturn);
  const downsideDev = downsideDeviation(returns, periodRiskFree);

  const sharpe = stdDev === 0
    ? 0
    : ((meanReturn - periodRiskFree) / stdDev) * Math.sqrt(periodsPerYear);
  const sortino = downsideDev === 0
    ? 0
    : ((meanReturn - periodRiskFree) / downsideDev) * Math.sqrt(periodsPerYear);

  const elapsedMs =
    equityCurve[equityCurve.length - 1].time - equityCurve[0].time;
  const years = elapsedMs > 0 ? elapsedMs / MS_PER_YEAR : 0;
  const cagr = years > 0
    ? Math.pow(finalEquity / initialCash, 1 / years) - 1
    : 0;

  const { maxDrawdown, maxDrawdownPct } = computeDrawdown(equityCurve);
  const calmar = maxDrawdownPct > 0 ? cagr / maxDrawdownPct : 0;

  const tradeStats = summarizeTrades(trades);

  return {
    totalReturn,
    totalReturnPct,
    cagr,
    sharpe,
    sortino,
    calmar,
    maxDrawdown,
    maxDrawdownPct,
    ...tradeStats,
  };
}

function emptyMetrics(
  initialCash: number,
  equityCurve: ReadonlyArray<EquityPoint>,
  trades: ReadonlyArray<ClosedTrade>,
): RiskMetrics {
  const finalEquity = equityCurve.length > 0
    ? equityCurve[equityCurve.length - 1].equity
    : initialCash;
  return {
    totalReturn: finalEquity - initialCash,
    totalReturnPct: (finalEquity - initialCash) / initialCash,
    cagr: 0,
    sharpe: 0,
    sortino: 0,
    calmar: 0,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    ...summarizeTrades(trades),
  };
}

function periodReturns(curve: ReadonlyArray<EquityPoint>): number[] {
  const result: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1].equity;
    if (prev <= 0) {
      result.push(0);
      continue;
    }
    result.push(curve[i].equity / prev - 1);
  }
  return result;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function standardDeviation(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  let acc = 0;
  for (const v of values) acc += (v - avg) ** 2;
  return Math.sqrt(acc / (values.length - 1));
}

function downsideDeviation(values: number[], target: number): number {
  if (values.length < 2) return 0;
  let acc = 0;
  let count = 0;
  for (const v of values) {
    const diff = v - target;
    if (diff < 0) {
      acc += diff ** 2;
      count++;
    }
  }
  if (count === 0) return 0;
  return Math.sqrt(acc / count);
}

function computeDrawdown(curve: ReadonlyArray<EquityPoint>): {
  maxDrawdown: number;
  maxDrawdownPct: number;
} {
  let peak = curve[0].equity;
  let maxDd = 0;
  let maxDdPct = 0;
  for (const point of curve) {
    if (point.equity > peak) peak = point.equity;
    const dd = peak - point.equity;
    if (dd > maxDd) {
      maxDd = dd;
      maxDdPct = peak > 0 ? dd / peak : 0;
    }
  }
  return { maxDrawdown: maxDd, maxDrawdownPct: maxDdPct };
}

function summarizeTrades(trades: ReadonlyArray<ClosedTrade>): {
  winRate: number;
  profitFactor: number;
  expectancy: number;
  averageWin: number;
  averageLoss: number;
  trades: number;
} {
  if (trades.length === 0) {
    return {
      winRate: 0,
      profitFactor: 0,
      expectancy: 0,
      averageWin: 0,
      averageLoss: 0,
      trades: 0,
    };
  }

  let wins = 0;
  let losses = 0;
  let totalWin = 0;
  let totalLoss = 0;
  for (const t of trades) {
    if (t.pnl > 0) {
      wins++;
      totalWin += t.pnl;
    } else if (t.pnl < 0) {
      losses++;
      totalLoss += -t.pnl;
    }
  }

  const winRate = wins / trades.length;
  const averageWin = wins > 0 ? totalWin / wins : 0;
  const averageLoss = losses > 0 ? totalLoss / losses : 0;
  const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;
  const expectancy = winRate * averageWin - (1 - winRate) * averageLoss;

  return {
    winRate,
    profitFactor,
    expectancy,
    averageWin,
    averageLoss,
    trades: trades.length,
  };
}

function inferPeriodsPerYear(curve: ReadonlyArray<EquityPoint>): number {
  if (curve.length < 2) return 252;
  const deltas: number[] = [];
  for (let i = 1; i < curve.length && i < 50; i++) {
    deltas.push(curve[i].time - curve[i - 1].time);
  }
  const avgMs = mean(deltas);
  if (avgMs <= 0) return 252;
  const perYear = MS_PER_YEAR / avgMs;
  // Snap to common cadences for stability
  if (perYear > 200_000) return 365 * 24 * 60; // 1m
  if (perYear > 50_000) return 365 * 24 * 4; // 15m
  if (perYear > 5_000) return 365 * 24; // hourly
  if (perYear > 200) return 252; // daily trading
  if (perYear > 40) return 52; // weekly
  return 12; // monthly fallback
}
