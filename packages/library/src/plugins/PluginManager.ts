import type { IndicatorPlugin } from '@chart-lib/commons';
import type { IndicatorEngine } from '@chart-lib/core';

export class PluginManager {
  constructor(private indicatorEngine: IndicatorEngine) {}

  registerIndicator(plugin: IndicatorPlugin): void {
    this.indicatorEngine.register(plugin);
  }
}
