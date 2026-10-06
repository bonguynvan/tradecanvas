import type { SignalMarkerStyle, Theme, TradeZoneStyle, TradingConfig } from '@tradecanvas/commons';

/** A selected drawing's handles, without a key of their own. */
const HANDLE_FILL = '#FFFFFF';

/** Whether any of `colors` is set. */
function anySet(colors: Readonly<Record<string, string | null>>): boolean {
  for (const key in colors) if (colors[key] !== null) return true;
  return false;
}

/** The entries of `colors` that are set, by the name they take in an overlay's own style. */
function setColors<K extends string>(colors: Record<K, string | null>, names: Record<K, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(colors) as K[]) {
    const color = colors[key];
    if (color !== null) out[names[key]] = color;
  }
  return out;
}

/** The trading config with the style keys' colours over its orders' and positions'; the same config without any. */
export function tradingConfigFor(config: TradingConfig, theme: Theme): TradingConfig {
  const t = theme.style?.trading;
  if (!t || !anySet(t)) return config;
  return {
    ...config,
    orderColors: { ...config.orderColors, ...setColors({ buy: t.buy, sell: t.sell }, { buy: 'buy', sell: 'sell' }) },
    positionColors: {
      ...config.positionColors,
      ...setColors({ profit: t.profit, loss: t.loss, entry: t.entry }, { profit: 'profit', loss: 'loss', entry: 'entry' }),
    },
  };
}

/** The markers' style with the style keys' colours over it. */
export function markerStyleFor(style: SignalMarkerStyle, theme: Theme): SignalMarkerStyle {
  const m = theme.style?.markers;
  if (!m || !anySet(m)) return style;
  return { ...style, ...setColors(m, { long: 'longColor', short: 'shortColor', neutral: 'neutralColor' }) };
}

/** The trade zones' style with the style keys' colours over it. */
export function zoneStyleFor(style: TradeZoneStyle, theme: Theme): TradeZoneStyle {
  const z = theme.style?.tradeZones;
  if (!z || !anySet(z)) return style;
  return { ...style, ...setColors(z, { profit: 'profitColor', loss: 'lossColor', active: 'activeColor' }) };
}

/** The fill of a selected drawing's handles. */
export function drawingHandleColor(theme: Pick<Theme, 'style'> | null): string {
  return theme?.style?.drawings.handle ?? HANDLE_FILL;
}
