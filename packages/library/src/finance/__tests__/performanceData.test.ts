import { describe, it, expect } from 'vitest';
import {
  toEquityPoints,
  computeDrawdownCurve,
  computeMonthlyReturns,
  selectKeyStats,
  type EquitySample,
  type RiskMetricsLike,
} from '../performanceData.js';

const DAY = 86_400_000;

describe('toEquityPoints', () => {
  it('maps equity to value, preserving time', () => {
    const curve: EquitySample[] = [
      { time: 1, equity: 1000 },
      { time: 2, equity: 1100 },
    ];
    expect(toEquityPoints(curve)).toEqual([
      { time: 1, value: 1000 },
      { time: 2, value: 1100 },
    ]);
  });
});

describe('computeDrawdownCurve', () => {
  it('reports 0 at new peaks and negative during drawdowns', () => {
    const curve: EquitySample[] = [
      { time: 1, equity: 100 },
      { time: 2, equity: 120 }, // new peak
      { time: 3, equity: 90 }, // 25% below peak
      { time: 4, equity: 120 }, // back to peak
    ];
    const dd = computeDrawdownCurve(curve);
    expect(dd[0].value).toBe(0);
    expect(dd[1].value).toBe(0);
    expect(dd[2].value).toBeCloseTo(-25, 5);
    expect(dd[3].value).toBe(0);
  });

  it('returns empty for empty input', () => {
    expect(computeDrawdownCurve([])).toEqual([]);
  });
});

describe('computeMonthlyReturns', () => {
  it('chains monthly returns off the prior month close', () => {
    // Two points in Jan, two in Feb (UTC).
    const jan1 = Date.UTC(2023, 0, 1);
    const feb1 = Date.UTC(2023, 1, 1);
    const curve: EquitySample[] = [
      { time: jan1, equity: 1000 },
      { time: jan1 + DAY, equity: 1100 }, // Jan close 1100 -> +10% off opening 1000
      { time: feb1, equity: 1100 },
      { time: feb1 + DAY, equity: 1210 }, // Feb close 1210 -> +10% off Jan close 1100
    ];
    const cells = computeMonthlyReturns(curve);
    expect(cells).toHaveLength(2);
    expect(cells[0]).toMatchObject({ id: '2023-01', label: 'Jan', group: '2023' });
    expect(cells[0].value).toBeCloseTo(10, 5);
    expect(cells[1]).toMatchObject({ id: '2023-02', label: 'Feb', group: '2023' });
    expect(cells[1].value).toBeCloseTo(10, 5);
  });

  it('returns empty for empty input', () => {
    expect(computeMonthlyReturns([])).toEqual([]);
  });
});

describe('selectKeyStats', () => {
  const metrics: RiskMetricsLike = {
    totalReturnPct: 23.5,
    cagr: 0.12,
    sharpe: 1.8,
    sortino: 2.4,
    maxDrawdownPct: -8.3,
    winRate: 0.55,
    profitFactor: 1.7,
    trades: 42,
  };

  it('produces a card per headline metric with signed tone', () => {
    const stats = selectKeyStats(metrics);
    const byLabel = Object.fromEntries(stats.map((s) => [s.label, s]));
    expect(byLabel['Total Return'].value).toBe('+23.50%');
    expect(byLabel['Total Return'].tone).toBe('positive');
    expect(byLabel['Max Drawdown'].tone).toBe('negative');
    expect(byLabel['Win Rate'].value).toBe('55.0%');
    expect(byLabel['Trades'].value).toBe('42');
  });

  it('renders infinite profit factor as ∞', () => {
    const stats = selectKeyStats({ ...metrics, profitFactor: Infinity });
    const pf = stats.find((s) => s.label === 'Profit Factor');
    expect(pf?.value).toBe('∞');
  });
});
