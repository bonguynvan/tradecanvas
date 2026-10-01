import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { CrossLineTool } from '../tools/CrossLine.js';
import { TrendAngleTool, screenAngleDeg } from '../tools/TrendAngle.js';
import { InfoLineTool, infoLineLines } from '../tools/InfoLine.js';
import { formatDrawingPrice, formatDuration, formatPriceChange } from '../tools/labels.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

const HOUR = 3_600_000;
/** unitViewport plus a 100-bar hourly series, so anchors are timestamps. */
const timedViewport: ViewportState = {
  ...unitViewport,
  data: Array.from({ length: 100 }, (_, i) => ({ time: i * HOUR })),
};

describe('drawing label formatting', () => {
  it('picks price precision from magnitude', () => {
    expect(formatDrawingPrice(65_000.123)).toBe('65000.12');
    expect(formatDrawingPrice(1.08345)).toBe('1.0835');
    expect(formatDrawingPrice(0.5213)).toBe('0.5213');
    expect(formatDrawingPrice(0.00001234)).toBe('0.00001234');
  });

  it('formats a change at the precision of the price it moved from', () => {
    expect(formatPriceChange(100, 110)).toBe('+10.00 (+10.00%)');
    expect(formatPriceChange(1.1, 1.0)).toBe('-0.1000 (-9.09%)');
  });

  it('formats durations compactly', () => {
    expect(formatDuration(45 * 60_000)).toBe('45m');
    expect(formatDuration(5 * HOUR + 30 * 60_000)).toBe('5h 30m');
    expect(formatDuration(3 * 24 * HOUR + 4 * HOUR)).toBe('3d 4h');
    expect(formatDuration(16 * 24 * HOUR)).toBe('2w 2d');
  });
});

describe('CrossLineTool', () => {
  const tool = new CrossLineTool();
  const state = drawing('crossLine', [{ time: 10, price: 50 }]); // pixel (105, 50)

  it('is placed with a single click', () => {
    expect(tool.descriptor.requiredAnchors).toBe(1);
  });

  it('hits anywhere along either line, misses elsewhere', () => {
    expect(tool.hitTest({ x: 900, y: 51 }, state, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 104, y: 5 }, state, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 300, y: 10 }, state, unitViewport, 3)).toBe(false);
  });

  it('draws the full-width and full-height lines', () => {
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    const moves = calls.filter((c) => c.name === 'moveTo').map((c) => c.args);
    expect(moves).toContainEqual([0, 50]);
    expect(moves).toContainEqual([105, 0]);
  });
});

describe('TrendAngleTool', () => {
  const tool = new TrendAngleTool();

  it('measures the on-screen angle, up = positive', () => {
    expect(screenAngleDeg({ x: 0, y: 0 }, { x: 10, y: -10 })).toBeCloseTo(45);
    expect(screenAngleDeg({ x: 0, y: 0 }, { x: 10, y: 10 })).toBeCloseTo(-45);
    expect(screenAngleDeg({ x: 0, y: 0 }, { x: -10, y: -10 })).toBeCloseTo(135);
  });

  it('labels the angle', () => {
    // (5, 50) → (15, 40): 10 px right, 10 px up.
    const state = drawing('trendAngle', [{ time: 0, price: 50 }, { time: 1, price: 60 }]);
    const { ctx, texts } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    expect(texts).toContain('45.0°');
  });

  it('sweeps the short way round for an up-and-left line', () => {
    const state = drawing('trendAngle', [{ time: 10, price: 50 }, { time: 5, price: 80 }]);
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    const arc = calls.find((c) => c.name === 'arc')!;
    const [, , , start, end] = arc.args as number[];
    expect(end - start).toBeGreaterThan(0);
    expect(end - start).toBeLessThanOrEqual(Math.PI);
  });

  it('hits along the segment only', () => {
    const state = drawing('trendAngle', [{ time: 0, price: 50 }, { time: 10, price: 50 }]);
    expect(tool.hitTest({ x: 50, y: 51 }, state, unitViewport, 3)).toBe(true);
    expect(tool.hitTest({ x: 300, y: 50 }, state, unitViewport, 3)).toBe(false);
  });
});

describe('InfoLineTool', () => {
  const tool = new InfoLineTool();

  it('reports price change, bars and angle with bar-index anchors', () => {
    const state = drawing('infoLine', [{ time: 0, price: 50 }, { time: 10, price: 55 }]);
    const lines = infoLineLines(state, unitViewport, 12.3);
    expect(lines).toEqual(['+5.00 (+10.00%)', '10 bars', '12.3°']);
  });

  it('adds the time spanned when anchors are timestamps', () => {
    const state = drawing('infoLine', [{ time: 0, price: 50 }, { time: 10 * HOUR, price: 45 }]);
    const lines = infoLineLines(state, timedViewport, 0);
    expect(lines[0]).toBe('-5.00 (-10.00%)');
    expect(lines[1]).toBe('10 bars, 10h');
  });

  it('renders the stats box', () => {
    const state = drawing('infoLine', [{ time: 0, price: 50 }, { time: 10, price: 55 }]);
    const { ctx, texts, calls } = recordingCtx();
    tool.render(ctx, state, unitViewport, false);
    expect(texts).toContain('+5.00 (+10.00%)');
    expect(calls.some((c) => c.name === 'fillRect')).toBe(true);
  });
});
