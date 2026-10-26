import type { IndicatorPlugin } from '@tradecanvas/commons';

/**
 * The plugins `registerBuiltInIndicators` made. They say whether they read
 * the exchange's zone (`readsExchangeTimeZone`), so one that says nothing
 * doesn't; a plugin of the host's that says nothing may.
 */
export const BUILT_IN_PLUGINS = new WeakSet<IndicatorPlugin>();
