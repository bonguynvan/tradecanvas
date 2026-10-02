import { describe, it, expect } from 'vitest';
import type { DrawingOptions } from '@tradecanvas/commons';
import { TrendLineTool } from '../tools/TrendLine.js';
import { ParallelChannelTool } from '../tools/ParallelChannel.js';
import { FibRetracementTool } from '../tools/FibRetracement.js';
import { FibExtensionTool } from '../tools/FibExtension.js';
import { FibChannelTool } from '../tools/FibChannel.js';
import { FibSpeedResistanceFanTool } from '../tools/FibSpeedResistanceFan.js';
import { FibTimeZonesTool } from '../tools/FibTimeZones.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

// unitViewport: bar N at x = N*10 + 5, price p at y = 100 - p, chart 1000 px wide.

describe('TrendLineTool extend options', () => {
  const tool = new TrendLineTool();
  const anchors = [{ time: 10, price: 50 }, { time: 20, price: 50 }]; // x 105 → 205 at y 50

  it('stops at its anchors by default', () => {
    expect(tool.hitTest({ x: 300, y: 50 }, drawing('trendLine', anchors), unitViewport, 3)).toBe(false);
  });

  it('reaches past either anchor when extended', () => {
    const right = drawing('trendLine', anchors, { options: { extendRight: true } });
    expect(tool.hitTest({ x: 600, y: 50 }, right, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 50, y: 50 }, right, unitViewport, 3)).toBe(false);
    const left = drawing('trendLine', anchors, { options: { extendLeft: true } });
    expect(tool.hitTest({ x: 50, y: 50 }, left, unitViewport, 3)).toBe(true);
  });
});

describe('ParallelChannelTool options', () => {
  const tool = new ParallelChannelTool();
  const anchors = [{ time: 10, price: 60 }, { time: 20, price: 60 }, { time: 15, price: 40 }]; // lines at y 40 and 60

  it('draws a middle line when asked', () => {
    const state = drawing('parallelChannel', anchors, { options: { middleLine: true } });
    expect(tool.hitTest({ x: 150, y: 50 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 150, y: 50 }, drawing('parallelChannel', anchors), unitViewport, 2)).toBe(false);
  });

  it('extends both lines', () => {
    const state = drawing('parallelChannel', anchors, { options: { extendRight: true } });
    expect(tool.hitTest({ x: 700, y: 40 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 700, y: 60 }, state, unitViewport, 2)).toBe(true);
  });
});

describe('FibRetracementTool options', () => {
  const tool = new FibRetracementTool();
  // 0% at the first anchor (price 80), 100% at the second (price 20).
  const anchors = [{ time: 10, price: 80 }, { time: 30, price: 20 }];
  const texts = (options?: DrawingOptions) => {
    const { ctx, texts: out } = recordingCtx();
    tool.render(ctx, drawing('fibRetracement', anchors, { options }), unitViewport, false);
    return out;
  };

  it('labels the classic levels with percent and price by default', () => {
    expect(texts()).toEqual([
      '0.0% (80.00)', '23.6% (65.84)', '38.2% (57.08)', '50.0% (50.00)', '61.8% (42.92)', '78.6% (32.84)', '100.0% (20.00)',
    ]);
  });

  it('draws only the levels left visible, including added ones', () => {
    const levels = [{ value: 0.5, visible: true }, { value: 0.618, visible: false }, { value: 1.618, visible: true }];
    expect(texts({ levels })).toEqual(['50.0% (50.00)', '161.8% (-17.08)']);
  });

  it('shows levels, prices, both or neither', () => {
    const levels = [{ value: 0.5, visible: true }];
    expect(texts({ levels, showPrices: false })).toEqual(['50.0%']);
    expect(texts({ levels, showLevels: false })).toEqual(['50.00']);
    expect(texts({ levels, showLevels: false, showPrices: false })).toEqual([]);
  });

  it('measures from the second anchor when reversed', () => {
    expect(texts({ levels: [{ value: 0, visible: true }], reverse: true })).toEqual(['0.0% (20.00)']);
  });

  it('spans only its anchors unless extended', () => {
    const inside = drawing('fibRetracement', anchors, { options: { extendLeft: false, extendRight: false } });
    expect(tool.hitTest({ x: 200, y: 50 }, inside, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 600, y: 50 }, inside, unitViewport, 2)).toBe(false);
    expect(tool.hitTest({ x: 600, y: 50 }, drawing('fibRetracement', anchors), unitViewport, 2)).toBe(true);
  });

  it('draws a level in its own colour', () => {
    const { ctx, calls } = recordingCtx();
    const strokes: string[] = [];
    const recorded = new Proxy(ctx, {
      get: (target, key) => (key === 'stroke' ? () => strokes.push(String((target as unknown as Record<string, unknown>).strokeStyle)) : Reflect.get(target, key)),
    });
    tool.render(recorded, drawing('fibRetracement', anchors, { options: { levels: [{ value: 0.5, visible: true, color: '#ff0000' }] } }), unitViewport, false);
    expect(strokes).toEqual(['#ff0000']);
    void calls;
  });
});

describe('FibExtensionTool', () => {
  const tool = new FibExtensionTool();
  // A 100 → B 120, pullback to C 110: targets above C.
  const anchors = [{ time: 0, price: 100 }, { time: 10, price: 120 }, { time: 15, price: 110 }];

  it('projects the A→B move from C in the direction of the trend', () => {
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, drawing('fibExtension', anchors, { options: { levels: [{ value: 1, visible: true }, { value: 1.618, visible: true }] } }), unitViewport, false);
    expect(texts).toEqual(['100.0% (130.00)', '161.8% (142.36)']);
  });
});

describe('level options on the other Fibonacci tools', () => {
  it('Fib channel draws the chosen levels', () => {
    const { ctx, texts } = recordingCtx();
    const state = drawing('fibChannel', [{ time: 0, price: 80 }, { time: 20, price: 80 }, { time: 10, price: 60 }], {
      options: { levels: [{ value: 0, visible: true }, { value: 0.5, visible: true }, { value: 1, visible: false }] },
    });
    new FibChannelTool().render(ctx, state, unitViewport, false);
    expect(texts).toEqual(['0', '0.5']);
  });

  it('the speed fan labels the chosen levels', () => {
    const { ctx, texts } = recordingCtx();
    const state = drawing('fibSpeedResistanceFan', [{ time: 0, price: 10 }, { time: 10, price: 50 }], {
      options: { levels: [{ value: 0.5, visible: true }] },
    });
    new FibSpeedResistanceFanTool().render(ctx, state, unitViewport, false);
    expect(texts).toEqual(['0.5']);
  });

  it('time zones mark the chosen bar counts', () => {
    const { ctx, texts } = recordingCtx();
    const state = drawing('fibTimeZones', [{ time: 0, price: 50 }, { time: 1, price: 50 }], {
      options: { levels: [{ value: 0, visible: true }, { value: 2, visible: true }, { value: 3, visible: false }] },
    });
    new FibTimeZonesTool().render(ctx, state, unitViewport, false);
    expect(texts).toEqual(['0', '2']);
  });
});
