import { CHART_TYPE_ICONS, DRAWING_TOOL_ICONS, UI_ICONS, iconSvg } from './iconSet.js';

/** An interface icon (toolbar, sidebar, panels) as inline SVG; '' for an unknown name. */
export function createIcon(name: string, size = 14): string {
  const icon = UI_ICONS[name];
  return icon ? iconSvg(icon, size) : '';
}

/** A drawing tool's own icon; a pen for a tool without one (e.g. from a plugin). */
export function createToolIcon(tool: string, size = 16): string {
  return iconSvg(DRAWING_TOOL_ICONS[tool] ?? UI_ICONS.penLine, size);
}

/** A chart type's icon; the generic chart glyph for a type without one. */
export function createChartTypeIcon(type: string, size = 14): string {
  return iconSvg(CHART_TYPE_ICONS[type] ?? UI_ICONS.barChart, size);
}
