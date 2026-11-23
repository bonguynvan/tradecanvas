import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Theme } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { TradingManager } from '../TradingManager.js';
import type { LineButton } from '../lineButtons.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const theme = DARK_THEME as Theme;
let manager: TradingManager;
let events: { event: string; data: unknown }[];

/** A market whose prices go in halves. */
const halves = (price: number): number => Math.round(price * 2) / 2;
/** Well left of the tags, which sit at the lines' right end. Prices 0–100 over a 100 px plot: y is 100 less the price. */
const X = 40;

function draw(): { lineYs: unknown[]; buttons: LineButton[] } {
  const { ctx, calls } = recordingCtx();
  manager.render(ctx, unitViewport, theme);
  return { lineYs: calls.filter((call) => call.name === 'moveTo').map((call) => call.args[1]), buttons: (manager as unknown as { buttons: LineButton[] }).buttons };
}

function axis(): string[] {
  const { ctx, texts } = recordingCtx();
  manager.renderAxisBadges(ctx, unitViewport, theme);
  return texts;
}

/** Presses at y `from`, drags to `to` and lets go. */
function drag(from: number, to: number, x = X): void {
  manager.onPointerDown({ x, y: from }, unitViewport);
  manager.onPointerMove({ x, y: to }, unitViewport);
  manager.onPointerUp({ x, y: to });
}

beforeEach(() => {
  manager = new TradingManager();
  events = [];
  manager.setEventCallback((event, data) => events.push({ event, data }));
  manager.setPriceRounding(halves);
  manager.setCurrentPrice(70);
});

describe('a price set by hand keeps to the market’s grid', () => {
  it('an order’s, dragged: the line stands on the grid as it goes, and is reported there', () => {
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1 }]);
    manager.onPointerDown({ x: X, y: 70 }, unitViewport);
    // To 60.3 by the pointer: 60.5 on the grid, at y 39.5.
    manager.onPointerMove({ x: X, y: 39.7 }, unitViewport);
    expect(axis()).toContain('60.50');
    expect(draw().lineYs).toContain(Math.round(39.5) + 0.5);
    manager.onPointerUp({ x: X, y: 39.7 });
    expect(events).toEqual([{ event: 'orderModify', data: { orderId: 'o1', newPrice: 60.5, previousPrice: 30 } }]);
  });

  it('a position’s stop and target, dragged', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2, stopLoss: 50, takeProfit: 80 }]);
    drag(50, 54.8); // the stop to 45.2: 45
    drag(20, 16.9); // the target to 83.1: 83
    expect(events).toEqual([
      { event: 'positionModify', data: { positionId: 'p1', stopLoss: 45 } },
      { event: 'positionModify', data: { positionId: 'p1', takeProfit: 83 } },
    ]);
  });

  it('a take-profit level, dragged', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 3, takeProfits: [{ price: 70, quantity: 1 }, { price: 80, quantity: 2 }] }]);
    drag(30, 26.8); // the first level to 73.2: 73
    expect(events).toEqual([{ event: 'positionModify', data: { positionId: 'p1', takeProfits: [{ price: 73, quantity: 1 }, { price: 80, quantity: 2 }] } }]);
  });

  it('a stop-limit’s stop, dragged alone and with its order', () => {
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'stopLimit', price: 85, stopPrice: 60, quantity: 1 }]);
    drag(40, 33.3); // the stop to 66.7: 66.5
    expect(events[0].data).toEqual({ orderId: 'o1', newPrice: 85, previousPrice: 85, newStopPrice: 66.5, previousStopPrice: 60 });
    events.length = 0;
    drag(15, 10.8); // the limit to 89.2: 89, and the stop four up with it
    expect(events[0].data).toEqual({ orderId: 'o1', newPrice: 89, previousPrice: 85, newStopPrice: 64, previousStopPrice: 60 });
  });

  it('a stop-limit’s stop taken with its order across a change of step: on the grid of where it lands', () => {
    // Prices under 50 go in halves, those from 50 in whole numbers.
    manager.setPriceRounding((price) => (price < 50 ? Math.round(price * 2) / 2 : Math.round(price)));
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'stopLimit', price: 48, stopPrice: 46.5, quantity: 1 }]);
    drag(52, 46); // the limit to 54, the stop six up to 52.5, which the grid there has not: a whole number
    const moved = events[0].data as { newPrice: number; newStopPrice: number };
    expect(moved.newPrice).toBe(54);
    expect(Number.isInteger(moved.newStopPrice)).toBe(true);
  });

  it('a stop dragged out of its button: where it starts, and where it is let go', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60.3, quantity: 2 }]);
    const add = draw().buttons.find((b) => b.action.type === 'addStop' && (b.action as { which: string }).which === 'stopLoss')!;
    const on = { x: add.x + (add.width ?? add.size) / 2, y: add.y + add.size / 2 };
    // Pressed and let go where it is: the stop is set where it starts, a price of the grid.
    manager.onPointerDown(on, unitViewport);
    manager.onPointerUp(on);
    const set = (events[0].data as { stopLoss: number }).stopLoss;
    expect(set).toBe(halves(set));
    events.length = 0;
    // Pressed and pulled: let go on the grid too.
    manager.onPointerDown(on, unitViewport);
    manager.onPointerMove({ x: on.x, y: on.y + 7.3 }, unitViewport);
    manager.onPointerUp({ x: on.x, y: on.y + 7.3 });
    const pulled = (events[0].data as { stopLoss: number }).stopLoss;
    expect(pulled).toBe(halves(pulled));
    expect(pulled).not.toBe(set);
  });

  it('a bracket’s: where it starts, and where its lines are dragged', () => {
    manager.startBracket('buy', 60.3, { quantity: 1 });
    // The entry on the grid, and its stop and target a per cent and two away, on it too.
    expect(manager.getBracket()).toMatchObject({ entry: 60.5, stopLoss: 60, takeProfit: 61.5 });
    // The entry's line, at y 39.5, pulled to 66.8 by the pointer: 67.
    manager.onPointerDown({ x: X, y: 39.5 }, unitViewport);
    manager.onPointerMove({ x: X, y: 33.2 }, unitViewport);
    manager.onPointerUp({ x: X, y: 33.2 });
    const bracket = manager.getBracket()!;
    expect(bracket.entry).toBe(67);
    for (const price of [bracket.entry, bracket.stopLoss, bracket.takeProfit]) expect(price).toBe(halves(price));
    manager.confirmBracket();
    const placed = events[0].data as { entry: number; stopLoss: number; takeProfit: number };
    for (const price of [placed.entry, placed.stopLoss, placed.takeProfit]) expect(price).toBe(halves(price));
  });

  it('a bracket’s stop and target keep off its entry where the grid is coarser than they start away', () => {
    // Prices in fives: one per cent of 60 is no step at all.
    manager.setPriceRounding((price) => Math.round(price / 5) * 5);
    manager.startBracket('buy', 60, { quantity: 1 });
    expect(manager.getBracket()).toMatchObject({ entry: 60, stopLoss: 55, takeProfit: 65 });
    manager.startBracket('sell', 60, { quantity: 1 });
    expect(manager.getBracket()).toMatchObject({ entry: 60, stopLoss: 65, takeProfit: 55 });
  });

  it('a draft order’s: where it starts, and where it is dragged', () => {
    manager.startOrderDraft('buy', 60.3);
    manager.onPointerDown({ x: X, y: 39.5 }, unitViewport);
    manager.onPointerMove({ x: X, y: 48.8 }, unitViewport);
    manager.onPointerUp({ x: X, y: 48.8 });
    manager.confirmOrderDraft();
    // To 51.2 by the pointer: 51.
    expect(events).toEqual([{ event: 'orderPlace', data: expect.objectContaining({ side: 'buy', price: 51 }) }]);
    events.length = 0;
    manager.startOrderDraft('sell', 60.3);
    manager.confirmOrderDraft();
    expect((events[0].data as { price: number }).price).toBe(60.5);
  });

  it('the right-click menu’s: the orders it offers are at a price of the grid', () => {
    const show = vi.fn();
    (manager as unknown as { contextMenu: { show: typeof show } }).contextMenu.show = show;
    manager.setConfig({ enabled: true, contextMenu: { enabled: true } });
    manager.setContainer({} as HTMLElement);
    manager.onContextMenu({ x: X, y: 39.7 }, unitViewport);
    expect(show.mock.calls[0][1]).toBe(60.5);
  });
});

describe('with no grid told', () => {
  it('a price is as the pointer has it, as it was', () => {
    const plain = new TradingManager();
    const moved: unknown[] = [];
    plain.setEventCallback((_event, data) => moved.push(data));
    plain.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1 }]);
    plain.setCurrentPrice(70);
    plain.onPointerDown({ x: X, y: 70 }, unitViewport);
    plain.onPointerMove({ x: X, y: 39.7 }, unitViewport);
    plain.onPointerUp({ x: X, y: 39.7 });
    expect((moved[0] as { newPrice: number }).newPrice).toBeCloseTo(60.3, 9);
  });

  it('a rounding that gives no price leaves the pointer’s', () => {
    manager.setPriceRounding(() => Number.NaN);
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1 }]);
    drag(70, 39.7);
    expect((events[0].data as { newPrice: number }).newPrice).toBeCloseTo(60.3, 9);
  });
});
