import { describe, it, expect, beforeEach } from 'vitest';
import type { Theme, TradingPosition } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { TradingManager } from '../TradingManager.js';
import type { TagBox } from '../tradingTags.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const theme = DARK_THEME as Theme;
let manager: TradingManager;
let events: { event: string; data: unknown }[];

/** Prices 0–100 over a 100 px plot: y is 100 less the price. A long from 60 with two levels, at y 30 and y 20. */
const LONG: TradingPosition = { id: 'p1', side: 'buy', entryPrice: 60, quantity: 3, takeProfits: [{ price: 70, quantity: 1 }, { price: 80, quantity: 2 }] };
/** Well left of the tags, which sit at the lines' right end. */
const X = 40;

function draw(): { texts: string[]; lineYs: unknown[]; boxes: TagBox[] } {
  const { ctx, texts, calls } = recordingCtx();
  manager.render(ctx, unitViewport, theme);
  return { texts, lineYs: calls.filter((call) => call.name === 'moveTo').map((call) => call.args[1]), boxes: (manager as unknown as { tagBoxes: TagBox[] }).tagBoxes };
}

/** What was reported, its prices to six places: a price read back from a pixel has a sum's rounding in it. */
const sent = (): unknown => JSON.parse(JSON.stringify(events), (_key, value) => (typeof value === 'number' ? Number(value.toFixed(6)) : value));

/** Presses at y `from`, drags to `to` and lets go. */
function drag(from: number, to: number, x = X): boolean {
  const taken = manager.onPointerDown({ x, y: from }, unitViewport);
  manager.onPointerMove({ x, y: to }, unitViewport);
  manager.onPointerUp({ x, y: to });
  return taken;
}

beforeEach(() => {
  manager = new TradingManager();
  events = [];
  manager.setEventCallback((event, data) => events.push({ event, data }));
  manager.setPositions([LONG]);
  manager.setCurrentPrice(65);
});

describe('a take-profit level dragged on the chart', () => {
  it('is taken by its line, and reported as the position’s levels with that one moved', () => {
    expect(manager.isOverDraggableLine({ x: X, y: 30 }, unitViewport)).toBe(true);
    expect(drag(30, 25)).toBe(true);
    expect(sent()).toEqual([{ event: 'positionModify', data: { positionId: 'p1', takeProfits: [{ price: 75, quantity: 1 }, { price: 80, quantity: 2 }] } }]);
  });

  it('is taken by its tag too, the line keeping its distance from the pointer', () => {
    const tag = draw().boxes.find((box) => box.grab.kind === 'level' && Math.round(box.lineY) === 20)!;
    expect(tag).toBeDefined();
    // Pressed in the tag's middle, wherever that is of its line, and moved up by 5: the line goes up by 5.
    const at = { x: tag.x + tag.width / 2, y: tag.y + tag.height / 2 };
    expect(manager.onPointerDown(at, unitViewport)).toBe(true);
    manager.onPointerMove({ x: at.x, y: at.y - 5 }, unitViewport);
    manager.onPointerUp({ x: at.x, y: at.y - 5 });
    expect(sent()).toEqual([{ event: 'positionModify', data: { positionId: 'p1', takeProfits: [{ price: 70, quantity: 1 }, { price: 85, quantity: 2 }] } }]);
  });

  it('is drawn where it is dragged to, with where it was left faint behind it, its tag and its price on the axis going with it', () => {
    manager.onPointerDown({ x: X, y: 30 }, unitViewport);
    manager.onPointerMove({ x: X, y: 24 }, unitViewport);
    const { texts, lineYs } = draw();
    // The line at 76 now, and still one where it was; the other level's untouched.
    expect(lineYs).toEqual(expect.arrayContaining([24.5, 30.5, 20.5]));
    // One at 76 from 60 makes 16.
    expect(texts).toContain('+16.00');
    expect(texts).not.toContain('+10.00');
    const axis = recordingCtx();
    manager.renderAxisBadges(axis.ctx, unitViewport, theme);
    expect(axis.texts).toContain('76.00');
    expect(axis.texts).not.toContain('70.00');
    manager.onPointerUp({ x: X, y: 24 });
  });

  it('is reported with the levels in their order, the nearest first, when it is dragged past another', () => {
    drag(30, 12);
    expect(sent()).toEqual([{ event: 'positionModify', data: { positionId: 'p1', takeProfits: [{ price: 80, quantity: 2 }, { price: 88, quantity: 1 }] } }]);
  });

  it('goes back where it was when let go at the entry or past it the losing way: a level is a profit', () => {
    drag(30, 45);
    expect(events).toEqual([]);
    drag(30, 40);
    expect(events).toEqual([]);
    // Drawn where it was again.
    expect(draw().lineYs).toEqual(expect.arrayContaining([30.5, 20.5]));
    expect(draw().texts).toContain('+10.00');
  });

  it('is a profit under the entry for a short', () => {
    manager.setPositions([{ id: 's1', side: 'sell', entryPrice: 60, quantity: 2, takeProfits: [{ price: 50, quantity: 1 }, { price: 40, quantity: 1 }] }]);
    drag(50, 55);
    expect(sent()).toEqual([{ event: 'positionModify', data: { positionId: 's1', takeProfits: [{ price: 45, quantity: 1 }, { price: 40, quantity: 1 }] } }]);
    events.length = 0;
    // Over the entry it would lose: back it goes.
    drag(50, 30);
    expect(events).toEqual([]);
  });

  it('reports nothing for a press that does not move', () => {
    drag(30, 30);
    expect(events).toEqual([]);
  });

  it('is not taken while the lines are locked', () => {
    manager.setLocked(true);
    expect(manager.isOverDraggableLine({ x: X, y: 30 }, unitViewport)).toBe(false);
    expect(drag(30, 25)).toBe(false);
    expect(events).toEqual([]);
  });

  it('is called off when the position goes, or the level has gone or moved meanwhile', () => {
    manager.onPointerDown({ x: X, y: 30 }, unitViewport);
    manager.onPointerMove({ x: X, y: 25 }, unitViewport);
    manager.setPositions([]);
    manager.onPointerUp({ x: X, y: 25 });
    expect(events).toEqual([]);

    manager.setPositions([LONG]);
    manager.onPointerDown({ x: X, y: 30 }, unitViewport);
    manager.onPointerMove({ x: X, y: 25 }, unitViewport);
    // The price reached the first level and the account took it off: what is first now is another level.
    manager.setPositions([{ ...LONG, closedQuantity: 1, takeProfits: [{ price: 80, quantity: 2 }] }]);
    manager.onPointerUp({ x: X, y: 25 });
    expect(events).toEqual([]);
  });

  it('leaves the position’s single take-profit and its stop to their own drags', () => {
    manager.setPositions([{ ...LONG, stopLoss: 50, takeProfit: 90 }]);
    drag(10, 5);
    drag(50, 55);
    expect(sent()).toEqual([
      { event: 'positionModify', data: { positionId: 'p1', takeProfit: 95 } },
      { event: 'positionModify', data: { positionId: 'p1', stopLoss: 45 } },
    ]);
  });

  it('is no handle on an order that waits: its levels are a plan the order brings', () => {
    manager.setPositions([]);
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 2, draggable: false, takeProfits: [{ price: 40, quantity: 1 }, { price: 50, quantity: 1 }] }]);
    expect(draw().boxes.some((box) => box.grab.kind === 'level')).toBe(false);
    expect(manager.isOverDraggableLine({ x: X, y: 60 }, unitViewport)).toBe(false);
    expect(drag(60, 55)).toBe(false);
    expect(events).toEqual([]);
  });
});
