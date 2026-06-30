import type { ChartPlugin } from './contracts.js';
import { pluginKey } from './contracts.js';

/**
 * Global default plugin registry. Every `Chart` created *after* a plugin is
 * registered inherits it (unless `inheritGlobal: false`). For per-chart scoping
 * use the constructor `plugins` option or `chart.plugins.register`.
 */
const globalPlugins = new Map<string, ChartPlugin>();

/** Register a plugin globally. Re-registering the same key replaces it. */
export function registerPlugin(plugin: ChartPlugin): void {
  globalPlugins.set(pluginKey(plugin), plugin);
}

/** Remove a global plugin by its `pluginKey`. Returns true if it existed. */
export function unregisterPlugin(key: string): boolean {
  return globalPlugins.delete(key);
}

/** Snapshot of all globally registered plugins. */
export function getGlobalPlugins(): ChartPlugin[] {
  return [...globalPlugins.values()];
}

/** Clear the global registry (test/teardown helper). */
export function clearGlobalPlugins(): void {
  globalPlugins.clear();
}
