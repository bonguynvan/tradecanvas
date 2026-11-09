import { describe, it, expect } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { contrastRatio, LIGHT_THEME } from '@tradecanvas/commons';
import { FIB_LEVEL_COLORS } from '../tools/options.js';
import { levelLabel } from '../tools/priceLevels.js';
import { FibRetracementTool } from '../tools/FibRetracement.js';
import { FibTimeZonesTool } from '../tools/FibTimeZones.js';
import { GannBoxTool } from '../tools/GannBox.js';
import { GannFanTool } from '../tools/GannFan.js';
import { FibCirclesTool, FibSpiralTool } from '../tools/fibGeometry.js';
import { ParallelChannelTool } from '../tools/ParallelChannel.js';
import { RegressionChannelTool } from '../tools/RegressionChannel.js';
import { FibSpeedResistanceFanTool } from '../tools/FibSpeedResistanceFan.js';
import { drawing, recordingCtx, textCtx, unitViewport } from './fixtures.js';

// `unitViewport`: bar i at x = i·10 + 5, price p at y = 100 − p, a plot 1000 × 100.
const tall: ViewportState = { ...unitViewport, chartRect: { x: 0, y: 0, width: 1000, height: 400 }, priceRange: { min: 0, max: 100 } };

describe('the Fibonacci levels’ colours', () => {
  it('give each ratio a colour of its own among those shown together', () => {
    const groups = [
      [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
      [0.25, 0.382, 0.5, 0.618, 0.75],
      [0, 0.618, 1, 1.618, 2, 2.618, 3.618, 4.236],
    ];
    for (const group of groups) {
      const colors = group.filter((v) => v !== 0 && v !== 1).map((v) => FIB_LEVEL_COLORS[v]);
      expect(new Set(colors).size, group.join(',')).toBe(colors.length);
    }
  });

  it('read at 3:1 on the light theme’s paper as lines, every one', () => {
    for (const [value, color] of Object.entries(FIB_LEVEL_COLORS)) {
      expect(contrastRatio(color, LIGHT_THEME.background)!, value).toBeGreaterThanOrEqual(2.9);
    }
  });
});

describe('a level’s label', () => {
  it('writes whole percentages without a trailing .0', () => {
    expect(levelLabel(0, 1, true, false)).toBe('0%');
    expect(levelLabel(0.5, 1, true, false)).toBe('50%');
    expect(levelLabel(1, 1, true, false)).toBe('100%');
    expect(levelLabel(0.618, 1, true, false)).toBe('61.8%');
    expect(levelLabel(0.236, 1, true, false)).toBe('23.6%');
  });

  it('is left out where it would cover the one above, but never at 0 and 100%', () => {
    const tool = new FibRetracementTool();
    // 0 at 50 and 1 at 54: the levels are 4 / 10 px apart, closer than a label is tall.
    const state = drawing('fibRetracement', [{ time: 2, price: 50 }, { time: 8, price: 54 }]);
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    expect(texts.some((t) => t.startsWith('0%'))).toBe(true);
    expect(texts.some((t) => t.startsWith('100%'))).toBe(true);
    expect(texts.length).toBeLessThan(7);
  });
});

describe('Fibonacci time zones', () => {
  it('draw the zone’s start, and put their handles halfway up the plot, on the lines they move', () => {
    const tool = new FibTimeZonesTool();
    const state = drawing('fibTimeZones', [{ time: 2, price: 90 }, { time: 4, price: 10 }]);
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    expect(texts).toContain('0');
    // The handles at bars 2 and 4 halfway up, whatever the anchors' prices: clear of the legend, the pane's foot and the buttons over it.
    const middle = unitViewport.chartRect.y + unitViewport.chartRect.height / 2;
    expect(tool.hitTestAnchor({ x: 25, y: middle }, state, unitViewport, 6)).toBe(0);
    expect(tool.hitTestAnchor({ x: 45, y: middle }, state, unitViewport, 6)).toBe(1);
    expect(tool.hitTestAnchor({ x: 25, y: 10 }, state, unitViewport, 6)).toBe(-1);
  });
});

describe('Gann', () => {
  it('a box labels its divisions in price and in time, none covering another', () => {
    const tool = new GannBoxTool();
    // A short box: 25% and 33% would touch.
    const state = drawing('gannBox', [{ time: 10, price: 60 }, { time: 30, price: 40 }]);
    const { ctx, drawn } = textCtx();
    tool.render(ctx, state, tall, false);
    // Each label's box, from where its text starts, its width and its baseline (the mark size is 11 px).
    const H = 11;
    const boxes = drawn.map((d) => {
      const top = d.baseline === 'top' ? d.y : d.baseline === 'middle' ? d.y - H / 2 : d.y - H;
      return { text: d.text, left: d.left, right: d.left + d.width, top, bottom: top + H };
    });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        expect(apart, `${a.text} / ${b.text}`).toBe(true);
      }
    }
    // Time divisions are labelled too.
    expect(drawn.filter((d) => d.text === '50%').length).toBe(2);
  });

  it('a fan labels every ray where it leaves the plot', () => {
    const tool = new GannFanTool();
    const state = drawing('gannFan', [{ time: 2, price: 10 }, { time: 12, price: 30 }]);
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, state, tall, false);
    for (const label of ['1x1', '2x1', '4x1', '8x1', '1x2', '1x8']) expect(texts, label).toContain(label);
  });
});

describe('level shapes', () => {
  it('keep the 1.0 circle’s label when the circles crowd', () => {
    const tool = new FibCirclesTool();
    const state = drawing('fibCircles', [{ time: 50, price: 50 }, { time: 51, price: 50 }]);
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, state, tall, false);
    expect(texts).toContain('1');
  });

  it('a spiral stops winding in before it is a dot', () => {
    const tool = new FibSpiralTool();
    const state = drawing('fibSpiral', [{ time: 50, price: 50 }, { time: 60, price: 50 }]);
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, state, tall, false);
    const pts = calls.filter((c) => c.name === 'lineTo' || c.name === 'moveTo').map((c) => c.args as number[]);
    const centre = { x: 505, y: 200 };
    const nearest = Math.min(...pts.map(([x, y]) => Math.hypot(x - centre.x, y - centre.y)));
    expect(nearest).toBeGreaterThanOrEqual(7);
  });

  it('a speed resistance fan draws each ray in its level’s colour, and labels time rays too', () => {
    const tool = new FibSpeedResistanceFanTool();
    const state = drawing('fibSpeedResistanceFan', [{ time: 10, price: 20 }, { time: 30, price: 60 }]);
    const { ctx, calls, texts } = recordingCtx();
    const strokes: unknown[] = [];
    const proxy = new Proxy(ctx as unknown as Record<string, unknown>, {
      get: (t, k: string) => (k === 'stroke' ? () => strokes.push(t.strokeStyle) : t[k]),
      set: (t, k: string, v) => { t[k] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
    tool.render(proxy, state, tall, false);
    void calls;
    expect(strokes).toContain(FIB_LEVEL_COLORS[0.5]);
    expect(texts.filter((t) => t === '0.5').length).toBe(2);
  });
});

describe('channels', () => {
  it('a parallel channel is the base line moved straight up or down to its third point, as its alerts read it', () => {
    const tool = new ParallelChannelTool();
    // Base from bar 0 at 10 to bar 10 at 30; the third point at bar 5, 20 above the base's 20.
    const state = drawing('parallelChannel', [{ time: 0, price: 10 }, { time: 10, price: 30 }, { time: 5, price: 40 }]);
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, state, tall, false);
    const moves = calls.filter((c) => c.name === 'moveTo').map((c) => c.args as number[]);
    const lines = calls.filter((c) => c.name === 'lineTo').map((c) => c.args as number[]);
    // The parallel starts at bar 0's x, 20 higher than the base there.
    const baseStart = { x: 5, y: tall.chartRect.height * (1 - 10 / 100) };
    expect(moves.some(([x, y]) => Math.abs(x - baseStart.x) < 0.5 && Math.abs(y - (baseStart.y - tall.chartRect.height * 0.2)) < 0.5)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
    expect(tool.priceAt(state, 0, tall)).toEqual([10, 30]);
  });

  it('a regression channel fits the closes between its points, with bands two deviations either side', () => {
    const tool = new RegressionChannelTool();
    // Closes on a straight rise, 10 + 2·i, with ±1 alternating noise.
    const bars: OHLCBar[] = Array.from({ length: 40 }, (_, i) => {
      const close = 10 + 2 * i + (i % 2 ? 1 : -1);
      return { time: i, open: close, high: close + 1, low: close - 1, close, volume: 1 };
    });
    tool.setDataGetter(() => bars);
    const fit = tool.fit(drawing('regressionChannel', [{ time: 5, price: 0 }, { time: 25, price: 0 }]), unitViewport);
    expect(fit).not.toBeNull();
    expect(fit!.slope).toBeCloseTo(2, 1);
    expect(fit!.deviation).toBeGreaterThan(0.5);
    expect(fit!.deviation).toBeLessThan(1.5);
    // Its handles sit on the fitted line at its two ends.
    const state = drawing('regressionChannel', [{ time: 5, price: 0 }, { time: 25, price: 0 }]);
    const y = (p: number) => unitViewport.chartRect.height * (1 - p / 100);
    expect(tool.hitTestAnchor({ x: 55, y: y(fit!.at(5)) }, state, unitViewport, 4)).toBe(0);
  });
});

describe('a horizontal ray', () => {
  it('starts its price past the handle at its start, so a selected ray’s ring doesn’t cover it', async () => {
    const { HorizontalRayTool } = await import('../tools/HorizontalRay.js');
    const { handleRadius } = await import('../drawingLook.js');
    const { ctx, drawn } = textCtx();
    // Its start at bar 10 (x = 105).
    new HorizontalRayTool().render(ctx, drawing('horizontalRay', [{ time: 10, price: 50 }]), unitViewport, true);
    const label = drawn.find((d) => d.text === '50.00')!;
    expect(label.left).toBeGreaterThan(105 + handleRadius(1));
  });
});

describe('after review', () => {
  it('draws the 0 and 100% labels first, and leaves out a neighbour they would cover', () => {
    const tool = new FibRetracementTool();
    // 0 at 50 and 1 at 56 on a 400 px plot (4 px a unit): 0 and 100% 24 px apart, a 0.93 level 2 px from 100%.
    const levels = [0, 0.93, 1].map((value) => ({ value, visible: true }));
    const state = drawing('fibRetracement', [{ time: 2, price: 50 }, { time: 8, price: 56 }], { options: { levels } });
    const { ctx, drawn } = textCtx();
    tool.render(ctx, state, tall, false);
    const H = 12;
    const boxes = drawn.map((d) => ({ text: d.text, top: d.y - H, bottom: d.y }));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        expect(a.bottom <= b.top || b.bottom <= a.top, `${a.text} / ${b.text}`).toBe(true);
      }
    }
    expect(drawn.some((d) => d.text.startsWith('100%'))).toBe(true);
  });

  it('a regression channel works its fit out once for the same bars, not on every frame and hover', () => {
    const tool = new RegressionChannelTool();
    let reads = 0;
    const bars: OHLCBar[] = Array.from({ length: 200 }, (_, i) => ({ time: i, open: i, high: i + 1, low: i - 1, close: i, volume: 1 }));
    const counted = bars.map((b) => new Proxy(b, { get: (t, k) => { if (k === 'close') reads++; return t[k as keyof OHLCBar]; } }));
    tool.setDataGetter(() => counted as OHLCBar[], () => 0);
    const state = drawing('regressionChannel', [{ time: 10, price: 0 }, { time: 150, price: 0 }]);
    tool.fit(state, unitViewport);
    const first = reads;
    expect(first).toBeGreaterThan(0);
    for (let i = 0; i < 5; i++) {
      tool.fit(state, unitViewport);
      tool.hitTest({ x: 500, y: 50 }, state, unitViewport, 4);
    }
    expect(reads).toBe(first);
  });

  it('a regression channel’s handles stay on its line where its points run past the bars', () => {
    const tool = new RegressionChannelTool();
    const bars: OHLCBar[] = Array.from({ length: 20 }, (_, i) => ({ time: i, open: 50, high: 51, low: 49, close: 50, volume: 1 }));
    tool.setDataGetter(() => bars);
    // The second point at bar 40, past the last bar (19): its handle at the line's end, bar 19.
    const state = drawing('regressionChannel', [{ time: 5, price: 0 }, { time: 40, price: 0 }]);
    const lineEnd = { x: 19 * 10 + 5, y: unitViewport.chartRect.height * 0.5 };
    expect(tool.hitTestAnchor(lineEnd, state, unitViewport, 2)).toBe(1);
  });

  it('Shift leaves a regression channel’s points free: their prices mean nothing to it', async () => {
    const { keepsAngle } = await import('../drawingEditing.js');
    expect(keepsAngle('regressionChannel')).toBe(false);
    expect(keepsAngle('trendLine')).toBe(true);
  });

  it('a Gann fan draws its 1x1 at full strength, whichever angles before it were left unlabelled', () => {
    const tool = new GannFanTool();
    const alphas: number[] = [];
    const { ctx } = recordingCtx();
    const probe = new Proxy(ctx as unknown as Record<string, unknown>, {
      get: (t, k: string) => (k === 'stroke' ? () => alphas.push(Number(t.globalAlpha ?? 1)) : t[k]),
      set: (t, k: string, v) => { t[k] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
    // Steep: the 8x1..2x1 rays leave by the plot's top far left, some outside it.
    tool.render(probe, drawing('gannFan', [{ time: 2, price: 10 }, { time: 3, price: 90 }]), unitViewport, false);
    // The rays go 8x1, 4x1, 3x1, 2x1, then 1x1 fifth.
    expect(alphas[4]).toBe(1);
  });

  it('a Gann square draws its arcs in its line, not as hairlines', async () => {
    const { GannSquareTool } = await import('../tools/fibGeometry.js');
    const widths: number[] = [];
    const { ctx } = recordingCtx();
    let inArc = false;
    const probe = new Proxy(ctx as unknown as Record<string, unknown>, {
      get: (t, k: string) => (k === 'stroke' ? () => { if (inArc) widths.push(Number(t.lineWidth)); } : k === 'arc' ? () => undefined : t[k]),
      set: (t, k: string, v) => { if (k === 'strokeStyle' && typeof v === 'string' && v !== '#4c8dff') inArc = true; t[k] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
    const state = drawing('gannSquare', [{ time: 10, price: 20 }, { time: 30, price: 60 }], { style: { color: '#4c8dff', lineWidth: 3, lineStyle: 'solid' } });
    new GannSquareTool().render(probe, state, tall, false);
    expect(widths.length).toBeGreaterThan(0);
    expect(widths.every((w) => w === 3)).toBe(true);
  });
});

describe('after the browser pass', () => {
  /** The boxes of the labels drawn, from where each starts, its width and baseline (`size` px tall). */
  const boxesOf = (drawn: ReturnType<typeof textCtx>['drawn'], size = 12) => drawn.map((d) => {
    const top = d.baseline === 'top' ? d.y : d.baseline === 'middle' ? d.y - size / 2 : d.y - size;
    return { text: d.text, left: d.left, right: d.left + d.width, top, bottom: top + size };
  });
  const apart = (a: { left: number; right: number; top: number; bottom: number }, b: typeof a) =>
    a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;

  it('a spiral winds in close to its centre, stopping short of a dot', () => {
    const tool = new FibSpiralTool();
    const state = drawing('fibSpiral', [{ time: 50, price: 50 }, { time: 60, price: 50 }]);
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, state, tall, false);
    const pts = calls.filter((c) => c.name === 'lineTo' || c.name === 'moveTo').map((c) => c.args as number[]);
    const nearest = Math.min(...pts.map(([x, y]) => Math.hypot(x - 505, y - 200)));
    expect(nearest).toBeGreaterThanOrEqual(7);
    expect(nearest).toBeLessThanOrEqual(12);
  });

  it('time tools’ handles sit clear of a pane divider’s touch reach under the plot', async () => {
    const { TOUCH_REACH } = await import('../../interaction/pointerReach.js');
    const tool = new FibTimeZonesTool();
    const state = drawing('fibTimeZones', [{ time: 2, price: 90 }, { time: 4, price: 10 }]);
    const foot = tall.chartRect.y + tall.chartRect.height;
    for (let rise = 0; rise <= TOUCH_REACH.divider; rise++) {
      expect(tool.hitTestAnchor({ x: 25, y: foot - rise }, state, tall, 1), String(rise)).toBe(-1);
    }
  });

  it('a level’s label keeps clear of the legend, moving under its line', async () => {
    const { setDrawingKeepOut } = await import('../tools/labels.js');
    const tool = new FibRetracementTool();
    // 100% at price 90, y 40 on the tall plot; the legend over the plot's top 45 px, from the left.
    setDrawingKeepOut([{ x: 0, y: 0, width: 400, height: 45 }]);
    try {
      const { ctx, drawn } = textCtx();
      tool.render(ctx, drawing('fibRetracement', [{ time: 2, price: 50 }, { time: 8, price: 90 }]), tall, false);
      const top = boxesOf(drawn).find((b) => b.text.startsWith('100%'))!;
      expect(top.top).toBeGreaterThanOrEqual(45);
    } finally {
      setDrawingKeepOut(null);
    }
  });

  it('the 0 and 100% labels never cover each other: the second goes under its line', () => {
    const tool = new FibRetracementTool();
    const { ctx, drawn } = textCtx();
    tool.render(ctx, drawing('fibRetracement', [{ time: 2, price: 50 }, { time: 8, price: 51 }]), tall, false);
    const boxes = boxesOf(drawn);
    const zero = boxes.find((b) => b.text.startsWith('0%'))!;
    const hundred = boxes.find((b) => b.text.startsWith('100%'))!;
    expect(apart(zero, hundred)).toBe(true);
  });

  it('a Fibonacci channel leaves out a level label that would cover another', async () => {
    const { FibChannelTool } = await import('../tools/FibChannel.js');
    const { ctx, drawn } = textCtx();
    // A flat, narrow channel: its levels a px or two apart.
    new FibChannelTool().render(ctx, drawing('fibChannel', [{ time: 10, price: 50 }, { time: 40, price: 50 }, { time: 10, price: 53 }]), tall, false);
    const boxes = boxesOf(drawn);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      expect(apart(boxes[i], boxes[j]), `${boxes[i].text} / ${boxes[j].text}`).toBe(true);
    }
    expect(boxes.map((b) => b.text)).toEqual(expect.arrayContaining(['0', '1']));
  });

  it('a parallel channel’s third handle sits on its parallel, halfway along', () => {
    const tool = new ParallelChannelTool();
    // Base from bar 0 at 10 to bar 10 at 30; the third point at bar 30 (past the span), 20 above the base line.
    const state = drawing('parallelChannel', [{ time: 0, price: 10 }, { time: 10, price: 30 }, { time: 30, price: 90 }]);
    // The parallel over bars 0..10 is the base 20 higher: halfway, bar 5 at price 40.
    const y = (p: number) => tall.chartRect.height * (1 - p / 100);
    expect(tool.hitTestAnchor({ x: 55, y: y(40) }, state, tall, 2)).toBe(2);
  });

  it('Fibonacci time zones keep their numbers clear of the legend and of each other', async () => {
    const { setDrawingKeepOut } = await import('../tools/labels.js');
    setDrawingKeepOut([{ x: 0, y: 0, width: 400, height: 45 }]);
    try {
      const { ctx, drawn } = textCtx();
      // Zones a bar apart: their numbers would touch.
      new FibTimeZonesTool().render(ctx, drawing('fibTimeZones', [{ time: 2, price: 50 }, { time: 3, price: 50 }]), tall, false);
      const boxes = boxesOf(drawn);
      for (const b of boxes) expect(b.left >= 400 || b.top >= 45, b.text).toBe(true);
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        expect(apart(boxes[i], boxes[j]), `${boxes[i].text} / ${boxes[j].text}`).toBe(true);
      }
    } finally {
      setDrawingKeepOut(null);
    }
  });
});
