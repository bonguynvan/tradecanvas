import type { MatrixChartOptions, Theme } from '@tradecanvas/commons';
import { computeMatrixLayout, hitMatrixCell, renderMatrix, type MatrixLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';

/** Past this many names, the description gives counts instead. */
const MAX_NAMED = 12;

/** A value for each row and column pair, coloured: correlations, volume by hour and weekday. */
export class MatrixChart extends InteractiveChart<MatrixChartOptions, MatrixLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): MatrixLayout {
    return computeMatrixLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: MatrixLayout): void {
    renderMatrix(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    const { rows, columns } = this.options;
    if (!columns) return rows.length <= MAX_NAMED ? `Matrix of ${rows.join(', ')}` : `Matrix of ${rows.length} rows`;
    return rows.length + columns.length <= MAX_NAMED
      ? `Matrix of ${rows.join(', ')} by ${columns.join(', ')}`
      : `Matrix of ${rows.length} rows by ${columns.length} columns`;
  }

  protected clickable(): boolean {
    return this.options.onCellClick !== undefined;
  }

  protected hits(layout: MatrixLayout, x: number, y: number): boolean {
    return hitMatrixCell(layout, x, y) !== null;
  }

  protected clickAt(layout: MatrixLayout, x: number, y: number): void {
    const hit = hitMatrixCell(layout, x, y);
    if (hit) this.options.onCellClick?.(hit.cell);
  }

  /** New values for the same rows and columns; `setOptions` changes the names. */
  update(values: number[][]): void {
    this.setOptions({ values });
  }
}
