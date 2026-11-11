/**
 * How a grid of charts can be arranged, shared by `ChartGrid` and
 * `ChartWidgetGrid`. The plain ones are named rows × columns: `'1x2'` is one
 * row of two charts. In the others one chart is large: `'1+2'` is one on the
 * left with two stacked beside it, `'1/2'` one on top with two below it.
 */
export type GridLayout =
  | '1x1' | '1x2' | '2x1' | '1x3' | '3x1' | '1+2' | '2+1' | '1/2' | '2/1'
  | '2x2' | '1x4' | '4x1' | '1+3' | '1/3' | '2x3' | '3x2' | '2x4' | '3x3';

/** Where a chart sits: its first column and row (from 0), and how many columns and rows it spans. */
export type GridArea = readonly [col: number, row: number, colSpan: number, rowSpan: number];

/** An arrangement: its columns and rows, and where each chart sits. */
export interface GridShape {
  readonly cols: number;
  readonly rows: number;
  /**
   * One place per chart, in the charts' order, that together cover every
   * column and row once. Absent: a chart in each of the `cols` × `rows` cells,
   * row by row.
   */
  readonly areas?: readonly GridArea[];
}

/** The side a large chart takes, from which its label is made. */
export type GridLargeSide = 'left' | 'right' | 'top' | 'bottom';

/** Every arrangement, by chart count (the order the grid's picker lists them in). */
export const GRID_LAYOUT_SHAPES: Readonly<Record<GridLayout, GridShape>> = {
  '1x1': { cols: 1, rows: 1 },
  '1x2': { cols: 2, rows: 1 },
  '2x1': { cols: 1, rows: 2 },
  '1x3': { cols: 3, rows: 1 },
  '3x1': { cols: 1, rows: 3 },
  '1+2': { cols: 2, rows: 2, areas: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]] },
  '2+1': { cols: 2, rows: 2, areas: [[0, 0, 1, 1], [0, 1, 1, 1], [1, 0, 1, 2]] },
  '1/2': { cols: 2, rows: 2, areas: [[0, 0, 2, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
  '2/1': { cols: 2, rows: 2, areas: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 2, 1]] },
  '2x2': { cols: 2, rows: 2 },
  '1x4': { cols: 4, rows: 1 },
  '4x1': { cols: 1, rows: 4 },
  '1+3': { cols: 2, rows: 3, areas: [[0, 0, 1, 3], [1, 0, 1, 1], [1, 1, 1, 1], [1, 2, 1, 1]] },
  '1/3': { cols: 3, rows: 2, areas: [[0, 0, 3, 1], [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1]] },
  '2x3': { cols: 3, rows: 2 },
  '3x2': { cols: 2, rows: 3 },
  '2x4': { cols: 4, rows: 2 },
  '3x3': { cols: 3, rows: 3 },
};

/** Every arrangement's id, in the table's order. */
export const GRID_LAYOUTS = Object.keys(GRID_LAYOUT_SHAPES) as readonly GridLayout[];

/** An arrangement the grid knows (own keys only: a stored `"constructor"` is not one). */
export function isGridLayout(value: unknown): value is GridLayout {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GRID_LAYOUT_SHAPES, value);
}

/** Where each chart of `shape` sits, in the charts' order. */
export function gridAreas(shape: GridShape): readonly GridArea[] {
  if (shape.areas) return shape.areas;
  const areas: GridArea[] = [];
  for (let row = 0; row < shape.rows; row++) {
    for (let col = 0; col < shape.cols; col++) areas.push([col, row, 1, 1]);
  }
  return areas;
}

/** How many charts `shape` shows. */
export function gridChartCount(shape: GridShape): number {
  return shape.areas?.length ?? shape.cols * shape.rows;
}

/** The CSS `grid-area` of a place: row start / column start / row span / column span (lines from 1). */
export function gridAreaCss([col, row, colSpan, rowSpan]: GridArea): string {
  return `${row + 1} / ${col + 1} / span ${rowSpan} / span ${colSpan}`;
}

/** Put `cell` in its place in the grid; none (a chart past the arrangement's count) clears it. */
export function placeGridCell(cell: HTMLElement, area: GridArea | undefined): void {
  cell.style.gridArea = area ? gridAreaCss(area) : '';
}

/**
 * The side the large chart of `shape` takes: a chart as tall as the grid is
 * on the left or right, one as wide on top or at the bottom. `null` for a
 * plain grid.
 */
export function gridLargeSide(shape: GridShape): GridLargeSide | null {
  if (!shape.areas) return null;
  const large = shape.areas.find(([, , colSpan, rowSpan]) => colSpan * rowSpan > 1);
  if (!large) return null;
  const [col, row, colSpan, rowSpan] = large;
  if (rowSpan === shape.rows && colSpan < shape.cols) return col === 0 ? 'left' : 'right';
  return row === 0 ? 'top' : 'bottom';
}
