import { describe, it, expect } from 'vitest';
import type { CalendarChartOptions, MatrixChartOptions } from '@tradecanvas/commons';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { resolveColorScale, scaleColor, readableText } from '../colorScale.js';
import { parseDay, dayToIso, computeCalendarLayout, hitDay, renderCalendar, MAX_CALENDAR_YEARS } from '../CalendarRenderer.js';
import { correlationMatrix, computeMatrixLayout, hitMatrixCell, renderMatrix } from '../MatrixRenderer.js';
import { layoutGroupedTreemap } from '../HeatmapLayout.js';
import { cellLabelInk, renderHeatmap } from '../HeatmapRenderer.js';

/** Text measured as 0.6 em a character, at the font's size. */
const measure = (text: string, size = 11) => text.length * size * 0.6;

/** Canvas stand-in: counts save/restore and keeps the text drawn. */
function fakeCtx(): { ctx: CanvasRenderingContext2D; depth: () => number; texts: string[] } {
  let depth = 0;
  const texts: string[] = [];
  const state: Record<string, unknown> = { font: '11px sans-serif' };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop === 'save') return () => { depth++; };
      if (prop === 'restore') return () => { depth--; };
      if (prop === 'fillText') return (t: string) => { texts.push(t); };
      if (prop === 'measureText') return (t: string) => ({ width: t.length * 6.6 });
      if (prop === 'roundRect') return undefined;
      if (prop in target) return target[prop as string];
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, depth: () => depth, texts };
}

describe('colour scales', () => {
  it('spans the data either side of zero, evenly, when it has negatives', () => {
    const s = resolveColorScale([-2, 1, 3], DARK_THEME);
    expect(s.min).toBe(-3);
    expect(s.max).toBe(3);
    expect(s.negative).toBe(DARK_THEME.candleDown);
    expect(s.positive).toBe(DARK_THEME.candleUp);
  });

  it('runs from zero up for data with no negatives, and keeps the range it is given', () => {
    expect(resolveColorScale([2, 5], DARK_THEME)).toMatchObject({ min: 0, max: 5 });
    expect(resolveColorScale([], DARK_THEME)).toMatchObject({ min: 0, max: 1 });
    const given = resolveColorScale([9], DARK_THEME, { negative: '#ff0000', zero: '#000000', positive: '#00ff00', min: -1, max: 1 });
    expect(given).toMatchObject({ min: -1, max: 1, negative: '#ff0000' });
  });

  it('mixes hex and rgb() colours, and holds the end colours past the range', () => {
    const s = resolveColorScale([], DARK_THEME, { negative: '#ff0000', zero: 'rgb(0, 0, 0)', positive: '#00ff00', min: -10, max: 10 });
    expect(scaleColor(10, s)).toBe('rgb(0,255,0)');
    expect(scaleColor(99, s)).toBe('rgb(0,255,0)');
    expect(scaleColor(-5, s)).toBe('rgb(128,0,0)');
    expect(scaleColor(0, s)).toBe('rgb(0,0,0)');
    expect(scaleColor(Number.NaN, s)).toBe('rgb(0,0,0)');
  });

  it('picks text that reads on the colour', () => {
    expect(readableText('#ffffff')).not.toBe(readableText('#000000'));
    expect(readableText('rgb(250, 250, 250)')).toBe(readableText('#ffffff'));
  });
});

describe('calendar days', () => {
  it('reads YYYY-MM-DD days and gives them back', () => {
    expect(parseDay('1970-01-02')).toBe(1);
    expect(dayToIso(parseDay('2024-02-29')!)).toBe('2024-02-29');
    expect(parseDay('2023-02-29')).toBeNull();
    expect(parseDay('2024-2-1')).toBeNull();
    expect(parseDay('soon')).toBeNull();
  });
});

describe('calendar layout', () => {
  const year: CalendarChartOptions = {
    data: [{ date: '2025-01-02', value: 1.2 }, { date: '2025-01-03', value: -0.8 }, { date: '2025-12-31', value: 0.4 }],
  };

  it('puts a year in week columns and weekday rows', () => {
    const layout = computeCalendarLayout(year, 900, 200, DARK_THEME, measure);
    expect(layout.cells).toHaveLength(364);
    const jan2 = layout.cells.find((c) => c.date === '2025-01-02')!;
    const jan3 = layout.cells.find((c) => c.date === '2025-01-03')!;
    // Thursday and Friday, one row apart in the same week.
    expect(jan3.x).toBe(jan2.x);
    expect(jan3.y).toBeGreaterThan(jan2.y);
    expect(jan2.day?.value).toBe(1.2);
    expect(layout.months.length).toBe(12);
  });

  it('leaves out weekends with weekdays: 5', () => {
    const layout = computeCalendarLayout({ ...year, weekdays: 5 }, 900, 200, DARK_THEME, measure);
    expect(layout.cells).toHaveLength(260);
    expect(layout.cells.some((c) => c.date === '2025-01-04')).toBe(false);
  });

  it('starts weeks on Sunday when asked', () => {
    const mon = computeCalendarLayout({ ...year, from: '2025-01-05', to: '2025-01-06' }, 900, 200, DARK_THEME, measure);
    const sun = computeCalendarLayout({ ...year, from: '2025-01-05', to: '2025-01-06', weekStart: 0 }, 900, 200, DARK_THEME, measure);
    // 5 Jan 2025 is a Sunday: the end of a Monday week, the start of a Sunday one.
    expect(mon.cells[0].x).toBeLessThan(mon.cells[1].x);
    expect(sun.cells[0].x).toBe(sun.cells[1].x);
  });

  it('stacks the years of a longer range', () => {
    const layout = computeCalendarLayout({ data: [{ date: '2024-11-01', value: 1 }, { date: '2025-02-01', value: 2 }] }, 900, 400, DARK_THEME, measure);
    expect(layout.years.map((y) => y.label)).toEqual(['2024', '2025']);
    const nov = layout.cells.find((c) => c.date === '2024-11-01')!;
    const feb = layout.cells.find((c) => c.date === '2025-02-01')!;
    expect(feb.y).toBeGreaterThan(nov.y);
  });

  it('keeps every cell inside the chart, and finds the day under the pointer', () => {
    const layout = computeCalendarLayout(year, 390, 180, DARK_THEME, measure);
    for (const c of layout.cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x + c.size).toBeLessThanOrEqual(390);
      expect(c.y + c.size).toBeLessThanOrEqual(180);
    }
    const cell = layout.cells[40];
    expect(hitDay(layout, cell.x + cell.size / 2, cell.y + cell.size / 2)).toBe(cell);
    expect(hitDay(layout, -5, -5)).toBeNull();
  });

  it('shows at most the last ten years, and nothing for no valid days', () => {
    const long = computeCalendarLayout({ data: [], from: '1900-01-01', to: '2025-01-01' }, 900, 1200, DARK_THEME, measure);
    expect(long.years).toHaveLength(MAX_CALENDAR_YEARS);
    expect(long.years[0].label).toBe('2016');
    expect(long.cells[long.cells.length - 1].date).toBe('2025-01-01');
    expect(computeCalendarLayout({ data: [{ date: 'x', value: 1 }] }, 900, 200, DARK_THEME, measure).cells).toHaveLength(0);
  });
});

describe('correlation', () => {
  it('gives 1 on the diagonal, -1 for opposite moves, NaN for too little data', () => {
    const m = correlationMatrix([[1, 2, 3, 4], [2, 4, 6, 8], [4, 3, 2, 1], [1, 1, 1, 1]]);
    expect(m[0][0]).toBeCloseTo(1);
    expect(m[0][1]).toBeCloseTo(1);
    expect(m[0][2]).toBeCloseTo(-1);
    expect(m[1][2]).toBe(m[2][1]);
    expect(m[0][3]).toBeNaN();
    expect(correlationMatrix([[1, 2], [2, 1]])[0][1]).toBeNaN();
  });

  it('pairs only the days both series have', () => {
    const m = correlationMatrix([[1, 2, Number.NaN, 4, 5], [2, 4, 100, 8, 10]]);
    expect(m[0][1]).toBeCloseTo(1);
  });
});

describe('matrix layout', () => {
  const names = ['VCB', 'BID', 'CTG', 'TCB'];
  const values = correlationMatrix([[1, 2, 3, 5], [1, 3, 2, 5], [2, 1, 3, 4], [5, 3, 2, 1]]);
  const options: MatrixChartOptions = { rows: names, values };

  it('lays out square cells with the rows and columns named', () => {
    const layout = computeMatrixLayout(options, 500, 400, DARK_THEME, measure);
    expect(layout.cells).toHaveLength(16);
    expect(layout.rowLabels.map((l) => l.text)).toEqual(names);
    expect(layout.columnLabels.map((l) => l.text)).toEqual(names);
    const [a, b] = layout.cells;
    expect(b.x - a.x).toBeCloseTo(layout.pitch);
    expect(layout.scale.min).toBe(-1);
  });

  it('keeps half a square matrix with triangle', () => {
    const lower = computeMatrixLayout({ ...options, triangle: 'lower' }, 500, 400, DARK_THEME, measure);
    expect(lower.cells).toHaveLength(10);
    expect(lower.cells.every((c) => c.cell.columnIndex <= c.cell.rowIndex)).toBe(true);
    const upper = computeMatrixLayout({ ...options, triangle: 'upper' }, 500, 400, DARK_THEME, measure);
    expect(upper.cells.every((c) => c.cell.columnIndex >= c.cell.rowIndex)).toBe(true);
  });

  it('turns long column names, leaves empty values out, and finds the cell under the pointer', () => {
    const long = { rows: ['Vietcombank', 'BIDV'], columns: ['Vietcombank', 'BIDV', 'VietinBank'], values: [[1, 0.5, Number.NaN], [0.5, 1]] };
    const layout = computeMatrixLayout(long, 300, 300, LIGHT_THEME, measure);
    expect(layout.columnLabels[0].rotated).toBe(true);
    expect(layout.cells).toHaveLength(4);
    const cell = layout.cells[1];
    expect(hitMatrixCell(layout, cell.x + 2, cell.y + 2)).toBe(cell);
    expect(hitMatrixCell(layout, layout.grid.x + layout.pitch * 2.5, layout.grid.y + 2)).toBeNull();
    for (const c of layout.cells) expect(c.x + c.size).toBeLessThanOrEqual(300);
  });
});

describe('grouped treemaps', () => {
  const cells = [
    { id: 'vcb', weight: 50, group: 'Banks', value: 1 },
    { id: 'bid', weight: 30, group: 'Banks', value: -1 },
    { id: 'vhm', weight: 40, group: 'Real estate', value: 2 },
    { id: 'hpg', weight: 20, group: 'Steel', value: -2 },
  ];
  const bounds = { x: 0, y: 0, width: 600, height: 400 };

  it('gives each group the room of its weights, and its cells inside it', () => {
    const { groups, cells: placed } = layoutGroupedTreemap(cells, bounds, 1, 18);
    expect(groups.map((g) => g.name)).toEqual(['Banks', 'Real estate', 'Steel']);
    const banks = groups[0];
    expect(banks.rect.width * banks.rect.height).toBeCloseTo((80 / 140) * 600 * 400, -2);
    expect(banks.value).toBeCloseTo((50 - 30) / 80);
    expect(banks.count).toBe(2);
    const vcb = placed.find((p) => p.id === 'vcb')!.rect;
    expect(vcb.x).toBeGreaterThanOrEqual(banks.rect.x);
    expect(vcb.y).toBeGreaterThanOrEqual(banks.rect.y + 18);
    expect(vcb.x + vcb.width).toBeLessThanOrEqual(banks.rect.x + banks.rect.width + 0.001);
  });

  it('puts cells without a group in one of their own, and skips the header where it can’t fit', () => {
    const { groups } = layoutGroupedTreemap([{ id: 'a', weight: 1, value: 0 }, { id: 'b', weight: 1, group: 'G', value: 0 }], { x: 0, y: 0, width: 200, height: 30 }, 1, 18);
    expect(groups.map((g) => g.name).sort()).toEqual(['', 'G']);
    expect(groups.every((g) => !g.header)).toBe(true);
  });

  it('draws group names over their cells', () => {
    const { ctx, depth, texts } = fakeCtx();
    const data = cells.map((c) => ({ id: c.id, label: c.id.toUpperCase(), value: c.value, weight: c.weight, group: c.group }));
    const layout = layoutGroupedTreemap(cells, bounds, 1, 18);
    renderHeatmap(ctx, 600, 400, data, layout.cells, { data, grouped: true }, DARK_THEME, { x: 5, y: 5 }, layout.groups);
    expect(depth()).toBe(0);
    expect(texts).toEqual(expect.arrayContaining(['Banks', 'VCB']));
  });
});

describe('a heatmap cell’s label', () => {
  // The light theme's PerformanceDashboard fades its months to the panel's near-clear surface: a month
  // near zero is near the paper, where its white label could not be read.
  it('is white on a dark or strong cell, as before, and dark ink on a pale one as drawn over the background', () => {
    expect(cellLabelInk('#424242', LIGHT_THEME.background)).toBe('#FFFFFF');
    expect(cellLabelInk('#1fa874', DARK_THEME.background)).toBe('#FFFFFF');
    expect(cellLabelInk('#e8505b', LIGHT_THEME.background)).toBe('#FFFFFF');
    expect(cellLabelInk('rgba(232,80,91,0.2)', DARK_THEME.background)).toBe('#FFFFFF');
    expect(cellLabelInk('rgba(232,80,91,0.2)', LIGHT_THEME.background)).not.toBe('#FFFFFF');
    expect(cellLabelInk('rgba(0,0,0,0.02)', '#fbfaf6')).not.toBe('#FFFFFF');
    expect(cellLabelInk('#f4e1e0', '#000000')).not.toBe('#FFFFFF');
  });

  it('draws the labels of pale cells in the dark ink, and no shadow under them', () => {
    const fills: string[] = [];
    const shadows: string[] = [];
    const { ctx } = fakeCtx();
    const spy = new Proxy(ctx, {
      get: (target, prop) => (prop === 'fillText'
        ? () => { fills.push(String(Reflect.get(target, 'fillStyle'))); shadows.push(String(Reflect.get(target, 'shadowColor'))); }
        : Reflect.get(target, prop)),
      set: (target, prop, value) => Reflect.set(target, prop, value),
    });
    const data = [{ id: 'flat', label: 'Nov', value: 0.2 }, { id: 'up', label: 'Aug', value: 7.9 }];
    const rects = [
      { id: 'flat', rect: { x: 0, y: 0, width: 80, height: 40 } },
      { id: 'up', rect: { x: 80, y: 0, width: 80, height: 40 } },
    ];
    renderHeatmap(spy, 160, 40, data, rects, { data, colorScale: { negative: '#b8423f', zero: 'rgba(0,0,0,0.02)', positive: '#1f7a5c' } }, LIGHT_THEME, null);
    expect(fills[0]).not.toBe('#FFFFFF');
    expect(shadows[0]).toBe('transparent');
    expect(fills.at(-1)).toBe('#FFFFFF');
  });
});

describe('drawing calendars and matrices', () => {
  it('draws a calendar with its months, a tooltip and a colour bar', () => {
    const { ctx, depth, texts } = fakeCtx();
    const options: CalendarChartOptions = { data: [{ date: '2025-03-03', value: 2 }], locale: 'en-US', from: '2025-03-01', to: '2025-04-30' };
    const layout = renderCalendar(ctx, 600, 200, options, DARK_THEME, null);
    const cell = layout.cells.find((c) => c.date === '2025-03-03')!;
    renderCalendar(ctx, 600, 200, options, DARK_THEME, { x: cell.x + 1, y: cell.y + 1 });
    expect(depth()).toBe(0);
    expect(texts).toEqual(expect.arrayContaining(['Mar', 'Apr', '2']));
    expect(texts.some((t) => t.includes('March 3'))).toBe(true);
  });

  it('draws a matrix with values in the cells and the hovered cell’s names', () => {
    const { ctx, depth, texts } = fakeCtx();
    const options: MatrixChartOptions = { rows: ['A', 'B'], values: [[1, -0.25], [-0.25, 1]] };
    const layout = renderMatrix(ctx, 400, 300, options, DARK_THEME, null);
    const cell = layout.cells[1];
    renderMatrix(ctx, 400, 300, options, DARK_THEME, { x: cell.x + 2, y: cell.y + 2 });
    expect(depth()).toBe(0);
    expect(texts).toEqual(expect.arrayContaining(['1.00', '-0.25', 'A × B']));
  });
});

describe('round B edge cases', () => {
  it('drops the oldest years rather than draw past a short chart', () => {
    for (const [w, h] of [[900, 300], [390, 180], [300, 120]]) {
      const layout = computeCalendarLayout({ data: [{ date: '2025-06-02', value: 1 }], from: '2015-01-01', to: '2025-12-31' }, w, h, DARK_THEME, measure);
      expect(layout.cells.length).toBeGreaterThan(0);
      expect(layout.years.length === 0 || layout.years[layout.years.length - 1].label === '2025').toBe(true);
      for (const c of layout.cells) expect(c.y + c.size).toBeLessThanOrEqual(h);
      if (layout.bar) expect(layout.bar.y + 22).toBeLessThanOrEqual(h);
    }
  });

  it('treats a day without a finite value as no data, and colours by the days shown', () => {
    const layout = computeCalendarLayout({ data: [{ date: '2025-01-06', value: Number.NaN }, { date: '2025-01-07', value: 1 }, { date: '2025-01-11', value: 50 }], weekdays: 5 }, 600, 200, DARK_THEME, measure);
    expect(layout.cells.find((c) => c.date === '2025-01-06')?.day).toBeUndefined();
    // The Saturday's 50 isn't on show.
    expect(layout.scale.max).toBe(1);
  });

  it('starts a five-day calendar from a weekend day', () => {
    const layout = computeCalendarLayout({ data: [], from: '2025-01-04', to: '2025-01-13', weekdays: 5 }, 600, 200, DARK_THEME, measure);
    expect(layout.cells.map((c) => c.date)).toEqual(['2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10', '2025-01-13']);
    expect(layout.cells[5].x).toBeGreaterThan(layout.cells[0].x);
  });

  it('keeps a large matrix and its colour bar inside a small chart', () => {
    const n = 200;
    const values = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => Math.cos(r - c)));
    const names = Array.from({ length: n }, (_, i) => `S${i}`);
    for (const [w, h] of [[150, 400], [300, 300], [800, 200]]) {
      const layout = computeMatrixLayout({ rows: names, values }, w, h, DARK_THEME, measure);
      expect(layout.grid.x + layout.grid.width).toBeLessThanOrEqual(w);
      expect(layout.grid.y + layout.grid.height).toBeLessThanOrEqual(h);
      if (layout.bar) expect(layout.bar.x + layout.bar.width).toBeLessThanOrEqual(w);
    }
  });

  it('names a hovered row by its index, so cut and repeated names light up right', () => {
    const { ctx, texts } = fakeCtx();
    const options: MatrixChartOptions = { rows: ['Mon', 'Mon'], columns: ['9h', '10h'], values: [[1, 2], [3, 4]] };
    const layout = computeMatrixLayout(options, 300, 300, DARK_THEME, measure);
    expect(layout.rowLabels.map((l) => l.index)).toEqual([0, 1]);
    const cell = layout.at[1][0]!;
    renderMatrix(ctx, 300, 300, options, DARK_THEME, { x: cell.x + 2, y: cell.y + 2 }, layout);
    expect(texts).toContain('Mon × 9h');
  });

  it('spaces turned column names further apart than upright ones', () => {
    const names = Array.from({ length: 30 }, (_, i) => `Company ${i}`);
    const values = names.map(() => names.map(() => 0.5));
    const layout = computeMatrixLayout({ rows: names, values }, 500, 520, DARK_THEME, measure);
    expect(layout.columnLabels[0].rotated).toBe(true);
    const step = layout.columnLabels[1].index - layout.columnLabels[0].index;
    expect(step * layout.pitch * Math.SQRT1_2).toBeGreaterThanOrEqual(11);
  });

  it('blends only colours it can read', () => {
    const s = resolveColorScale([], DARK_THEME, { negative: 'red', zero: '#000000', positive: 'hsl(120 50% 50%)', min: -1, max: 1 });
    expect(scaleColor(-0.2, s)).toBe('#000000');
    expect(scaleColor(-0.9, s)).toBe('red');
    expect(readableText('transparent')).toBe('#ffffff');
    expect(readableText('#26a69a')).toBe(readableText('#ffffff'));
  });

  it('leaves out cells with no weight in a grouped map, and draws a group tooltip', () => {
    const { groups, cells } = layoutGroupedTreemap([{ id: 'a', weight: 0, group: 'G', value: 1 }, { id: 'b', weight: 2, group: 'G', value: 1 }], { x: 0, y: 0, width: 300, height: 200 }, 1);
    expect(cells.map((c) => c.id)).toEqual(['b']);
    expect(groups[0].header).toBe(18);
    const { ctx, texts } = fakeCtx();
    const data = [{ id: 'b', label: 'B', value: 1, weight: 2, group: 'G' }];
    renderHeatmap(ctx, 300, 200, data, cells, { data, grouped: true }, DARK_THEME, { x: 100, y: 5 }, groups);
    expect(texts.filter((t) => t === 'G').length).toBe(2);
  });
});
