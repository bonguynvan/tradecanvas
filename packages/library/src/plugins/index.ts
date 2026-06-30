export { PluginManager } from './PluginManager.js';
export type { PluginManagerOptions } from './PluginManager.js';
export {
  registerPlugin,
  unregisterPlugin,
  getGlobalPlugins,
  clearGlobalPlugins,
} from './registry.js';
export { PLUGIN_API_VERSION, pluginKey } from './contracts.js';
export type {
  ChartPlugin,
  ChartTypePlugin,
  OverlayPlugin,
  OverlayRenderContext,
} from './contracts.js';
