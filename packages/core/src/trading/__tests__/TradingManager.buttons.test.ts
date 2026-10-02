import { describe, it, expect, beforeEach } from 'vitest';
import type { FillEvent, Theme } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { TradingManager } from '../TradingManager.js';
import { renderFillMarks, fillBarTime } from '../fillMarks.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const theme = DARK_THEME as Theme;
let manager: TradingManager;
let events: { event: string; data: unknown }[];

beforeEach(() => {
  manager = new TradingManager();
  events = [];
  manager.setEventCallback((event, data) => events.push({ event, data }));
  manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1 }]);
  manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2, stopLoss: 50, takeProfit: 80 }]);
  manager.setCurrentPrice(70);
  manager.render(recordingCtx().ctx, unitViewport, theme);
});

/** Where the button for `action` was drawn (its centre). */
function buttonCentre(type: string, extra: Record<string, unknown> = {}): { x: number; y: number } {
  const buttons = (manager as unknown as { buttons: { x: number; y: number; size: number; action: Record<string, unknown> }[] }).buttons;
  const b = buttons.find((x) => x.action.type === type && Object.entries(extra).every(([k, v]) => x.action[k] === v))!;
  return { x: b.x + b.size / 2, y: b.y + b.size / 2 };
}

/** Press and release over the same point. */
function click(at: { x: number; y: number }): void {
  manager.onPointerDown(at, unitViewport);
  manager.onPointerUp(at);
}

describe('TradingManager buttons on the lines', () => {
  it('cancels an order with the × on its line, on release', () => {
    const at = buttonCentre('cancelOrder');
    expect(manager.isOverButton(at)).toBe(true);
    expect(manager.onPointerDown(at, unitViewport)).toBe(true);
    expect(events).toEqual([]);
    expect(manager.onPointerUp(at)).toBe(true);
    expect(events).toEqual([{ event: 'orderCancel', data: { orderId: 'o1' } }]);
  });

  it('does nothing when the press slides off the button or leaves the chart', () => {
    const at = buttonCentre('closePosition');
    manager.onPointerDown(at, unitViewport);
    expect(manager.onPointerMove({ x: at.x, y: at.y + 40 }, unitViewport)).toBe(true); // no pan meanwhile
    manager.onPointerUp({ x: at.x, y: at.y + 40 });
    manager.onPointerDown(at, unitViewport);
    manager.onPointerUp();
    expect(events).toEqual([]);
  });

  it('closes and reverses a position', () => {
    click(buttonCentre('closePosition'));
    click(buttonCentre('reversePosition'));
    expect(events).toEqual([
      { event: 'positionClose', data: { positionId: 'p1' } },
      { event: 'positionReverse', data: { positionId: 'p1' } },
    ]);
  });

  it('removes a stop-loss or a take-profit, before the line would be dragged', () => {
    click(buttonCentre('removeStop', { which: 'stopLoss' }));
    expect(events).toEqual([{ event: 'positionModify', data: { positionId: 'p1', stopLoss: null } }]);
  });

  it('offers no buttons on a position line scrolled out of the plot', () => {
    manager.setPositions([{ id: 'p2', side: 'buy', entryPrice: 500, quantity: 1, stopLoss: -50 }]);
    manager.render(recordingCtx().ctx, unitViewport, theme);
    const buttons = (manager as unknown as { buttons: { action: { type: string; positionId?: string } }[] }).buttons;
    expect(buttons.filter((b) => b.action.positionId === 'p2')).toEqual([]);
  });

  it('draws no buttons that are switched off', () => {
    manager.setConfig({ lineButtons: { cancel: false, close: false, reverse: false, removeStops: false } });
    manager.render(recordingCtx().ctx, unitViewport, theme);
    expect(manager.isOverButton({ x: 40, y: 70 })).toBe(false);
    expect((manager as unknown as { buttons: unknown[] }).buttons).toEqual([]);
  });
});

describe('fill marks', () => {
  const fill = (over: Partial<FillEvent>): FillEvent => ({ orderId: 'o', side: 'buy', price: 50, quantity: 1, time: 10, ...over });

  it('puts a buy under its price and a sell over it, solid when it opened and hollow when it closed', () => {
    const { ctx, calls } = recordingCtx();
    renderFillMarks(ctx, [fill({}), fill({ side: 'sell', reason: 'close' })], unitViewport, {} as never);
    expect(calls.filter((c) => c.name === 'fill')).toHaveLength(1);
    expect(calls.filter((c) => c.name === 'stroke')).toHaveLength(1);
    const tips = calls.filter((c) => c.name === 'moveTo').map((c) => c.args[1]);
    expect(tips).toEqual([52, 48]); // price 50 is y 50: a buy's tip below, a sell's above
  });

  it('reads a fill on the bars’ clock (seconds or milliseconds)', () => {
    const seconds = { ...unitViewport, data: [{ time: 1_700_000_000 }] };
    expect(fillBarTime(1_700_000_000_000, seconds)).toBe(1_700_000_000);
    const millis = { ...unitViewport, data: [{ time: 1_700_000_000_000 }] };
    expect(fillBarTime(1_700_000_000_000, millis)).toBe(1_700_000_000_000);
  });

  it('keeps the latest fills', () => {
    for (let i = 0; i < 1005; i++) manager.addFill(fill({ time: i }));
    const fills = manager.getFills();
    expect(fills).toHaveLength(1000);
    expect(fills[0].time).toBe(5);
  });
});
