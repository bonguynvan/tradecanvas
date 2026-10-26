import type { HeatmapCell, HeatmapOptions, Theme } from '@tradecanvas/commons';
import { lerpColor } from '@tradecanvas/commons';
import type { GroupRect, LayoutRect } from './HeatmapLayout.js';
import { fitText } from './chartKit.js';

function defaultValueFormat(value: number): string {
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
const DARK_INK = '#11151b';
/** Below this contrast with its cell a white label gives way to the dark ink: a pale cell, such as a light theme's month near zero. */
const WHITE_LABEL_MIN_CONTRAST = 3;

function relativeLuminance(rgb: readonly number[]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The ink of a cell's label: white, as the labels have always been, unless
 * the cell as drawn over `background` (a see-through one blended into it) is
 * too pale for white; then the dark ink.
 */
export function cellLabelInk(fill: string, background: string): string {
  const seeThrough = /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i.exec(fill.trim());
  const drawn = seeThrough
    ? lerpColor(background, `rgb(${seeThrough[1]},${seeThrough[2]},${seeThrough[3]})`, Number(seeThrough[4]))
    : lerpColor(fill, fill, 0);
  const rgb = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(drawn);
  if (!rgb) return WHITE_INK;
  const whiteContrast = 1.05 / (relativeLuminance(rgb.slice(1).map(Number)) + 0.05);
  return whiteContrast >= WHITE_LABEL_MIN_CONTRAST ? WHITE_INK : DARK_INK;
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

export interface HeatmapHitResult {
  cell: HeatmapCell;
  rect: LayoutRect;
}

function drawCellText(
  ctx: CanvasRenderingContext2D,
  cell: HeatmapCell,
  x: number,
  y: number,
  rw: number,
  rh: number,
  theme: Theme,
  showLabels: boolean,
  showValues: boolean,
  formatLabel: (c: HeatmapCell) => string,
  formatValue: (v: number) => string,
  ink: string,
): void {
  if (rw < 40 || rh < 30) return;

  const cx = x + rw / 2;
  const cy = y + rh / 2;

  ctx.save();
  // A shadow lifts white off a strong cell; the dark ink on a pale one needs none.
  const white = ink === WHITE_INK;
  ctx.shadowColor = white ? 'rgba(0,0,0,0.6)' : 'transparent';
  ctx.shadowBlur = white ? 2 : 0;
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';

  if (showLabels) {
    const labelText = formatLabel(cell);
    const fontSize = Math.min(theme.font.sizeMedium, rw / labelText.length * 1.5, rh / 4);
    ctx.font = 'bold ' + Math.max(8, fontSize) + 'px ' + theme.font.family;
    ctx.textBaseline = showValues ? 'bottom' : 'middle';
    ctx.fillText(labelText, cx, showValues ? cy - 1 : cy, rw - 8);
  }

  if (showValues) {
    const valText = formatValue(cell.value);
    const valSize = Math.min(theme.font.sizeSmall, rw / valText.length * 1.5, rh / 4);
    ctx.font = Math.max(7, valSize) + 'px ' + theme.font.family;
    ctx.textBaseline = showLabels ? 'top' : 'middle';
    ctx.fillText(valText, cx, showLabels ? cy + 1 : cy, rw - 8);
  }

  ctx.restore();
}

function drawTooltip(
  ctx: CanvasRenderingContext2D,
  cell: HeatmapCell,
  crosshairPos: { x: number; y: number },
  width: number,
  height: number,
  theme: Theme,
  formatLabel: (c: HeatmapCell) => string,
  formatValue: (v: number) => string,
): void {
  const lines = [
    formatLabel(cell),
    formatValue(cell.value),
  ];
  if (cell.meta) {
    for (const [key, val] of Object.entries(cell.meta)) {
      lines.push(key + ': ' + String(val));
    }
  }

  ctx.save();
  ctx.font = theme.font.sizeSmall + 'px ' + theme.font.family;
  const maxTextW = Math.max(...lines.map(l => ctx.measureText(l).width));
  const tooltipW = maxTextW + 16;
  const lineH = theme.font.sizeSmall + 4;
  const tooltipH = lines.length * lineH + 12;

  let tx = crosshairPos.x + 14;
  let ty = crosshairPos.y - tooltipH / 2;
  if (tx + tooltipW > width) tx = crosshairPos.x - tooltipW - 14;
  if (ty < 0) ty = 0;
  if (ty + tooltipH > height) ty = height - tooltipH;

  ctx.fillStyle = theme.axisLabelBackground;
  ctx.globalAlpha = 0.92;
  roundRect(ctx, tx, ty, tooltipW, tooltipH, 4);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.text;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], tx + 8, ty + 6 + i * lineH);
  }
  ctx.restore();
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
): HeatmapHitResult | null {
  if (cells.length === 0 || layoutRects.length === 0 || width <= 0 || height <= 0) return null;

  const given = options.colorScale;
  const colorScale = {
    negative: given?.negative ?? '#e8505b',
    zero: given?.zero ?? '#424242',
    positive: given?.positive ?? '#1fa874',
    min: given?.min,
    max: given?.max,
  };
  const cellRadius = options.cellRadius ?? 4;
  const showLabels = options.showLabels !== false;
  const showValues = options.showValues !== false;
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

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  for (const lr of layoutRects) {
    const cell = cellMap.get(lr.id);
    if (!cell) continue;

    const { x, y, width: rw, height: rh } = lr.rect;
    if (rw <= 0 || rh <= 0) continue;

    const bgColor = computeCellColor(cell.value, colorScale);
    roundRect(ctx, x, y, rw, rh, cellRadius);
    ctx.fillStyle = bgColor;
    ctx.fill();

    drawCellText(ctx, cell, x, y, rw, rh, theme, showLabels, showValues, formatLabel, formatValue, cellLabelInk(bgColor, theme.background));

    if (lr.id === hoveredId) {
      roundRect(ctx, x, y, rw, rh, cellRadius);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  const hoveredGroup = crosshairPos && !hitResult ? groups.find((g) => g.header > 0 && inHeader(g, crosshairPos)) : undefined;
  drawGroupHeaders(ctx, groups, theme, formatValue, hoveredGroup);

  if (hitResult && crosshairPos) {
    drawTooltip(ctx, hitResult.cell, crosshairPos, width, height, theme, formatLabel, formatValue);
  } else if (hoveredGroup && crosshairPos) {
    drawTooltip(ctx, { id: '', label: hoveredGroup.name, value: hoveredGroup.value }, crosshairPos, width, height, theme, (c) => c.label, formatValue);
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
