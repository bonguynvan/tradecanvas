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
  it('give each take-profit level of a position its tag: which it is, its part and what that would make', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 3, takeProfits: [{ price: 70, quantity: 1 }, { price: 80, quantity: 2 }] }]);
    manager.setOrders([]);
    const { texts, calls } = draw();
    expect(texts).toEqual(expect.arrayContaining(['TP1', 'TP2']));
    // One at 70 from 60 makes 10, two at 80 make 40.
    expect(texts).toEqual(expect.arrayContaining(['+10.00', '+40.00']));
    // A line for each, beside the entry's: at y 30 and y 20, on the pixel's middle as lines are drawn.
    const lineYs = calls.filter((call) => call.name === 'moveTo').map((call) => call.args[1]);
    expect(lineYs).toEqual(expect.arrayContaining([30.5, 20.5]));
  });

  it('write on a level the part it can still take: no more than is left open after the levels before it', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 3, closedQuantity: 1, takeProfits: [{ price: 70, quantity: 1.5 }, { price: 80, quantity: 5 }, { price: 90, quantity: 1 }] }]);
    manager.setOrders([]);
    const { texts } = draw();
    // Two open: one and a half at the first, the half left at the second, nothing for a third.
    expect(texts).toEqual(expect.arrayContaining(['TP1', '1.5', 'TP2', '0.5']));
    expect(texts).not.toContain('TP3');
    expect(texts).not.toContain('5');
  });

  it('give a waiting order’s levels their tags too', () => {
    manager.setPositions([]);
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 2, takeProfits: [{ price: 40, quantity: 1 }, { price: 50, quantity: 1 }] }]);
    const { texts } = draw();
    expect(texts).toEqual(expect.arrayContaining(['TP1', 'TP2', '+10.00', '+20.00']));
  });

  it('draw no level that is off the plot', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 3, takeProfits: [{ price: 500, quantity: 1 }] }]);
    manager.setOrders([]);
    expect(draw().texts).not.toContain('TP1');
  });

  it('say which orders are of a group where one cancels the others', () => {
    expect(draw().texts).not.toContain('OCO');
    manager.setOrders([
      { id: 'o1', side: 'sell', type: 'limit', price: 30, quantity: 1, ocoGroup: 'exit' },
      { id: 'o2', side: 'sell', type: 'stop', price: 20, quantity: 1 },
    ]);
    expect(draw().texts.filter((text) => text === 'OCO')).toHaveLength(1);
  });

  it('sit at the right end of their lines, a gap short of the price axis', () => {
    const { buttons } = draw();
    const close = button(buttons, 'closePosition');
    expect(close.x + close.size).toBe(1000 - TAG_GAP);
    const cancel = button(buttons, 'cancelOrder');
    expect(cancel.x + cancel.size).toBe(1000 - TAG_GAP);
  });

  it('keep clear of a strip by the price axis, where the chart puts its "+"', () => {
    manager.setTagInset(19);
    const { buttons } = draw();
    for (const type of ['closePosition', 'cancelOrder']) {
      const b = button(buttons, type);
      expect(b.x + b.size).toBe(1000 - 19 - TAG_GAP);
    }
    manager.setTagInset(0);
    const close = button(draw().buttons, 'closePosition');
    expect(close.x + close.size).toBe(1000 - TAG_GAP);
  });

  it('tell where they were last drawn, so the legend can leave them showing', () => {
    const { buttons } = draw();
    const close = button(buttons, 'closePosition');
    const rects = manager.tagRects();
    // One rect a tag: the position, its stop and target, and the order.
    expect(rects).toHaveLength(4);
    expect(rects).toContainEqual(expect.objectContaining({ y: close.y, height: close.size, x: expect.any(Number) }));
    const mine = rects.find((r) => r.y === close.y)!;
    expect(mine.x + mine.width).toBe(close.x + close.size);
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

  it('tell while a line is dragged to a price: once it has moved, until the release', () => {
    expect(manager.isDraggingLine()).toBe(false);
    const cancel = button(draw().buttons, 'cancelOrder');
    const onTag = { x: cancel.x - 10, y: 62 };
    manager.onPointerDown(onTag, unitViewport);
    // Pressed, it has gone nowhere: a click moves no line.
    expect(manager.isDraggingLine()).toBe(false);
    // A hand's tremor is no drag either.
    manager.onPointerMove({ x: onTag.x, y: 61 }, unitViewport);
    expect(manager.isDraggingLine()).toBe(false);
    manager.onPointerMove({ x: onTag.x, y: 32 }, unitViewport);
    expect(manager.isDraggingLine()).toBe(true);
    manager.onPointerUp({ x: onTag.x, y: 32 });
    expect(manager.isDraggingLine()).toBe(false);
    // The next press starts with nothing moved.
    manager.onPointerDown({ x: onTag.x, y: 32 }, unitViewport);
    expect(manager.isDraggingLine()).toBe(false);
    manager.onPointerUp({ x: onTag.x, y: 32 });
  });

  it('tell of a bracket’s line and of a draft order’s the same way, and of none once the press is called off', () => {
    manager.setOrders([]);
    manager.setPositions([]);
    manager.startBracket('buy', 60, { quantity: 1 });
    // The entry's line is at y 40.
    manager.onPointerDown({ x: 50, y: 40 }, unitViewport);
    expect(manager.isDraggingLine()).toBe(false);
    manager.onPointerMove({ x: 50, y: 30 }, unitViewport);
    expect(manager.isDraggingLine()).toBe(true);
    manager.cancelPointer();
    expect(manager.isDraggingLine()).toBe(false);
    manager.cancelBracket();
    manager.startOrderDraft('buy', 60);
    manager.onPointerDown({ x: 50, y: 40 }, unitViewport);
    expect(manager.isDraggingLine()).toBe(false);
    manager.onPointerMove({ x: 50, y: 30 }, unitViewport);
    expect(manager.isDraggingLine()).toBe(true);
    manager.onPointerUp({ x: 50, y: 30 });
    expect(manager.isDraggingLine()).toBe(false);
  });

  it('tell of no drag while a button on a line is pressed: it moves no line', () => {
    const cancel = button(draw().buttons, 'cancelOrder');
    const onButton = { x: cancel.x + (cancel.width ?? cancel.size) / 2, y: cancel.y + cancel.size / 2 };
    expect(manager.onPointerDown(onButton, unitViewport)).toBe(true);
    expect(manager.isDraggingLine()).toBe(false);
    manager.onPointerUp();
  });

  it('leave a position’s entry where it is: its tag is not a handle', () => {
    const reverse = button(draw().buttons, 'reversePosition');
    expect(manager.isOverDraggableLine({ x: reverse.x - 10, y: 36 }, unitViewport)).toBe(false);
  });

  describe('a stop-limit order', () => {
    /** A buy that begins to work at 80 and takes no more than 85: lines at y 20 and y 15. */
    const stopLimit = { id: 'o1', side: 'buy' as const, type: 'stopLimit' as const, price: 85, stopPrice: 80, quantity: 1, label: 'STOP LIMIT' as const };
    const lineYs = (calls: { name: string; args: unknown[] }[]) => calls.filter((call) => call.name === 'moveTo').map((call) => call.args[1]);
    const axis = () => {
      const { ctx, texts } = recordingCtx();
      manager.renderAxisBadges(ctx, unitViewport, theme);
      return texts;
    };

    beforeEach(() => {
      manager.setPositions([]);
      manager.setOrders([stopLimit]);
    });

    it('shows its stop as a line and a tag of its own, beside the order’s at its limit', () => {
      const { texts, calls } = draw();
      expect(texts).toEqual(expect.arrayContaining(['Buy stop limit', 'STOP']));
      expect(lineYs(calls)).toEqual(expect.arrayContaining([15.5, 20.5]));
    });

    it('puts both its prices on the axis', () => {
      expect(axis()).toEqual(expect.arrayContaining(['85.00', '80.00']));
    });

    it('shows no stop of its own for an order that has none, or whose stop is its price', () => {
      manager.setOrders([{ id: 'a', side: 'buy', type: 'stop', price: 80, stopPrice: 80, quantity: 1 }, { id: 'b', side: 'sell', type: 'limit', price: 90, quantity: 1 }]);
      expect(draw().texts).not.toContain('STOP');
      expect(axis().sort()).toEqual(['80.00', '90.00']);
      // A stop-limit told with no stop, or one that is no price, is drawn as the one line it has.
      manager.setOrders([{ ...stopLimit, stopPrice: undefined }]);
      expect(draw().texts).not.toContain('STOP');
      manager.setOrders([{ ...stopLimit, stopPrice: Number.NaN }]);
      expect(draw().texts).not.toContain('STOP');
      expect(axis()).toEqual(['85.00']);
    });

    it('draws no stop that is off the plot', () => {
      manager.setOrders([{ ...stopLimit, price: 95, stopPrice: 140 }]);
      expect(draw().texts).not.toContain('STOP');
      expect(axis()).toEqual(['95.00']);
    });

    it('does not take a press on its stop: the order is moved by its own line', () => {
      // A stop well away from the limit, so a press on it is in reach of no other line: at y 40.
      manager.setOrders([{ ...stopLimit, stopPrice: 60 }]);
      expect(draw().texts).toContain('STOP');
      expect(manager.isOverDraggableLine({ x: 50, y: 40 }, unitViewport)).toBe(false);
      expect(manager.onPointerDown({ x: 50, y: 40 }, unitViewport)).toBe(false);
      expect(manager.isOverDraggableLine({ x: 50, y: 15 }, unitViewport)).toBe(true);
    });

    it('moves its stop with it while it is dragged, the room between them kept', () => {
      const events: { event: string; data: unknown }[] = [];
      manager.setEventCallback((event, data) => events.push({ event, data }));
      manager.onPointerDown({ x: 50, y: 15 }, unitViewport);
      // Down ten: the limit to 75 (y 25), the stop to 70 (y 30).
      manager.onPointerMove({ x: 50, y: 25 }, unitViewport);
      const { calls } = draw();
      expect(lineYs(calls)).toEqual(expect.arrayContaining([25.5, 30.5]));
      expect(lineYs(calls)).not.toContain(20.5);
      expect(axis()).toEqual(expect.arrayContaining(['75.00', '70.00']));
      manager.onPointerUp({ x: 50, y: 25 });
      expect(events).toEqual([{ event: 'orderModify', data: { orderId: 'o1', newPrice: 75, previousPrice: 85 } }]);
    });
  });

  describe('an order that is gone while its line is dragged', () => {
    it('calls the drag off: letting go moves no order', () => {
      const events: { event: string; data: unknown }[] = [];
      manager.setEventCallback((event, data) => events.push({ event, data }));
      manager.onPointerDown({ x: 50, y: 70 }, unitViewport);
      manager.onPointerMove({ x: 50, y: 40 }, unitViewport);
      expect(manager.isDraggingLine()).toBe(true);
      // It filled, or the broker cancelled it.
      manager.setOrders([]);
      expect(manager.isDraggingLine()).toBe(false);
      manager.onPointerUp({ x: 50, y: 40 });
      expect(events).toEqual([]);
    });

    it('keeps the drag of an order that is still there, whatever else changed', () => {
      const events: { event: string; data: unknown }[] = [];
      manager.setEventCallback((event, data) => events.push({ event, data }));
      manager.onPointerDown({ x: 50, y: 70 }, unitViewport);
      manager.onPointerMove({ x: 50, y: 40 }, unitViewport);
      // Another order came, and a part of this one filled: it is the same order, working on.
      manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1, filledQuantity: 0.5 }, { id: 'o2', side: 'sell', type: 'limit', price: 90, quantity: 1 }]);
      expect(manager.isDraggingLine()).toBe(true);
      manager.onPointerUp({ x: 50, y: 40 });
      expect(events).toEqual([{ event: 'orderModify', data: { orderId: 'o1', newPrice: 60, previousPrice: 30 } }]);
    });
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

describe('the tag of an order that fills in parts', () => {
  it('says how much of it has filled, of how much', () => {
    manager.setPositions([]);
    manager.setOrders([
      { id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 5, filledQuantity: 2 },
      { id: 'o2', side: 'sell', type: 'limit', price: 80, quantity: 0.3, filledQuantity: 0.1 + 0.1 },
      { id: 'o3', side: 'sell', type: 'limit', price: 60, quantity: 4 },
    ]);
    const { texts } = draw();
    // Two of five; two tenths of three, with no sum's rounding after them; and a plain quantity where nothing has filled.
    expect(texts).toEqual(expect.arrayContaining(['2/5', '0.2/0.3', '4']));
    expect(texts).not.toContain('5');
  });

  it('says on its stop and its target what the rest of it would make: what has filled is a position, with tags of its own', () => {
    manager.setPositions([]);
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 5, filledQuantity: 2, stopLoss: 20, takeProfit: 50, takeProfits: [{ price: 40, quantity: 4 }] }]);
    const { texts } = draw();
    // Three are left: ten under for each at the stop, twenty over at the target.
    expect(texts).toEqual(expect.arrayContaining(['-30.00', '+60.00']));
    expect(texts).not.toContain('-50.00');
    expect(texts).not.toContain('+100.00');
    // A level is a size of the position's plan, not of what is left of the order: written as planned.
    expect(texts).toEqual(expect.arrayContaining(['TP1', '4', '+40.00']));
  });

  it('writes a plain quantity for an order nothing of which has filled, or whose count is none', () => {
    manager.setPositions([]);
    manager.setOrders([
      { id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 5, filledQuantity: 0 },
      { id: 'o2', side: 'buy', type: 'limit', price: 50, quantity: 6, filledQuantity: Number.NaN },
    ]);
    const { texts } = draw();
    expect(texts).toEqual(expect.arrayContaining(['5', '6']));
    expect(texts.some((text) => text.includes('/'))).toBe(false);
  });
});
