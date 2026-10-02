import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createChartTypeIcon, createIcon, createToolIcon } from '../icons.js';
import { CHART_TYPE_ICONS, DRAWING_TOOL_ICONS, UI_ICONS } from '../iconSet.js';
import { CHART_TYPES, DRAWING_TOOL_GROUPS } from '../widgetConfig.js';

const widgetDir = fileURLToPath(new URL('..', import.meta.url));

describe('icon set', () => {
  it('has an icon for every drawing tool the sidebar offers', () => {
    const tools = DRAWING_TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.value));
    expect(tools.filter((t) => !DRAWING_TOOL_ICONS[t])).toEqual([]);
    // …and each looks different from the others.
    const shapes = tools.map((t) => JSON.stringify(DRAWING_TOOL_ICONS[t]));
    expect(new Set(shapes).size).toBe(tools.length);
  });

  it('has an icon for every chart type in the menu', () => {
    expect(CHART_TYPES.map((c) => c.value).filter((t) => !CHART_TYPE_ICONS[t])).toEqual([]);
  });

  it('has every interface icon the widget asks for by name', () => {
    const used = new Set<string>();
    for (const file of readdirSync(widgetDir).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(widgetDir + file, 'utf8');
      for (const m of src.matchAll(/(?:createIcon|iconBtn)\('([a-zA-Z]+)'/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(10);
    expect([...used].filter((n) => !UI_ICONS[n])).toEqual([]);
  });

  it('draws in currentColor on the 24 grid with the set stroke', () => {
    const svg = createToolIcon('fibRetracement', 16);
    expect(svg).toMatch(/^<svg [^>]*width="16" height="16" viewBox="0 0 24 24"/);
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('stroke-width="1.75"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg.match(/<circle /g)).toHaveLength(2); // its two anchor dots
  });

  it('falls back instead of rendering nothing for tools and chart types it does not know', () => {
    expect(createIcon('no-such-icon')).toBe('');
    expect(createToolIcon('pluginTool')).toBe(createToolIcon('__other__'));
    expect(createChartTypeIcon('pluginType')).toContain('<path');
  });
});
