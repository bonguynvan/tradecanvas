import { describe, it, expect, afterEach } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { MeasureTool } from '../tools/Measure.js';
import { setDrawingKeepOut } from '../tools/labels.js';
import { drawing, recordingCtx, textCtx, unitViewport } from './fixtures.js';

/** A plot 300 px wide from x = 20 (a left scale beside it), 200 px tall from y = 10. */
const plot: ViewportState = { ...unitViewport, chartRect: { x: 20, y: 10, width: 300, height: 200 } };
const RIGHT = 20 + 300;
const BOTTOM = 10 + 200;

/** The label's box: the one fillRect the tool draws. */
function labelBox(state: ReturnType<typeof drawing>, viewport: ViewportState) {
  const { ctx, calls } = recordingCtx();
  new MeasureTool().render(ctx, state, viewport, false);
  const [x, y, w, h] = calls.find((c) => c.name === 'fillRect')!.args as number[];
  return { left: x, top: y, right: x + w, bottom: y + h };
}

describe('MeasureTool label', () => {
  it('stays inside the plot when the measure starts at its left edge', () => {
    // Bars 0 to 2 lie at x 25 to 45: the label centred on them would start left of the plot.
    const at = drawing('measure', [{ time: 0, price: 10 }, { time: 2, price: 60 }]);
    const box = labelBox(at, plot);
    expect(box.left).toBeGreaterThanOrEqual(plot.chartRect.x);
    const { ctx, drawn } = textCtx();
    new MeasureTool().render(ctx, at, plot, false);
    for (const t of drawn) expect(t.left, t.text).toBeGreaterThanOrEqual(plot.chartRect.x);
  });

  it('stays inside the plot by its right edge and its top', () => {
    const box = labelBox(drawing('measure', [{ time: 29, price: 99 }, { time: 31, price: 99.5 }]), plot);
    expect(box.right).toBeLessThanOrEqual(RIGHT);
    expect(box.top).toBeGreaterThanOrEqual(plot.chartRect.y);
    expect(box.bottom).toBeLessThanOrEqual(BOTTOM);
  });

  it('sits centred over the middle of the measure where there is room', () => {
    const box = labelBox(drawing('measure', [{ time: 10, price: 20 }, { time: 20, price: 40 }]), plot);
    // Bars 10 and 20 at x 125 and 225 (the plot's 20 in): the middle at 175.
    expect((box.left + box.right) / 2).toBeCloseTo(175, 5);
  });

  afterEach(() => setDrawingKeepOut(null));

  it('goes under the legend where it would cover its rows', () => {
    // The OHLC rows across the plot's top, to y = 50.
    setDrawingKeepOut([{ x: 20, y: 10, width: 300, height: 40 }]);
    const box = labelBox(drawing('measure', [{ time: 0, price: 99 }, { time: 2, price: 99.5 }]), plot);
    expect(box.top).toBeGreaterThanOrEqual(50);
    expect(box.bottom).toBeLessThanOrEqual(BOTTOM);
  });
});
