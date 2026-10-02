import { CHART_TYPE_ICONS, DRAWING_TOOL_ICONS, UI_ICONS, iconSvg, type IconDef } from './iconSet.js';

const own = (map: Readonly<Record<string, IconDef>>, key: string): IconDef | undefined =>
  Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;

/** An interface icon (toolbar, sidebar, panels) as inline SVG; '' for an unknown name. */
export function createIcon(name: string, size = 14): string {
  const icon = own(UI_ICONS, name);
  return icon ? iconSvg(icon, size) : '';
}

/** A drawing tool's own icon; a pen for a tool without one (e.g. from a plugin). */
export function createToolIcon(tool: string, size = 16): string {
  return iconSvg(own(DRAWING_TOOL_ICONS, tool) ?? UI_ICONS.penLine, size);
}

/** A chart type's icon; the generic chart glyph for a type without one. */
export function createChartTypeIcon(type: string, size = 14): string {
  return iconSvg(own(CHART_TYPE_ICONS, type) ?? UI_ICONS.barChart, size);
}
