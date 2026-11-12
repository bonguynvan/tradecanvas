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

  it('list_drawing_tools says which tools are kept to the screen, and how their anchors read', () => {
    const data = call('list_drawing_tools', { query: 'anchored' }).data as { tools: { type: string; anchoring?: string }[]; usage: string };
    expect(data.tools.find((t) => t.type === 'anchoredText')?.anchoring).toBe('screen');
    expect(data.tools.find((t) => t.type === 'anchoredVWAP')?.anchoring).toBeUndefined();
    expect(data.usage).toContain("anchoring: 'screen'");
  });

  it('list_options lists an entry point\'s options with their types and docs', () => {
    const data = call('list_options', { target: 'Chart', query: 'render' }).data as { options: { name: string; values?: string[] }[] };
    expect(data.options.find((o) => o.name === 'renderer')?.values).toContain('webgl');
    const widget = call('list_options', { target: 'ChartWidget', query: 'timeframe' }).data as { options: { name: string; values?: string[]; items?: string[] }[] };
    expect(widget.options.find((o) => o.name === 'timeframe')?.values).toContain('1h');
    expect(widget.options.find((o) => o.name === 'timeframes')?.items).toContain('1h');
  });

  it('list_options finds options one level in, by their path', () => {
    type Found = { options: { name: string; doc?: string }[] };
    // The widget's chart options and the chart's feature switches.
    const widget = call('list_options', { target: 'ChartWidget', query: 'numberLocale' }).data as Found;
    expect(widget.options.map((o) => o.name)).toContain('chartOptions.numberLocale');
    expect(widget.options.find((o) => o.name === 'chartOptions.numberLocale')?.doc).toMatch(/ko-KR/);
    const chart = call('list_options', { target: 'Chart', query: 'priceAxisAdd' }).data as Found;
    expect(chart.options.map((o) => o.name)).toContain('features.priceAxisAddButton');
    // Without words to find, only the entry point's own options: the list stays short.
    const all = call('list_options', { target: 'Chart' }).data as Found;
    expect(all.options.some((o) => o.name.includes('.'))).toBe(false);
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

describe('the finance charts', () => {
  it('list_finance_charts names every class @tradecanvas/chart has, and finds one by its purpose', () => {
    const all = call('list_finance_charts').data as { count: number; charts: { name: string; what: string; options: string[] }[]; usage: string };
    expect(all.count).toBe(14);
    expect(all.charts.map((c) => c.name)).toEqual(expect.arrayContaining(['BarChart', 'DepthChart', 'EquityCurveChart', 'HeatmapChart', 'PerformanceDashboard']));
    expect(all.charts.every((c) => c.what.length > 20 && c.options.length > 3)).toBe(true);
    expect(all.usage).toContain("from '@tradecanvas/chart'");
    const book = call('list_finance_charts', { query: 'order book' }).data as typeof all;
    expect(book.charts.map((c) => c.name)).toEqual(['DepthChart']);
  });

  it('list_options takes a finance chart’s name', () => {
    const depth = call('list_options', { target: 'DepthChart' }).data as { target: string; what: string; options: { name: string; type: string; doc?: string }[]; usage: string };
    expect(depth.target).toBe('DepthChart');
    expect(depth.options.map((o) => o.name)).toEqual(expect.arrayContaining(['data', 'spreadLabel', 'theme', 'font', 'locale', 'ariaLabel']));
    // Options that were declared and never read are gone.
    expect(depth.options.map((o) => o.name)).not.toContain('width');
    expect(depth.usage).toContain('new DepthChart(element, options)');
    const found = call('list_options', { target: 'BarChart', query: 'stacked' }).data as typeof depth;
    expect(found.options.map((o) => o.name)).toContain('mode');
  });

  it('validate_options takes one too, and an unknown target is told the names', () => {
    const bad = call('validate_options', { target: 'BarChart', options: { categories: [], series: [], orientaton: 'horizontal' } });
    expect(bad.text).toContain("Did you mean 'orientation'?");
    expect(call('validate_options', { target: 'GaugeChart', options: { value: 5 } }).text).toBe('No problems found.');
    const none = call('validate_options', { target: 'PieChart', options: {} });
    expect(none.isError).toBe(true);
    expect(none.text).toContain('ChartWidget');
    expect(none.text).toContain('DonutChart');
    expect(call('list_options', { target: 'PieChart' }).isError).toBe(true);
    // A target that is not a string is no target, in either tool.
    expect(call('validate_options', { target: ['BarChart'], options: {} }).isError).toBe(true);
    expect(call('list_options', { target: ['BarChart'] }).isError).toBe(true);
  });

  it('tells the dashboard apart: it is updated, not given options', () => {
    const dash = call('list_options', { target: 'PerformanceDashboard' }).data as { usage: string; options: { name: string }[] };
    expect(dash.usage).toContain('dashboard.update(result)');
    expect(dash.usage).not.toContain('setOptions');
    expect(dash.options.map((o) => o.name)).not.toContain('ariaLabel');
    expect((call('list_options', { target: 'GaugeChart' }).data as typeof dash).usage).toContain('chart.setOptions');
  });

  it('offers the names in the schema of both tools', () => {
    for (const name of ['list_options', 'validate_options']) {
      const target = TOOLS.find((t) => t.name === name)!.inputSchema.properties.target as { enum: string[] };
      expect(target.enum).toEqual(expect.arrayContaining(['ChartWidget', 'Chart', 'ChartWidgetGrid', 'SparklineChart', 'PerformanceDashboard']));
    }
  });
});
