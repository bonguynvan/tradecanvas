import type { ChartOptions, ChartStyleOverridesPatch, CrosshairLineOptions } from '@tradecanvas/commons';

/** A crosshair line's options as `crosshair.<axis>.*` keys. */
function crosshairLine(axis: 'horizontal' | 'vertical', line: CrosshairLineOptions | undefined): Record<string, unknown> {
  if (!line) return {};
  return {
    ...(line.visible !== undefined ? { [`crosshair.${axis}.visible`]: line.visible } : {}),
    ...(line.color !== undefined ? { [`crosshair.${axis}.color`]: line.color } : {}),
    ...(line.style !== undefined ? { [`crosshair.${axis}.style`]: line.style } : {}),
    ...(line.width !== undefined ? { [`crosshair.${axis}.width`]: line.width } : {}),
  };
}

/**
 * The overrides a chart starts with: the grid's and crosshair's line options
 * read as their keys (they are shorthand for them), then `overrides`, which
 * win where both set a key.
 */
export function startOverrides(options: Pick<ChartOptions, 'grid' | 'crosshair' | 'overrides'>): ChartStyleOverridesPatch {
  const { grid, crosshair } = options;
  const labelBackground = crosshair?.vLine?.labelBackground ?? crosshair?.hLine?.labelBackground;
  return {
    ...(grid?.hLineColor !== undefined ? { 'grid.horizontal.color': grid.hLineColor } : {}),
    ...(grid?.hLineStyle !== undefined ? { 'grid.horizontal.style': grid.hLineStyle } : {}),
    ...(grid?.vLineColor !== undefined ? { 'grid.vertical.color': grid.vLineColor } : {}),
    ...(grid?.vLineStyle !== undefined ? { 'grid.vertical.style': grid.vLineStyle } : {}),
    ...crosshairLine('horizontal', crosshair?.hLine),
    ...crosshairLine('vertical', crosshair?.vLine),
    ...(labelBackground !== undefined ? { 'crosshair.labelBackground': labelBackground } : {}),
    ...options.overrides,
  } as ChartStyleOverridesPatch;
}
