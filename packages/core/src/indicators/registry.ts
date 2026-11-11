import type { IndicatorPlugin } from '@tradecanvas/commons';
import type { IndicatorEngine } from './IndicatorEngine.js';
import { BUILT_IN_PLUGINS } from './builtIns.js';
import { BUILT_IN_FACTORIES } from './builtInFactories.js';

export function registerBuiltInIndicators(engine: IndicatorEngine): void {
  for (const make of BUILT_IN_FACTORIES) {
    const plugin: IndicatorPlugin = make();
    BUILT_IN_PLUGINS.add(plugin);
    engine.register(plugin);
  }
}
