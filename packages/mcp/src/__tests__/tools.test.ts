import { describe, it, expect } from 'vitest';
import { TOOLS, runTool } from '../tools.js';

const call = (name: string, args: Record<string, unknown> = {}) => runTool(name, args);

describe('tools', () => {
  it('each has a name, a description and an object input schema', () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(7);
    for (const tool of TOOLS) {
      expect(tool.name).toMatch(/^[a-z_]+$/);
      expect(tool.description.length).toBeGreaterThan(40);
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('list_indicators finds by id, name or short name, and filters by placement', () => {
    const all = call('list_indicators').data as { count: number; indicators: { id: string; placement: string }[] };
    expect(all.count).toBe(all.indicators.length);
    expect(all.count).toBeGreaterThan(100);
    const bands = call('list_indicators', { query: 'bollinger' }).data as typeof all;
    expect(bands.indicators.map((i) => i.id)).toContain('bb');
    const panes = call('list_indicators', { placement: 'panel' }).data as typeof all;
    expect(panes.indicators.every((i) => i.placement === 'panel')).toBe(true);
  });

  it('get_indicator gives the params, the line keys and how to use them', () => {
    const rsi = call('get_indicator', { id: 'rsi' });
    const data = rsi.data as { id: string; plots: { key: string }[]; usage: string };
    expect(data.plots.map((p) => p.key)).toEqual(['value']);
    expect(data.usage).toContain("addIndicator('rsi'");
    expect(data.usage).toContain('.value');
  });

  it('get_indicator writes code that strict TypeScript accepts: addIndicator may return null', () => {
    const { usage } = call('get_indicator', { id: 'macd' }).data as { usage: string };
    expect(usage).toContain('if (instanceId)');
    expect(usage).toContain('?.series ?? []');
    // Nothing declared and left unused: the code pastes into a project with noUnusedLocals.
    expect(usage).not.toMatch(/const last\b/);
  });

  it('get_indicator asks for the id when a short name is shared', () => {
    const vi = call('get_indicator', { id: 'VI' });
    expect(vi.isError).toBe(true);
    expect(vi.text).toMatch(/vortex/);
    expect(vi.text).toMatch(/volindex/);
  });

  it('answers in compact JSON text, the same data as the structured content', () => {
    const result = call('list_widget_features', { prefix: 'menu.' });
    expect(result.text).not.toContain('\n');
    expect(JSON.parse(result.text)).toEqual(result.data);
  });

  it('get_indicator reads a name too, and suggests ids for an unknown one', () => {
    expect((call('get_indicator', { id: 'Relative Strength Index' }).data as { id: string }).id).toBe('rsi');
    const miss = call('get_indicator', { id: 'stochastik' });
    expect(miss.isError).toBe(true);
    expect(miss.text).toMatch(/stochastic/);
  });

  it('list_drawing_tools gives each tool its anchors and how to add it', () => {
    const data = call('list_drawing_tools', { query: 'fib' }).data as { tools: { type: string; anchors: number }[]; usage: string };
    expect(data.tools.find((t) => t.type === 'fibRetracement')?.anchors).toBe(2);
    expect(data.usage).toContain('addDrawing');
  });

  it('list_options lists an entry point\'s options with their types and docs', () => {
    const data = call('list_options', { target: 'Chart', query: 'render' }).data as { options: { name: string; values?: string[] }[] };
    expect(data.options.find((o) => o.name === 'renderer')?.values).toContain('webgl');
    const widget = call('list_options', { target: 'ChartWidget', query: 'timeframe' }).data as { options: { name: string; values?: string[]; items?: string[] }[] };
    expect(widget.options.find((o) => o.name === 'timeframe')?.values).toContain('1h');
    expect(widget.options.find((o) => o.name === 'timeframes')?.items).toContain('1h');
  });

  it('list_widget_features and list_style_keys narrow by prefix', () => {
    const features = call('list_widget_features', { prefix: 'toolbar.' }).data as { features: string[] };
    expect(features.features.length).toBeGreaterThan(5);
    expect(features.features.every((f) => f.startsWith('toolbar.'))).toBe(true);
    const keys = call('list_style_keys', { prefix: 'grid.' }).data as { keys: Record<string, string> };
    expect(keys.keys['grid.vertical.visible']).toBe('boolean');
  });

  it('validate_options answers with problems and suggestions', () => {
    const result = call('validate_options', { target: 'ChartWidget', options: { timeFrame: '5m' } });
    expect(result.isError).toBeFalsy();
    expect((result.data as { valid: boolean }).valid).toBe(false);
    expect(result.text).toMatch(/timeframe/);
  });

  it('reports a bad argument as a tool error, not a crash', () => {
    expect(call('list_options', { target: 'Widget' }).isError).toBe(true);
    expect(call('get_indicator', {}).isError).toBe(true);
  });
});
