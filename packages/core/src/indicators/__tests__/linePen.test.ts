import { describe, it, expect } from 'vitest';
import { LinePen, fillDenseBand, isDenseLine } from '../linePen.js';

/** A context that records calls; Path2D-free (the pen draws on the context). */
function recorder() {
  const calls: { name: string; args: number[] }[] = [];
  const props: Record<string, unknown> = {};
  const ctx = new Proxy({}, {
    get: (_t, key: string) => (key in props ? props[key] : (...args: number[]) => { calls.push({ name: key, args }); }),
    set: (_t, key: string, v) => { props[key] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, props };
}

describe('LinePen', () => {
  it('strokes a polyline when the points are spread out', () => {
    const { ctx, calls, props } = recorder();
    const pen = new LinePen(ctx, '#f00', 2, false);
    pen.add(0, 10);
    pen.add(10, 20);
    pen.add(20, 15);
    pen.finish();
    expect(calls.map((c) => c.name)).toEqual(['beginPath', 'moveTo', 'lineTo', 'lineTo', 'stroke']);
    expect(props.strokeStyle).toBe('#f00');
    expect(props.lineWidth).toBe(2);
  });

  it('fills one span per pixel column when dense, joined to the column before', () => {
    const { ctx, calls, props } = recorder();
    const pen = new LinePen(ctx, '#0f0', 2, true);
    // Column 0: y 10..20; column 1 starts at the last y of column 0 (20) and runs to 30.
    for (const [x, y] of [[0.1, 10], [0.4, 20], [0.8, 12], [1.2, 30], [1.6, 25]]) pen.add(x, y);
    pen.finish();
    const rects = calls.filter((c) => c.name === 'rect').map((c) => c.args);
    // Half the line width (1) above and below each span, and the line's width across.
    expect(rects).toEqual([[-0.5, 9, 2, 12], [0.5, 11, 2, 20]]);
    expect(calls.at(-1)?.name).toBe('fill');
    expect(props.fillStyle).toBe('#0f0');
  });

  it('does not join across a gap', () => {
    const { ctx, calls } = recorder();
    const pen = new LinePen(ctx, '#0f0', 2, true);
    pen.add(0.2, 10);
    pen.gap();
    pen.add(1.2, 50);
    pen.finish();
    const rects = calls.filter((c) => c.name === 'rect').map((c) => c.args);
    expect(rects).toEqual([[-0.5, 9, 2, 2], [0.5, 49, 2, 2]]);
  });

  it('joins a segment to the last point only when it starts there', () => {
    const { ctx, calls } = recorder();
    const pen = new LinePen(ctx, '#0f0', 2, false);
    pen.segment(0, 0, 10, 10);
    pen.segment(10, 10, 20, 0);
    pen.segment(30, 5, 40, 5);
    pen.finish();
    expect(calls.map((c) => c.name)).toEqual(['beginPath', 'moveTo', 'lineTo', 'lineTo', 'moveTo', 'lineTo', 'stroke']);
  });
});

describe('isDenseLine', () => {
  it('is dense when points come more than about one per pixel', () => {
    expect(isDenseLine(100, 0, 99)).toBe(false);
    expect(isDenseLine(400, 0, 99)).toBe(true);
    expect(isDenseLine(1, 0, 0)).toBe(false);
  });
});

describe('fillDenseBand', () => {
  it('fills each column from the top line to the bottom line', () => {
    const { ctx, calls } = recorder();
    fillDenseBand(ctx, [0.1, 0.6, 1.3], [10, 8, 12], [30, 32, 28], '#00f');
    const rects = calls.filter((c) => c.name === 'rect').map((c) => c.args);
    // Column 1 also reaches back to column 0's last edges, so the band has no seam.
    expect(rects).toEqual([[0, 8, 1, 24], [1, 8, 1, 24]]);
  });
});

describe('isDenseSlots', () => {
  it('is dense only when each bar takes less than a pixel, so no column is left empty', async () => {
    const { isDenseSlots } = await import('../linePen.js');
    // Zoomed out, a 1.6 px slot splits into a 0.8 px bar and 0.8 px gap: not dense.
    expect(isDenseSlots({ barWidth: 0.8, barSpacing: 0.8 } as never)).toBe(false);
    expect(isDenseSlots({ barWidth: 0.4, barSpacing: 0.4 } as never)).toBe(true);
    expect(isDenseSlots({ barWidth: 6, barSpacing: 2 } as never)).toBe(false);
  });
});

describe('LinePen edges', () => {
  it('takes a missing or non-finite width as one pixel', () => {
    const { ctx, calls } = recorder();
    const pen = new LinePen(ctx, '#0f0', Number.NaN, true);
    pen.add(0.2, 10);
    pen.finish();
    expect(calls.filter((c) => c.name === 'rect').map((c) => c.args)).toEqual([[0, 9.5, 1, 1]]);
  });

  it('skips non-finite points instead of losing the column', () => {
    const { ctx, calls } = recorder();
    const pen = new LinePen(ctx, '#0f0', 2, true);
    pen.add(0.2, Number.NaN);
    pen.add(0.5, 10);
    pen.add(0.8, Number.POSITIVE_INFINITY);
    pen.finish();
    expect(calls.filter((c) => c.name === 'rect').map((c) => c.args)).toEqual([[-0.5, 9, 2, 2]]);
  });
});

describe('renderPlots zoomed out', () => {
  const vp = (barWidth: number, barSpacing: number) => ({
    visibleRange: { from: 0, to: 39 }, priceRange: { min: -10, max: 10 },
    barWidth, barSpacing, offset: 0, chartRect: { x: 0, y: 0, width: 40, height: 100 },
  });

  it('draws a dense histogram as one column per pixel, keeping its largest bar and its sign', async () => {
    const { renderPlots } = await import('../plots.js');
    const { ctx, calls } = recorder();
    // Four bars a pixel: 1, -5, 2, 3 in column 0 → the -5 bar, below zero.
    const series = [1, -5, 2, 3, 4, 4, 4, 4].map((v) => ({ v }));
    renderPlots(ctx, { values: new Map(), series } as never, { ...vp(0.15, 0.1), visibleRange: { from: 0, to: 7 } } as never,
      { colors: ['#0f0'], lineWidths: [1] } as never, [{ key: 'v', title: 'v', kind: 'histogram', color: 0 }] as never);
    const rects = calls.filter((c) => c.name === 'rect').map((c) => c.args);
    expect(rects).toHaveLength(2);
    const zeroY = 50;
    expect(rects[0][1]).toBe(zeroY); // the bar hangs below zero
    expect(rects[0][2]).toBe(1);
  });

  it('strokes the line as before while a bar still spans more than a pixel', async () => {
    const { renderPlots } = await import('../plots.js');
    const { ctx, calls } = recorder();
    const series = Array.from({ length: 40 }, (_, i) => ({ v: Math.sin(i) }));
    renderPlots(ctx, { values: new Map(), series } as never, vp(0.8, 0.8) as never,
      { colors: ['#0f0'], lineWidths: [1.5] } as never, [{ key: 'v', title: 'v', kind: 'line', color: 0 }] as never);
    expect(calls.some((c) => c.name === 'stroke')).toBe(true);
    expect(calls.some((c) => c.name === 'rect')).toBe(false);
  });
});
