import { describe, it, expect } from 'vitest';
import type { DrawingOptions, ViewportState } from '@tradecanvas/commons';
import { TrendLineTool } from '../tools/TrendLine.js';
import { RayTool } from '../tools/Ray.js';
import { ExtendedLineTool } from '../tools/ExtendedLine.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

const HOUR = 3_600_000;
/** unitViewport plus an hourly series, so anchors are timestamps. */
const timedViewport: ViewportState = {
  ...unitViewport,
  data: Array.from({ length: 100 }, (_, i) => ({ time: i * HOUR })),
};

const tool = new TrendLineTool();
/** From bar 2 at 40 to bar 8 at 70: on screen from (25, 60) to (85, 30), rising. */
const line = (options: DrawingOptions = {}) => drawing('trendLine', [{ time: 2 * HOUR, price: 40 }, { time: 8 * HOUR, price: 70 }], { options });

const draw = (options: DrawingOptions = {}, selected = false) => {
  const rec = recordingCtx();
  tool.render(rec.ctx, line(options), timedViewport, selected);
  return rec;
};
const count = (calls: { name: string }[], name: string) => calls.filter((c) => c.name === name).length;
const STATS = { showPriceRange: true, showBarsRange: true, showDateRange: true, showAngle: true };

describe('a trend line’s ends, middle point and stats', () => {
  it('are offered by the trend line, and all but the ends by the ray and the extended line', () => {
    expect(Object.keys(tool.descriptor.options)).toEqual([
      'extendLeft', 'extendRight', 'leftEnd', 'rightEnd', 'showMiddlePoint',
      'showPriceRange', 'showBarsRange', 'showDateRange', 'showAngle', 'alwaysShowStats', 'statsPosition',
    ]);
    for (const other of [new RayTool(), new ExtendedLineTool()]) {
      expect(Object.keys(other.descriptor.options ?? {})).toEqual([
        'showMiddlePoint', 'showPriceRange', 'showBarsRange', 'showDateRange', 'showAngle', 'alwaysShowStats', 'statsPosition',
      ]);
    }
  });

  it('draws a plain line as before', () => {
    const { calls, texts } = draw();
    expect(count(calls, 'fill')).toBe(0);
    expect(count(calls, 'arc')).toBe(0);
    expect(texts).toEqual([]);
  });

  it('puts an arrowhead on each end asked for', () => {
    expect(count(draw({ rightEnd: 'arrow' }).calls, 'fill')).toBe(1);
    expect(count(draw({ leftEnd: 'arrow', rightEnd: 'arrow' }).calls, 'fill')).toBe(2);
  });

  it('marks the middle point', () => {
    const arcs = draw({ showMiddlePoint: true }).calls.filter((c) => c.name === 'arc');
    expect(arcs).toHaveLength(1);
    expect(arcs[0].args.slice(0, 2)).toEqual([55, 45]);
  });

  it('shows the stats asked for while selected', () => {
    expect(draw(STATS).texts).toEqual([]);
    expect(draw(STATS, true).texts).toEqual(['+30.00 (+75.00%)', '6 bars', '6h', '26.6°']);
    expect(draw({ showBarsRange: true }, true).texts).toEqual(['6 bars']);
  });

  it('shows them all the time when asked', () => {
    expect(draw({ ...STATS, alwaysShowStats: true }).texts).toHaveLength(4);
  });

  it('puts the stats by the end, the middle or the start', () => {
    const boxLeft = (statsPosition: string) =>
      draw({ showBarsRange: true, alwaysShowStats: true, statsPosition }).calls.find((c) => c.name === 'fillRect')!.args[0] as number;
    expect(boxLeft('right')).toBeGreaterThan(85);
    expect(boxLeft('left') + 6 * '6 bars'.length + 12).toBeLessThan(25);
    expect(boxLeft('center')).toBeLessThan(55);
    expect(boxLeft('center')).toBeGreaterThan(25);
  });
});
