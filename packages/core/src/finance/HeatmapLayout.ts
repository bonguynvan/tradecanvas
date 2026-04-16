export interface LayoutRect {
  id: string;
  rect: { x: number; y: number; width: number; height: number };
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function layoutUniformGrid(
  cells: readonly { id: string }[],
  bounds: Bounds,
  padding: number,
): LayoutRect[] {
  if (cells.length === 0) return [];

  const n = cells.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  const cellW = bounds.width / cols;
  const cellH = bounds.height / rows;

  const result: LayoutRect[] = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    result.push({
      id: cells[i].id,
      rect: {
        x: bounds.x + col * cellW + padding,
        y: bounds.y + row * cellH + padding,
        width: Math.max(0, cellW - padding * 2),
        height: Math.max(0, cellH - padding * 2),
      },
    });
  }

  return result;
}

function worstAspectRatio(
  row: readonly number[],
  sideLength: number,
): number {
  const sumRow = row.reduce((a, b) => a + b, 0);
  if (sumRow === 0 || sideLength === 0) return Infinity;

  let worst = 0;
  for (const area of row) {
    const rowHeight = sumRow / sideLength;
    const cellWidth = area / rowHeight;
    const ratio = rowHeight > cellWidth
      ? rowHeight / cellWidth
      : cellWidth / rowHeight;
    if (ratio > worst) worst = ratio;
  }
  return worst;
}

function layoutRow(
  row: readonly number[],
  ids: readonly string[],
  bounds: Bounds,
  isWide: boolean,
  padding: number,
  results: LayoutRect[],
): void {
  const sideLength = isWide ? bounds.height : bounds.width;
  const rowSum = row.reduce((a, b) => a + b, 0);
  const rowThickness = sideLength > 0 ? rowSum / sideLength : 0;

  let offset = 0;
  for (let i = 0; i < row.length; i++) {
    const cellLength = rowThickness > 0 ? row[i] / rowThickness : 0;

    let rect: { x: number; y: number; width: number; height: number };
    if (isWide) {
      rect = {
        x: bounds.x + padding,
        y: bounds.y + offset + padding,
        width: Math.max(0, rowThickness - padding * 2),
        height: Math.max(0, cellLength - padding * 2),
      };
    } else {
      rect = {
        x: bounds.x + offset + padding,
        y: bounds.y + padding,
        width: Math.max(0, cellLength - padding * 2),
        height: Math.max(0, rowThickness - padding * 2),
      };
    }

    results.push({ id: ids[i], rect });
    offset += cellLength;
  }
}

function squarify(
  areas: number[],
  ids: string[],
  bounds: Bounds,
  padding: number,
  results: LayoutRect[],
): void {
  if (areas.length === 0) return;

  const isWide = bounds.width >= bounds.height;
  const sideLength = isWide ? bounds.height : bounds.width;

  if (areas.length === 1) {
    layoutRow(areas, ids, bounds, isWide, padding, results);
    return;
  }

  const currentRow: number[] = [];
  const currentIds: string[] = [];

  let i = 0;
  while (i < areas.length) {
    const testRow = [...currentRow, areas[i]];

    if (
      currentRow.length === 0 ||
      worstAspectRatio(testRow, sideLength) <= worstAspectRatio(currentRow, sideLength)
    ) {
      currentRow.push(areas[i]);
      currentIds.push(ids[i]);
      i++;
    } else {
      layoutRow(currentRow, currentIds, bounds, isWide, padding, results);
      const rowSum = currentRow.reduce((a, b) => a + b, 0);
      const rowThickness = sideLength > 0 ? rowSum / sideLength : 0;

      if (isWide) {
        bounds = {
          x: bounds.x + rowThickness,
          y: bounds.y,
          width: bounds.width - rowThickness,
          height: bounds.height,
        };
      } else {
        bounds = {
          x: bounds.x,
          y: bounds.y + rowThickness,
          width: bounds.width,
          height: bounds.height - rowThickness,
        };
      }

      squarify(areas.slice(i), ids.slice(i), bounds, padding, results);
      return;
    }
  }

  if (currentRow.length > 0) {
    layoutRow(currentRow, currentIds, bounds, isWide, padding, results);
  }
}

export function layoutSquarifiedTreemap(
  cells: readonly { id: string; weight: number }[],
  bounds: Bounds,
  padding: number,
): LayoutRect[] {
  if (cells.length === 0) return [];

  const sorted = [...cells].sort((a, b) => b.weight - a.weight);
  const totalWeight = sorted.reduce((s, c) => s + Math.max(0, c.weight), 0);
  if (totalWeight === 0) return [];

  const totalArea = bounds.width * bounds.height;
  const areas = sorted.map(c => (Math.max(0, c.weight) / totalWeight) * totalArea);
  const ids = sorted.map(c => c.id);

  const results: LayoutRect[] = [];
  squarify(areas, ids, { ...bounds }, padding, results);
  return results;
}
