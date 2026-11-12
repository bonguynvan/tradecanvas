import type { EquityPoint, HeatmapCell } from '@tradecanvas/commons';
import { timeframeBucketStart } from '@tradecanvas/commons';

/** Minimal equity sample shape — structurally satisfied by analytics' EquityPoint. */
export interface EquitySample {
  time: number;
  equity: number;
}

/**
 * Subset of analytics RiskMetrics needed to render the stats strip. The
 * percentages are fractions, as @tradecanvas/analytics returns them: a
 * totalReturnPct of 0.12 shows as +12.00%.
 */
export interface RiskMetricsLike {
  /** Total return as a fraction: 0.12 is +12%. */
  totalReturnPct: number;
  /** Compound annual growth rate as a fraction. */
  cagr: number;
  sharpe: number;
  sortino: number;
  /**
   * The deepest fall from a running peak, as a fraction: 0.5 is 50%. Either
   * sign reads as a fall, since some callers sign their drawdowns.
   */
  maxDrawdownPct: number;
  /** Share of winning trades as a fraction. */
  winRate: number;
  profitFactor: number;
  trades: number;
}

export interface DashboardStat {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'neutral';
}

/** The words on the dashboard: the panels' titles and the stats' names. */
export interface DashboardLabels {
  equityCurve: string;
  drawdown: string;
  monthlyReturns: string;
  totalReturn: string;
  cagr: string;
  sharpe: string;
  sortino: string;
  maxDrawdown: string;
  winRate: string;
  profitFactor: string;
  trades: string;
}

export const DEFAULT_DASHBOARD_LABELS: Readonly<DashboardLabels> = Object.freeze({
  equityCurve: 'Equity Curve',
  drawdown: 'Drawdown',
  monthlyReturns: 'Monthly Returns',
  totalReturn: 'Total Return',
  cagr: 'CAGR',
  sharpe: 'Sharpe',
  sortino: 'Sortino',
  maxDrawdown: 'Max Drawdown',
  winRate: 'Win Rate',
  profitFactor: 'Profit Factor',
  trades: 'Trades',
});

/** The twelve months' short names in `locale` (the browser's when none, or when it can't read the tag). */
function monthNames(locale?: string): string[] {
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  } catch {
    format = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' });
  }
  return Array.from({ length: 12 }, (_, month) => format.format(new Date(Date.UTC(2024, month, 15))));
}

/** Map an analytics equity curve to the finance EquityCurveChart point shape. */
export function toEquityPoints(curve: ReadonlyArray<EquitySample>): EquityPoint[] {
  return curve.map((p) => ({ time: p.time, value: p.equity }));
}

/**
 * Underwater drawdown curve as a percentage (<= 0). Each point is the equity's
 * shortfall from the running peak: `equity / peak - 1`, expressed in percent.
 */
export function computeDrawdownCurve(curve: ReadonlyArray<EquitySample>): EquityPoint[] {
  let peak = -Infinity;
  return curve.map((p) => {
    if (p.equity > peak) peak = p.equity;
    const dd = peak > 0 ? (p.equity / peak - 1) * 100 : 0;
    return { time: p.time, value: dd };
  });
}

/**
 * Calendar-month returns as heatmap cells. Each month's return is chained off
 * the prior month's closing equity (the first month chains off its own opening
 * equity), so the series reads as sequential monthly performance. `group` is
 * the year and `value` is the return in percent.
 */
export function computeMonthlyReturns(curve: ReadonlyArray<EquitySample>, locale?: string): HeatmapCell[] {
  if (curve.length === 0) return [];
  const names = monthNames(locale);

  // Collapse the curve to one closing equity per calendar month, in order.
  const months: { key: number; close: number }[] = [];
  for (const p of curve) {
    const key = timeframeBucketStart(p.time, '1M');
    const last = months[months.length - 1];
    if (last && last.key === key) {
      last.close = p.equity;
    } else {
      months.push({ key, close: p.equity });
    }
  }

  let prevClose = curve[0].equity;
  const cells: HeatmapCell[] = [];
  for (const m of months) {
    const base = prevClose === 0 ? 1 : prevClose;
    const returnPct = (m.close / base - 1) * 100;
    prevClose = m.close;
    const d = new Date(m.key);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    cells.push({
      id: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: names[month],
      group: String(year),
      value: returnPct,
    });
  }
  return cells;
}

/** Metrics arrive as fractions (0.12); the cards show percent (12.00%). */
const PERCENT = 100;

function pct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function tone(value: number): DashboardStat['tone'] {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

/**
 * The headline stats rendered as cards above the charts. The drawdown is a
 * fall, so it reads with a minus sign whichever sign it arrives with, as the
 * Drawdown panel below plots it.
 */
/** The dashboard's words: the defaults, with those of `labels` that are given over them. */
export function dashboardLabels(labels: Partial<DashboardLabels> = {}): DashboardLabels {
  const given = Object.fromEntries(Object.entries(labels).filter(([, word]) => typeof word === 'string'));
  return { ...DEFAULT_DASHBOARD_LABELS, ...given };
}

export function selectKeyStats(metrics: RiskMetricsLike, labels: Partial<DashboardLabels> = {}): DashboardStat[] {
  const l = dashboardLabels(labels);
  return [
    { label: l.totalReturn, value: pct(metrics.totalReturnPct * PERCENT), tone: tone(metrics.totalReturnPct) },
    { label: l.cagr, value: pct(metrics.cagr * PERCENT), tone: tone(metrics.cagr) },
    { label: l.sharpe, value: metrics.sharpe.toFixed(2), tone: tone(metrics.sharpe) },
    { label: l.sortino, value: metrics.sortino.toFixed(2), tone: tone(metrics.sortino) },
    { label: l.maxDrawdown, value: pct(-Math.abs(metrics.maxDrawdownPct) * PERCENT), tone: 'negative' },
    { label: l.winRate, value: `${(metrics.winRate * PERCENT).toFixed(1)}%`, tone: 'neutral' },
    { label: l.profitFactor, value: Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞', tone: tone(metrics.profitFactor - 1) },
    { label: l.trades, value: String(metrics.trades), tone: 'neutral' },
  ];
}
