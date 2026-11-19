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
    manager.setConfig({ lineButtons: { cancel: false, close: false, reverse: false, removeStops: false, trailStop: false } });
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

describe('TradingManager — a press called off (the browser took the touch back)', () => {
  it('puts a dragged order line back and reports nothing', () => {
    // The order at 30 is at y 70.
    expect(manager.onPointerDown({ x: 500, y: 70 }, unitViewport)).toBe(true);
    manager.onPointerMove({ x: 500, y: 40 }, unitViewport);
    expect(manager.cancelPointer()).toBe(true);
    expect(manager.onPointerUp({ x: 500, y: 40 })).toBe(false);
    expect(events).toEqual([]);
  });

  it('puts a bracket handle back where the press found it', () => {
    manager.startBracket('buy', 50);
    const before = (manager as unknown as { bracket: { getDraft(): unknown } }).bracket.getDraft();
    expect(manager.onPointerDown({ x: 500, y: 50 }, unitViewport)).toBe(true);
    manager.onPointerMove({ x: 500, y: 20 }, unitViewport);
    manager.cancelPointer();
    expect((manager as unknown as { bracket: { getDraft(): unknown } }).bracket.getDraft()).toEqual(before);
  });

  it('lets a pressed button go without running it', () => {
    const at = buttonCentre('cancelOrder');
    manager.onPointerDown(at, unitViewport);
    manager.cancelPointer();
    manager.onPointerUp(at);
    expect(events).toEqual([]);
  });

  it('is false with nothing pressed', () => {
    expect(manager.cancelPointer()).toBe(false);
  });
});

describe('TradingManager: the trail button on a stop-loss', () => {
  it('asks for the stop to trail at its distance from the price now', () => {
    // Price 70, stop 50.
    click(buttonCentre('trailStop'));
    expect(events).toEqual([{ event: 'positionModify', data: { positionId: 'p1', trailingStop: 20 } }]);
  });

  it('asks for the trail to end on a stop that is trailing, and stamps it TSL', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2, stopLoss: 50, takeProfit: 80, trailingStop: 20 }]);
    const { ctx, texts } = recordingCtx();
    manager.render(ctx, unitViewport, theme);
    expect(texts).toContain('TSL');
    expect(texts).not.toContain('SL');
    click(buttonCentre('trailStop'));
    expect(events).toEqual([{ event: 'positionModify', data: { positionId: 'p1', trailingStop: null } }]);
  });

  it('reads a broker’s 0 for "no trail" as none: SL, and a button that starts one', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2, stopLoss: 50, trailingStop: 0 }]);
    const { ctx, texts } = recordingCtx();
    manager.render(ctx, unitViewport, theme);
    expect(texts).toContain('SL');
    click(buttonCentre('trailStop'));
    expect(events).toEqual([{ event: 'positionModify', data: { positionId: 'p1', trailingStop: 20 } }]);
  });

  it('is not on a take-profit, on a stop the price is past, or when switched off', () => {
    const count = () => (manager as unknown as { buttons: { action: { type: string } }[] }).buttons.filter((b) => b.action.type === 'trailStop').length;
    expect(count()).toBe(1);
    // The price under a long's stop: no distance to trail at.
    manager.setCurrentPrice(45);
    manager.render(recordingCtx().ctx, unitViewport, theme);
    expect(count()).toBe(0);
    manager.setCurrentPrice(70);
    manager.setConfig({ lineButtons: { trailStop: false } });
    manager.render(recordingCtx().ctx, unitViewport, theme);
    expect(count()).toBe(0);
  });
});

describe('TradingManager: a trail that shows it is on', () => {
  const cells = () => (manager as unknown as { positionRenderer: { tags(...a: unknown[]): { cells: { kind: string; action?: { type: string }; active?: boolean }[] }[] } })
    .positionRenderer.tags((manager as unknown as { positions: unknown[] }).positions, 70, unitViewport, (manager as unknown as { config: unknown }).config)
    .flatMap((tag) => tag.cells).filter((cell) => cell.action?.type === 'trailStop');

  it('marks the trail button of a trailing stop, and not of one that is not', () => {
    expect(cells().map((c) => c.active)).toEqual([false]);
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2, stopLoss: 50, trailingStop: 20 }]);
    expect(cells().map((c) => c.active)).toEqual([true]);
  });

  it('stamps a waiting order\u2019s trailing stop TSL', () => {
    manager.setPositions([]);
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 60, quantity: 1, stopLoss: 50, trailingStop: 10 }]);
    const { ctx, texts } = recordingCtx();
    manager.render(ctx, unitViewport, theme);
    expect(texts).toContain('TSL');
    expect(texts).not.toContain('SL');
  });
});

describe('TradingManager: adding a stop-loss or a take-profit to a position without one', () => {
  beforeEach(() => {
    manager.setOrders([]);
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2 }]);
    manager.setCurrentPrice(60);
    manager.render(recordingCtx().ctx, unitViewport, theme);
  });

  const addButtons = () => (manager as unknown as { buttons: { action: { type: string; which?: string } }[] }).buttons
    .filter((b) => b.action.type === 'addStop').map((b) => b.action.which);

  it('puts an SL and a TP button on the entry’s tag, only for what is missing', () => {
    expect(addButtons()).toEqual(['stopLoss', 'takeProfit']);
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2, stopLoss: 50 }]);
    manager.render(recordingCtx().ctx, unitViewport, theme);
    expect(addButtons()).toEqual(['takeProfit']);
  });

  it('sets one at its starting distance on a click', () => {
    click(buttonCentre('addStop', { which: 'stopLoss' }));
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('positionModify');
    expect((events[0].data as { stopLoss: number }).stopLoss).toBeCloseTo(59.4);
  });

  it('sets one where it is dragged to, the line keeping its distance from the pointer', () => {
    const at = buttonCentre('addStop', { which: 'takeProfit' });
    expect(manager.onPointerDown(at, unitViewport)).toBe(true);
    // The target starts at 61.2 (2R of 1%); 10 px up on this chart is 10 higher.
    expect(manager.onPointerMove({ x: at.x, y: at.y - 10 }, unitViewport)).toBe(true);
    expect(manager.onPointerUp({ x: at.x, y: at.y - 10 })).toBe(true);
    expect(events).toHaveLength(1);
    expect((events[0].data as { positionId: string; takeProfit: number })).toEqual({ positionId: 'p1', takeProfit: expect.closeTo(71.2, 5) });
  });

  it('draws the line being set while it is dragged, with the stop’s tag, and no SL button meanwhile', () => {
    const at = buttonCentre('addStop', { which: 'stopLoss' });
    manager.onPointerDown(at, unitViewport);
    manager.onPointerMove({ x: at.x, y: at.y + 10 }, unitViewport);
    const { ctx, texts } = recordingCtx();
    manager.render(ctx, unitViewport, theme);
    expect(texts).toContain('SL');
    expect(addButtons()).toEqual(['takeProfit']);
  });

  it('sets nothing when the press is called off', () => {
    manager.onPointerDown(buttonCentre('addStop', { which: 'stopLoss' }), unitViewport);
    expect(manager.cancelPointer()).toBe(true);
    expect(events).toEqual([]);
  });

  it('has no such buttons when they are switched off', () => {
    manager.setConfig({ lineButtons: { addStops: false } });
    manager.render(recordingCtx().ctx, unitViewport, theme);
    expect(addButtons()).toEqual([]);
  });
});

describe('TradingManager: a stop added on the chart, after review', () => {
  // 50 px a unit: a 1% stop is far more than a tag's height.
  const zoomed = { ...unitViewport, priceRange: { min: 99, max: 101 } };
  const addButton = (which: string) => (manager as unknown as { buttons: { x: number; y: number; size: number; action: { type: string; which?: string; price?: number } }[] }).buttons
    .find((b) => b.action.type === 'addStop' && b.action.which === which);

  beforeEach(() => {
    manager.setOrders([]);
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 99.6, quantity: 1 }]);
    manager.setCurrentPrice(99.6);
    manager.render(recordingCtx().ctx, zoomed, theme);
  });

  it('starts one that would be off the plot at the plot’s edge, where it can be seen and dragged', () => {
    const stop = addButton('stopLoss')!;
    // Bottom edge, half a tag in: y 89.5 is 99.21 here; its 1% start, 98.6, is below the plot.
    expect(stop.action.price).toBeCloseTo(99.21, 2);
    const at = { x: stop.x + 2, y: stop.y + 2 };
    manager.onPointerDown(at, zoomed);
    manager.onPointerUp(at);
    expect((events[0].data as { stopLoss: number }).stopLoss).toBeCloseTo(99.21, 2);
  });

  it('offers none where even the plot’s edge is not beyond the price', () => {
    manager.setCurrentPrice(99.1);
    manager.render(recordingCtx().ctx, zoomed, theme);
    expect(addButton('stopLoss')).toBeUndefined();
    expect(addButton('takeProfit')).toBeDefined();
  });

  it('sends nothing for a position gone, or given that stop, while it was dragged', () => {
    const press = () => {
      const b = addButton('stopLoss')!;
      manager.onPointerDown({ x: b.x + 2, y: b.y + 2 }, zoomed);
    };
    press();
    manager.setPositions([]);
    manager.onPointerUp({ x: 0, y: 0 });
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 99.6, quantity: 1 }]);
    manager.render(recordingCtx().ctx, zoomed, theme);
    press();
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 99.6, quantity: 1, stopLoss: 99.3 }]);
    manager.onPointerUp({ x: 0, y: 0 });
    expect(events).toEqual([]);
  });
});

describe('TradingManager: positions and orders hidden or locked', () => {
  const buttonsNow = () => (manager as unknown as { buttons: { action: { type: string } }[] }).buttons.map((b) => b.action.type);

  it('draws none of them while hidden, and they take no press; a bracket being placed still shows', () => {
    manager.setHidden(true);
    expect(manager.isHidden()).toBe(true);
    const { ctx, texts } = recordingCtx();
    manager.render(ctx, unitViewport, theme);
    expect(buttonsNow()).toEqual([]);
    expect(texts).toEqual([]);
    expect(manager.axisBadgeLines(unitViewport)).toEqual([]);
    // A bracket being placed: its entry, stop and target, and nothing of the position or the order.
    manager.startBracket('buy', 40);
    expect(manager.axisBadgeLines(unitViewport)).toHaveLength(3);
    manager.cancelBracket();
    // The order line at 30 (y 70) is not there to drag.
    expect(manager.onPointerDown({ x: 400, y: 70 }, unitViewport)).toBe(false);
    expect(manager.isOverDraggableLine({ x: 400, y: 70 }, unitViewport)).toBe(false);
    manager.setHidden(false);
    manager.render(recordingCtx().ctx, unitViewport, theme);
    expect(buttonsNow()).toContain('cancelOrder');
  });

  it('lets none of their lines or tags be dragged while locked, but keeps their buttons', () => {
    manager.setLocked(true);
    expect(manager.isLocked()).toBe(true);
    manager.render(recordingCtx().ctx, unitViewport, theme);
    expect(manager.onPointerDown({ x: 400, y: 70 }, unitViewport)).toBe(false);
    expect(manager.isOverDraggableLine({ x: 400, y: 70 }, unitViewport)).toBe(false);
    click(buttonCentre('cancelOrder'));
    expect(events).toEqual([{ event: 'orderCancel', data: { orderId: 'o1' } }]);
  });

  it('says a locked line’s tag cannot be dragged, as its line cannot', () => {
    manager.setLocked(true);
    manager.render(recordingCtx().ctx, unitViewport, theme);
    const tag = (manager as unknown as { tagBoxes: { x: number; y: number; width: number; height: number }[] }).tagBoxes[0];
    expect(tag).toBeDefined();
    expect(manager.isOverDraggableLine({ x: tag.x + 2, y: tag.y + tag.height / 2 }, unitViewport)).toBe(false);
  });

  it('offers no SL or TP to drag out while locked', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2 }]);
    manager.setLocked(true);
    manager.render(recordingCtx().ctx, unitViewport, theme);
    expect(buttonsNow()).not.toContain('addStop');
  });
});
