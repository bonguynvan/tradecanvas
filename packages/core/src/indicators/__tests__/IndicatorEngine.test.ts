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

describe('IndicatorEngine colours', () => {
  it('gives each new line in the price pane a colour no line there has', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('ema'));
    engine.register(fakeOverlayPlugin('sma'));
    const first = engine.addIndicator('ema', {}, bars(5));
    const other = engine.addIndicator('sma', {}, bars(5));
    const second = engine.addIndicator('ema', {}, bars(5));
    const colour = (id: string) => engine.getIndicatorStyle(id)!.colors[0];
    expect(new Set([colour(first), colour(other), colour(second)]).size).toBe(3);
    expect(engine.getIndicatorStyle(second)!.colors).toHaveLength(engine.getIndicatorStyle(first)!.colors.length);
  });

  it('keeps the usual colour for a pane indicator in a pane of its own', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('ema'));
    engine.register(fakePanelPlugin('rsi'));
    const ema = engine.addIndicator('ema', {}, bars(5));
    const rsi = engine.addIndicator('rsi', {}, bars(5));
    expect(engine.getIndicatorStyle(rsi)!.colors[0]).toBe(engine.getIndicatorStyle(ema)!.colors[0]);
  });

  it('recolours a line moved into a pane where its colour is taken, unless it was chosen', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('sma'));
    engine.register(fakePanelPlugin('rsi'));
    const rsi = engine.addIndicator('rsi', {}, bars(5));
    const sma = engine.addIndicator('sma', {}, bars(5));
    const colour = (id: string) => engine.getIndicatorStyle(id)!.colors[0];
    expect(colour(sma)).toBe(colour(rsi)); // different panes
    engine.setPane(sma, rsi);
    expect(colour(sma)).not.toBe(colour(rsi));

    const chosen = engine.addIndicator('sma', {}, bars(5));
    engine.updateIndicatorStyle(chosen, { colors: [colour(rsi)] });
    engine.setPane(chosen, rsi);
    expect(colour(chosen)).toBe(colour(rsi)); // someone's choice stays
  });

  it('gives a new instance a colour no remaining instance uses', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('ema'));
    const first = engine.addIndicator('ema', {}, bars(5));
    const second = engine.addIndicator('ema', {}, bars(5));
    const colour = (id: string) => engine.getIndicatorStyle(id)!.colors[0];
    const usual = colour(first);
    engine.removeIndicator(first);
    const third = engine.addIndicator('ema', {}, bars(5));
    expect(colour(third)).not.toBe(colour(second)); // not two lines in one colour
    expect(colour(third)).toBe(usual); // the freed colour comes back
  });
});
