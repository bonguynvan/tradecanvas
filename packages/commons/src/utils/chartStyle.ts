import type { ChartType, LineStyle } from '../types/chart.js';
import type { Theme } from '../types/theme.js';
import type { IndicatorPlotStyle } from '../types/indicator.js';
import {
  CHART_STYLE_KEYS,
  type ChartStyleKey,
  type ChartStyleOverrides,
  type ChartStyleOverridesPatch,
  type PaneStyle,
  type ResolvedChartStyle,
  type ResolvedLineLook,
  type StyleValueKind,
} from '../types/style.js';
import { resolveVolumeColors } from '../constants/themes.js';

const LINE_STYLES: readonly LineStyle[] = ['solid', 'dashed', 'dotted'];
/** Widths past this are a mistake, not a look. */
const MAX_WIDTH = 20;
/** Long enough for any colour CSS writes, short enough to keep anything else out. */
const MAX_COLOR_LENGTH = 64;
/** The main series' line width when nothing sets it. */
const DEFAULT_LINE_WIDTH = 2;

/**
 * A colour as CSS writes one, and only that: hex, a name, or a colour
 * function (`rgb()`, `hsl()`, `oklch()`, `color()`…) of numbers, units and
 * words. Anything else is refused, so a value read from a saved layout can't
 * carry markup or script into a style or an attribute.
 */
const COLOR_PATTERNS = [
  /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
  /^[a-z]{3,30}$/i,
  /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([0-9a-z.,%/\s-]*\)$/i,
];

function isColor(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_COLOR_LENGTH && COLOR_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

function isValue(kind: StyleValueKind, value: unknown): boolean {
  switch (kind) {
    case 'color': return isColor(value);
    case 'lineStyle': return LINE_STYLES.includes(value as LineStyle);
    case 'width': return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_WIDTH;
    case 'boolean': return typeof value === 'boolean';
  }
}

function isStyleKey(key: string): key is ChartStyleKey {
  return Object.prototype.hasOwnProperty.call(CHART_STYLE_KEYS, key);
}

/**
 * Overrides read from anywhere (your options, a saved layout): the keys it
 * knows with values of their kind, `null` taking a key away. `rejected`
 * names what was left out.
 */
export function readChartStyleOverrides(raw: unknown): { overrides: ChartStyleOverridesPatch; rejected: string[] } {
  const overrides: Record<string, unknown> = {};
  const rejected: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { overrides: {}, rejected };
  for (const [key, value] of Object.entries(raw)) {
    if (!isStyleKey(key)) rejected.push(key);
    else if (value === null) overrides[key] = null;
    else if (isValue(CHART_STYLE_KEYS[key], value)) overrides[key] = value;
    else rejected.push(key);
  }
  return { overrides: overrides as ChartStyleOverridesPatch, rejected };
}

/** A pane's own style: the colours it can use, or null when it has none. */
export function readPaneStyle(raw: unknown): PaneStyle | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { background, separator } = raw as Record<string, unknown>;
  const style: PaneStyle = {
    ...(isColor(background) ? { background } : {}),
    ...(isColor(separator) ? { separator } : {}),
  };
  return Object.keys(style).length > 0 ? style : null;
}

/** A plot key as indicators name them: short, nothing odd in it. */
const PLOT_KEY = /^[A-Za-z0-9_]{1,32}$/;

/** Plot styles read from anywhere: by plot key, a dash style and whether it shows; undefined when none. */
export function readIndicatorPlotStyles(raw: unknown): Record<string, IndicatorPlotStyle> | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const out: Record<string, IndicatorPlotStyle> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!PLOT_KEY.test(key) || typeof value !== 'object' || value === null) continue;
    const { lineStyle, visible } = value as Record<string, unknown>;
    const plot: IndicatorPlotStyle = {
      ...(LINE_STYLES.includes(lineStyle as LineStyle) ? { lineStyle: lineStyle as LineStyle } : {}),
      ...(typeof visible === 'boolean' ? { visible } : {}),
    };
    if (Object.keys(plot).length > 0) out[key] = plot;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** A dash pattern for a line style: `dashed` its own, `dotted` dots as wide as the line. */
export function lineDash(style: LineStyle, dashed: readonly number[], width = 1): number[] {
  if (style === 'solid') return [];
  if (style === 'dotted') return [width, width * 2];
  return [...dashed];
}

type Lookup = (key: string) => unknown;

/** The main series' colours and widths, as the chart type `type` takes them. */
function seriesLooks(base: Theme, o: Lookup, type: ChartType) {
  const own = (prop: string) => o(`series.${type}.${prop}`);
  const upSet = own('upColor') ?? o('series.candlestick.upColor');
  const downSet = own('downColor') ?? o('series.candlestick.downColor');
  const up = (upSet as string | undefined) ?? base.candleUp;
  const down = (downSet as string | undefined) ?? base.candleDown;
  return {
    up,
    down,
    // A wick takes its body's colour once that is set, as the theme's own do.
    wickUp: ((own('wickUpColor') ?? o('series.candlestick.wickUpColor')) as string | undefined) ?? (upSet !== undefined ? up : base.candleUpWick),
    wickDown: ((own('wickDownColor') ?? o('series.candlestick.wickDownColor')) as string | undefined) ?? (downSet !== undefined ? down : base.candleDownWick),
    line: ((own('color') ?? own('lineColor') ?? o('series.line.color')) as string | undefined) ?? base.lineColor,
    lineWidth: ((own('lineWidth') ?? o('series.line.lineWidth')) as number | undefined) ?? DEFAULT_LINE_WIDTH,
    top: ((own('topColor') ?? o('series.area.topColor')) as string | undefined) ?? base.areaTopColor,
    bottom: ((own('bottomColor') ?? o('series.area.bottomColor')) as string | undefined) ?? base.areaBottomColor,
  };
}

function lineLook(o: Lookup, prefix: string, fallback: ResolvedLineLook): ResolvedLineLook {
  return {
    visible: (o(`${prefix}.visible`) as boolean | undefined) ?? fallback.visible,
    color: (o(`${prefix}.color`) as string | undefined) ?? fallback.color,
    style: (o(`${prefix}.style`) as LineStyle | undefined) ?? fallback.style,
    width: (o(`${prefix}.width`) as number | undefined) ?? fallback.width,
  };
}

/**
 * The theme the chart draws with: `base` with `overrides` on its tokens (the
 * main series' as `chartType` takes them) and the finer looks in `style`.
 * `base` is left as it was.
 */
export function resolveChartTheme(base: Theme, chartType: ChartType, overrides: ChartStyleOverrides): Theme {
  const { style: _ignored, ...plain } = base;
  const map = overrides as Record<string, unknown>;
  const o: Lookup = (key) => map[key];
  const series = seriesLooks(plain, o, chartType);
  const background = (o('background.color') as string | undefined) ?? plain.background;
  const str = (key: ChartStyleKey, fallback: string) => (o(key) as string | undefined) ?? fallback;

  const style: ResolvedChartStyle = {
    panes: {
      background: str('panes.background', background),
      separator: str('panes.separatorColor', plain.axisLine),
      title: str('panes.titleColor', plain.textSecondary),
    },
    grid: {
      horizontal: lineLook(o, 'grid.horizontal', { visible: true, color: plain.grid, style: 'solid', width: 1 }),
      vertical: lineLook(o, 'grid.vertical', { visible: true, color: plain.grid, style: 'solid', width: 1 }),
    },
    crosshair: {
      horizontal: lineLook(o, 'crosshair.horizontal', { visible: true, color: plain.crosshair, style: 'dashed', width: 1 }),
      vertical: lineLook(o, 'crosshair.vertical', { visible: true, color: plain.crosshair, style: 'dashed', width: 1 }),
      labelBackground: str('crosshair.labelBackground', plain.text),
      labelText: str('crosshair.labelTextColor', background),
    },
    axis: {
      price: { line: str('axis.price.lineColor', plain.axisLine), text: str('axis.price.textColor', plain.axisLabel) },
      time: { line: str('axis.time.lineColor', plain.axisLine), text: str('axis.time.textColor', plain.axisLabel) },
    },
    legend: { text: str('legend.textColor', plain.text), label: str('legend.labelColor', plain.textSecondary) },
    watermark: { color: (o('watermark.color') as string | undefined) ?? null },
    lastPrice: {
      visible: (o('lastPrice.visible') as boolean | undefined) ?? true,
      up: str('lastPrice.upColor', series.up),
      down: str('lastPrice.downColor', series.down),
      style: (o('lastPrice.style') as LineStyle | undefined) ?? 'dashed',
      width: (o('lastPrice.width') as number | undefined) ?? 1,
    },
    sessionBreaks: {
      color: (o('sessionBreaks.color') as string | undefined) ?? null,
      style: (o('sessionBreaks.style') as LineStyle | undefined) ?? null,
      width: (o('sessionBreaks.width') as number | undefined) ?? null,
    },
    highLow: { color: (o('highLow.color') as string | undefined) ?? null },
    series: { lineWidth: series.lineWidth },
  };

  return {
    ...plain,
    background,
    candleUp: series.up,
    candleDown: series.down,
    candleUpWick: series.wickUp,
    candleDownWick: series.wickDown,
    lineColor: series.line,
    areaTopColor: series.top,
    areaBottomColor: series.bottom,
    volumeUp: str('volume.upColor', plain.volumeUp),
    volumeDown: str('volume.downColor', plain.volumeDown),
    style,
  };
}

/** How each key that isn't the series' reads back from the resolved theme. */
const READ_BACK: { [K in ChartStyleKey]?: (t: Theme, s: ResolvedChartStyle) => unknown } = {
  'background.color': (t) => t.background,
  'panes.background': (_t, s) => s.panes.background,
  'panes.separatorColor': (_t, s) => s.panes.separator,
  'panes.titleColor': (_t, s) => s.panes.title,
  'crosshair.labelBackground': (_t, s) => s.crosshair.labelBackground,
  'crosshair.labelTextColor': (_t, s) => s.crosshair.labelText,
  'axis.price.lineColor': (_t, s) => s.axis.price.line,
  'axis.price.textColor': (_t, s) => s.axis.price.text,
  'axis.time.lineColor': (_t, s) => s.axis.time.line,
  'axis.time.textColor': (_t, s) => s.axis.time.text,
  'legend.textColor': (_t, s) => s.legend.text,
  'legend.labelColor': (_t, s) => s.legend.label,
  'watermark.color': (_t, s) => s.watermark.color,
  'lastPrice.visible': (_t, s) => s.lastPrice.visible,
  'lastPrice.upColor': (_t, s) => s.lastPrice.up,
  'lastPrice.downColor': (_t, s) => s.lastPrice.down,
  'lastPrice.style': (_t, s) => s.lastPrice.style,
  'lastPrice.width': (_t, s) => s.lastPrice.width,
  // As drawn: a theme that sets only candle colours gets volume in those colours.
  'volume.upColor': (t) => resolveVolumeColors(t).up,
  'volume.downColor': (t) => resolveVolumeColors(t).down,
  'sessionBreaks.color': (_t, s) => s.sessionBreaks.color,
  'sessionBreaks.style': (_t, s) => s.sessionBreaks.style,
  'sessionBreaks.width': (_t, s) => s.sessionBreaks.width,
  'highLow.color': (_t, s) => s.highLow.color,
};

const LINE_PROPS: Record<string, keyof ResolvedLineLook> = { visible: 'visible', color: 'color', style: 'style', width: 'width' };

/**
 * What `key` resolves to: its override, or what it falls back to. A
 * `series.<type>.*` key resolves as that type would draw; the last price
 * follows `chartType`'s colours. Null for the parts that keep to their own
 * settings when not overridden (the watermark, session breaks, high/low).
 */
export function chartStyleValue(
  base: Theme,
  overrides: ChartStyleOverrides,
  key: ChartStyleKey,
  chartType: ChartType = 'candlestick',
): string | number | boolean | null {
  const parts = key.split('.');
  if (parts[0] === 'series') {
    const looks = seriesLooks(base, (k) => (overrides as Record<string, unknown>)[k], parts[1] as ChartType);
    switch (parts[2]) {
      case 'upColor': return looks.up;
      case 'downColor': return looks.down;
      case 'wickUpColor': return looks.wickUp;
      case 'wickDownColor': return looks.wickDown;
      case 'color':
      case 'lineColor': return looks.line;
      case 'lineWidth': return looks.lineWidth;
      case 'topColor': return looks.top;
      case 'bottomColor': return looks.bottom;
    }
  }
  const theme = resolveChartTheme(base, chartType, overrides);
  const style = theme.style!;
  if (parts[0] === 'grid' || (parts[0] === 'crosshair' && (parts[1] === 'horizontal' || parts[1] === 'vertical'))) {
    const group = parts[0] === 'grid' ? style.grid : style.crosshair;
    return group[parts[1] as 'horizontal' | 'vertical'][LINE_PROPS[parts[2]]];
  }
  return (READ_BACK[key]?.(theme, style) ?? null) as string | number | boolean | null;
}
