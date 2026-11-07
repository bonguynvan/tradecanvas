/**
 * The widget's look: corners, sizes, type, lines, shadows and the shape of
 * its bars, as tokens. A preset gives all of them; a theme of yours changes
 * what it names. Colours stay with the widget's dark / light theme.
 */
import { PHI, SANS_FONT_FAMILY, phiStep } from '@tradecanvas/commons';

export type WidgetUIPreset = 'print' | 'studio' | 'terminal' | 'capsule' | 'desk';

const DEFAULT_PRESET: WidgetUIPreset = 'print';

/** Type climbs by the cube root of φ: every third size is φ larger (11, 13, 15, 18, 21). */
const TYPE_STEPS_PER_PHI = 3;
/** Below this, letters with two marks stacked (Vietnamese ế, ộ) stop reading. */
const MIN_TYPE_SIZE = 10;

/**
 * How much bigger the look grows on a wide widget, by its width in CSS px:
 * a sixth of φ from full HD, a third from 2560 (4K at 150%), a half from
 * 3400 (4K at 100%). Narrower than the first, it keeps its sizes.
 */
const WIDE_STEPS: readonly (readonly [minWidth: number, phiFraction: number])[] = [
  [3400, 1 / 2],
  [2560, 1 / 3],
  [1800, 1 / 6],
];
/**
 * The drawing tools are a half step of φ over the look's other buttons and
 * icons: drawn on all day and alone in their column, they read at a glance.
 * Compact keeps them at the others' size.
 */
const TOOL_STEP = Math.sqrt(PHI);
/** The scales a theme may set by hand. */
const MIN_SCALE = 0.75;
const MAX_SCALE = 2;

/** The look's scale for a widget `width` px wide (see `WidgetUITheme.scale`): 1 below full HD. */
export function widgetScaleFor(width: number): number {
  const step = WIDE_STEPS.find(([min]) => width >= min);
  return step ? PHI ** step[1] : 1;
}

/**
 * The look at `factor` its size: bars, buttons, icons, menu rows and type,
 * each rounded to a whole pixel. Corners, lines and shadows stay.
 */
export function scaledWidgetUI(ui: ResolvedWidgetUI, factor: number): ResolvedWidgetUI {
  if (factor === 1) return ui;
  const s = ui.sizes;
  const at = (n: number) => Math.round(n * factor);
  return {
    ...ui,
    sizes: { toolbar: at(s.toolbar), control: at(s.control), controlSmall: at(s.controlSmall), icon: at(s.icon), sidebar: at(s.sidebar), menuItem: at(s.menuItem) },
    font: { ...ui.font, size: at(ui.font.size) },
  };
}

/** The type size `steps` from `body` on the look's scale, never below 10px. */
export function typeSize(body: number, steps: number): number {
  return Math.max(MIN_TYPE_SIZE, phiStep(body, steps, TYPE_STEPS_PER_PHI));
}

/** Corners, in px (999 makes a pill). */
export interface WidgetUIRadius {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

/** Each part's corners, in px; unset parts follow the scale. */
export interface WidgetUIComponentRadius {
  /** Buttons and toggles in bars. */
  control: number;
  /** Text fields and selects. */
  input: number;
  /** Menus and dropdowns. */
  menu: number;
  /** Dialogs. */
  dialog: number;
  /** Floating panels (alerts, data window, order ticket). */
  panel: number;
  tooltip: number;
  /** Price tags and chips. */
  tag: number;
  toast: number;
  /** The toolbar's own box (a floating toolbar is an island). */
  toolbar: number;
  /** The drawing tools' own box. */
  sidebar: number;
}

/** Sizes, in px. */
export interface WidgetUISizes {
  toolbar: number;
  control: number;
  controlSmall: number;
  icon: number;
  /**
   * The drawing tools' column. Its buttons are a half step of φ over `control`
   * and their icons over `icon` (but in compact), and never wider than the
   * column less 6 px a side.
   */
  sidebar: number;
  menuItem: number;
}

export interface WidgetUIFont {
  /** A CSS font-family list. The widget loads no fonts: load the ones you name. */
  family: string;
  /** For prices and numbers. */
  mono: string;
  /** Body size, px; the small sizes follow it. */
  size: number;
  weight: number;
  strongWeight: number;
  /** Small labels (section titles, field names): as written or in capitals. */
  labelCase: 'none' | 'uppercase';
  /** Their letter spacing, in em. */
  labelTracking: number;
}

export interface WidgetUIShadows {
  menu: string;
  dialog: string;
  tooltip: string;
}

/**
 * How roomy the look is: its controls' sizes, and for `'airy'` the chart too.
 * `'airy'` is spacious controls, the figures (legend, axes) in the look's
 * sans face and golden bars (the body φ⁻¹ of its slot), the look 2.0 opens
 * with; `chartOptions.barLayout` and a `chartOptions.font.family` win over
 * it, and sizes alone in `chartOptions.font` keep the look's face.
 */
export type WidgetUIDensity = 'compact' | 'comfortable' | 'spacious' | 'airy';

/** The whole look, every token set. */
export interface ResolvedWidgetUI {
  preset: WidgetUIPreset;
  /** Always set by `resolveWidgetUI`; `'comfortable'` when left out. */
  density?: WidgetUIDensity;
  radius: WidgetUIRadius;
  components: WidgetUIComponentRadius;
  sizes: WidgetUISizes;
  font: WidgetUIFont;
  borders: { width: number; separators: boolean };
  shadows: WidgetUIShadows;
  /** Frosted floating surfaces: blur behind them, px (0: solid). */
  blur: number;
  /** How a chosen button shows: a tinted fill, a solid pill, or an underline. */
  active: 'tint' | 'solid' | 'underline';
  /** The toolbar along the top edge, or floating as an island. */
  toolbar: 'docked' | 'floating';
  /** The drawing tools along the left edge, or floating. */
  sidebar: 'docked' | 'floating';
  /** The interval buttons as they are, or in a segmented track. */
  intervals: 'plain' | 'segmented';
  /** Corners of the price tags and pills the chart draws (999: pills). */
  tagRadius: number;
  /** How much bigger than its sizes the look is drawn: `'auto'` by the widget's width, or a number. */
  scale?: number | 'auto';
}

/** Your look: a preset to start from (Print by default) and what to change. */
export interface WidgetUITheme {
  preset?: WidgetUIPreset;
  radius?: Partial<WidgetUIRadius>;
  components?: Partial<WidgetUIComponentRadius>;
  /**
   * Control sizes at once: compact, comfortable (the preset's) or spacious;
   * `sizes` win over it. `'airy'`: spacious, with the chart's figures in the
   * sans face and golden bars (see `WidgetUIDensity`).
   */
  density?: WidgetUIDensity;
  sizes?: Partial<WidgetUISizes>;
  font?: Partial<WidgetUIFont>;
  borders?: Partial<ResolvedWidgetUI['borders']>;
  shadows?: Partial<WidgetUIShadows>;
  blur?: number;
  active?: ResolvedWidgetUI['active'];
  toolbar?: ResolvedWidgetUI['toolbar'];
  sidebar?: ResolvedWidgetUI['sidebar'];
  intervals?: ResolvedWidgetUI['intervals'];
  tagRadius?: number;
  /**
   * How much bigger the bars, buttons, icons and type are drawn. `'auto'`
   * (the default) by the widget's width: as set up to full HD, then a step
   * of φ's root bigger at a time, so a 4K screen is not all small print. A
   * number (0.75 to 2) at every width; 1 keeps the sizes as they are.
   */
  scale?: number | 'auto';
}

const SYSTEM_SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', ui-monospace, monospace";
/** The face every system has: the widget's labels without a font to load. */
const PRINT_SANS = SANS_FONT_FAMILY;
/**
 * Print's figures, on the chart and in the panels: sans faces every system has
 * whose digits are one width as they come. San Francisco's are not, and the
 * chart's canvas can't ask for tabular figures, so it is left out.
 */
const PRINT_FIGURES = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
/**
 * The desktop trading platforms' small Windows face, and the nearest where
 * there is no Tahoma. Its digits are one width, so figures still line up.
 */
const DESK_SANS = "Tahoma, Verdana, 'Segoe UI', 'DejaVu Sans', sans-serif";

type Density = 'compact' | 'spacious';
type PresetBase = Omit<ResolvedWidgetUI, 'components' | 'preset' | 'density'> & {
  components: Partial<WidgetUIComponentRadius>;
  /** Its sizes when compact or spacious; the shared table when it has none. */
  density?: Record<Density, WidgetUISizes>;
};

const PRESETS: Record<WidgetUIPreset, PresetBase> = {
  /*
   * Print, the default: paper and ink, hairlines, figures that line up. It
   * keeps to the golden ratio. Sizes climb in half steps of φ from the icon
   * (16, 20, 26, 33, 42), the drawing tools' column the step after (53), corners are Fibonacci numbers, and a nested corner
   * is the one around it less the padding between (a menu's 5 = its rows'
   * 2 + its 3 of padding).
   */
  print: {
    radius: { xs: 1, sm: 2, md: 3, lg: 5, xl: 8 },
    components: { tag: 2, toolbar: 0, sidebar: 0 },
    sizes: { toolbar: 42, control: 26, controlSmall: 20, icon: 16, sidebar: 53, menuItem: 33 },
    // A half step of φ down or up; compact keeps its icons and small buttons whole.
    density: {
      compact: { toolbar: 33, control: 20, controlSmall: 20, icon: 16, sidebar: 33, menuItem: 26 },
      spacious: { toolbar: 53, control: 33, controlSmall: 26, icon: 20, sidebar: 62, menuItem: 42 },
    },
    font: { family: PRINT_SANS, mono: PRINT_FIGURES, size: 13, weight: 400, strongWeight: 600, labelCase: 'uppercase', labelTracking: 0.06 },
    borders: { width: 1, separators: true },
    // A hairline round each surface, and a soft shadow to lift it off the chart.
    shadows: {
      menu: '0 0 0 1px var(--tcw-border), var(--tcw-shadow-md)',
      dialog: '0 0 0 1px var(--tcw-border), var(--tcw-shadow-lg)',
      tooltip: 'var(--tcw-shadow-sm)',
    },
    blur: 0,
    active: 'solid',
    toolbar: 'docked',
    sidebar: 'docked',
    intervals: 'plain',
    tagRadius: 2,
  },
  studio: {
    radius: { xs: 3, sm: 5, md: 7, lg: 11, xl: 16 },
    components: { toolbar: 0, sidebar: 0 },
    sizes: { toolbar: 46, control: 30, controlSmall: 24, icon: 18, sidebar: 58, menuItem: 30 },
    font: { family: `'Manrope', 'Inter', ${SYSTEM_SANS}`, mono: MONO, size: 13, weight: 500, strongWeight: 600, labelCase: 'none', labelTracking: 0 },
    borders: { width: 1, separators: false },
    // Shadows from the theme's tokens, so they suit dark and light alike.
    shadows: { menu: 'var(--tcw-shadow-lg)', dialog: 'var(--tcw-shadow-xl)', tooltip: 'var(--tcw-shadow-md)' },
    blur: 0,
    active: 'tint',
    toolbar: 'docked',
    sidebar: 'docked',
    intervals: 'segmented',
    tagRadius: 4,
  },
  terminal: {
    radius: { xs: 1, sm: 2, md: 2, lg: 2, xl: 3 },
    components: { tag: 0, toolbar: 0, sidebar: 0 },
    sizes: { toolbar: 36, control: 26, controlSmall: 20, icon: 16, sidebar: 53, menuItem: 26 },
    font: {
      family: `'IBM Plex Sans Condensed', 'Roboto Condensed', 'Arial Narrow', ${SYSTEM_SANS}`,
      mono: "'IBM Plex Mono', ui-monospace, monospace",
      size: 12, weight: 500, strongWeight: 600, labelCase: 'uppercase', labelTracking: 0.08,
    },
    borders: { width: 1, separators: true },
    shadows: {
      menu: '0 0 0 1px var(--tcw-border-strong)',
      dialog: '0 0 0 1px var(--tcw-border-strong), var(--tcw-shadow-lg)',
      tooltip: 'none',
    },
    blur: 0,
    active: 'underline',
    toolbar: 'docked',
    sidebar: 'docked',
    intervals: 'plain',
    tagRadius: 0,
  },
  capsule: {
    radius: { xs: 6, sm: 10, md: 999, lg: 18, xl: 24 },
    components: { tooltip: 10, toolbar: 999, sidebar: 999, toast: 999, tag: 999 },
    sizes: { toolbar: 44, control: 32, controlSmall: 26, icon: 18, sidebar: 61, menuItem: 34 },
    font: { family: `'Sora', 'Manrope', ${SYSTEM_SANS}`, mono: MONO, size: 13, weight: 500, strongWeight: 600, labelCase: 'none', labelTracking: 0 },
    borders: { width: 1, separators: false },
    shadows: {
      menu: '0 0 0 1px var(--tcw-divider), var(--tcw-shadow-xl)',
      dialog: '0 0 0 1px var(--tcw-divider), var(--tcw-shadow-xl)',
      tooltip: 'var(--tcw-shadow-lg)',
    },
    blur: 16,
    active: 'solid',
    toolbar: 'floating',
    sidebar: 'floating',
    intervals: 'segmented',
    tagRadius: 999,
  },
  /*
   * Desk: a desktop trading platform's window. Tahoma at 12px throughout,
   * square corners, bars a step tighter, and buttons that show a tint.
   */
  desk: {
    radius: { xs: 0, sm: 1, md: 2, lg: 2, xl: 3 },
    components: { tag: 0, toolbar: 0, sidebar: 0 },
    sizes: { toolbar: 34, control: 24, controlSmall: 20, icon: 16, sidebar: 51, menuItem: 24 },
    font: { family: DESK_SANS, mono: DESK_SANS, size: 12, weight: 400, strongWeight: 700, labelCase: 'none', labelTracking: 0 },
    borders: { width: 1, separators: true },
    shadows: {
      menu: '0 0 0 1px var(--tcw-border-strong), var(--tcw-shadow-sm)',
      dialog: '0 0 0 1px var(--tcw-border-strong), var(--tcw-shadow-md)',
      tooltip: '0 0 0 1px var(--tcw-border)',
    },
    blur: 0,
    active: 'tint',
    toolbar: 'docked',
    sidebar: 'docked',
    intervals: 'plain',
    tagRadius: 0,
  },
};

/** Compact and spacious sizes for the looks without their own. */
const DENSITY: Record<Density, WidgetUISizes> = {
  compact: { toolbar: 38, control: 26, controlSmall: 20, icon: 16, sidebar: 40, menuItem: 26 },
  spacious: { toolbar: 52, control: 34, controlSmall: 28, icon: 20, sidebar: 63, menuItem: 34 },
};

/** Each part's corners from the scale (where the preset sets none of its own). */
function componentsFrom(radius: WidgetUIRadius, own: Partial<WidgetUIComponentRadius>): WidgetUIComponentRadius {
  return {
    control: radius.md,
    input: radius.md,
    menu: radius.lg,
    dialog: radius.xl,
    panel: radius.lg,
    tooltip: radius.sm,
    tag: radius.sm,
    toast: radius.lg,
    toolbar: 0,
    sidebar: 0,
    ...own,
  };
}

/** The presets, every token set. */
export const WIDGET_UI_PRESETS: Readonly<Record<WidgetUIPreset, Readonly<ResolvedWidgetUI>>> = Object.freeze(
  Object.fromEntries((Object.keys(PRESETS) as WidgetUIPreset[]).map((name) => [name, deepFreeze(resolvePreset(name))])) as Record<WidgetUIPreset, ResolvedWidgetUI>,
);

function resolvePreset(name: WidgetUIPreset): ResolvedWidgetUI {
  const { density: _density, ...base } = PRESETS[name];
  return {
    ...base,
    preset: name,
    density: 'comfortable',
    scale: 'auto',
    radius: { ...base.radius },
    components: componentsFrom(base.radius, base.components),
    sizes: { ...base.sizes },
    font: { ...base.font },
    borders: { ...base.borders },
    shadows: { ...base.shadows },
  };
}

function deepFreeze<T extends object>(value: T): T {
  for (const v of Object.values(value)) if (v && typeof v === 'object') deepFreeze(v as object);
  return Object.freeze(value);
}

const isPreset = (v: unknown): v is WidgetUIPreset => typeof v === 'string' && Object.prototype.hasOwnProperty.call(PRESETS, v);
const px = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
/**
 * CSS text that stays a value: no way out of the declaration, no URLs, and
 * nothing the browser would drop (an open quote or bracket, a comment).
 */
const cssValue = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= 300 && !/[;{}<>\\]|url\s*\(|expression\s*\(|\/\*/i.test(v) && balanced(v);

/** Quotes closed and brackets matched. */
function balanced(v: string): boolean {
  let depth = 0;
  let quote = '';
  for (const ch of v) {
    if (quote) {
      if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')' && --depth < 0) return false;
  }
  return depth === 0 && !quote;
}
const oneOf = <T extends string>(v: unknown, options: readonly T[]): v is T => typeof v === 'string' && (options as readonly string[]).includes(v);

function pick<T extends object>(base: T, over: Partial<Record<keyof T, unknown>> | undefined, ok: (key: keyof T, v: unknown) => boolean): T {
  const out = { ...base };
  if (!over || typeof over !== 'object') return out;
  for (const key of Object.keys(base) as (keyof T)[]) {
    const v = over[key];
    if (v !== undefined && ok(key, v)) (out as Record<keyof T, unknown>)[key] = v;
  }
  return out;
}

/**
 * Every token of a look: a preset by name, or your theme over its preset
 * (Print when none). What isn't a usable value is left at the preset's.
 */
export function resolveWidgetUI(theme?: WidgetUIPreset | WidgetUITheme): ResolvedWidgetUI {
  const t: WidgetUITheme = typeof theme === 'string' ? { preset: theme } : theme ?? {};
  const name: WidgetUIPreset = isPreset(t.preset) ? t.preset : DEFAULT_PRESET;
  const base = PRESETS[name];

  const radius = pick(base.radius, t.radius, (_, v) => px(v, 0, 999));
  const density = oneOf(t.density, ['compact', 'comfortable', 'spacious', 'airy'] as const) ? t.density : 'comfortable';
  const step = density === 'airy' ? 'spacious' : density;
  const stepSizes = step === 'compact' || step === 'spacious' ? (base.density ?? DENSITY)[step] : base.sizes;
  const sizes = pick(stepSizes, t.sizes, (key, v) => (key === 'icon' ? px(v, 10, 32) : px(v, 16, 80)));
  const picked = pick(base.font, t.font, (key, v) => {
    if (key === 'family' || key === 'mono') return cssValue(v);
    if (key === 'size') return px(v, 11, 20);
    if (key === 'weight' || key === 'strongWeight') return px(v, 100, 900);
    if (key === 'labelCase') return v === 'none' || v === 'uppercase';
    return px(v, 0, 0.5);
  });
  // Airy figures read in the look's own sans face, unless its figures face is set.
  const font = density === 'airy' && t.font?.mono === undefined ? { ...picked, mono: picked.family } : picked;
  // Corners the theme sets on the scale reach the parts that follow it.
  const components = pick(componentsFrom(radius, base.components), t.components, (_, v) => px(v, 0, 999));
  return {
    preset: name,
    density,
    radius,
    components,
    sizes,
    font,
    borders: pick(base.borders, t.borders, (key, v) => (key === 'width' ? px(v, 0, 4) : typeof v === 'boolean')),
    shadows: pick(base.shadows, t.shadows, (_, v) => cssValue(v)),
    blur: px(t.blur, 0, 40) ? t.blur : base.blur,
    active: oneOf(t.active, ['tint', 'solid', 'underline'] as const) ? t.active : base.active,
    toolbar: oneOf(t.toolbar, ['docked', 'floating'] as const) ? t.toolbar : base.toolbar,
    sidebar: oneOf(t.sidebar, ['docked', 'floating'] as const) ? t.sidebar : base.sidebar,
    intervals: oneOf(t.intervals, ['plain', 'segmented'] as const) ? t.intervals : base.intervals,
    tagRadius: px(t.tagRadius, 0, 999) ? t.tagRadius : base.tagRadius,
    scale: typeof t.scale === 'number' && Number.isFinite(t.scale) && t.scale >= MIN_SCALE && t.scale <= MAX_SCALE ? t.scale : 'auto',
  };
}

/** The look as the widget's CSS variables. */
export function widgetUIVariables(ui: ResolvedWidgetUI): Record<string, string> {
  const p = (n: number) => `${n}px`;
  const r = ui.radius;
  const c = ui.components;
  const s = ui.sizes;
  const f = ui.font;
  const tool = ui.density === 'compact' ? 1 : TOOL_STEP;
  return {
    '--tcw-radius-xs': p(r.xs),
    '--tcw-radius-sm': p(r.sm),
    '--tcw-radius': p(r.md),
    '--tcw-radius-lg': p(r.lg),
    '--tcw-radius-xl': p(r.xl),
    '--tcw-control-radius': p(c.control),
    '--tcw-input-radius': p(c.input),
    '--tcw-menu-radius': p(c.menu),
    '--tcw-dialog-radius': p(c.dialog),
    '--tcw-panel-radius': p(c.panel),
    '--tcw-tooltip-radius': p(c.tooltip),
    '--tcw-tag-radius': p(c.tag),
    '--tcw-toast-radius': p(c.toast),
    '--tcw-toolbar-radius': p(c.toolbar),
    '--tcw-sidebar-radius': p(c.sidebar),
    '--tcw-toolbar-h': p(s.toolbar),
    '--tcw-control-h': p(s.control),
    '--tcw-control-h-sm': p(s.controlSmall),
    '--tcw-icon': p(s.icon),
    '--tcw-sidebar-w': p(s.sidebar),
    '--tcw-tool-h': p(Math.round(s.control * tool)),
    // An even size, so a 24-unit icon's strokes land on whole pixels.
    '--tcw-tool-icon': p(2 * Math.round((s.icon * tool) / 2)),
    '--tcw-menu-item-h': p(s.menuItem),
    '--tcw-font': f.family,
    '--tcw-font-mono': f.mono,
    '--tcw-font-size': p(f.size),
    '--tcw-font-size-sm': p(typeSize(f.size, -1)),
    '--tcw-font-size-xs': p(typeSize(f.size, -2)),
    '--tcw-font-size-lg': p(typeSize(f.size, 1)),
    '--tcw-font-size-xl': p(typeSize(f.size, 2)),
    '--tcw-font-size-display': p(typeSize(f.size, 3)),
    '--tcw-weight': String(f.weight),
    '--tcw-weight-strong': String(f.strongWeight),
    '--tcw-label-case': f.labelCase,
    '--tcw-label-tracking': `${f.labelTracking}em`,
    '--tcw-border-w': p(ui.borders.width),
    '--tcw-sep-w': ui.borders.separators ? p(Math.max(1, ui.borders.width)) : '0px',
    '--tcw-menu-shadow': ui.shadows.menu,
    '--tcw-dialog-shadow': ui.shadows.dialog,
    '--tcw-tooltip-shadow': ui.shadows.tooltip,
    '--tcw-blur': p(ui.blur),
    // A frosted surface lets some of the chart through.
    '--tcw-surface-opacity': ui.blur > 0 ? '82%' : '100%',
  };
}

/**
 * Put the look on an element of the widget (its root, its modal portal):
 * its tokens inline and its layout switches as data attributes. With
 * `variables: false` only the switches; the tokens are left to the
 * stylesheet (whose defaults are Print's), and any set inline before are
 * cleared.
 */
export function applyWidgetUI(el: HTMLElement, ui: ResolvedWidgetUI, options: { variables?: boolean } = {}): void {
  const inline = options.variables !== false;
  for (const [name, value] of Object.entries(widgetUIVariables(ui))) {
    if (inline) el.style.setProperty(name, value);
    else el.style.removeProperty(name);
  }
  el.dataset.tcwUi = ui.preset;
  el.dataset.tcwActive = ui.active;
  el.dataset.tcwToolbar = ui.toolbar;
  el.dataset.tcwSidebar = ui.sidebar;
  el.dataset.tcwIntervals = ui.intervals;
  el.dataset.tcwSeparators = ui.borders.separators ? 'on' : 'off';
}
