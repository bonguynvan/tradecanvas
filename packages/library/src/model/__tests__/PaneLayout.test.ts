import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { LayoutManager } from '../../layout/LayoutManager.js';
import { PaneLayout, PANE_HEADER_HEIGHT, type PaneSources } from '../PaneLayout.js';

type Line = Record<string, number | undefined>;

/** Indicators with fixed values: `values[id]` is its line, one point a bar. */
function sources(values: Record<string, (number | undefined)[]>, extra: Partial<PaneSources> = {}): PaneSources {
  const range = (id: string, from: number, to: number, log = false) => {
    const seen = (values[id] ?? []).slice(from, to + 1).filter((v): v is number => v !== undefined);
    // On a log scale, a range only while every value is above 0.
    if (log && seen.some((v) => v <= 0)) return null;
    return seen.length ? { min: Math.min(...seen), max: Math.max(...seen) } : null;
  };
  return {
    getPaneValueRange: range,
    getPaneMembers: () => [],
    getOutput: (id) => (values[id] ? { series: values[id].map((v): Line => ({ value: v })) } : null),
    getIndicatorDescriptor: (id) => (values[id] ? { plots: [{ key: 'value' }] } : null),
    getActiveIndicators: () => Object.keys(values).map((instanceId) => ({ instanceId })),
    ...extra,
  } as PaneSources;
}

const main = (from: number, to: number) =>
  ({ visibleRange: { from, to }, chartRect: { x: 0, y: 0, width: 700, height: 300 }, priceRange: { min: 1, max: 2 }, logScale: false, invertScale: false, scaleMode: 'regular', formatPrice: () => '', pricePrecision: 2 }) as unknown as ViewportState;

function setup(values: Record<string, (number | undefined)[]>, extra?: Partial<PaneSources>) {
  const layout = new LayoutManager();
  layout.resize(800, 600);
  for (const id of Object.keys(values)) layout.addPanel(id, 'bottom', 100);
  const bounds: { top: number; bottom: number }[] = [];
  const panes = new PaneLayout(layout, sources(values, extra), (b) => bounds.push(b));
  return { layout, panes, bounds };
}

describe('PaneLayout: each pane on its own scale', () => {
  it('scales a pane to its values on view, below its header', () => {
    const { panes } = setup({ rsi: [10, 90, 40, 60] });
    const [rsi] = panes.panels(() => main(2, 3));
    expect(rsi.viewport.priceRange).toEqual({ min: 40, max: 60 });
    expect(rsi.viewport.chartRect.y).toBe(rsi.rect.y + PANE_HEADER_HEIGHT);
    expect(rsi.viewport.chartRect.height).toBe(rsi.rect.height - PANE_HEADER_HEIGHT);
  });

  it('gives a pane with nothing on view 0 to 100', () => {
    const { panes } = setup({ rsi: [] });
    expect(panes.panels(() => main(0, 5))[0].viewport.priceRange).toEqual({ min: 0, max: 100 });
  });

  it('is on a log scale only while all its values are above 0', () => {
    const { layout, panes } = setup({ osc: [-5, 5, 10] });
    layout.setPanelScale('osc', { log: true });
    expect(panes.panels(() => main(1, 2))[0].viewport.logScale).toBe(true);
    panes.invalidate();
    // From 0 on, a value isn't above 0: the linear scale.
    const linear = panes.panels(() => main(0, 2))[0].viewport;
    expect(linear.logScale).toBe(false);
    expect(linear.priceRange).toEqual({ min: -5, max: 10 });
  });

  it('measures a percent scale from its first value on screen, not 0', () => {
    const { layout, panes } = setup({ obv: [undefined, 0, 250, 300] });
    layout.setPanelScale('obv', { percent: true });
    const vp = panes.panels(() => main(0, 3))[0].viewport;
    expect(vp.scaleMode).toBe('percentage');
    expect(vp.scaleBaseline).toBe(250);
  });

  it('leaves price formats to the price pane: a pane holds values, not prices', () => {
    const { panes } = setup({ rsi: [1] });
    const vp = panes.panels(() => main(0, 0))[0].viewport;
    expect(vp.formatPrice).toBeUndefined();
    expect(vp.pricePrecision).toBeUndefined();
  });

  it('keeps the panes worked out until told the values or the layout moved', () => {
    const { panes } = setup({ rsi: [1, 2] });
    const first = panes.panels(() => main(0, 1));
    expect(panes.panels(() => main(0, 1))).toBe(first);
    panes.invalidateScales();
    expect(panes.panels(() => main(0, 1))).not.toBe(first);
  });
});

describe('PaneLayout: the layout', () => {
  it('starts the time axis under the price pane and every pane below it', () => {
    const { panes } = setup({ a: [1], b: [1] });
    const resolved = panes.resolved();
    expect(panes.timeAxisTop()).toBe(resolved.mainChartRect.y + resolved.mainChartRect.height + 200);
  });

  it('reports the hover over the price pane and the panes above and below it', () => {
    const { panes, bounds } = setup({ a: [1] });
    const resolved = panes.resolved();
    panes.resolved();
    // Once a layout, not once a read.
    expect(bounds).toHaveLength(1);
    const pane = resolved.panels[0].rect;
    expect(bounds[0]).toEqual({ top: resolved.mainChartRect.y, bottom: pane.y + pane.height });
  });

  it('lays out as if gone a pane whose indicators are all off this chart type', () => {
    const { panes } = setup({ cmp: [1], rsi: [1] }, {
      getActiveIndicators: () => [{ instanceId: 'cmp', offChartType: true }, { instanceId: 'rsi' }, { instanceId: 'ema', pane: 'rsi', offChartType: true }],
    } as Partial<PaneSources>);
    expect([...panes.offChartType()]).toEqual(['cmp']);
  });
});

describe('PaneLayout: a pane style', () => {
  it('goes with the pane: to the indicator that takes it over, or away with it', () => {
    const { panes } = setup({ rsi: [1], macd: [1] });
    const style = { background: '#123' };
    expect(panes.setStyle('rsi', style)).toBe(true);
    expect(panes.setStyle('rsi', { ...style })).toBe(false);
    expect(panes.panels(() => main(0, 0))[0].style).toEqual(style);
    panes.passStyle('rsi', 'macd');
    expect(panes.style('rsi')).toBeUndefined();
    expect(panes.style('macd')).toEqual(style);
    panes.passStyle('macd', null);
    expect(panes.style('macd')).toBeUndefined();
  });
});
