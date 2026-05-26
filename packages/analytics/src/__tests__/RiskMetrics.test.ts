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
