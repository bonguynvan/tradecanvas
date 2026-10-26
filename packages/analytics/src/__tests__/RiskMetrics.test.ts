import { describe, it, expect } from 'vitest';
import { computeRiskMetrics } from '../RiskMetrics.js';
import type { ClosedTrade, EquityPoint } from '../types.js';

function curve(values: number[], stepMs = 86_400_000): EquityPoint[] {
  return values.map((v, i) => ({
    time: i * stepMs,
    equity: v,
    cash: v,
    positionValue: 0,
    unrealizedPnl: 0,
    realizedPnl: 0,
  }));
}

function trade(pnl: number): ClosedTrade {
  return {
    entryTime: 0,
    exitTime: 1,
    side: 'long',
    quantity: 1,
    entryPrice: 100,
    exitPrice: 100 + pnl,
    pnl,
    pnlPct: pnl / 100,
    commission: 0,
  };
}

describe('computeRiskMetrics', () => {
  it('returns zeros for an empty curve', () => {
    const m = computeRiskMetrics(10_000, [], []);
    expect(m.sharpe).toBe(0);
    expect(m.trades).toBe(0);
  });

  it('computes positive return for upward equity curve', () => {
    const m = computeRiskMetrics(10_000, curve([10_000, 10_500, 11_000, 11_500]), []);
    expect(m.totalReturn).toBe(1500);
    expect(m.totalReturnPct).toBeCloseTo(0.15);
  });

  it('captures max drawdown', () => {
    const m = computeRiskMetrics(10_000, curve([10_000, 12_000, 11_000, 9_000, 10_500]), []);
    expect(m.maxDrawdown).toBe(3000);
    expect(m.maxDrawdownPct).toBeCloseTo(0.25);
  });

  // A growing account: the late fall from 1000 to 800 costs more money (200)
  // than the early one from 100 to 50, but it is a smaller share of its peak.
  const GROWING = [100, 50, 100, 400, 1000, 800, 1200];

  it('measures the deepest percentage fall, not the percent of the largest fall in money', () => {
    const m = computeRiskMetrics(100, curve(GROWING), []);
    expect(m.maxDrawdownPct).toBeCloseTo(0.5);
  });

  it('keeps max drawdown as the largest fall in money', () => {
    const m = computeRiskMetrics(100, curve(GROWING), []);
    expect(m.maxDrawdown).toBe(200);
  });

  it('divides CAGR by the deepest percentage fall for Calmar', () => {
    const YEAR = 365 * 86_400_000;
    // Six steps of a third of a year: two years, so CAGR stays moderate.
    const m = computeRiskMetrics(100, curve(GROWING, YEAR / 3), []);
    expect(m.calmar).toBeCloseTo(m.cagr / 0.5);
  });

  it('measures a fall with no recovery from the first peak', () => {
    const m = computeRiskMetrics(10_000, curve([10_000, 8_000, 9_000, 4_500]), []);
    expect(m.maxDrawdown).toBe(5_500);
    expect(m.maxDrawdownPct).toBeCloseTo(0.55);
  });

  it('reports no drawdown on a curve that only rises', () => {
    const m = computeRiskMetrics(100, curve([100, 110, 120, 130]), []);
    expect(m.maxDrawdown).toBe(0);
    expect(m.maxDrawdownPct).toBe(0);
    expect(m.calmar).toBe(0);
  });

  it('summarizes win rate and profit factor over trades', () => {
    const trades = [trade(100), trade(-50), trade(200), trade(-30), trade(80)];
    const m = computeRiskMetrics(10_000, curve([10_000, 10_300]), trades);
    expect(m.trades).toBe(5);
    expect(m.winRate).toBeCloseTo(3 / 5);
    expect(m.averageWin).toBeCloseTo(380 / 3);
    expect(m.averageLoss).toBeCloseTo(40);
    expect(m.profitFactor).toBeCloseTo(380 / 80);
  });

  it('produces a positive sharpe on monotonic gains', () => {
    const m = computeRiskMetrics(
      10_000,
      curve([10_000, 10_100, 10_200, 10_300, 10_400, 10_500]),
      [],
    );
    expect(m.sharpe).toBeGreaterThan(0);
  });

  it('treats profit factor with no losses correctly', () => {
    const trades = [trade(100), trade(50)];
    const m = computeRiskMetrics(10_000, curve([10_000, 10_150]), trades);
    expect(m.profitFactor).toBe(Infinity);
  });
});
