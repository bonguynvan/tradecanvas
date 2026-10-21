import type { MatrixCell, MatrixChartOptions, Theme } from '@tradecanvas/commons';
import { LABEL_SIZE, canvasMeasure, drawTooltip, fitText, fontOf, type Measure, type Rect } from './chartKit.js';
import { COLOR_BAR_ROOM, drawColorBar, readableText, resolveColorScale, scaleColor, type ResolvedScale } from './colorScale.js';

/** Rows and columns past this many are left out: their cells would be under a pixel. */
export const MAX_MATRIX_SIZE = 200;
const PAD = 12;
const LABEL_GAP = 6;
const MAX_PITCH = 72;
/** Column names turned this far, when they don't fit across their cells. */
const TURN = Math.PI / 4;
const SIN_TURN = Math.sin(TURN);

/**
 * Pearson correlations between series, `[i][j]` for series i and j: pass
 * returns (day-on-day changes), not prices. Each pair uses the positions
 * where both have a finite value; fewer than three, or a series that never
 * moves, gives NaN. It runs on the calling thread: 200 series of 1,000
 * values take some tens of milliseconds. Colour the result with
 * `colorScale: { min: -1, max: 1 }`, so 0.5 doesn't look like 1.
 */
export function correlationMatrix(series: readonly (readonly number[])[]): number[][] {
  const n = series.length;
  const out = Array.from({ length: n }, () => new Array<number>(n).fill(Number.NaN));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const r = pearson(series[i], series[j], i === j);
      out[i][j] = r;
      out[j][i] = r;
    }
  }
  return out;
}

function pearson(a: readonly number[], b: readonly number[], same: boolean): number {
  const len = Math.min(a.length, b.length);
  let count = 0;
  let sa = 0;
  let sb = 0;
  for (let k = 0; k < len; k++) {
    if (Number.isFinite(a[k]) && Number.isFinite(b[k])) {
      count++;
      sa += a[k];
      sb += b[k];
    }
  }
  if (count < 3) return Number.NaN;
  const ma = sa / count;
  const mb = sb / count;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let k = 0; k < len; k++) {
    if (!Number.isFinite(a[k]) || !Number.isFinite(b[k])) continue;
    const da = a[k] - ma;
    const db = b[k] - mb;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  if (saa === 0 || sbb === 0) return Number.NaN;
  if (same) return 1;
  return Math.max(-1, Math.min(1, sab / Math.sqrt(saa * sbb)));
}

export interface MatrixCellRect {
  x: number;
  y: number;
  size: number;
  cell: MatrixCell;
  color: string;
  /** The value printed in the cell, when it fits. */
  text: string | null;
  textColor: string;
}

export interface MatrixLayout {
  cells: MatrixCellRect[];
  rowLabels: { text: string; index: number; x: number; y: number }[];
  columnLabels: { text: string; index: number; x: number; y: number; rotated: boolean }[];
  /** The whole grid, every row and column, empty cells included. */
  grid: Rect;
  pitch: number;
  scale: ResolvedScale;
  bar: Rect | null;
  /** The cell at `[row][column]`, if one is drawn there. */
  at: (MatrixCellRect | undefined)[][];
}

const twoDecimals = (v: number) => v.toFixed(2);

function keeps(triangle: MatrixChartOptions['triangle'], square: boolean, r: number, c: number): boolean {
  if (!square || !triangle) return true;
  return triangle === 'lower' ? c <= r : c >= r;
}

/** Square cells in rows and columns, named along the left and the top, for a chart `width` × `height`. */
export function computeMatrixLayout(options: MatrixChartOptions, width: number, height: number, theme: Theme, measure: Measure): MatrixLayout {
  const rows = options.rows.slice(0, MAX_MATRIX_SIZE);
  const columns = (options.columns ?? options.rows).slice(0, MAX_MATRIX_SIZE);
  const square = options.columns === undefined || (options.columns.length === options.rows.length && options.columns.every((c, i) => c === options.rows[i]));
  const finite: number[] = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < columns.length; c++) {
      const v = options.values[r]?.[c];
      if (Number.isFinite(v) && keeps(options.triangle, square, r, c)) finite.push(v);
    }
  }
  const scale = resolveColorScale(finite, theme, options.colorScale);
  const layout: MatrixLayout = { cells: [], rowLabels: [], columnLabels: [], grid: { x: 0, y: 0, width: 0, height: 0 }, pitch: 0, scale, bar: null, at: [] };
  if (rows.length === 0 || columns.length === 0 || width <= 0 || height <= 0) return layout;

  const rowRoom = Math.min(width * 0.3, Math.max(...rows.map((t) => measure(t, LABEL_SIZE))));
  const colWidest = Math.max(...columns.map((t) => measure(t, LABEL_SIZE)));
  const legendRoom = options.legend === false ? 0 : COLOR_BAR_ROOM;
  const left = PAD + rowRoom + LABEL_GAP;
  const across = width - left - PAD;
  const fitPitch = (top: number) => Math.min(MAX_PITCH, across / columns.length, (height - top - PAD - legendRoom) / rows.length);

  let top = PAD + LABEL_SIZE + LABEL_GAP;
  let pitch = fitPitch(top);
  const rotated = colWidest > pitch - 4;
  let colRoom = colWidest;
  if (rotated) {
    // Turned names need height: up to a third of the chart's, cut to fit it.
    colRoom = Math.min(colWidest, (height * 0.33) / SIN_TURN);
    top = PAD + colRoom * SIN_TURN + LABEL_SIZE;
    pitch = fitPitch(top);
  }
  if (!(pitch > 0)) return layout;
  const gap = pitch >= 8 ? 1 : 0;
  const size = pitch - gap;
  const gridX = left + Math.max(0, (across - columns.length * pitch) / 2);
  // Turned names lean left over the row names: no further than the chart's edge.
  if (rotated) colRoom = Math.max(0, Math.min(colRoom, (gridX + size / 2 - 2 - (LABEL_SIZE * SIN_TURN) / 2) / SIN_TURN));
  layout.grid = { x: gridX, y: top, width: columns.length * pitch, height: rows.length * pitch };
  layout.pitch = pitch;

  const format = options.valueFormat ?? twoDecimals;
  const showValues = options.showValues !== false;
  const valueSize = Math.max(8, Math.min(LABEL_SIZE, pitch / 3));
  for (let r = 0; r < rows.length; r++) {
    layout.at.push([]);
    for (let c = 0; c < columns.length; c++) {
      const value = options.values[r]?.[c];
      if (!Number.isFinite(value) || !keeps(options.triangle, square, r, c)) continue;
      const color = scaleColor(value, scale);
      const text = showValues ? format(value) : '';
      const fits = showValues && pitch >= 18 && measure(text, valueSize) <= pitch - 4;
      const placed: MatrixCellRect = {
        x: gridX + c * pitch,
        y: top + r * pitch,
        size,
        cell: { row: rows[r], column: columns[c], value, rowIndex: r, columnIndex: c },
        color,
        text: fits ? text : null,
        textColor: readableText(color),
      };
      layout.cells.push(placed);
      layout.at[r][c] = placed;
    }
  }

  // Names a line apart at least; turned ones sit closer across their slant.
  const rowEvery = Math.max(1, Math.ceil(LABEL_SIZE / pitch));
  const colEvery = Math.max(1, Math.ceil(LABEL_SIZE / (rotated ? pitch * SIN_TURN : pitch)));
  for (let r = 0; r < rows.length; r += rowEvery) {
    layout.rowLabels.push({ text: fitText(rows[r], rowRoom, measure), index: r, x: gridX - LABEL_GAP, y: top + r * pitch + size / 2 });
  }
  for (let c = 0; c < columns.length; c += colEvery) {
    layout.columnLabels.push({ text: fitText(columns[c], colRoom, measure), index: c, x: gridX + c * pitch + size / 2, y: top - LABEL_GAP, rotated });
  }
  if (legendRoom > 0) layout.bar = { x: gridX, y: top + rows.length * pitch + 8, width: Math.min(layout.grid.width, width - gridX - PAD), height: legendRoom - 8 };
  return layout;
}

/** The cell under the pointer, if one is drawn there. */
export function hitMatrixCell(layout: MatrixLayout, x: number, y: number): MatrixCellRect | null {
  const { grid, pitch } = layout;
  if (pitch <= 0 || x < grid.x || y < grid.y || x >= grid.x + grid.width || y >= grid.y + grid.height) return null;
  return layout.at[Math.floor((y - grid.y) / pitch)]?.[Math.floor((x - grid.x) / pitch)] ?? null;
}

export function renderMatrix(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: MatrixChartOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: MatrixLayout = computeMatrixLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): MatrixLayout {
  const format = options.valueFormat ?? twoDecimals;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  const hovered = pointer && options.crosshair !== false ? hitMatrixCell(layout, pointer.x, pointer.y) : null;

  ctx.save();
  const valueSize = Math.max(8, Math.min(LABEL_SIZE, layout.pitch / 3));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = fontOf(theme, valueSize);
  for (const c of layout.cells) {
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.size, c.size);
    if (c.text) {
      ctx.fillStyle = c.textColor;
      ctx.fillText(c.text, c.x + c.size / 2, c.y + c.size / 2);
    }
  }
  if (hovered) {
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hovered.x + 0.75, hovered.y + 0.75, hovered.size - 1.5, hovered.size - 1.5);
  }

  ctx.font = fontOf(theme, LABEL_SIZE);
  ctx.fillStyle = theme.textSecondary;
  ctx.textAlign = 'right';
  for (const l of layout.rowLabels) {
    ctx.fillStyle = hovered && hovered.cell.rowIndex === l.index ? theme.text : theme.textSecondary;
    ctx.fillText(l.text, l.x, l.y);
  }
  for (const l of layout.columnLabels) {
    ctx.fillStyle = hovered && hovered.cell.columnIndex === l.index ? theme.text : theme.textSecondary;
    if (l.rotated) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(TURN);
      ctx.textAlign = 'right';
      ctx.fillText(l.text, 0, 0);
      ctx.restore();
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(l.text, l.x, l.y);
      ctx.textBaseline = 'middle';
    }
  }
  ctx.restore();

  if (layout.bar) drawColorBar(ctx, layout.bar, layout.scale, format, theme);

  if (hovered && pointer) {
    const { cell } = hovered;
    drawTooltip(ctx, [
      { text: `${cell.row} × ${cell.column}`, bold: true, color: hovered.color },
      { text: format(cell.value) },
    ], pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}
