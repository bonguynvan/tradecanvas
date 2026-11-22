import type { HeatmapCell, HeatmapOptions, Theme } from '@tradecanvas/commons';
import { lerpColor } from '@tradecanvas/commons';
import type { GroupRect, LayoutRect } from './HeatmapLayout.js';
import type { CellImage } from './ImageStore.js';
import { drawTooltip, fitText, type TooltipLine } from './chartKit.js';
import { readableText, resolveColorScale } from './colorScale.js';

function defaultValueFormat(value: number): string {
  // A cell with no number shows its label alone.
  if (!Number.isFinite(value)) return '';
  const sign = value >= 0 ? '+' : '';
  return sign + value.toFixed(2) + '%';
}

function defaultLabelFormat(cell: HeatmapCell): string {
  return cell.label;
}

function computeCellColor(
  value: number,
  colorScale: { negative: string; zero: string; positive: string; min?: number; max?: number },
): string {
  const min = colorScale.min ?? -5;
  const max = colorScale.max ?? 5;

  // A value that is no number has no place on the scale: the colour of none.
  if (!Number.isFinite(value)) return colorScale.zero;
  if (value <= min) return colorScale.negative;
  if (value >= max) return colorScale.positive;

  if (value < 0) {
    const t = 1 - value / min;
    return lerpColor(colorScale.negative, colorScale.zero, t);
  }
  const t = value / max;
  return lerpColor(colorScale.zero, colorScale.positive, t);
}

const WHITE_INK = '#FFFFFF';
/** The dark ink, as `readableText` gives it. */
const DARK_INK = '#11151b';

/**
 * The ink of a cell's label: white or the dark ink, whichever reads better
 * on the cell as drawn over `background` (a see-through one blended into
 * it), so a label reads at 4.5:1 wherever either ink can: on a mid-tone
 * cell (a light theme's month at -3.4%) white reads at 3.1:1, the dark ink
 * at 5.9:1.
 */
export function cellLabelInk(fill: string, background: string): string {
  const seeThrough = /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i.exec(fill.trim());
  const drawn = seeThrough
    ? lerpColor(background, `rgb(${seeThrough[1]},${seeThrough[2]},${seeThrough[3]})`, Number(seeThrough[4]))
    : lerpColor(fill, fill, 0);
  return readableText(drawn) === DARK_INK ? DARK_INK : WHITE_INK;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

export type { CellImage };

export interface HeatmapHitResult {
  cell: HeatmapCell;
  rect: LayoutRect;
}

/** The least a cell is across and down for its name and its value to be written in it. */
const TEXT_MIN_WIDTH = 40;
const TEXT_MIN_HEIGHT = 30;
/** A hair between a cell's name and the line it meets its value on, and the same under it. */
const LINE_GAP = 1;
/** A logo is a third of its cell's shorter side, forty at the most; one under fourteen is left out. */
const LOGO_SHARE = 1 / 3;
const LOGO_MOST = 40;
const LOGO_LEAST = 14;
/** Room between a logo and the text under it, and between a cell's edge and what it holds. */
const LOGO_GAP = 4;
const CELL_PAD = 4;
/** How round a logo's plate is, as a share of its side. */
const LOGO_CORNER = 0.22;
/** The plate under a logo: white, as the page most logos are drawn for, whatever the cell's colour. */
const LOGO_PLATE = '#FFFFFF';

/** A line a cell writes, and the size it is written in. */
interface CellLine {
  text: string;
  size: number;
}

/** What a cell writes: its name, its value, or both. */
interface CellText {
  label: CellLine | null;
  value: CellLine | null;
}

/** What a cell of a size writes; null for one too small to write in, and for one that writes nothing. */
function cellText(
  cell: HeatmapCell,
  rw: number,
  rh: number,
  theme: Theme,
  showLabels: boolean,
  showValues: boolean,
  formatLabel: (c: HeatmapCell) => string,
  formatValue: (v: number) => string,
): CellText | null {
  if (rw < TEXT_MIN_WIDTH || rh < TEXT_MIN_HEIGHT || (!showLabels && !showValues)) return null;
  let label: CellLine | null = null;
  let value: CellLine | null = null;
  if (showLabels) {
    const text = formatLabel(cell);
    label = { text, size: Math.max(8, Math.min(theme.font.sizeMedium, rw / text.length * 1.5, rh / 4)) };
  }
  if (showValues) {
    const text = formatValue(cell.value);
    value = { text, size: Math.max(7, Math.min(theme.font.sizeSmall, rw / text.length * 1.5, rh / 4)) };
  }
  return { label, value };
}

/** How tall what a cell writes is: its name over its value, or the one of them it writes. */
function textHeight(text: CellText | null): number {
  if (!text) return 0;
  if (text.label && text.value) return text.label.size + 2 * LINE_GAP + text.value.size;
  return (text.label ?? text.value)?.size ?? 0;
}

/**
 * A cell's name and value about the line `ty`: the name ending a hair over
 * it and the value starting a hair under it, or the one of them the cell
 * writes, in its middle.
 */
function drawCellText(
  ctx: CanvasRenderingContext2D,
  text: CellText,
  cx: number,
  ty: number,
  rw: number,
  theme: Theme,
  ink: string,
): void {
  ctx.save();
  // A shadow lifts white off a strong cell; the dark ink on a pale one needs none.
  const white = ink === WHITE_INK;
  ctx.shadowColor = white ? 'rgba(0,0,0,0.6)' : 'transparent';
  ctx.shadowBlur = white ? 2 : 0;
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';

  if (text.label) {
    ctx.font = 'bold ' + text.label.size + 'px ' + theme.font.family;
    ctx.textBaseline = text.value ? 'bottom' : 'middle';
    ctx.fillText(text.label.text, cx, text.value ? ty - LINE_GAP : ty, rw - 8);
  }

  if (text.value) {
    ctx.font = text.value.size + 'px ' + theme.font.family;
    ctx.textBaseline = text.label ? 'top' : 'middle';
    ctx.fillText(text.value.text, cx, text.label ? ty + LINE_GAP : ty, rw - 8);
  }

  ctx.restore();
}

/** The side of a cell's logo, px; 0 where the cell has no room for one over what it writes. */
function logoSide(rw: number, rh: number, textH: number): number {
  const wanted = Math.min(LOGO_MOST, Math.round(Math.min(rw, rh) * LOGO_SHARE));
  const down = rh - 2 * CELL_PAD - (textH > 0 ? LOGO_GAP + textH : 0);
  const side = Math.floor(Math.min(wanted, down, rw - 2 * CELL_PAD));
  return side >= LOGO_LEAST ? side : 0;
}

/** A logo on its plate, a square with round corners: the picture whole inside it, whatever its shape. */
function drawLogo(ctx: CanvasRenderingContext2D, image: CellImage, x: number, y: number, side: number): void {
  ctx.save();
  roundRect(ctx, x, y, side, side, side * LOGO_CORNER);
  ctx.fillStyle = LOGO_PLATE;
  ctx.fill();
  ctx.clip();
  const scale = Math.min(side / image.width, side / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image.source, x + (side - width) / 2, y + (side - height) / 2, width, height);
  ctx.restore();
}

/** A cell's name, its value, and whatever else it carries, as the tooltip's lines. */
function tooltipLines(cell: HeatmapCell, color: string | undefined, formatLabel: (c: HeatmapCell) => string, formatValue: (v: number) => string): TooltipLine[] {
  const lines: TooltipLine[] = [{ text: formatLabel(cell), bold: true }];
  const value = formatValue(cell.value);
  if (value !== '') lines.push({ text: value, color });
  for (const [key, val] of Object.entries(cell.meta ?? {})) lines.push({ text: key + ': ' + String(val) });
  return lines;
}

export function renderHeatmap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cells: readonly HeatmapCell[],
  layoutRects: readonly LayoutRect[],
  options: HeatmapOptions,
  theme: Theme,
  crosshairPos: { x: number; y: number } | null,
  groups: readonly GroupRect[] = [],
  /** A cell's logo as a picture ready to be drawn; null for one that has not come. With none given, no logo is drawn. */
  logoOf?: (cell: HeatmapCell) => CellImage | null,
): HeatmapHitResult | null {
  if (width <= 0 || height <= 0) return null;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  if (cells.length === 0 || layoutRects.length === 0) return null;

  // The theme's own colours for a fall and a rise, and a faint surface of it
  // for none, unless the options give others. The range stays the options':
  // five either side of zero when they give none.
  const given = options.colorScale;
  const themed = resolveColorScale([], theme, given);
  const colorScale = { negative: themed.negative, zero: themed.zero, positive: themed.positive, min: given?.min, max: given?.max };
  const cellRadius = options.cellRadius ?? 4;
  const showLabels = options.showLabels !== false;
  const showValues = options.showValues !== false;
  const showLogos = options.showLogos !== false;
  const writes = showLabels || showValues;
  const formatValue = options.valueFormat ?? defaultValueFormat;
  const formatLabel = options.labelFormat ?? defaultLabelFormat;

  const cellMap = new Map<string, HeatmapCell>();
  for (const c of cells) cellMap.set(c.id, c);

  let hoveredId: string | null = null;
  let hitResult: HeatmapHitResult | null = null;

  if (crosshairPos) {
    for (const lr of layoutRects) {
      const { x, y, width: rw, height: rh } = lr.rect;
      if (
        crosshairPos.x >= x &&
        crosshairPos.x <= x + rw &&
        crosshairPos.y >= y &&
        crosshairPos.y <= y + rh
      ) {
        hoveredId = lr.id;
        const cell = cellMap.get(lr.id);
        if (cell) {
          hitResult = { cell, rect: lr };
        }
        break;
      }
    }
  }

  for (const lr of layoutRects) {
    const cell = cellMap.get(lr.id);
    if (!cell) continue;

    const { x, y, width: rw, height: rh } = lr.rect;
    if (rw <= 0 || rh <= 0) continue;

    const bgColor = computeCellColor(cell.value, colorScale);
    roundRect(ctx, x, y, rw, rh, cellRadius);
    ctx.fillStyle = bgColor;
    ctx.fill();

    const text = cellText(cell, rw, rh, theme, showLabels, showValues, formatLabel, formatValue);
    const textH = textHeight(text);
    const cx = x + rw / 2;
    const cy = y + rh / 2;
    // A logo goes before the text does: a cell too small to write in has none either.
    const roomForLogo = showLogos && logoOf !== undefined && !!cell.logo && (text !== null || !writes);
    const side = roomForLogo ? logoSide(rw, rh, textH) : 0;
    // Asked for only where it will be drawn: asking is what starts a picture loading.
    const image = side > 0 && logoOf ? logoOf(cell) : null;
    let ty = cy;
    if (image) {
      // The logo and the text under it, together in the middle of the cell.
      const top = Math.round(cy - (side + (textH > 0 ? LOGO_GAP + textH : 0)) / 2);
      drawLogo(ctx, image, Math.round(cx - side / 2), top, side);
      ty = top + side + LOGO_GAP + (text?.label && text.value ? text.label.size + LINE_GAP : textH / 2);
    }
    if (text) drawCellText(ctx, text, cx, ty, rw, theme, cellLabelInk(bgColor, theme.background));

    if (lr.id === hoveredId) {
      roundRect(ctx, x, y, rw, rh, cellRadius);
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  const hoveredGroup = crosshairPos && !hitResult ? groups.find((g) => g.header > 0 && inHeader(g, crosshairPos)) : undefined;
  drawGroupHeaders(ctx, groups, theme, formatValue, hoveredGroup);

  if (hitResult && crosshairPos) {
    const lines = tooltipLines(hitResult.cell, computeCellColor(hitResult.cell.value, colorScale), formatLabel, formatValue);
    drawTooltip(ctx, lines, crosshairPos, { x: 0, y: 0, width, height }, theme);
  } else if (hoveredGroup && crosshairPos) {
    const lines = tooltipLines({ id: '', label: hoveredGroup.name, value: hoveredGroup.value }, undefined, (c) => c.label, formatValue);
    drawTooltip(ctx, lines, crosshairPos, { x: 0, y: 0, width, height }, theme);
  }

  return hitResult;
}

function inHeader(g: GroupRect, p: { x: number; y: number }): boolean {
  const r = g.rect;
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + g.header;
}

/** Each group's name and its weighted change, in the strip above its cells. */
function drawGroupHeaders(
  ctx: CanvasRenderingContext2D,
  groups: readonly GroupRect[],
  theme: Theme,
  formatValue: (v: number) => string,
  hovered: GroupRect | undefined,
): void {
  if (groups.length === 0) return;
  ctx.save();
  ctx.textBaseline = 'middle';
  const size = theme.font.sizeSmall;
  const measure = (t: string) => ctx.measureText(t).width;
  for (const g of groups) {
    if (g.header <= 0) continue;
    const { x, y, width } = g.rect;
    const cy = y + g.header / 2 + 1;
    ctx.font = size + 'px ' + theme.font.family;
    const valueText = formatValue(g.value);
    const valueWidth = measure(valueText);
    const showValue = width >= valueWidth * 2 + 24;
    if (showValue) {
      ctx.textAlign = 'right';
      ctx.fillStyle = g.value < 0 ? theme.candleDown : g.value > 0 ? theme.candleUp : theme.textSecondary;
      ctx.fillText(valueText, x + width - 5, cy);
    }
    ctx.font = '600 ' + size + 'px ' + theme.font.family;
    ctx.textAlign = 'left';
    ctx.fillStyle = g === hovered ? theme.text : theme.textSecondary;
    const room = width - 10 - (showValue ? valueWidth + 8 : 0);
    const name = fitText(g.name, room, (t) => measure(t), size);
    if (name) ctx.fillText(name, x + 5, cy);
  }
  ctx.restore();
}
