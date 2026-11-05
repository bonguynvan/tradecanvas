import { describe, expect, it } from 'vitest';
import type { IndicatorPlugin } from '@tradecanvas/commons';
import type { IndicatorEngine } from '../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../registry.js';
import { IndicatorBase } from '../IndicatorBase.js';

/**
 * The built-ins whose drawing is not one value a bar, so `plots` and `fills`
 * cannot say it; each draws itself.
 */
const DRAWS_ITSELF: Record<string, string> = {
  ichimoku: 'its cloud and leading spans run past the latest bar',
  zigzag: 'it joins swing points, not bars',
  volumeProfile: 'its rows stand on prices, not bars',
  candlepatterns: 'marks with labels above and below the bars',
  chopzone: 'each bar is coloured by the band its angle falls in',
  elderray: 'two histograms side by side in each bar',
};

describe('built-ins drawn from their plots', () => {
  const plugins: IndicatorPlugin[] = [];
  registerBuiltInIndicators({ register: (p: IndicatorPlugin) => plugins.push(p) } as unknown as IndicatorEngine);

  it('draws every built-in from its descriptor but those listed', () => {
    const selfDrawn = plugins
      .filter((p) => p instanceof IndicatorBase && Object.prototype.hasOwnProperty.call(Object.getPrototypeOf(p), 'render'))
      .map((p) => p.descriptor.id)
      .sort();
    expect(selfDrawn).toEqual(Object.keys(DRAWS_ITSELF).sort());
  });

  it('shades only between plots it declares', () => {
    for (const p of plugins) {
      const keys = new Set(p.descriptor.plots?.map((plot) => plot.key));
      for (const fill of p.descriptor.fills ?? []) {
        expect(fill.between.every((key) => keys.has(key)), `${p.descriptor.id} fill ${fill.between.join('/')}`).toBe(true);
      }
    }
  });
});
