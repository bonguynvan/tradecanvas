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

  it('a bracket’s stop and target stay a step off its entry when their handles are pulled onto it', () => {
    manager.startBracket('buy', 60, { quantity: 1 });
    expect(manager.getBracket()).toMatchObject({ entry: 60, stopLoss: 59.5, takeProfit: 61 });
    // The stop's handle (at y 40.5) pulled up past the entry.
    manager.onPointerDown({ x: X, y: 40.5 }, unitViewport);
    manager.onPointerMove({ x: X, y: 39.9 }, unitViewport);
    manager.onPointerUp({ x: X, y: 39.9 });
    expect(manager.getBracket()!.stopLoss).toBe(59.5);
    // The target's (at y 39) pulled down onto it.
    manager.onPointerDown({ x: X, y: 39 }, unitViewport);
    manager.onPointerMove({ x: X, y: 40.2 }, unitViewport);
    manager.onPointerUp({ x: X, y: 40.2 });
    expect(manager.getBracket()).toMatchObject({ entry: 60, stopLoss: 59.5, takeProfit: 60.5, quantity: 1 });
  });

  it('a bracket moved whole across a change of step keeps its stop and target off its entry', () => {
    // Prices under 50 go in halves, those from 50 in fives.
    manager.setPriceRounding((price) => (price < 50 ? Math.round(price * 2) / 2 : Math.round(price / 5) * 5));
    manager.startBracket('buy', 48, { quantity: 1 });
    expect(manager.getBracket()).toMatchObject({ entry: 48, stopLoss: 47.5, takeProfit: 49 });
    // Its entry (at y 52) pulled up to 55: half and one away, its stop and its target would both land on 55.
    manager.onPointerDown({ x: X, y: 52 }, unitViewport);
    manager.onPointerMove({ x: X, y: 45 }, unitViewport);
    manager.onPointerUp({ x: X, y: 45 });
    expect(manager.getBracket()).toMatchObject({ entry: 55, stopLoss: 50, takeProfit: 60 });
  });

  it('a stop added from its button starts on its own side of the entry and of the price now, though the grid would round it across', () => {
    const fives = (price: number): number => Math.round(price / 5) * 5;
    manager.setPriceRounding(fives);
    /** Presses the button that adds `which` and lets go where it is: what the position is asked to take. */
    const added = (which: 'stopLoss' | 'takeProfit'): number => {
      events.length = 0;
      const add = draw().buttons.find((b) => b.action.type === 'addStop' && (b.action as { which: string }).which === which)!;
      const on = { x: add.x + (add.width ?? add.size) / 2, y: add.y + add.size / 2 };
      manager.onPointerDown(on, unitViewport);
      manager.onPointerUp(on);
      return (events[0].data as Record<string, number>)[which];
    };
    // A long from 69, off the grid: a per cent under it is 68.31, which the grid rounds up to 70, over the entry.
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 69, quantity: 2 }]);
    expect(added('stopLoss')).toBe(65);
    // The price now under the entry: a per cent under it is 63.31, which rounds to 65, over the price.
    manager.setCurrentPrice(64);
    expect(added('stopLoss')).toBe(60);
    // A short from 71: a per cent over it rounds down to 70, under the entry.
    manager.setCurrentPrice(70);
    manager.setPositions([{ id: 'p2', side: 'sell', entryPrice: 71, quantity: 2 }]);
    expect(added('stopLoss')).toBe(75);
  });

  it('a draft order started at the market is a limit there, whichever way the grid rounds it', () => {
    manager.setCurrentPrice(60.3);
    manager.startOrderDraft('buy', 60.3);
    manager.confirmOrderDraft();
    // 60.5 on the grid, over a market of 60.3 to the digit: at the market, as it was started.
    expect(events[0].data).toMatchObject({ side: 'buy', type: 'limit', price: 60.5 });
    events.length = 0;
    manager.setCurrentPrice(60.2);
    manager.startOrderDraft('sell', 60.2);
    manager.confirmOrderDraft();
    expect(events[0].data).toMatchObject({ side: 'sell', type: 'limit', price: 60 });
    // Pulled a step over the market, a buy is a stop as before.
    events.length = 0;
    manager.startOrderDraft('buy', 60.2);
    manager.onPointerDown({ x: X, y: 40 }, unitViewport);
    manager.onPointerMove({ x: X, y: 37 }, unitViewport);
    manager.onPointerUp({ x: X, y: 37 });
    manager.confirmOrderDraft();
    expect(events[0].data).toMatchObject({ side: 'buy', type: 'stop', price: 63 });
  });

  it('nothing for a line let go on the step it was on: the broker is asked to move no order', () => {
    manager.setPriceRounding((price) => Math.round(price / 10) * 10);
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1 }]);
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2, stopLoss: 50 }]);
    drag(70, 66); // four pixels, to 34: still 30
    drag(50, 46); // the stop, to 54: still 50
    expect(events).toEqual([]);
    drag(70, 64); // to 36: 40
    expect(events).toEqual([{ event: 'orderModify', data: { orderId: 'o1', newPrice: 40, previousPrice: 30 } }]);
  });

  it('a level let go on another’s price is kept there, as it was with no grid: the two are both the position’s', () => {
    manager.setPriceRounding((price) => Math.round(price / 10) * 10);
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 3, takeProfits: [{ price: 70, quantity: 1 }, { price: 80, quantity: 2 }] }]);
    drag(30, 22); // the first level to 78: 80, where the second is
    expect(events).toEqual([{ event: 'positionModify', data: { positionId: 'p1', takeProfits: [{ price: 80, quantity: 1 }, { price: 80, quantity: 2 }] } }]);
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

describe('an order set by hand keeps inside the day’s limits', () => {
  /** Today's prices run from 40 to 80: y 60 down to y 20. */
  let limits: { floor: number; ceiling: number } | null;

  beforeEach(() => {
    limits = { floor: 40, ceiling: 80 };
    manager.setOrderPriceBounds(() => limits);
  });

  it('an order dragged past the ceiling or the floor stops there, and is reported there', () => {
    manager.setOrders([{ id: 'o1', side: 'sell', type: 'limit', price: 75, quantity: 1 }]);
    manager.onPointerDown({ x: X, y: 25 }, unitViewport);
    manager.onPointerMove({ x: X, y: 8 }, unitViewport);
    // The line at the ceiling's 80 (y 20), though the pointer is at 92.
    expect(axis()).toContain('80.00');
    expect(draw().lineYs).toContain(20.5);
    manager.onPointerUp({ x: X, y: 8 });
    expect(events).toEqual([{ event: 'orderModify', data: { orderId: 'o1', newPrice: 80, previousPrice: 75 } }]);
    events.length = 0;
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 45, quantity: 1 }]);
    drag(55, 77);
    expect(events).toEqual([{ event: 'orderModify', data: { orderId: 'o1', newPrice: 40, previousPrice: 45 } }]);
  });

  it('a stop-limit taken to the ceiling takes its stop with it, the room kept; its stop alone stops at the ceiling too', () => {
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'stopLimit', price: 75, stopPrice: 70, quantity: 1 }]);
    drag(25, 9); // the limit to 91: the ceiling's 80, and its stop five under
    expect(events[0].data).toEqual({ orderId: 'o1', newPrice: 80, previousPrice: 75, newStopPrice: 75, previousStopPrice: 70 });
    events.length = 0;
    drag(30, 4); // the stop alone, to 96: the ceiling's 80
    expect(events[0].data).toEqual({ orderId: 'o1', newPrice: 75, previousPrice: 75, newStopPrice: 80, previousStopPrice: 70 });
  });

  it('a stop-limit whose stop is the nearer the ceiling stops short of it: its stop at the limit, the room between them kept', () => {
    // A buy whose limit waits under its stop, six apart.
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'stopLimit', price: 70, stopPrice: 76, quantity: 1 }]);
    manager.onPointerDown({ x: X, y: 30 }, unitViewport);
    manager.onPointerMove({ x: X, y: 12 }, unitViewport); // the limit to 88 by the pointer
    // Drawn as it will be told: the order at 74 (y 26), its stop at the ceiling's 80 (y 20), nothing past it.
    const drawn = draw().lineYs as number[];
    expect(drawn).toEqual(expect.arrayContaining([26.5, 20.5]));
    expect(drawn.every((y) => y >= 20)).toBe(true);
    expect(axis()).toEqual(expect.arrayContaining(['74.00', '80.00']));
    manager.onPointerUp({ x: X, y: 12 });
    expect(events[0].data).toEqual({ orderId: 'o1', newPrice: 74, previousPrice: 70, newStopPrice: 80, previousStopPrice: 76 });
    // And the same at the floor, for one whose stop is under it.
    events.length = 0;
    manager.setOrders([{ id: 'o2', side: 'sell', type: 'stopLimit', price: 50, stopPrice: 44, quantity: 1 }]);
    drag(50, 71);
    expect(events[0].data).toEqual({ orderId: 'o2', newPrice: 46, previousPrice: 50, newStopPrice: 40, previousStopPrice: 44 });
  });

  it('limits that are off the market’s grid hold an order on the grid inside them', () => {
    limits = { floor: 40.3, ceiling: 79.8 };
    manager.setOrders([{ id: 'o1', side: 'sell', type: 'limit', price: 75, quantity: 1 }]);
    drag(25, 8);
    // 79.5, the highest half not over the ceiling: not the ceiling's own 79.8, which the market has not.
    expect((events[0].data as { newPrice: number }).newPrice).toBe(79.5);
    events.length = 0;
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 45, quantity: 1 }]);
    drag(55, 77);
    expect((events[0].data as { newPrice: number }).newPrice).toBe(40.5);
  });

  it('an order that is past the limits already is taken to the limit by a pull, and left where it is by a press', () => {
    // Yesterday's order, or one the broker set: at 90, over today's ceiling.
    manager.setOrders([{ id: 'o1', side: 'sell', type: 'limit', price: 90, quantity: 1 }]);
    manager.onPointerDown({ x: X, y: 10 }, unitViewport);
    manager.onPointerUp({ x: X, y: 10 });
    expect(events).toEqual([]);
    drag(10, 5); // pulled further out: to the ceiling all the same
    expect(events).toEqual([{ event: 'orderModify', data: { orderId: 'o1', newPrice: 80, previousPrice: 90 } }]);
  });

  it('a bracket or a draft order in hand when the limits come is put inside them as it is confirmed', () => {
    limits = null;
    manager.startBracket('buy', 95, { quantity: 1 });
    expect(manager.getBracket()!.entry).toBe(95);
    limits = { floor: 40, ceiling: 80 };
    manager.confirmBracket();
    const placed = events[0].data as { entry: number; stopLoss: number; takeProfit: number };
    expect(placed.entry).toBe(80);
    // Its stop and its target keep their own sides of where it now is.
    expect(placed.stopLoss).toBeLessThan(80);
    expect(placed.takeProfit).toBeGreaterThan(80);
    events.length = 0;
    limits = null;
    manager.startOrderDraft('sell', 12);
    limits = { floor: 40, ceiling: 80 };
    manager.confirmOrderDraft();
    expect((events[0].data as { price: number }).price).toBe(40);
  });

  it('says a right-click past the limits is still the chart’s: its menu is on, and has no order to offer there', () => {
    manager.setConfig({ enabled: true, contextMenu: { enabled: true } });
    manager.setContainer({} as HTMLElement);
    expect(manager.refusesContextMenu({ x: X, y: 10 }, unitViewport)).toBe(true);
    expect(manager.refusesContextMenu({ x: X, y: 40 }, unitViewport)).toBe(false);
    // With its menu off it has no say: the click is the host's, or the browser's.
    manager.setConfig({ enabled: true, contextMenu: { enabled: false } });
    expect(manager.refusesContextMenu({ x: X, y: 10 }, unitViewport)).toBe(false);
  });

  it('leaves a position’s stop, target and levels free: they are no orders of today’s', () => {
    // The level well under the target, so a press on it is in reach of no other line.
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 50, quantity: 3, stopLoss: 45, takeProfit: 75, takeProfits: [{ price: 60, quantity: 1 }] }]);
    drag(55, 68);  // the stop to 32, under the floor
    drag(25, 10);  // the target to 90, over the ceiling
    drag(40, 12);  // the level to 88
    expect(events).toEqual([
      { event: 'positionModify', data: { positionId: 'p1', stopLoss: 32 } },
      { event: 'positionModify', data: { positionId: 'p1', takeProfit: 90 } },
      { event: 'positionModify', data: { positionId: 'p1', takeProfits: [{ price: 88, quantity: 1 }] } },
    ]);
  });

  it('a bracket’s entry: where it starts and where it is dragged; its stop and target go where they are put', () => {
    manager.startBracket('buy', 95, { quantity: 1 });
    expect(manager.getBracket()!.entry).toBe(80);
    // Its entry (at y 20) pulled further up: still the ceiling.
    manager.onPointerDown({ x: X, y: 20 }, unitViewport);
    manager.onPointerMove({ x: X, y: 6 }, unitViewport);
    manager.onPointerUp({ x: X, y: 6 });
    expect(manager.getBracket()!.entry).toBe(80);
    // Its target is no order of today's: over the ceiling it may be.
    expect(manager.getBracket()!.takeProfit).toBeGreaterThan(80);
    const targetY = 100 - manager.getBracket()!.takeProfit;
    manager.onPointerDown({ x: X, y: targetY }, unitViewport);
    manager.onPointerMove({ x: X, y: 5 }, unitViewport);
    manager.onPointerUp({ x: X, y: 5 });
    expect(manager.getBracket()!.takeProfit).toBe(95);
  });

  it('a draft order’s: where it starts, and where it is dragged', () => {
    manager.startOrderDraft('sell', 12);
    manager.confirmOrderDraft();
    expect((events[0].data as { price: number }).price).toBe(40);
    events.length = 0;
    manager.startOrderDraft('buy', 60);
    manager.onPointerDown({ x: X, y: 40 }, unitViewport);
    manager.onPointerMove({ x: X, y: 3 }, unitViewport);
    manager.onPointerUp({ x: X, y: 3 });
    manager.confirmOrderDraft();
    expect((events[0].data as { price: number }).price).toBe(80);
  });

  it('the right-click menu offers no order past them, and offers them inside', () => {
    const show = vi.fn();
    (manager as unknown as { contextMenu: { show: typeof show } }).contextMenu.show = show;
    manager.setConfig({ enabled: true, contextMenu: { enabled: true } });
    manager.setContainer({} as HTMLElement);
    expect(manager.onContextMenu({ x: X, y: 10 }, unitViewport)).toBe(false);
    expect(manager.onContextMenu({ x: X, y: 70 }, unitViewport)).toBe(false);
    expect(show).not.toHaveBeenCalled();
    expect(manager.onContextMenu({ x: X, y: 39.7 }, unitViewport)).toBe(true);
    expect(show.mock.calls[0][1]).toBe(60.5);
    // At a limit itself an order may be.
    expect(manager.onContextMenu({ x: X, y: 20 }, unitViewport)).toBe(true);
  });

  it('follows the limits as they are now, and none when there are none', () => {
    manager.setOrders([{ id: 'o1', side: 'sell', type: 'limit', price: 75, quantity: 1 }]);
    limits = { floor: 40, ceiling: 90 };
    drag(25, 4);
    expect((events[0].data as { newPrice: number }).newPrice).toBe(90);
    events.length = 0;
    limits = null;
    manager.setOrders([{ id: 'o1', side: 'sell', type: 'limit', price: 75, quantity: 1 }]);
    drag(25, 4);
    expect((events[0].data as { newPrice: number }).newPrice).toBe(96);
    // Limits that are no prices, or the wrong way round, hold nothing.
    for (const odd of [{ floor: Number.NaN, ceiling: 80 }, { floor: 80, ceiling: 40 }]) {
      events.length = 0;
      limits = odd;
      manager.setOrders([{ id: 'o1', side: 'sell', type: 'limit', price: 75, quantity: 1 }]);
      drag(25, 4);
      expect((events[0].data as { newPrice: number }).newPrice).toBe(96);
    }
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
