import type {
  ChartStyleKey,
  ChartStyleOverrides,
  ChartStyleOverridesPatch,
  ChartType,
  ShapeConfig,
  StyleLayer,
  Theme,
  ThemeName,
} from '@tradecanvas/commons';
import { DARK_THEME, LIGHT_THEME, chartStyleValue, resolveChartTheme } from '@tradecanvas/commons';

/**
 * The chart's theme and its style overrides. The theme drawn with
 * (`getTheme`) is the base theme with the overrides on it, worked out once
 * per change: the host's layer, then the user's for the base theme's name
 * (what someone chose for the dark theme stays with the dark theme).
 */
export class ThemeManager {
  private base: Theme;
  /** Shapes set apart from the theme (`setShapes`): they stay through theme switches. */
  private shape: ShapeConfig | null = null;
  private chartType: ChartType = 'candlestick';
  private host: ChartStyleOverrides = {};
  /** The user's overrides, by the name of the theme they were made on. */
  private user = new Map<string, ChartStyleOverrides>();
  private effective: Theme | null = null;

  constructor(themeOrName?: ThemeName | Theme) {
    this.base = ThemeManager.read(themeOrName);
  }

  private static read(themeOrName?: ThemeName | Theme): Theme {
    if (!themeOrName || themeOrName === 'dark') return { ...DARK_THEME };
    if (themeOrName === 'light') return { ...LIGHT_THEME };
    // A theme as drawn brings its resolved style along: it is worked out again here.
    const { style: _style, ...theme } = themeOrName;
    return theme;
  }

  /** The theme as drawn: the base with the overrides on it. */
  getTheme(): Theme {
    this.effective ??= resolveChartTheme(this.base, this.chartType, this.merged());
    return this.effective;
  }

  /** The theme as set, without the overrides. */
  getBaseTheme(): Theme {
    return this.base;
  }

  setTheme(themeOrName: ThemeName | Theme): void {
    this.base = ThemeManager.read(themeOrName);
    if (this.shape) this.base = { ...this.base, shape: { ...this.base.shape, ...this.shape } };
    this.effective = null;
  }

  /** Shapes over every theme from now on (null: each theme's own). */
  setShape(shape: ShapeConfig | null): void {
    this.shape = shape ? { ...shape } : null;
    this.base = { ...this.base, shape: shape ? { ...this.base.shape, ...shape } : this.base.shape };
    this.effective = null;
  }

  /** The main series' type: its `series.<type>.*` keys apply. */
  setChartType(type: ChartType): void {
    if (type === this.chartType) return;
    this.chartType = type;
    this.effective = null;
  }

  /** Set (a value) or take away (`null`) overrides on a layer; true when that changed anything. */
  applyOverrides(patch: ChartStyleOverridesPatch, layer: StyleLayer): boolean {
    const current = this.layer(layer);
    const next: Record<string, unknown> = { ...current };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined) delete next[key];
      else next[key] = value;
    }
    return this.setLayer(layer, next as ChartStyleOverrides);
  }

  /** `overrides` in place of a layer's; true when that changed anything. */
  setOverrides(overrides: ChartStyleOverrides, layer: StyleLayer): boolean {
    return this.setLayer(layer, { ...overrides });
  }

  /** Take away `keys` (all of them without) from a layer; true when that changed anything. */
  resetOverrides(layer: StyleLayer, keys?: readonly ChartStyleKey[]): boolean {
    if (!keys) return this.setLayer(layer, {});
    const next: Record<string, unknown> = { ...this.layer(layer) };
    for (const key of keys) delete next[key];
    return this.setLayer(layer, next as ChartStyleOverrides);
  }

  /** A layer's overrides (the user's for the current theme). */
  getOverrides(layer: StyleLayer): ChartStyleOverrides {
    return { ...this.layer(layer) };
  }

  /** The user's overrides on every theme, by theme name, for saving. */
  getUserOverrides(): Record<string, ChartStyleOverrides> {
    const out: Record<string, ChartStyleOverrides> = {};
    for (const [name, overrides] of this.user) if (Object.keys(overrides).length > 0) out[name] = { ...overrides };
    return out;
  }

  /** The user's overrides in place of theirs, by theme name (a layout loaded); true when that changed anything. */
  setUserOverrides(byTheme: Record<string, ChartStyleOverrides>): boolean {
    if (JSON.stringify(byTheme) === JSON.stringify(this.getUserOverrides())) return false;
    this.user = new Map(Object.entries(byTheme).map(([name, overrides]) => [name, { ...overrides }]));
    this.effective = null;
    return true;
  }

  /** What `key` resolves to now. */
  getStyleValue(key: ChartStyleKey): string | number | boolean | null {
    return chartStyleValue(this.base, this.merged(), key, this.chartType);
  }

  private layer(layer: StyleLayer): ChartStyleOverrides {
    return layer === 'host' ? this.host : this.user.get(this.base.name) ?? {};
  }

  private setLayer(layer: StyleLayer, next: ChartStyleOverrides): boolean {
    if (JSON.stringify(next) === JSON.stringify(this.layer(layer))) return false;
    if (layer === 'host') this.host = next;
    else if (Object.keys(next).length > 0) this.user.set(this.base.name, next);
    else this.user.delete(this.base.name);
    this.effective = null;
    return true;
  }

  private merged(): ChartStyleOverrides {
    return { ...this.host, ...this.user.get(this.base.name) };
  }
}
