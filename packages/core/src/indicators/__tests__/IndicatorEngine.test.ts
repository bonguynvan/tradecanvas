import { describe, it, expect } from 'vitest';
import type { IndicatorPlugin, IndicatorValue, OHLCBar } from '@tradecanvas/commons';
import { IndicatorEngine } from '../IndicatorEngine.js';

function bars(n: number): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => ({ time: i * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 0 }));
}

/** A fake overlay plugin whose output.value at bar index i is just i — makes range assertions trivial. */
function fakeOverlayPlugin(id: string): IndicatorPlugin {
  return {
    descriptor: { id, name: id, placement: 'overlay', defaultConfig: {} },
    calculate(data) {
      const values = new Map<number, IndicatorValue>();
      const series: (IndicatorValue | null)[] = data.map((bar, i) => {
        const v = { value: i };
        values.set(bar.time, v);
        return v;
      });
      return { values, series };
    },
    render() {},
  };
}

/** A panel plugin (should be excluded from getOverlayPriceRange). */
function fakePanelPlugin(id: string): IndicatorPlugin {
  const overlay = fakeOverlayPlugin(id);
  return { ...overlay, descriptor: { ...overlay.descriptor, placement: 'panel' } };
}

describe('IndicatorEngine.getOverlayPriceRange', () => {
  it('only reflects values within [from, to], not the whole series', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('fake'));
    const data = bars(1000);
    engine.addIndicator('fake', {}, data);

    // Full series spans 0..999; windowing to [10, 20] should exclude 0 and 999.
    const range = engine.getOverlayPriceRange(10, 20);
    expect(range).toEqual({ min: 10, max: 20 });
  });

  it('ignores panel-placement indicators', () => {
    const engine = new IndicatorEngine();
    engine.register(fakePanelPlugin('panelOnly'));
    engine.addIndicator('panelOnly', {}, bars(50));

    expect(engine.getOverlayPriceRange(0, 49)).toBeNull();
  });

  it('ignores hidden indicators', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('fake'));
    const instanceId = engine.addIndicator('fake', {}, bars(50));
    engine.setVisible(instanceId, false);

    expect(engine.getOverlayPriceRange(0, 49)).toBeNull();
  });

  it('combines the min/max across multiple active overlays', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('a'));
    engine.register(fakeOverlayPlugin('b'));
    const data = bars(30);
    engine.addIndicator('a', {}, data);
    engine.addIndicator('b', {}, data);

    const range = engine.getOverlayPriceRange(5, 15);
    expect(range).toEqual({ min: 5, max: 15 });
  });

  it('returns null when nothing is registered', () => {
    const engine = new IndicatorEngine();
    expect(engine.getOverlayPriceRange(0, 10)).toBeNull();
  });
});
