import {
  CHART_STYLE_KEYS,
  DEFAULT_SIGNAL_STYLE,
  DEFAULT_TRADE_ZONE_STYLE,
  DEFAULT_TRADING_CONFIG,
  type ChartStyleKey,
  type ChartType,
} from '@tradecanvas/commons';
import type { MessageKey } from './i18n.js';

/** A row of the settings' look: the style keys it sets together (it shows the first) and its name. */
export interface LookRow {
  label: MessageKey;
  keys: readonly ChartStyleKey[];
  /**
   * A key the chart leaves to the part itself until set (it reads back null):
   * the row offers Auto, and a colour picker starts from `hint` (the part's
   * colour as the library sets it; a host may have set its own) or from the
   * colour another key reads back (`from`).
   */
  auto?: { hint?: string; from?: ChartStyleKey };
}

export interface LookSection {
  title: MessageKey;
  rows: readonly LookRow[];
  /** Shown only on a chart that trades. */
  trading?: boolean;
}

const row = (label: MessageKey, ...keys: ChartStyleKey[]): LookRow => ({ label, keys });
const autoRow = (label: MessageKey, key: ChartStyleKey, start: { hint?: string; from?: ChartStyleKey } = {}): LookRow =>
  ({ label, keys: [key], auto: start });
const hint = (colour: string | undefined) => ({ hint: colour });
/** The theme's quieter text, which the watermark and the high and low lines take. */
const QUIET_TEXT = { from: 'panes.titleColor' } as const;

/** The Symbol tab's sections after the chart type's own: the last price, the volume, the high and low. */
export const LAST_PRICE_SECTION: LookSection = {
  title: 'settings.section.lastPrice',
  rows: [
    row('settings.priceLine', 'lastPrice.visible'),
    row('settings.up', 'lastPrice.upColor'),
    row('settings.down', 'lastPrice.downColor'),
    row('drawingSettings.lineStyle', 'lastPrice.style'),
    row('drawingSettings.lineWidth', 'lastPrice.width'),
  ],
};
export const VOLUME_SECTION: LookSection = {
  title: 'settings.volume',
  rows: [row('settings.up', 'volume.upColor'), row('settings.down', 'volume.downColor')],
};
export const HIGH_LOW_SECTION: LookSection = {
  title: 'settings.highLowLines',
  rows: [autoRow('drawingSettings.color', 'highLow.color', QUIET_TEXT)],
};

export const SYMBOL_SECTIONS: readonly LookSection[] = [LAST_PRICE_SECTION, VOLUME_SECTION, HIGH_LOW_SECTION];

/** The Status line tab's colours: the legend's text and the panes' titles. */
export const STATUS_LINE_ROWS: readonly LookRow[] = [
  row('settings.legendText', 'legend.textColor'),
  row('settings.legendLabels', 'legend.labelColor'),
  row('settings.paneTitles', 'panes.titleColor'),
];

/** The Scales tab's colours: the axes' text and lines. */
export const SCALE_ROWS: readonly LookRow[] = [
  row('drawingSettings.text', 'axis.price.textColor', 'axis.time.textColor'),
  row('settings.scaleLines', 'axis.price.lineColor', 'axis.time.lineColor'),
];

/** The Appearance tab: the background, the grid, the crosshair, the session breaks, the drawings' handles. */
export const APPEARANCE_SECTIONS: readonly LookSection[] = [
  {
    title: 'settings.section.background',
    rows: [
      row('settings.background', 'background.color'),
      row('settings.paneBackground', 'panes.background'),
      row('settings.paneSeparator', 'panes.separatorColor'),
      autoRow('settings.watermark', 'watermark.color', QUIET_TEXT),
    ],
  },
  {
    title: 'settings.gridLines',
    rows: [
      row('settings.horizontal', 'grid.horizontal.visible'),
      row('settings.vertical', 'grid.vertical.visible'),
      row('drawingSettings.color', 'grid.horizontal.color', 'grid.vertical.color'),
      row('drawingSettings.lineStyle', 'grid.horizontal.style', 'grid.vertical.style'),
      row('drawingSettings.lineWidth', 'grid.horizontal.width', 'grid.vertical.width'),
    ],
  },
  {
    title: 'settings.crosshairMode',
    rows: [
      row('settings.horizontal', 'crosshair.horizontal.visible'),
      row('settings.vertical', 'crosshair.vertical.visible'),
      row('drawingSettings.color', 'crosshair.horizontal.color', 'crosshair.vertical.color'),
      row('drawingSettings.lineStyle', 'crosshair.horizontal.style', 'crosshair.vertical.style'),
      row('drawingSettings.lineWidth', 'crosshair.horizontal.width', 'crosshair.vertical.width'),
      row('settings.labelBackground', 'crosshair.labelBackground'),
      row('settings.labelText', 'crosshair.labelTextColor'),
    ],
  },
  {
    title: 'settings.sessionBreaks',
    rows: [
      autoRow('drawingSettings.color', 'sessionBreaks.color', { from: 'axis.price.lineColor' }),
      autoRow('drawingSettings.lineStyle', 'sessionBreaks.style'),
      autoRow('drawingSettings.lineWidth', 'sessionBreaks.width'),
    ],
  },
  {
    title: 'objects.drawings',
    rows: [autoRow('settings.handles', 'drawings.handleColor', hint('#ffffff'))],
  },
];

/** The Trading tab: the colours of what the host puts on the chart, its own until set. */
export const TRADING_SECTIONS: readonly LookSection[] = [
  {
    title: 'settings.section.orders',
    trading: true,
    rows: [
      autoRow('ticket.buy', 'trading.buyColor', hint(DEFAULT_TRADING_CONFIG.orderColors?.buy)),
      autoRow('ticket.sell', 'trading.sellColor', hint(DEFAULT_TRADING_CONFIG.orderColors?.sell)),
      autoRow('settings.profit', 'trading.profitColor', hint(DEFAULT_TRADING_CONFIG.positionColors?.profit)),
      autoRow('settings.loss', 'trading.lossColor', hint(DEFAULT_TRADING_CONFIG.positionColors?.loss)),
      autoRow('account.entry', 'trading.entryColor', hint(DEFAULT_TRADING_CONFIG.positionColors?.entry)),
    ],
  },
  {
    title: 'settings.section.signals',
    rows: [
      autoRow('account.long', 'markers.longColor', hint(DEFAULT_SIGNAL_STYLE.longColor)),
      autoRow('account.short', 'markers.shortColor', hint(DEFAULT_SIGNAL_STYLE.shortColor)),
      autoRow('markers.neutral', 'markers.neutralColor', hint(DEFAULT_SIGNAL_STYLE.neutralColor)),
    ],
  },
  {
    title: 'settings.section.tradeZones',
    rows: [
      autoRow('settings.profit', 'tradeZones.profitColor', hint(DEFAULT_TRADE_ZONE_STYLE.profitColor)),
      autoRow('settings.loss', 'tradeZones.lossColor', hint(DEFAULT_TRADE_ZONE_STYLE.lossColor)),
      autoRow('settings.openTrade', 'tradeZones.activeColor', hint(DEFAULT_TRADE_ZONE_STYLE.activeColor)),
    ],
  },
];

/** The name of each of a chart type's keys, by the key's last part. */
const SERIES_LABELS: Readonly<Record<string, MessageKey>> = {
  upColor: 'settings.up',
  downColor: 'settings.down',
  wickUpColor: 'settings.upWick',
  wickDownColor: 'settings.downWick',
  color: 'drawingSettings.color',
  lineColor: 'drawingSettings.color',
  lineWidth: 'drawingSettings.lineWidth',
  topColor: 'settings.areaTop',
  bottomColor: 'settings.areaBottom',
};

/** Types whose up and down are bodies with wicks. */
const BODIES: ReadonlySet<ChartType> = new Set<ChartType>(['candlestick', 'heikinAshi', 'volumeCandles', 'equivolume']);

/** The rows of a chart type's own colours and widths, in the key table's order. */
export function seriesRows(type: ChartType): LookRow[] {
  const prefix = `series.${type}.`;
  return (Object.keys(CHART_STYLE_KEYS) as ChartStyleKey[])
    .filter((key) => key.startsWith(prefix))
    .map((key) => {
      const prop = key.slice(prefix.length);
      let label = SERIES_LABELS[prop] ?? 'drawingSettings.color';
      if (BODIES.has(type) && prop === 'upColor') label = 'settings.upBody';
      if (BODIES.has(type) && prop === 'downColor') label = 'settings.downBody';
      if (type === 'baseline' && prop === 'upColor') label = 'settings.aboveBase';
      if (type === 'baseline' && prop === 'downColor') label = 'settings.belowBase';
      return row(label, key);
    });
}

/**
 * Every key the settings set, every chart type's included: what Reset takes
 * away and an undo puts back.
 */
export const SETTINGS_LOOK_KEYS: readonly ChartStyleKey[] = [
  ...new Set<ChartStyleKey>([
    ...(Object.keys(CHART_STYLE_KEYS) as ChartStyleKey[]).filter((key) => key.startsWith('series.')),
    ...[...SYMBOL_SECTIONS, ...APPEARANCE_SECTIONS, ...TRADING_SECTIONS].flatMap((section) => section.rows.flatMap((r) => r.keys)),
    ...[...STATUS_LINE_ROWS, ...SCALE_ROWS].flatMap((r) => r.keys),
  ]),
];
