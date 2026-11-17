import type { IndicatorDescriptor, IndicatorStyleConfig, ResolvedIndicatorStyle, Theme } from '@tradecanvas/commons';

/** The parts of a style a descriptor's `defaultStyle` can give for a theme. */
export interface ThemeLook {
  colors?: string[];
  lineWidths?: number[];
  opacity?: number;
}

export type ThemeLookKey = keyof ThemeLook;
/** The parts of a style a theme can give. */
export const THEME_LOOK_KEYS: readonly ThemeLookKey[] = ['colors', 'lineWidths', 'opacity'];

/** The descriptor's look for `theme`, as copies (none when it gives none, or its function throws). */
export function descriptorLook(descriptor: IndicatorDescriptor, theme: Theme): ThemeLook {
  const given = descriptor.defaultStyle;
  let style: IndicatorStyleConfig | undefined;
  try {
    style = typeof given === 'function' ? given(theme) : given;
  } catch (err) {
    // An app's function that throws must not stop the chart drawing: the chart's own look instead.
    console.warn(`Indicator "${descriptor.id}": defaultStyle failed, its own look is not used:`, err);
    return {};
  }
  if (!style) return {};
  return {
    ...(style.colors ? { colors: [...style.colors] } : {}),
    ...(style.lineWidths ? { lineWidths: [...style.lineWidths] } : {}),
    ...(style.opacity !== undefined ? { opacity: style.opacity } : {}),
  };
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The parts of `style` the theme still gives: those taken from it (`taken`)
 * that nobody has changed since.
 */
export function themedKeys(style: ResolvedIndicatorStyle, taken: ThemeLook | undefined): ThemeLookKey[] {
  if (!taken) return [];
  return THEME_LOOK_KEYS.filter((key) => taken[key] !== undefined && same(style[key], taken[key]));
}

/**
 * Put the look for a new theme on the parts the old one still gives, in
 * place. Returns what the theme gives now.
 */
export function applyThemeLook(style: ResolvedIndicatorStyle, taken: ThemeLook | undefined, next: ThemeLook): ThemeLook | undefined {
  const keys = themedKeys(style, taken);
  if (keys.length === 0) return undefined;
  const now: ThemeLook = {};
  for (const key of keys) {
    const value = next[key] ?? taken![key];
    (now as Record<ThemeLookKey, unknown>)[key] = Array.isArray(value) ? [...value] : value;
    (style as unknown as Record<ThemeLookKey, unknown>)[key] = Array.isArray(value) ? [...value] : value;
  }
  return now;
}

/** `style` without the parts the theme gives: what a layout keeps. */
export function ownStyle(style: ResolvedIndicatorStyle, taken: ThemeLook | undefined): IndicatorStyleConfig {
  const themed = new Set(themedKeys(style, taken));
  const out: IndicatorStyleConfig = {};
  if (!themed.has('colors')) out.colors = [...style.colors];
  if (!themed.has('lineWidths')) out.lineWidths = [...style.lineWidths];
  if (!themed.has('opacity')) out.opacity = style.opacity;
  if (style.plots) out.plots = Object.fromEntries(Object.entries(style.plots).map(([key, plot]) => [key, { ...plot }]));
  return out;
}

/**
 * Put the descriptor's look for `theme` back on the parts `keys` it gives,
 * in place, and return what the theme gives then (or the old `taken` when
 * nothing changed). `changed` says whether any part of `style` did.
 */
export function followLook(
  style: ResolvedIndicatorStyle,
  taken: ThemeLook | undefined,
  look: ThemeLook,
  keys: readonly ThemeLookKey[],
): { taken: ThemeLook | undefined; changed: boolean } {
  let changed = false;
  const now: ThemeLook = { ...taken };
  for (const key of keys) {
    const value = look[key];
    if (value === undefined) continue;
    if (!same(style[key], value)) changed = true;
    (style as unknown as Record<ThemeLookKey, unknown>)[key] = Array.isArray(value) ? [...value] : value;
    (now as Record<ThemeLookKey, unknown>)[key] = Array.isArray(value) ? [...value] : value;
  }
  return { taken: Object.keys(now).length > 0 ? now : undefined, changed };
}
