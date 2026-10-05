import { describe, expect, it } from 'vitest';
import { DARK_THEME, resolveChartTheme, type ChartStyleOverrides, type ViewportState } from '@tradecanvas/commons';
import { GridRenderer, gridFitsGpu } from '../GridRenderer.js';
import { strokeRecorder } from '../../__tests__/strokeRecorder.js';

const viewport: ViewportState = {
  visibleRange: { from: 0, to: 50 },
  priceRange: { min: 100, max: 200 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 500, height: 400 },
};

function draw(overrides: ChartStyleOverrides) {
  const rec = strokeRecorder();
  new GridRenderer().render(rec.ctx, viewport, resolveChartTheme(DARK_THEME, 'candlestick', overrides));
  return rec.strokes;
}

const isHorizontal = (s: { segments: number[][] }) => s.segments.every(([x0, y0, x1, y1]) => y0 === y1 && x0 !== x1);
const isVertical = (s: { segments: number[][] }) => s.segments.every(([x0, y0, x1, y1]) => x0 === x1 && y0 !== y1);

describe('GridRenderer looks', () => {
  it('draws both ways in one stroke of the theme grid colour, solid and 1 px, as before', () => {
    // One stroke: a see-through grid colour isn't laid twice where the lines cross.
    const strokes = draw({});
    expect(strokes).toHaveLength(1);
    expect(strokes[0]).toMatchObject({ color: DARK_THEME.grid, width: 1, dash: [] });
    expect(strokes[0].segments.some(([, y0, , y1]) => y0 === y1)).toBe(true);
    expect(strokes[0].segments.some(([x0, , x1]) => x0 === x1)).toBe(true);
  });

  it('draws each way in its own look', () => {
    const strokes = draw({
      'grid.horizontal.color': '#111111', 'grid.horizontal.style': 'dashed', 'grid.horizontal.width': 2,
      'grid.vertical.color': '#222222', 'grid.vertical.style': 'dotted',
    });
    const h = strokes.find(isHorizontal)!;
    const v = strokes.find(isVertical)!;
    expect(h).toMatchObject({ color: '#111111', width: 2 });
    expect(h.dash.length).toBeGreaterThan(0);
    expect(v).toMatchObject({ color: '#222222', width: 1, dash: [1, 2] });
  });

  it('leaves out a way that is hidden', () => {
    const strokes = draw({ 'grid.vertical.visible': false });
    expect(strokes.some(isVertical)).toBe(false);
    expect(strokes.some(isHorizontal)).toBe(true);
    expect(draw({ 'grid.horizontal.visible': false, 'grid.vertical.visible': false })).toEqual([]);
  });

  it('leaves the grid to the GPU only while it is solid, 1 px and one colour', () => {
    const fits = (o: ChartStyleOverrides) => gridFitsGpu(resolveChartTheme(DARK_THEME, 'candlestick', o));
    expect(fits({})).toBe(true);
    expect(fits({ 'grid.vertical.visible': false })).toBe(true);
    expect(fits({ 'grid.vertical.visible': false, 'grid.horizontal.color': '#123' })).toBe(true);
    expect(fits({ 'grid.horizontal.color': '#123' })).toBe(false);
    expect(fits({ 'grid.horizontal.style': 'dashed' })).toBe(false);
    expect(fits({ 'grid.vertical.width': 2 })).toBe(false);
    // A hidden way's look doesn't matter.
    expect(fits({ 'grid.vertical.visible': false, 'grid.vertical.style': 'dotted' })).toBe(true);
  });
});
