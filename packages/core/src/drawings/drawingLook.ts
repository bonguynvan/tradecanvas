/**
 * How every drawing is drawn: the sizes of its type, its faces, its handles,
 * its dashes, its fills and the ink on its tags, worked out once from the
 * theme as each drawing pass starts (`setDrawingLook`), so the tools share
 * one look instead of each keeping numbers of its own.
 */
import type { DrawingStyle, Theme } from '@tradecanvas/commons';
import { DEFAULT_FONT_FAMILY, SANS_FONT_FAMILY, inkOn, ownFillColor, readableOn, withAlpha } from '@tradecanvas/commons';

/** The type drawings set their words and figures in, px. */
export interface DrawingTypeSizes {
  /** Dense marks on a tool: a Gann box's divisions, a volume profile's point of control. */
  mark: number;
  /** Figures and short labels: a level's price, a ratio, a measure, a stats box. */
  label: number;
  /** A pattern's or a wave's point letters. */
  letter: number;
  /** Text people write: a Text drawing, a note, a callout, the words on a line. */
  text: number;
}

export type DrawingTypeRole = keyof DrawingTypeSizes;

export interface DrawingLook {
  sizes: DrawingTypeSizes;
  /** The chart's face: the figures drawings print. */
  figures: string;
  /** The face for words people write on drawings. */
  prose: string;
  /** The chart's background: handles are filled with it, text is haloed in it. */
  background: string;
  /** The chart's text colour: the ink of label boxes. */
  ink: string;
  /** A handle's fill. */
  handleFill: string;
  /** How much bigger than the default the chart's type is (1 at the default, more on a wide widget). */
  scale: number;
}

/** The axis type size the drawing sizes are reckoned from. */
const BASE_AXIS_SIZE = 11;
/** The smallest each role is set at, px: below them the labels stop reading over bars. */
const MIN_SIZES: DrawingTypeSizes = { mark: 11, label: 12, letter: 13, text: 14 };
/** How far over the axis type each role sits, px. */
const OVER_AXIS: DrawingTypeSizes = { mark: 0, label: 1, letter: 2, text: 3 };
/** The size every drawing was saved with before the type was set by role: read as no size of its own. */
const LEGACY_FONT_SIZE = 12;
/** How strongly a drawing's area is tinted with its line's colour. */
export const FILL_ALPHA = 0.12;
const DARK_BACKGROUND = '#131416';
const DARK_INK = '#e6e3dc';

/** What a look is worked out from: a theme, or the parts of one a drawing pass has. */
export type LookTheme = Pick<Theme, 'background' | 'style'> & { text?: string; font?: Partial<Theme['font']> };

function lookFor(theme: LookTheme | null): DrawingLook {
  const font = theme?.font;
  const axis = font?.sizeSmall ?? BASE_AXIS_SIZE;
  const size = (role: DrawingTypeRole) => Math.max(MIN_SIZES[role], axis + OVER_AXIS[role]);
  const background = theme?.background ?? DARK_BACKGROUND;
  return {
    sizes: { mark: size('mark'), label: size('label'), letter: size('letter'), text: size('text') },
    figures: font?.family || DEFAULT_FONT_FAMILY,
    prose: font?.textFamily || SANS_FONT_FAMILY,
    background,
    ink: theme?.text ?? DARK_INK,
    handleFill: theme?.style?.drawings.handle ?? background,
    scale: Math.max(1, axis / BASE_AXIS_SIZE),
  };
}

let look: DrawingLook = lookFor(null);

/** The plot the drawing being drawn is clipped to: its labels keep inside it. */
let plot: { x: number; y: number; width: number; height: number } | null = null;

/** The plot of the drawing about to be drawn (its pane's); none lets labels go anywhere. */
export function setDrawingPlot(rect: { x: number; y: number; width: number; height: number } | null): void {
  plot = rect;
}

/** How far in from the plot's edges a label keeps, px. */
const PLOT_INSET = 4;

/**
 * Where a label `width` × `height` with its top-left at (left, top) goes so it
 * stays on the plot: moved in from an edge it would cross, as far as it fits.
 */
export function keepOnPlot(left: number, top: number, width: number, height: number): { left: number; top: number } {
  if (!plot) return { left, top };
  const maxLeft = plot.x + plot.width - PLOT_INSET - width;
  const maxTop = plot.y + plot.height - PLOT_INSET - height;
  return {
    left: Math.max(plot.x + PLOT_INSET, Math.min(left, maxLeft)),
    top: Math.max(plot.y + PLOT_INSET, Math.min(top, maxTop)),
  };
}

/**
 * The look the next drawing pass draws in, from its theme; none puts the
 * default back. Set by the drawing renderer right before each (synchronous)
 * pass.
 */
export function setDrawingLook(theme: LookTheme | null): void {
  look = lookFor(theme);
}

/** The look of the pass being drawn. */
export function drawingLook(): DrawingLook {
  return look;
}

/** A font for a role's text in the pass's look: figures in the chart's face, words in the prose face. */
export function roleFont(role: DrawingTypeRole, options: { weight?: number | 'bold'; prose?: boolean } = {}): string {
  const weight = options.weight ? `${options.weight} ` : '';
  return `${weight}${look.sizes[role]}px ${options.prose ? look.prose : look.figures}`;
}

/** The size a drawing's text is set at: its own, or its role's when it has none (or the old default). */
export function textSize(style: Pick<DrawingStyle, 'fontSize'>, role: DrawingTypeRole = 'text'): number {
  const own = style.fontSize;
  return own && own !== LEGACY_FONT_SIZE ? own : look.sizes[role];
}

/** An arrowhead's length for a line `lineWidth` px wide: long enough to stay a point on a thick line. */
export function arrowHeadSize(lineWidth: number): number {
  return ARROW_HEAD_BASE + ARROW_HEAD_GROWTH * Math.max(1, Number.isFinite(lineWidth) ? lineWidth : 1);
}
const ARROW_HEAD_BASE = 9;
const ARROW_HEAD_GROWTH = 3;

/** Text colours that read, by colour, background and ink: worked out once, not on every frame. */
const readable = new Map<string, string>();
const READABLE_CACHE_SIZE = 64;
/** The contrast a drawing's small text keeps on the chart's background (WCAG). */
const TEXT_CONTRAST = 4.5;

/** `color`, deepened toward the chart's text colour as far as it must to read as small text on its background. */
export function readableText(color: string): string {
  const key = `${color}|${look.background}|${look.ink}`;
  let out = readable.get(key);
  if (out === undefined) {
    if (readable.size >= READABLE_CACHE_SIZE) readable.clear();
    out = readableOn(color, look.background, look.ink, TEXT_CONTRAST);
    readable.set(key, out);
  }
  return out;
}

/** A handle's radius for a line `lineWidth` px wide: a ring always wider than the line it sits on. */
export function handleRadius(lineWidth: number, scale = look.scale): number {
  const w = Math.max(1, Number.isFinite(lineWidth) ? lineWidth : 1);
  return Math.min(HANDLE_MAX_RADIUS, HANDLE_RADIUS + HANDLE_GROWTH * (w - 1)) * scale;
}
const HANDLE_RADIUS = 4.5;
const HANDLE_GROWTH = 0.75;
const HANDLE_MAX_RADIUS = 8;

/**
 * A line style's dash pattern for a line `lineWidth` px wide: dashes and gaps
 * in proportion to the line, dots as round dots (a 0 dash on a round cap).
 */
export function dashFor(style: DrawingStyle['lineStyle'] | 'guide', lineWidth: number): number[] {
  const w = Math.max(1, lineWidth);
  switch (style) {
    case 'dashed': return [Math.max(5, 3 * w), Math.max(4, 2 * w)];
    case 'dotted': return [0, Math.max(3, 2.5 * w)];
    case 'guide': return [3, 3];
    default: return [];
  }
}

/** A drawing's area fill: its own, or its line's colour tinted (the old blue default counts as none). */
export function drawingFill(style: Pick<DrawingStyle, 'color' | 'fillColor'>, alpha = FILL_ALPHA): string {
  return ownFillColor(style) ?? withAlpha(style.color, alpha);
}

/** Whether a drawing has a fill of its own, set by hand (the old default doesn't count). */
export function hasOwnFill(style: Pick<DrawingStyle, 'fillColor'>): boolean {
  return ownFillColor(style) !== undefined;
}

/** The ink for text on a tag of `fill`: black or white, whichever reads. */
export function labelInk(fill: string): string {
  return inkOn(fill, '#0b0d10', '#ffffff');
}
