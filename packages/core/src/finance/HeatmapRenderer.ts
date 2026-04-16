import type { HeatmapCell, HeatmapOptions, Theme } from '@tradecanvas/commons';
import { lerpColor } from '@tradecanvas/commons';
import type { LayoutRect } from './HeatmapLayout.js';

function defaultValueFormat(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return sign + value.toFixed(2) + '%';
}

function defaultLabelFormat(cell: HeatmapCell): string {
  return cell.label;
}

function computeCellColor(
  value: number,
  colorScale: NonNullable<HeatmapOptions['colorScale']>,
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
): void {
  if (rw < 40 || rh < 30) return;

  const cx = x + rw / 2;
  const cy = y + rh / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 2;
  ctx.fillStyle = '#FFFFFF';
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
): HeatmapHitResult | null {
  if (cells.length === 0 || layoutRects.length === 0 || width <= 0 || height <= 0) return null;

  const colorScale = options.colorScale ?? {
    negative: '#EF5350',
    zero: '#424242',
    positive: '#26A69A',
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

    drawCellText(ctx, cell, x, y, rw, rh, theme, showLabels, showValues, formatLabel, formatValue);

    if (lr.id === hoveredId) {
      roundRect(ctx, x, y, rw, rh, cellRadius);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  if (hitResult && crosshairPos) {
    drawTooltip(ctx, hitResult.cell, crosshairPos, width, height, theme, formatLabel, formatValue);
  }

  return hitResult;
}
