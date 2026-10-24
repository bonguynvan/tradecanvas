import { describe, it, expect, beforeEach } from 'vitest';
import type { Theme } from '@tradecanvas/commons';
import { DARK_THEME, UI_ICONS } from '@tradecanvas/commons';
import { TradingManager } from '../TradingManager.js';
import { drawTags, layoutTags, type TagBox, type TradingTag } from '../tradingTags.js';
import { amountAt, formatAmount } from '../positionFormat.js';
import { buttonAt, type LineButton } from '../lineButtons.js';
import { tagPath } from '../../ui/shapes.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const theme = DARK_THEME as Theme;
let manager: TradingManager;
let events: { event: string; data: unknown }[];

function draw(): { texts: string[]; buttons: LineButton[]; boxes: TagBox[] } {
  const { ctx, texts } = recordingCtx();
  manager.render(ctx, unitViewport, theme);
  const m = manager as unknown as { buttons: LineButton[]; tagBoxes: TagBox[] };
  return { texts, buttons: m.buttons, boxes: m.tagBoxes };
}

const axisTexts = () => {
  const { ctx, texts } = recordingCtx();
  manager.renderAxisBadges(ctx, unitViewport, theme);
  return texts;
};

/** Press at `from`, drag to `to`, let go. */
function drag(from: { x: number; y: number }, to: { x: number; y: number }): void {
  manager.onPointerDown(from, unitViewport);
  manager.onPointerMove(to, unitViewport);
  manager.onPointerUp(to);
}

beforeEach(() => {
  manager = new TradingManager();
  events = [];
  manager.setEventCallback((event, data) => events.push({ event, data }));
  manager.setCurrentPrice(70);
});

describe('a press on a tag', () => {
  it('takes the line the tag is on, not another as near', () => {
    // The stop at 31 (y 69) and an order at 30 (y 70): the stop's tag keeps the axis end.
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2, stopLoss: 31 }]);
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1 }]);
    const remove = draw().buttons.find((b) => b.action.type === 'removeStop')!;
    // On the stop's tag, 5 px over its line; the line lands on y 40.
    drag({ x: remove.x - 10, y: 64 }, { x: remove.x - 10, y: 35 });
    expect(events).toEqual([{ event: 'positionModify', data: { positionId: 'p1', stopLoss: 60 } }]);
  });

  it('takes a bracket’s line by its tag', () => {
    manager.startBracket('buy', 50);
    const tp = draw().boxes.find((b) => b.grab.kind === 'bracket' && b.grab.handle === 'tp')!;
    // The target starts at 51 (y 49): pressed 6 px under it, it lands on y 30.
    drag({ x: tp.x + 4, y: 55 }, { x: tp.x + 4, y: 36 });
    const draft = (manager as unknown as { bracket: { getDraft(): { takeProfit: number } } }).bracket.getDraft();
    expect(draft.takeProfit).toBeCloseTo(70);
  });

  it('keeps the line on the plot, though the pointer runs to its edge', () => {
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1 }]);
    const cancel = draw().buttons.find((b) => b.action.type === 'cancelOrder')!;
    // Pressed 8 px over the line; the pointer at the plot's foot would put the line 8 px under it.
    drag({ x: cancel.x - 10, y: 62 }, { x: cancel.x - 10, y: 100 });
    expect(events).toEqual([{ event: 'orderModify', data: { orderId: 'o1', newPrice: 0, previousPrice: 30 } }]);
  });

  it('takes nothing on an order that can’t be dragged, nor past the plot’s foot', () => {
    manager.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 30, quantity: 1, draggable: false }]);
    const cancel = draw().buttons.find((b) => b.action.type === 'cancelOrder')!;
    expect(manager.isOverDraggableLine({ x: cancel.x - 10, y: 62 }, unitViewport)).toBe(false);
    manager.setOrders([{ id: 'o2', side: 'buy', type: 'limit', price: 1, quantity: 1 }]);
    const low = draw().buttons.find((b) => b.action.type === 'cancelOrder')!;
    // Its line is at y 99: the tag reaches 109, but the plot ends at 100 (and 109 is past the line's own reach).
    expect(manager.isOverDraggableLine({ x: low.x - 10, y: 109 }, unitViewport)).toBe(false);
  });
});

describe('a stop or a target while it is dragged', () => {
  it('moves its line, its tag’s amount and its price on the axis with the pointer', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2, stopLoss: 50 }]);
    draw();
    manager.onPointerDown({ x: 500, y: 50 }, unitViewport);
    manager.onPointerMove({ x: 500, y: 45 }, unitViewport);
    // Two long from 60 with the stop at 55 lose 10.
    expect(draw().texts).toContain('-10.00');
    expect(axisTexts()).toContain('55.00');
  });
});

describe('a position’s tag', () => {
  it('counts what is still open, as its profit does', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 5, closedQuantity: 2 }]);
    // Three open from 60 at 70 make 30.
    expect(draw().texts).toEqual(expect.arrayContaining(['3', 'Long', '+30.00']));
  });

  it('takes the host’s words after its quantity, as a template or a function', () => {
    manager.setPositions([{ id: 'p1', side: 'sell', entryPrice: 60, quantity: 2 }]);
    manager.setConfig({ positionLabel: '{side} from {entry}' });
    expect(draw().texts).toEqual(expect.arrayContaining(['2', 'SELL from 60.00']));
    manager.setConfig({ positionLabel: (ctx) => `open ${ctx.openQuantity}` });
    expect(draw().texts).toContain('open 2');
  });

  it('says only its side while there is no price', () => {
    manager = new TradingManager();
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 60, quantity: 2 }]);
    expect(draw().texts).toEqual(['2', 'Long']);
  });

  it('has no buttons where the tag would run off the plot', () => {
    manager.setPositions([{ id: 'p1', side: 'buy', entryPrice: 99, quantity: 1 }]);
    expect(draw().buttons).toEqual([]);
  });
});

describe('a bracket off the plot', () => {
  it('tags and prices only the lines on it', () => {
    // A long from 99.5: its target, 2 % over, is off the top.
    manager.startBracket('buy', 99.5);
    expect(draw().texts).not.toContain('TP');
    expect(axisTexts()).not.toContain('101.49');
  });
});

describe('tags that cannot all fit', () => {
  const wide = (action: string): TradingTag => ({
    y: 50,
    color: '#1fa874',
    cells: [{ kind: 'text', text: 'x'.repeat(95) }, { kind: 'button', icon: UI_ICONS.x, action: { type: 'cancelOrder', orderId: action } }],
  });

  it('say where one could not be placed', () => {
    expect(layoutTags([{ y: 50, width: 600 }, { y: 50, width: 600 }], { left: 0, right: 1000 })).toEqual([
      { x: 392, fits: true },
      { x: 0, fits: false },
    ]);
  });

  it('leave the buttons of one that could not be placed out, as they may lie under another', () => {
    const buttons: LineButton[] = [];
    drawTags(recordingCtx().ctx, [wide('a'), wide('b')], unitViewport, theme, buttons);
    expect(buttons.map((b) => (b.action as { orderId: string }).orderId)).toEqual(['a']);
  });
});

describe('formatAmount and amountAt', () => {
  it('write a short’s profit with its sign, and nothing as no sign', () => {
    expect(formatAmount(amountAt('sell', 100, 2, 90), 2)).toBe('+20.00');
    expect(formatAmount(amountAt('sell', 100, 2, 110), 2)).toBe('-20.00');
    expect(formatAmount(amountAt('sell', 100, 2, 100), 2)).toBe('0.00');
    expect(formatAmount(-0.001, 2)).toBe('0.00');
  });
});

describe('buttonAt', () => {
  it('takes the button a press is on before one whose margin it is in', () => {
    const upper: LineButton = { x: 0, y: 0, size: 21, action: { type: 'cancelOrder', orderId: 'upper' } };
    const lower: LineButton = { x: 0, y: 22, size: 21, action: { type: 'cancelOrder', orderId: 'lower' } };
    // y 23 is on the lower button, and in the upper one's touch margin.
    expect(buttonAt([lower, upper], { x: 10, y: 23 }, 8)?.action).toEqual(lower.action);
    expect(buttonAt([lower, upper], { x: 10, y: -4 }, 8)?.action).toEqual(upper.action);
  });
});

describe('tagPath', () => {
  it('traces a plain box for a square theme', () => {
    const { ctx, calls } = recordingCtx();
    tagPath(ctx, 1, 2, 30, 21, theme);
    expect(calls.map((c) => c.name)).toEqual(['beginPath', 'rect']);
  });
});
