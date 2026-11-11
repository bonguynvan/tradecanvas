import { describe, it, expect } from 'vitest';
import {
  GRID_LAYOUTS,
  GRID_LAYOUT_SHAPES,
  gridAreaCss,
  gridAreas,
  gridChartCount,
  gridLargeSide,
  isGridLayout,
  type GridLayout,
} from '../gridShapes.js';

/** How many charts cover each cell of `layout`'s columns × rows. */
function coverage(layout: GridLayout): number[][] {
  const shape = GRID_LAYOUT_SHAPES[layout];
  const cells = Array.from({ length: shape.rows }, () => Array<number>(shape.cols).fill(0));
  for (const [col, row, colSpan, rowSpan] of gridAreas(shape)) {
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (cells[r]?.[c] === undefined) throw new Error(`${layout}: a chart reaches past the grid`);
        cells[r][c]++;
      }
    }
  }
  return cells;
}

describe('grid shapes', () => {
  it.each(GRID_LAYOUTS.map((l) => [l]))('%s covers every cell of its grid exactly once', (layout) => {
    const shape = GRID_LAYOUT_SHAPES[layout];
    expect(coverage(layout)).toEqual(Array.from({ length: shape.rows }, () => Array(shape.cols).fill(1)));
  });

  it('counts the charts of each arrangement', () => {
    const counts = Object.fromEntries(GRID_LAYOUTS.map((l) => [l, gridChartCount(GRID_LAYOUT_SHAPES[l])]));
    expect(counts).toEqual({
      '1x1': 1, '1x2': 2, '2x1': 2, '1x3': 3, '3x1': 3, '1+2': 3, '2+1': 3, '1/2': 3, '2/1': 3,
      '2x2': 4, '1x4': 4, '4x1': 4, '1+3': 4, '1/3': 4, '2x3': 6, '3x2': 6, '2x4': 8, '3x3': 9,
    });
    for (const l of GRID_LAYOUTS) expect(gridAreas(GRID_LAYOUT_SHAPES[l])).toHaveLength(counts[l]);
  });

  it('lists the arrangements by chart count', () => {
    const counts = GRID_LAYOUTS.map((l) => gridChartCount(GRID_LAYOUT_SHAPES[l]));
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });

  it('names plain grids rows × columns', () => {
    expect(GRID_LAYOUT_SHAPES['1x4']).toEqual({ cols: 4, rows: 1 });
    expect(GRID_LAYOUT_SHAPES['4x1']).toEqual({ cols: 1, rows: 4 });
    expect(GRID_LAYOUT_SHAPES['2x4']).toEqual({ cols: 4, rows: 2 });
    expect(GRID_LAYOUT_SHAPES['3x3']).toEqual({ cols: 3, rows: 3 });
  });

  it('puts the large chart first, but last in 2+1 and 2/1', () => {
    const large = (l: GridLayout) => gridAreas(GRID_LAYOUT_SHAPES[l]).findIndex(([, , w, h]) => w * h > 1);
    expect(large('1+2')).toBe(0);
    expect(large('1/2')).toBe(0);
    expect(large('1+3')).toBe(0);
    expect(large('1/3')).toBe(0);
    expect(large('2+1')).toBe(2);
    expect(large('2/1')).toBe(2);
  });

  it('tells the side the large chart takes', () => {
    const sides = Object.fromEntries((['1+2', '2+1', '1/2', '2/1', '1+3', '1/3', '2x2'] as const).map((l) => [l, gridLargeSide(GRID_LAYOUT_SHAPES[l])]));
    expect(sides).toEqual({ '1+2': 'left', '2+1': 'right', '1/2': 'top', '2/1': 'bottom', '1+3': 'left', '1/3': 'top', '2x2': null });
  });

  it('places a plain grid row by row', () => {
    expect(gridAreas(GRID_LAYOUT_SHAPES['2x3'])).toEqual([
      [0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1],
      [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1],
    ]);
  });

  it('writes a place as a CSS grid-area', () => {
    expect(gridAreaCss([0, 0, 1, 3])).toBe('1 / 1 / span 3 / span 1');
    expect(gridAreaCss([2, 1, 1, 1])).toBe('2 / 3 / span 1 / span 1');
  });

  it('knows the new arrangements, and no property names', () => {
    for (const l of ['1x4', '4x1', '2x4', '3x3', '1+2', '2+1', '1/2', '2/1', '1+3', '1/3']) expect(isGridLayout(l)).toBe(true);
    for (const l of ['constructor', 'toString', '4x4', '', 2, null]) expect(isGridLayout(l)).toBe(false);
  });
});
