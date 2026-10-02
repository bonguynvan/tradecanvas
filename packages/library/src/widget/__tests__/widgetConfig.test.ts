import { describe, it, expect } from 'vitest';
import { IndicatorEngine, registerBuiltInIndicators } from '@tradecanvas/core';
import { INDICATORS, POPULAR_INDICATORS } from '../widgetConfig.js';

const engine = new IndicatorEngine();
registerBuiltInIndicators(engine);
const builtIns = engine.getAvailableIndicators();

describe('the widget’s indicator menu', () => {
  it('lists every built-in indicator once, where it is drawn', () => {
    expect(INDICATORS.map((i) => i.id).sort()).toEqual(builtIns.map((d) => d.id).sort());
    for (const item of INDICATORS) {
      const placement = builtIns.find((d) => d.id === item.id)!.placement;
      expect(item.type, item.id).toBe(placement === 'panel' ? 'panel' : 'overlay');
    }
  });

  it('features only indicators it lists', () => {
    for (const id of POPULAR_INDICATORS) expect(INDICATORS.some((i) => i.id === id), id).toBe(true);
  });
});
