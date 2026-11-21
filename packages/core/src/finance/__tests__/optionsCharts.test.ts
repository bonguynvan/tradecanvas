import { describe, it, expect } from 'vitest';
import { DARK_THEME, type OptionLeg, type SunburstNode } from '@tradecanvas/commons';
import { computePayoffLayout, optionPayoff, payoffPriceAt, payoffStats, renderPayoff } from '../PayoffRenderer.js';
import { computeCurveLayout, curveValueAt, nearestCurveX, renderCurve } from '../CurveRenderer.js';
import { boxPlotStats, computeBoxPlotLayout, hitBox, renderBoxPlot } from '../BoxPlotRenderer.js';
import { computeRadarLayout, hitRadarAxis, renderRadar } from '../RadarRenderer.js';
import { computeSunburstLayout, hitSunburstArc, renderSunburst } from '../SunburstRenderer.js';
import { computeStackedAreaLayout, hitStackedCategory, renderStackedArea } from '../StackedAreaRenderer.js';
import { niceScale, readoutFormat } from '../chartKit.js';

/** A canvas stand-in that keeps the text drawn with it, and how far it was turned for each. */
function recorder(): { ctx: CanvasRenderingContext2D; texts: string[]; turns: number[] } {
  const texts: string[] = [];
  const turns: number[] = [];
  const state: Record<string | symbol, unknown> = { font: '10px sans-serif' };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      return (...args: unknown[]) => {
        if (prop === 'fillText') texts.push(String(args[0]));
        if (prop === 'rotate') turns.push(Number(args[0]));
      };
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, turns };
}

/** As the stand-in measures: 6 px a character. */
const measure = (text: string) => text.length * 6;
const W = 400;
const H = 300;
const plain = (v: number) => String(Number(v.toFixed(4)));

const longCall: OptionLeg = { type: 'call', side: 'long', strike: 100, premium: 5 };
const longPut: OptionLeg = { type: 'put', side: 'long', strike: 100, premium: 4 };
const callSpread: OptionLeg[] = [longCall, { type: 'call', side: 'short', strike: 110, premium: 2 }];
const condor: OptionLeg[] = [
  { type: 'put', side: 'long', strike: 90, premium: 1 },
  { type: 'put', side: 'short', strike: 95, premium: 2.5 },
  { type: 'call', side: 'short', strike: 105, premium: 2.5 },
  { type: 'call', side: 'long', strike: 110, premium: 1 },
];

describe('a value read between a scale’s ticks', () => {
  it('has two more decimals than the scale’s steps, and none it does not need', () => {
    const small = readoutFormat(niceScale(0.03, 0.05, 3), 'en');
    expect(small(0.0431)).toBe('0.0431');
    expect(small(0.04)).toBe('0.04');
    const large = readoutFormat(niceScale(75, 125, 3), 'en');
    expect(large(101.4)).toBe('101.4');
    expect(large(92)).toBe('92');
    expect(readoutFormat(niceScale(0, 50_000, 3), 'en')(12_345.678)).toBe('12,345.68');
    expect(() => readoutFormat(niceScale(0, 1), 'not a tag')(0.5)).not.toThrow();
  });
});

describe('what an options position is worth at expiry', () => {
  it('is each leg’s worth less its premium, the other way for one sold, times the quantity and the multiplier', () => {
    expect([90, 110, 120].map((p) => optionPayoff([longCall], p))).toEqual([-5, 5, 15]);
    expect([90, 110].map((p) => optionPayoff([{ type: 'put', side: 'short', strike: 100, premium: 4 }], p))).toEqual([-6, 4]);
    expect(optionPayoff([{ type: 'underlying', side: 'long', entry: 100 }], 110)).toBe(10);
    expect(optionPayoff([{ type: 'underlying', side: 'short', entry: 100, quantity: 2 }], 110)).toBe(-20);
    expect(optionPayoff([{ ...longCall, quantity: 3 }], 120, 100)).toBe(4500);
    expect(optionPayoff([], 100)).toBe(0);
  });

  it('takes a quantity or a multiplier that is none as one', () => {
    expect(optionPayoff([{ ...longCall, quantity: Number.NaN }], 120, 0)).toBe(15);
    expect(optionPayoff([{ ...longCall, quantity: -2 }], 120, -5)).toBe(15);
  });
});

describe('the most a position makes and loses, and where it breaks even', () => {
  it('has no limit above for a call bought, and loses its premium at most', () => {
    expect(payoffStats([longCall])).toEqual({ maxProfit: null, maxLoss: -5, breakevens: [105] });
    expect(payoffStats([longCall], 100)).toEqual({ maxProfit: null, maxLoss: -500, breakevens: [105] });
  });

  it('makes the strike less the premium at most for a put bought: a price ends at zero', () => {
    expect(payoffStats([longPut])).toEqual({ maxProfit: 96, maxLoss: -4, breakevens: [96] });
  });

  it('has no limit to the loss of a call sold alone', () => {
    expect(payoffStats([{ ...longCall, side: 'short' }])).toEqual({ maxProfit: 5, maxLoss: null, breakevens: [105] });
  });

  it('is bounded both ways for a spread and a condor', () => {
    expect(payoffStats(callSpread)).toEqual({ maxProfit: 7, maxLoss: -3, breakevens: [103] });
    expect(payoffStats(condor)).toEqual({ maxProfit: 3, maxLoss: -2, breakevens: [92, 108] });
  });

  it('breaks even on both sides of a straddle', () => {
    expect(payoffStats([longCall, longPut])).toEqual({ maxProfit: null, maxLoss: -9, breakevens: [91, 109] });
  });

  it('counts the underlying held beside a call sold', () => {
    expect(payoffStats([{ type: 'underlying', side: 'long', entry: 100 }, { type: 'call', side: 'short', strike: 110, premium: 3 }]))
      .toEqual({ maxProfit: 13, maxLoss: -97, breakevens: [97] });
  });

  it('has nothing to say of no legs', () => {
    expect(payoffStats([])).toEqual({ maxProfit: 0, maxLoss: 0, breakevens: [] });
  });
});

describe('the payoff chart', () => {
  it('draws the line through its ends and each strike between them, around the strikes when no range is given', () => {
    const layout = computePayoffLayout({ legs: condor }, W, H, DARK_THEME, measure);
    expect(layout.xScale.min).toBeLessThan(90);
    expect(layout.xScale.max).toBeGreaterThan(110);
    expect(layout.points.map((p) => p.price)).toEqual([layout.xScale.min, 90, 95, 105, 110, layout.xScale.max]);
    expect(layout.points.map((p) => p.value)).toEqual([-2, -2, 3, 3, -2, -2]);
    expect(layout.zeroY).toBeGreaterThan(layout.plot.y);
    expect(layout.zeroY).toBeLessThan(layout.plot.y + layout.plot.height);
    // A profit is above zero on the canvas, a loss below it.
    expect(layout.points[2].y).toBeLessThan(layout.zeroY);
    expect(layout.points[0].y).toBeGreaterThan(layout.zeroY);
  });

  it('draws the prices asked for, never under zero', () => {
    const layout = computePayoffLayout({ legs: [longCall], range: { min: -50, max: 200 } }, W, H, DARK_THEME, measure);
    expect(layout.xScale.min).toBe(0);
    expect(layout.xScale.max).toBe(200);
  });

  it('reads the price under the pointer, inside the plot only', () => {
    const layout = computePayoffLayout({ legs: [longCall], range: { min: 50, max: 150 } }, W, H, DARK_THEME, measure);
    const { plot } = layout;
    expect(payoffPriceAt(layout, plot.x + plot.width / 2, plot.y + 10)).toBeCloseTo(100, 6);
    expect(payoffPriceAt(layout, plot.x - 5, plot.y + 10)).toBeNull();
    expect(payoffPriceAt(layout, plot.x + 10, plot.y - 5)).toBeNull();
  });

  it('writes the breakevens and the price now over the plot, and the profit at the pointer', () => {
    const options = { legs: [longCall], range: { min: 50, max: 150 }, spot: 98, spotLabel: 'Spot', valueFormat: plain, priceFormat: plain };
    const layout = computePayoffLayout(options, W, H, DARK_THEME, measure);
    const quiet = recorder();
    renderPayoff(quiet.ctx, W, H, options, DARK_THEME, null, layout);
    expect(quiet.texts).toEqual(expect.arrayContaining(['Spot 98', '105']));
    const pointed = recorder();
    const x = layout.plot.x + layout.plot.width * 0.7;
    renderPayoff(pointed.ctx, W, H, options, DARK_THEME, { x, y: layout.plot.y + 20 }, layout);
    expect(pointed.texts).toEqual(expect.arrayContaining(['120', '+15']));
  });

  it('writes a small price in full at its mark and at the pointer when no format is given', () => {
    const options = { legs: [{ type: 'underlying' as const, side: 'long' as const, entry: 0.0412 }], spot: 0.0431, range: { min: 0.03, max: 0.05 }, locale: 'en' };
    const { ctx, texts } = recorder();
    renderPayoff(ctx, W, H, options, DARK_THEME, null);
    expect(texts).toEqual(expect.arrayContaining(['0.0431', '0.0412']));
  });

  it('draws no legs as an empty plot and does not throw', () => {
    const { ctx } = recorder();
    expect(() => renderPayoff(ctx, W, H, { legs: [] }, DARK_THEME, { x: 200, y: 150 })).not.toThrow();
  });
});

describe('a curve chart', () => {
  const smile = [{ x: 110, y: 22 }, { x: 90, y: 30 }, { x: 100, y: 20 }];

  it('reads a curve between its points, and nothing outside them', () => {
    expect(curveValueAt(smile, 100)).toBe(20);
    expect(curveValueAt(smile, 95)).toBe(25);
    expect(curveValueAt(smile, 105)).toBe(21);
    expect(curveValueAt(smile, 80)).toBeNull();
    expect(curveValueAt(smile, 111)).toBeNull();
    expect(curveValueAt([], 100)).toBeNull();
  });

  it('draws each curve by rising x, without the points that are no numbers', () => {
    const layout = computeCurveLayout({ series: [{ name: '1M', points: [...smile, { x: Number.NaN, y: 1 }, { x: 95, y: Infinity }] }] }, W, H, DARK_THEME, measure);
    expect(layout.lines[0].points.map((p) => p.x)).toEqual([90, 100, 110]);
    expect(layout.xs).toEqual([90, 100, 110]);
    const px = layout.lines[0].points.map((p) => p.px);
    expect(px[0]).toBeLessThan(px[1]);
    // The value axis is around the values: a smile from 20 to 30 does not start at zero.
    expect(layout.yScale.min).toBeGreaterThan(0);
    expect(layout.yScale.max).toBeGreaterThanOrEqual(30);
  });

  it('snaps the pointer to the nearest x any curve has', () => {
    const layout = computeCurveLayout({ series: [{ name: 'a', points: smile }, { name: 'b', points: [{ x: 95, y: 26 }] }] }, W, H, DARK_THEME, measure);
    const at = (x: number) => layout.plot.x + ((x - layout.xScale.min) / (layout.xScale.max - layout.xScale.min)) * layout.plot.width;
    expect(nearestCurveX(layout, at(96), layout.plot.y + 5)).toBe(95);
    expect(nearestCurveX(layout, at(108), layout.plot.y + 5)).toBe(110);
    expect(nearestCurveX(layout, at(96), layout.plot.y - 5)).toBeNull();
  });

  it('writes the tenors given along x, a marker’s label, and each curve’s value at the pointer', () => {
    const options = {
      series: [{ name: 'Today', points: [{ x: 30, y: 4 }, { x: 365, y: 5 }] }, { name: 'Before', points: [{ x: 30, y: 3 }, { x: 365, y: 6 }], dashed: true }],
      ticks: [{ x: 30, label: '1M' }, { x: 365, label: '1Y' }],
      markers: [{ x: 180, label: 'Mid' }],
      valueFormat: plain,
    };
    const layout = computeCurveLayout(options, W, H, DARK_THEME, measure);
    const pointed = recorder();
    renderCurve(pointed.ctx, W, H, options, DARK_THEME, { x: layout.lines[0].points[1].px, y: layout.plot.y + 20 }, layout);
    expect(pointed.texts).toEqual(expect.arrayContaining(['1M', '1Y', 'Mid', 'Today', 'Before', 'Today: 5', 'Before: 6']));
  });

  it('leaves out a tenor whose label would run into the one before it', () => {
    const options = {
      series: [{ name: 'Today', points: [{ x: 7, y: 4 }, { x: 30, y: 4.2 }, { x: 365, y: 5 }] }],
      ticks: [{ x: 7, label: '1 week' }, { x: 30, label: '1 month' }, { x: 365, label: '1 year' }],
    };
    const { ctx, texts } = recorder();
    renderCurve(ctx, W, H, options, DARK_THEME, null);
    expect(texts).toEqual(expect.arrayContaining(['1 week', '1 year']));
    expect(texts).not.toContain('1 month');
  });

  it('writes a small x in full at the pointer when no format is given', () => {
    const options = { series: [{ name: 'a', points: [{ x: 0.0412, y: 1 }, { x: 0.0431, y: 2 }, { x: 0.05, y: 3 }] }], locale: 'en' };
    const layout = computeCurveLayout(options, W, H, DARK_THEME, measure);
    const { ctx, texts } = recorder();
    renderCurve(ctx, W, H, options, DARK_THEME, { x: layout.lines[0].points[1].px, y: layout.plot.y + 20 }, layout);
    expect(texts).toContain('0.0431');
  });

  it('draws no series as an empty plot and does not throw', () => {
    const { ctx } = recorder();
    expect(() => renderCurve(ctx, W, H, { series: [] }, DARK_THEME, { x: 200, y: 150 })).not.toThrow();
  });
});

describe('a box plot', () => {
  it('finds the quartiles between the values, and the whiskers at the furthest values that are no outliers', () => {
    expect(boxPlotStats([9, 1, 8, 2, 7, 3, 6, 4, 5])).toEqual({ min: 1, q1: 3, median: 5, q3: 7, max: 9, outliers: [] });
    expect(boxPlotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])).toEqual({ min: 1, q1: 3.25, median: 5.5, q3: 7.75, max: 9, outliers: [100] });
    expect(boxPlotStats([-100, 1, 2, 3, 4, 5, 6, 7, 8, 9])!.outliers).toEqual([-100]);
  });

  it('takes the whiskers to the ends when told no value is an outlier', () => {
    expect(boxPlotStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100], Infinity)).toEqual(expect.objectContaining({ max: 100, outliers: [] }));
  });

  it('has one value as all five numbers, and nothing for no values', () => {
    expect(boxPlotStats([5])).toEqual({ min: 5, q1: 5, median: 5, q3: 5, max: 5, outliers: [] });
    expect(boxPlotStats([])).toBeNull();
    expect(boxPlotStats([Number.NaN, Infinity])).toBeNull();
  });

  it('gives each group a box in its own slot, from its values or from numbers worked out already', () => {
    const layout = computeBoxPlotLayout({
      data: [
        { label: 'Mon', values: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
        { label: 'Tue', values: [] },
        { label: 'Wed', stats: { min: -4, q1: -2, median: -1, q3: 1, max: 3, outliers: [8] } },
      ],
      colorBySign: true,
    }, W, H, DARK_THEME, measure);
    expect(layout.boxes.map((b) => b.group.label)).toEqual(['Mon', 'Wed']);
    const [mon, wed] = layout.boxes;
    expect(mon.x).toBeLessThan(wed.x);
    // Higher values are higher on the canvas.
    expect(mon.yMax).toBeLessThan(mon.yQ3);
    expect(mon.yQ3).toBeLessThan(mon.yMedian);
    expect(mon.yMedian).toBeLessThan(mon.yQ1);
    expect(mon.yQ1).toBeLessThan(mon.yMin);
    expect(mon.color).toBe(DARK_THEME.candleUp);
    expect(wed.color).toBe(DARK_THEME.candleDown);
    expect(wed.outliers.map((o) => o.value)).toEqual([8]);
    expect(layout.yScale.max).toBeGreaterThanOrEqual(9);
    expect(layout.yScale.min).toBeLessThanOrEqual(-4);
    expect(hitBox(layout, mon.x, layout.plot.y + 5)).toBe(mon);
    expect(hitBox(layout, wed.x, layout.plot.y + 5)).toBe(wed);
    expect(hitBox(layout, (mon.x + wed.x) / 2, layout.plot.y + 5)).toBeNull();
  });

  it('writes the groups’ labels and the hovered box’s numbers', () => {
    const options = { data: [{ label: 'Mon', values: [1, 2, 3, 4, 5, 6, 7, 8, 9] }], valueFormat: plain };
    const layout = computeBoxPlotLayout(options, W, H, DARK_THEME, measure);
    const { ctx, texts } = recorder();
    renderBoxPlot(ctx, W, H, options, DARK_THEME, { x: layout.boxes[0].x, y: layout.plot.y + 5 }, layout);
    expect(texts).toEqual(expect.arrayContaining(['Mon', 'Max 9', 'Q3 7', 'Median 5', 'Q1 3', 'Min 1']));
    const other = recorder();
    renderBoxPlot(other.ctx, W, H, { ...options, labels: { median: 'Trung vị' } }, DARK_THEME, { x: layout.boxes[0].x, y: layout.plot.y + 5 }, layout);
    expect(other.texts).toEqual(expect.arrayContaining(['Trung vị 5', 'Max 9']));
  });
});

describe('a radar chart', () => {
  const axes = [{ label: 'A', max: 10 }, { label: 'B', max: 10 }, { label: 'C', max: 10 }, { label: 'D', max: 10 }];

  it('puts the first spoke at twelve o’clock and the rest clockwise, a value as far out as its share of the spoke', () => {
    const layout = computeRadarLayout({ axes, series: [{ name: 's', values: [10, 5, 0, 20] }] }, W, H, DARK_THEME, measure);
    const { cx, cy, radius } = layout;
    const [a, b, c, d] = layout.shapes[0].points;
    expect(a.x).toBeCloseTo(cx, 6);
    expect(a.y).toBeCloseTo(cy - radius, 6);
    expect(b.x).toBeCloseTo(cx + radius / 2, 6);
    expect(b.y).toBeCloseTo(cy, 6);
    expect(c.x).toBeCloseTo(cx, 6);
    expect(c.y).toBeCloseTo(cy, 6);
    // Past the rim's value: at the rim.
    expect(d.x).toBeCloseTo(cx - radius, 6);
  });

  it('takes a spoke’s rim from the highest value on it when none is given, and its centre from min', () => {
    const layout = computeRadarLayout({ axes: [{ label: 'A' }, { label: 'B', min: 50, max: 100 }, { label: 'C' }], series: [{ name: 's', values: [4, 75, 0] }, { name: 't', values: [8, 50, 0] }] }, W, H, DARK_THEME, measure);
    expect(layout.spokes[0].max).toBe(8);
    expect(layout.shapes[0].points[0].share).toBe(0.5);
    expect(layout.shapes[0].points[1].share).toBe(0.5);
    expect(layout.shapes[1].points[1].share).toBe(0);
    // A spoke with nothing on it: every value at the centre.
    expect(layout.shapes[0].points[2].share).toBe(0);
  });

  it('finds the spoke nearest the pointer, inside the chart', () => {
    const layout = computeRadarLayout({ axes, series: [{ name: 's', values: [1, 2, 3, 4] }] }, W, H, DARK_THEME, measure);
    const { cx, cy, radius } = layout;
    expect(hitRadarAxis(layout, cx + 2, cy - radius / 2)).toBe(0);
    expect(hitRadarAxis(layout, cx + radius / 2, cy + 3)).toBe(1);
    expect(hitRadarAxis(layout, cx - radius / 2, cy - 3)).toBe(3);
    expect(hitRadarAxis(layout, cx + radius * 3, cy)).toBeNull();
  });

  it('writes a label over or under the chart in full where one beside it would be cut', () => {
    const named = [{ label: 'A long label on top' }, { label: 'A long label on the right' }, { label: 'C' }, { label: 'D' }];
    const { ctx, texts } = recorder();
    renderRadar(ctx, W, H, { axes: named, series: [{ name: 's', values: [1, 2, 3, 4] }] }, DARK_THEME, null);
    expect(texts).toContain('A long label on top');
    expect(texts).not.toContain('A long label on the right');
    expect(texts.some((t) => t.startsWith('A long label') && t.endsWith('…'))).toBe(true);
  });

  it('draws nothing but its background with fewer than three spokes', () => {
    const layout = computeRadarLayout({ axes: axes.slice(0, 2), series: [{ name: 's', values: [1, 2] }] }, W, H, DARK_THEME, measure);
    expect(layout.shapes).toEqual([]);
    const { ctx, texts } = recorder();
    renderRadar(ctx, W, H, { axes: axes.slice(0, 2), series: [{ name: 's', values: [1, 2] }] }, DARK_THEME, { x: 200, y: 150 });
    expect(texts).toEqual([]);
  });

  it('writes the spokes’ labels and every series’ value on the hovered spoke', () => {
    const options = { axes, series: [{ name: 'Fund', values: [1, 2, 3, 4] }, { name: 'Index', values: [5, 6, 7, 8] }], valueFormat: plain };
    const layout = computeRadarLayout(options, W, H, DARK_THEME, measure);
    const { ctx, texts } = recorder();
    renderRadar(ctx, W, H, options, DARK_THEME, { x: layout.cx + layout.radius / 2, y: layout.cy }, layout);
    expect(texts).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'Fund: 2', 'Index: 6']));
  });
});

describe('a sunburst chart', () => {
  const data: SunburstNode[] = [
    { label: 'Stocks', value: 999, children: [{ label: 'Banks', value: 30 }, { label: 'Steel', value: 10, children: [{ label: 'HPG', value: 10 }] }] },
    { label: 'Bonds', value: 40 },
    { label: 'None', value: 0 },
    { label: 'Debt', value: -5 },
  ];

  it('gives a part its children’s size, a ring a level, and leaves out what has no size', () => {
    const layout = computeSunburstLayout({ data }, W, H, DARK_THEME, measure);
    expect(layout.total).toBe(80);
    expect(layout.arcs.map((a) => [a.path.join('/'), a.depth, a.value])).toEqual([
      ['Stocks', 0, 40],
      ['Stocks/Banks', 1, 30],
      ['Stocks/Steel', 1, 10],
      ['Stocks/Steel/HPG', 2, 10],
      ['Bonds', 0, 40],
    ]);
    const [stocks, banks, steel, hpg, bonds] = layout.arcs;
    expect(stocks.share).toBe(0.5);
    // Twelve o'clock, clockwise; children inside their parent's angle.
    expect(stocks.start).toBeCloseTo(-Math.PI / 2, 9);
    expect(stocks.end).toBeCloseTo(Math.PI / 2, 9);
    expect(banks.start).toBeCloseTo(stocks.start, 9);
    expect(steel.end).toBeCloseTo(stocks.end, 9);
    expect(hpg.start).toBeCloseTo(steel.start, 9);
    expect(bonds.end).toBeCloseTo(Math.PI * 1.5, 9);
    // A child keeps its parent's colour unless it has one.
    expect(banks.color).not.toBe(bonds.color);
  });

  it('draws no more rings than asked', () => {
    const layout = computeSunburstLayout({ data, maxDepth: 1 }, W, H, DARK_THEME, measure);
    expect(layout.arcs.map((a) => a.path.join('/'))).toEqual(['Stocks', 'Bonds']);
  });

  it('finds the part under the pointer by its ring and its angle', () => {
    const layout = computeSunburstLayout({ data }, W, H, DARK_THEME, measure);
    const { cx, cy, inner, ring } = layout;
    // To the right of the centre is three o'clock: the end of Stocks (first ring), Steel (second), HPG (third).
    const at = (level: number, angle: number) => ({ x: cx + Math.cos(angle) * (inner + ring * (level + 0.5)), y: cy + Math.sin(angle) * (inner + ring * (level + 0.5)) });
    const up = -Math.PI / 4;
    expect(hitSunburstArc(layout, at(0, up).x, at(0, up).y)!.path).toEqual(['Stocks']);
    expect(hitSunburstArc(layout, at(1, up).x, at(1, up).y)!.path).toEqual(['Stocks', 'Banks']);
    const late = Math.PI / 2 - 0.1;
    expect(hitSunburstArc(layout, at(2, late).x, at(2, late).y)!.path).toEqual(['Stocks', 'Steel', 'HPG']);
    expect(hitSunburstArc(layout, at(2, up).x, at(2, up).y)).toBeNull();
    expect(hitSunburstArc(layout, cx, cy)).toBeNull();
  });

  it('writes the hovered part’s path, its value and its share of the whole', () => {
    const options = { data, valueFormat: plain, locale: 'en' };
    const layout = computeSunburstLayout(options, W, H, DARK_THEME, measure);
    const { ctx, texts } = recorder();
    const angle = -Math.PI / 4;
    const r = layout.inner + layout.ring * 1.5;
    renderSunburst(ctx, W, H, options, DARK_THEME, { x: layout.cx + Math.cos(angle) * r, y: layout.cy + Math.sin(angle) * r }, layout);
    expect(texts).toContain('Stocks / Banks');
    expect(texts.some((t) => t.startsWith('30') && t.includes('37.5%'))).toBe(true);
  });

  it('writes a name along its ring, turned so that it is never upside down', () => {
    const halves = { data: [{ label: 'Right', value: 1 }, { label: 'Left', value: 1 }] };
    const { ctx, texts, turns } = recorder();
    renderSunburst(ctx, W, H, halves, DARK_THEME, null);
    expect(texts).toEqual(['Right', 'Left']);
    // At three o'clock the ring runs down, at nine o'clock up.
    expect(turns[0]).toBeCloseTo(Math.PI / 2, 9);
    expect(turns[1]).toBeCloseTo(Math.PI * 1.5, 9);
    // One part all the way round is named at the bottom, level.
    const whole = recorder();
    renderSunburst(whole.ctx, W, H, { data: [{ label: 'Whole', value: 1 }] }, DARK_THEME, null);
    expect(whole.turns[0]).toBeCloseTo(0, 9);
  });

  it('cuts a name to what a straight text has of a curved ring, and leaves a small part unnamed', () => {
    const long = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const thin = { data: [{ label: long, children: [{ label: 'x', children: [{ label: 'y', value: 49 }] }] }, { label: 'other', value: 49 }, { label: 'Tiny', value: 2 }] };
    const layout = computeSunburstLayout(thin, W, H, DARK_THEME, measure);
    const { ctx, texts } = recorder();
    renderSunburst(ctx, W, H, thin, DARK_THEME, null, layout);
    const written = texts.find((t) => t.startsWith('ABC'))!;
    expect(written.endsWith('…')).toBe(true);
    // Three thin rings: the first has room for about nine letters before the text would leave it.
    expect(measure(written)).toBeLessThan(layout.ring * 2);
    expect(measure(written)).toBeGreaterThan(layout.ring);
    expect(texts).not.toContain('Tiny');
  });

  it('draws nothing but its background with no data', () => {
    const { ctx, texts } = recorder();
    expect(computeSunburstLayout({ data: [] }, W, H, DARK_THEME, measure).arcs).toEqual([]);
    renderSunburst(ctx, W, H, { data: [] }, DARK_THEME, { x: 200, y: 150 });
    expect(texts).toEqual([]);
  });
});

describe('a stacked area chart', () => {
  const categories = ['Jan', 'Feb', 'Mar'];
  const series = [{ name: 'Stocks', values: [10, 20, 30] }, { name: 'Bonds', values: [10, -5, 10] }, { name: 'Cash', values: [0, 20] }];

  it('stacks each series on the ones before it, a value under zero or missing as none', () => {
    const layout = computeStackedAreaLayout({ categories, series }, W, H, DARK_THEME, measure);
    expect(layout.totals).toEqual([20, 40, 40]);
    expect(layout.bands.map((b) => b.values)).toEqual([[10, 20, 30], [10, 0, 10], [0, 20, 0]]);
    const [stocks, bonds, cash] = layout.bands;
    const floor = layout.plot.y + layout.plot.height;
    expect(stocks.lower).toEqual([floor, floor, floor]);
    expect(bonds.lower).toEqual(stocks.upper);
    expect(cash.lower).toEqual(bonds.upper);
    // More is higher on the canvas.
    expect(stocks.upper[2]).toBeLessThan(stocks.upper[0]);
    expect(layout.yScale.max).toBeGreaterThanOrEqual(40);
    expect(layout.xs[0]).toBeCloseTo(layout.plot.x, 6);
    expect(layout.xs[2]).toBeCloseTo(layout.plot.x + layout.plot.width, 6);
  });

  it('fills the height with shares when normalized, and leaves a point with nothing empty', () => {
    const layout = computeStackedAreaLayout({ categories, series: [{ name: 'a', values: [1, 0, 3] }, { name: 'b', values: [3, 0, 1] }], normalized: true }, W, H, DARK_THEME, measure);
    expect(layout.bands.map((b) => b.values)).toEqual([[0.25, 0, 0.75], [0.75, 0, 0.25]]);
    expect(layout.yScale.max).toBe(1);
    expect(layout.bands[1].upper[0]).toBeCloseTo(layout.plot.y, 6);
    expect(layout.bands[1].upper[1]).toBeCloseTo(layout.plot.y + layout.plot.height, 6);
  });

  it('finds the point nearest the pointer, inside the plot', () => {
    const layout = computeStackedAreaLayout({ categories, series }, W, H, DARK_THEME, measure);
    expect(hitStackedCategory(layout, layout.xs[1] + 3, layout.plot.y + 5)).toBe(1);
    expect(hitStackedCategory(layout, layout.xs[2] - 3, layout.plot.y + 5)).toBe(2);
    expect(hitStackedCategory(layout, layout.plot.x - 5, layout.plot.y + 5)).toBeNull();
  });

  it('writes the point’s label, every series’ value and their total at the pointer', () => {
    const options = { categories, series, valueFormat: plain };
    const layout = computeStackedAreaLayout(options, W, H, DARK_THEME, measure);
    const { ctx, texts } = recorder();
    renderStackedArea(ctx, W, H, options, DARK_THEME, { x: layout.xs[1], y: layout.plot.y + 20 }, layout);
    expect(texts).toEqual(expect.arrayContaining(['Feb', 'Stocks: 20', 'Bonds: 0', 'Cash: 20', '40']));
  });

  it('draws one point, or none, without throwing', () => {
    const { ctx } = recorder();
    expect(() => renderStackedArea(ctx, W, H, { categories: ['Jan'], series: [{ name: 'a', values: [1] }] }, DARK_THEME, { x: 200, y: 150 })).not.toThrow();
    expect(() => renderStackedArea(ctx, W, H, { categories: [], series: [] }, DARK_THEME, { x: 200, y: 150 })).not.toThrow();
  });
});
