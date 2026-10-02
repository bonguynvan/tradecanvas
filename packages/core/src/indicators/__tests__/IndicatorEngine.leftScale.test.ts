import { describe, it, expect } from 'vitest';
import type { IndicatorPlugin, IndicatorValue, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { IndicatorEngine } from '../IndicatorEngine.js';

function bars(n: number): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => ({ time: i * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 0 }));
}

/** An overlay whose value at bar i is `scale * i`; it records the viewport it was drawn with. */
function overlay(id: string, scale: number, drawnWith: ViewportState[]): IndicatorPlugin {
  return {
    descriptor: { id, name: id, placement: 'overlay', defaultConfig: {}, plots: [{ key: 'value', title: id, color: 0 }] },
    calculate(data) {
      const values = new Map<number, IndicatorValue>();
      const series = data.map((bar, i) => {
        const v = { value: scale * i };
        values.set(bar.time, v);
        return v;
      });
      return { values, series };
    },
    render(_ctx, _output, viewport) {
      drawnWith.push(viewport);
    },
  };
}

const viewport = (min: number, max: number) => ({ priceRange: { min, max } }) as unknown as ViewportState;

describe('IndicatorEngine left scale', () => {
  it('keeps a left-scale overlay out of the price scale, and gives it a range of its own', () => {
    const engine = new IndicatorEngine();
    engine.register(overlay('price', 1, []));
    engine.register(overlay('volume', 1000, []));
    const data = bars(100);
    engine.addIndicator('price', {}, data);
    engine.addIndicator('volume', {}, data, { scale: 'left' });

    expect(engine.getOverlayPriceRange(10, 20)).toEqual({ min: 10, max: 20 });
    expect(engine.getOverlayPriceRange(10, 20, 'left')).toEqual({ min: 10_000, max: 20_000 });
    expect(engine.hasLeftScaleOverlays()).toBe(true);
  });

  it('draws each overlay on the scale it belongs to', () => {
    const right: ViewportState[] = [];
    const left: ViewportState[] = [];
    const engine = new IndicatorEngine();
    engine.register(overlay('price', 1, right));
    engine.register(overlay('volume', 1000, left));
    engine.addIndicator('price', {}, bars(10));
    engine.addIndicator('volume', {}, bars(10), { scale: 'left' });

    const main = viewport(0, 10);
    const leftView = viewport(0, 10_000);
    engine.renderOverlays({} as CanvasRenderingContext2D, main, leftView);
    expect(right).toEqual([main]);
    expect(left).toEqual([leftView]);
  });

  it('moves an overlay between scales, and ignores the scale for a pane indicator', () => {
    const engine = new IndicatorEngine();
    engine.register(overlay('volume', 1000, []));
    engine.register({ ...overlay('osc', 1, []), descriptor: { id: 'osc', name: 'osc', placement: 'panel', defaultConfig: {} } });
    const id = engine.addIndicator('volume', {}, bars(10));
    expect(engine.setScale(id, 'left')).toBe(true);
    expect(engine.getIndicatorConfig(id)?.scale).toBe('left');
    expect(engine.setScale(id, 'right')).toBe(true);
    expect(engine.getIndicatorConfig(id)?.scale).toBeUndefined();

    const osc = engine.addIndicator('osc', {}, bars(10), { scale: 'left' });
    expect(engine.getIndicatorConfig(osc)?.scale).toBeUndefined();
    expect(engine.setScale(osc, 'left')).toBe(false);
  });

  it('tags the latest values of each scale separately', () => {
    const engine = new IndicatorEngine();
    engine.register(overlay('price', 1, []));
    engine.register(overlay('volume', 1000, []));
    engine.addIndicator('price', {}, bars(10));
    engine.addIndicator('volume', {}, bars(10), { scale: 'left' });
    expect(engine.getLatestOverlayValues().map((v) => v.value)).toEqual([9]);
    expect(engine.getLatestOverlayValues('left').map((v) => v.value)).toEqual([9000]);
  });
});
