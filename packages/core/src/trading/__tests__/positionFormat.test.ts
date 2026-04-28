import { describe, it, expect } from 'vitest';
import type { TradingPosition, PnLThreshold } from '@tradecanvas/commons';
import {
  buildPositionLabelContext,
  formatPositionLabel,
  pickPnLColor,
  resolvePositionLabel,
} from '../positionFormat.js';

const longPos: TradingPosition = {
  id: 'p1',
  side: 'buy',
  entryPrice: 100,
  quantity: 10,
};

const shortPos: TradingPosition = {
  id: 'p2',
  side: 'sell',
  entryPrice: 100,
  quantity: 10,
};

describe('buildPositionLabelContext', () => {
  it('computes positive P&L for a long when price rises', () => {
    const ctx = buildPositionLabelContext(longPos, 110, 2);
    expect(ctx.pnl).toBeCloseTo(100);
    expect(ctx.pnlPct).toBeCloseTo(10);
    expect(ctx.openQuantity).toBe(10);
  });

  it('computes positive P&L for a short when price falls', () => {
    const ctx = buildPositionLabelContext(shortPos, 90, 2);
    expect(ctx.pnl).toBeCloseTo(100);
    expect(ctx.pnlPct).toBeCloseTo(10);
  });

  it('reduces P&L by closed quantity', () => {
    const partial = { ...longPos, closedQuantity: 4 };
    const ctx = buildPositionLabelContext(partial, 110, 2);
    expect(ctx.openQuantity).toBe(6);
    expect(ctx.pnl).toBeCloseTo(60);
  });

  it('clamps closedQuantity into [0, quantity]', () => {
    const over = { ...longPos, closedQuantity: 999 };
    const under = { ...longPos, closedQuantity: -5 };
    expect(buildPositionLabelContext(over, 110, 2).openQuantity).toBe(0);
    expect(buildPositionLabelContext(under, 110, 2).openQuantity).toBe(10);
  });

  it('returns 0 percentage when entry price is 0 (no division by zero)', () => {
    const odd = { ...longPos, entryPrice: 0 };
    expect(buildPositionLabelContext(odd, 50, 2).pnlPct).toBe(0);
  });
});

describe('formatPositionLabel', () => {
  it('substitutes documented tokens', () => {
    const ctx = buildPositionLabelContext(longPos, 110, 2);
    const out = formatPositionLabel(
      '{side} {qty} @ {entry} → {price} | {pnlSign}{pnl} ({pnlPct})',
      ctx,
    );
    expect(out).toBe('BUY 10 @ 100.00 → 110.00 | +100.00 (10.00%)');
  });

  it('omits the + sign on negative P&L', () => {
    const ctx = buildPositionLabelContext(longPos, 90, 2);
    expect(formatPositionLabel('{pnlSign}{pnl}', ctx)).toBe('-100.00');
  });

  it('leaves unknown tokens alone (no template injection)', () => {
    const ctx = buildPositionLabelContext(longPos, 110, 2);
    expect(formatPositionLabel('hello {unknown} {pnl}', ctx)).toBe(
      'hello {unknown} 100.00',
    );
  });
});

describe('resolvePositionLabel', () => {
  it('uses the default template when none is provided', () => {
    const ctx = buildPositionLabelContext(longPos, 110, 2);
    expect(resolvePositionLabel(undefined, ctx)).toBe('BUY 10 | P&L: +100.00');
  });

  it('invokes a function template', () => {
    const ctx = buildPositionLabelContext(longPos, 110, 2);
    const out = resolvePositionLabel((c) => `pnl=${c.pnl}`, ctx);
    expect(out).toBe('pnl=100');
  });
});

describe('pickPnLColor', () => {
  const stops: PnLThreshold[] = [
    { pnl: -Infinity, color: 'red' },
    { pnl: 0, color: 'gray' },
    { pnl: 50, color: 'lightgreen' },
    { pnl: 200, color: 'green' },
  ];

  it('returns fallback when thresholds are empty', () => {
    expect(pickPnLColor(10, [], 'fallback')).toBe('fallback');
    expect(pickPnLColor(10, undefined, 'fallback')).toBe('fallback');
  });

  it('picks the highest threshold whose pnl ≤ live P&L', () => {
    expect(pickPnLColor(-100, stops, 'fb')).toBe('red');
    expect(pickPnLColor(0, stops, 'fb')).toBe('gray');
    expect(pickPnLColor(49.99, stops, 'fb')).toBe('gray');
    expect(pickPnLColor(50, stops, 'fb')).toBe('lightgreen');
    expect(pickPnLColor(199, stops, 'fb')).toBe('lightgreen');
    expect(pickPnLColor(1000, stops, 'fb')).toBe('green');
  });

  it('handles unsorted thresholds', () => {
    const unsorted: PnLThreshold[] = [
      { pnl: 200, color: 'green' },
      { pnl: 0, color: 'gray' },
      { pnl: 50, color: 'lightgreen' },
    ];
    expect(pickPnLColor(75, unsorted, 'fb')).toBe('lightgreen');
  });
});
