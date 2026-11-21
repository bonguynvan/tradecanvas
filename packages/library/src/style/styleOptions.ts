import type { ChartOptions, ChartStyleOverridesPatch, CrosshairLineOptions, FontConfig, ShapeConfig } from '@tradecanvas/commons';

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

/** The longest family list `setFont` takes, characters. */
const MAX_FONT_FAMILY = 300;

/** A font the chart can draw with: a family that isn't empty, sizes above zero. */
export function readFont(font: Partial<FontConfig>): Partial<FontConfig> {
  const out: Partial<FontConfig> = {};
  // A list of faces, nothing a style sheet could read more into (the family also reaches CSS text).
  const face = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= MAX_FONT_FAMILY && !/[;{}<>\\]|\/\*/.test(v);
  if (face(font.family)) out.family = font.family;
  if (face(font.textFamily)) out.textFamily = font.textFamily;
  for (const key of ['sizeSmall', 'sizeMedium', 'sizeLarge'] as const) {
    const size = font[key];
    if (typeof size === 'number' && Number.isFinite(size) && size > 0) out[key] = size;
  }
  return out;
}

/** Shapes the chart can draw: a corner radius from 0 to 999 px. */
export function readShapes(shapes: ShapeConfig): ShapeConfig {
  const r = shapes.tagRadius;
  return typeof r === 'number' && Number.isFinite(r) && r >= 0 ? { tagRadius: Math.min(r, 999) } : {};
}
