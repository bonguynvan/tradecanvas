import { describe, it, expect } from 'vitest';
import type { Theme, TradingPosition } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { PositionRenderer } from '../PositionRenderer.js';
import { TradingManager } from '../TradingManager.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const theme = DARK_THEME as Theme;
// Entry in view; the stop below the plot (y 150 of a 100 px plot), as when price runs away from it.
const position: TradingPosition = { id: 'p1', side: 'buy', entryPrice: 60, quantity: 1, stopLoss: -50, takeProfit: 80 };

describe('PositionRenderer', () => {
  it('draws no stop priced off the plot, so none paints over the time axis or a pane', () => {
    const { ctx, texts } = recordingCtx();
    new PositionRenderer().render(ctx, [position], 70, unitViewport, theme, {});
    expect(texts).toContain('TP');
    expect(texts).not.toContain('SL');
  });

  it('puts no entry badge on the price axis for an entry out of the plot', () => {
    const { ctx, texts } = recordingCtx();
    const r = new PositionRenderer();
    r.renderAxisBadges(ctx, [{ ...position, entryPrice: 500 }], unitViewport, theme, {});
    expect(texts).toEqual([]);
    r.renderAxisBadges(ctx, [position], unitViewport, theme, {});
    expect(texts).toEqual(['60.00']);
  });
});

describe('TradingManager and the plot', () => {
  it('draws everything clipped to the plot', () => {
    const manager = new TradingManager();
    manager.setPositions([position]);
    manager.setCurrentPrice(70);
    const { ctx, calls } = recordingCtx();
    manager.render(ctx, unitViewport, theme);
    const names = calls.map((c) => c.name);
    const clipAt = names.indexOf('clip');
    expect(calls.slice(0, clipAt).reverse().find((c) => c.name === 'rect')?.args).toEqual([0, 0, 1000, 100]);
    expect(calls.findIndex((c) => c.name === 'fillText')).toBeGreaterThan(clipAt);
    expect(names.at(-1)).toBe('restore');
  });

  it('lifts the clip even when a label callback throws', () => {
    const manager = new TradingManager();
    manager.setConfig({ positionLabel: () => { throw new Error('bad label'); } });
    manager.setPositions([position]);
    manager.setCurrentPrice(70);
    const { ctx, calls } = recordingCtx();
    expect(() => manager.render(ctx, unitViewport, theme)).toThrow('bad label');
    const names = calls.map((c) => c.name);
    expect(names.filter((n) => n === 'save').length).toBe(names.filter((n) => n === 'restore').length);
  });

  it('offers no drag on a stop or an order priced off the plot', () => {
    const manager = new TradingManager();
    manager.setPositions([position]);
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: -30, quantity: 1 }]);
    manager.render(recordingCtx().ctx, unitViewport, theme);
    // Both lines map below the 100 px plot: the stop to y 150, the order to y 130.
    for (const y of [150, 130]) {
      expect(manager.isOverDraggableLine({ x: 500, y }, unitViewport)).toBe(false);
      expect(manager.onPointerDown({ x: 500, y }, unitViewport)).toBe(false);
    }
    // The take-profit, in view, still drags.
    expect(manager.isOverDraggableLine({ x: 500, y: 20 }, unitViewport)).toBe(true);
  });
});
