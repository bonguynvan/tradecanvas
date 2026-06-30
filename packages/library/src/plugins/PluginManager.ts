import type { IndicatorPlugin } from '@tradecanvas/commons';
import type { IndicatorEngine } from '@tradecanvas/core';
import type { ChartPlugin, ChartTypePlugin, OverlayPlugin } from './contracts.js';
import { pluginKey } from './contracts.js';
import { getGlobalPlugins } from './registry.js';

export interface PluginManagerOptions {
  /** Per-instance plugins (from `new Chart(el, { plugins })`); merged over globals. */
  plugins?: ChartPlugin[];
  /** Inherit the global registry at construction (default: true). */
  inheritGlobal?: boolean;
}

/**
 * Per-chart plugin registry. Resolves plugins in precedence order:
 * global defaults → constructor `plugins` → imperative `register()`.
 * Indicator plugins additionally flow into the `IndicatorEngine` so
 * `chart.addIndicator(id)` can find them by descriptor id.
 */
export class PluginManager {
  private plugins = new Map<string, ChartPlugin>();

  constructor(
    private indicatorEngine: IndicatorEngine,
    options: PluginManagerOptions = {},
  ) {
    if (options.inheritGlobal !== false) {
      for (const p of getGlobalPlugins()) this.add(p);
    }
    for (const p of options.plugins ?? []) this.add(p);
  }

  /** Register a plugin on this chart instance. */
  register(plugin: ChartPlugin): void {
    this.add(plugin);
  }

  /** Remove a plugin by its `pluginKey`. Returns true if it existed. */
  unregister(key: string): boolean {
    return this.plugins.delete(key);
  }

  /** All plugins active on this instance. */
  list(): ChartPlugin[] {
    return [...this.plugins.values()];
  }

  /** Back-compat shorthand for registering an indicator plugin. */
  registerIndicator(plugin: IndicatorPlugin): void {
    this.add({ kind: 'indicator', plugin });
  }

  /** Look up a registered custom chart type by its `type` string. */
  getChartType(type: string): ChartTypePlugin | undefined {
    const p = this.plugins.get(`chartType:${type}`);
    return p?.kind === 'chartType' ? p.plugin : undefined;
  }

  /** All registered overlay plugins. */
  getOverlays(): OverlayPlugin[] {
    const out: OverlayPlugin[] = [];
    for (const p of this.plugins.values()) {
      if (p.kind === 'overlay') out.push(p.plugin);
    }
    return out;
  }

  private add(plugin: ChartPlugin): void {
    this.plugins.set(pluginKey(plugin), plugin);
    // Indicator plugins must reach the engine so they're resolvable by id.
    if (plugin.kind === 'indicator') {
      this.indicatorEngine.register(plugin.plugin);
    }
  }
}
