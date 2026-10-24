import { describe, it, expect, beforeEach } from 'vitest';
import type { Theme } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { TradingManager } from '../TradingManager.js';
import { TAG_GAP } from '../tradingTags.js';
import type { LineButton } from '../lineButtons.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const theme = DARK_THEME as Theme;
let manager: TradingManager;

/** What the manager drew last: its texts, its calls, the buttons it left. */
function draw(): { texts: string[]; calls: { name: string; args: unknown[] }[]; buttons: LineButton[] } {
  const { ctx, texts, calls } = recordingCtx();
  manager.render(ctx, unitViewport, theme);
  return { texts, calls, buttons: (manager as unknown as { buttons: LineButton[] }).buttons };
}

const button = (buttons: LineButton[], type: string, which?: string) =>
  buttons.find((b) => b.action.type === type && (which === undefined || (b.action as { which?: string }).which === which))!;

beforeEach(() => {
  manager = new TradingManager();
  // Prices 0–100 over a 100 px plot: y is 100 less the price.
  manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2, stopLoss: 50, takeProfit: 80 }]);
  manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1 }]);
  manager.setCurrentPrice(70);
});

describe('the tags on the trading lines', () => {
  it('sit at the right end of their lines, a gap short of the price axis', () => {
    const { buttons } = draw();
    const close = button(buttons, 'closePosition');
    expect(close.x + close.size).toBe(1000 - TAG_GAP);
    const cancel = button(buttons, 'cancelOrder');
    expect(cancel.x + cancel.size).toBe(1000 - TAG_GAP);
  });

  it('give a position its quantity, its side and its profit, then reverse and close', () => {
    const { texts, buttons } = draw();
    expect(texts).toEqual(expect.arrayContaining(['2', 'Long', '+20.00']));
    expect(button(buttons, 'reversePosition').x).toBeLessThan(button(buttons, 'closePosition').x);
  });

  it('say what the stop and the target would make, each with its ×', () => {
    const { texts, buttons } = draw();
    // Two long from 60: the stop at 50 loses 20, the target at 80 makes 40.
    expect(texts).toEqual(expect.arrayContaining(['SL', '-20.00', 'TP', '+40.00']));
    expect(button(buttons, 'removeStop', 'stopLoss').y).toBe(50 - 10);
    expect(button(buttons, 'removeStop', 'takeProfit').y).toBe(20 - 10);
  });

  it('give an order its quantity, then its side and kind', () => {
    manager.setOrders([
      { id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1 },
      { id: 'o2', side: 'sell', type: 'stopLimit', price: 10, quantity: 3 },
      { id: 'o3', side: 'sell', type: 'stop', label: 'SL', price: 90, quantity: 2 },
    ]);
    const { texts } = draw();
    expect(texts).toEqual(expect.arrayContaining(['1', 'Buy limit', '3', 'Sell stop limit', 'SL']));
  });

  it('move a tag that would cover another to its left', () => {
    manager.setOrders([{ id: 'o1', side: 'sell', type: 'limit', price: 61, quantity: 1 }]);
    const { buttons } = draw();
    // The position's tag keeps the axis end; the order's, a line above, goes to its left.
    const positionTagStart = button(buttons, 'reversePosition').x;
    expect(button(buttons, 'cancelOrder').x + button(buttons, 'cancelOrder').size).toBeLessThan(positionTagStart);
  });

  it('show an order’s stop and target as lines with tags, which it cannot yet drag or remove', () => {
    manager.setPositions([]);
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1, stopLoss: 20, takeProfit: 45 }]);
    const { texts, buttons } = draw();
    // One to buy at 30: its stop at 20 would lose 10, its target at 45 make 15.
    expect(texts).toEqual(expect.arrayContaining(['SL', '-10.00', 'TP', '+15.00']));
    expect(buttons.filter((b) => b.action.type === 'removeStop')).toEqual([]);
  });

  it('take their line when pressed, as the line itself does', () => {
    const events: { event: string; data: unknown }[] = [];
    manager.setEventCallback((event, data) => events.push({ event, data }));
    const cancel = button(draw().buttons, 'cancelOrder');
    // On the order's tag, 8 px over its line at y 70; dragged so the line lands on y 40.
    const onTag = { x: cancel.x - 10, y: 62 };
    expect(manager.isOverDraggableLine(onTag, unitViewport)).toBe(true);
    expect(manager.onPointerDown(onTag, unitViewport)).toBe(true);
    manager.onPointerMove({ x: onTag.x, y: 32 }, unitViewport);
    manager.onPointerUp({ x: onTag.x, y: 32 });
    expect(events).toEqual([{ event: 'orderModify', data: { orderId: 'o1', newPrice: 60, previousPrice: 30 } }]);
  });

  it('leave a position’s entry where it is: its tag is not a handle', () => {
    const reverse = button(draw().buttons, 'reversePosition');
    expect(manager.isOverDraggableLine({ x: reverse.x - 10, y: 36 }, unitViewport)).toBe(false);
  });

  it('put every price on the axis: entries, orders, stops and targets', () => {
    const { ctx, texts } = recordingCtx();
    manager.renderAxisBadges(ctx, unitViewport, theme);
    expect(texts).toEqual(expect.arrayContaining(['60.00', '50.00', '80.00', '30.00']));
  });

  it('keep their prices on the axis apart, each as near its line as the others allow', () => {
    // The entry at y 40 and the stop at 50 are nearer than a badge is high (16): the stop's moves down, and the order's after it.
    const { ctx, calls } = recordingCtx();
    manager.renderAxisBadges(ctx, unitViewport, theme);
    const ys = calls.filter((c) => c.name === 'fillText').map((c) => c.args[2] as number).sort((a, b) => a - b);
    expect(ys).toEqual([20, 40, 56, 72]);
    expect(manager.axisTagYs(unitViewport, theme).map(Math.round)).toEqual(ys);
  });
});

describe('the bracket and the order draft', () => {
  beforeEach(() => {
    manager.setPositions([]);
    manager.setOrders([]);
  });

  it('tag a bracket’s lines at the right, with its reward to risk, and draw no knobs', () => {
    manager.startBracket('buy', 50);
    const { texts, calls } = draw();
    // Defaults: the stop 1 % under, the target twice as far over.
    expect(texts).toEqual(expect.arrayContaining(['Long', '2.00R', 'TP', '+2.00%', 'SL', '-1.00%']));
    expect(calls.some((c) => c.name === 'arc')).toBe(false);
    const axis = recordingCtx();
    manager.renderAxisBadges(axis.ctx, unitViewport, theme);
    expect(axis.texts).toEqual(expect.arrayContaining(['50.00', '49.50', '51.00']));
  });

  it('tag a draft order as the order it will be, and put its price on the axis', () => {
    manager.startOrderDraft('buy', 40);
    const { texts, calls } = draw();
    expect(texts).toEqual(expect.arrayContaining(['1', 'Buy limit']));
    expect(calls.some((c) => c.name === 'arc')).toBe(false);
    const axis = recordingCtx();
    manager.renderAxisBadges(axis.ctx, unitViewport, theme);
    expect(axis.texts).toContain('40.00');
  });
});
