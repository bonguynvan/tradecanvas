import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOG, TARGETS } from '../catalog.js';
import { runTool } from '../tools.js';
import { SOURCES, TABLES } from '../migration/tables.js';
import type { MigrationTarget } from '../migration/types.js';

const KINDS = ['option', 'featureset', 'override', 'study', 'drawing', 'method', 'datafeed', 'broker'];
const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
/** The methods `chart.` and `widget.` calls may name: those the classes declare. */
const METHODS = {
  chart: source('../../../library/src/Chart.ts'),
  widget: source('../../../library/src/widget/ChartWidget.ts'),
};

/** Why a target names nothing real, or null when it is fine. */
function badTarget(to: MigrationTarget): string | null {
  if ('feature' in to) return CATALOG.widgetFeatures.includes(to.feature) ? null : `no feature switch '${to.feature}'`;
  if ('styleKey' in to) return to.styleKey in CATALOG.styleKeys ? null : `no style key '${to.styleKey}'`;
  if ('drawing' in to) return CATALOG.drawingTools.some((t) => t.type === to.drawing) ? null : `no drawing tool '${to.drawing}'`;
  if ('indicator' in to) {
    const indicator = CATALOG.indicators.find((i) => i.id === to.indicator);
    if (!indicator) return `no indicator '${to.indicator}'`;
    const missing = Object.values(to.params ?? {}).filter((p) => !(p in indicator.params));
    return missing.length ? `'${to.indicator}' has no param ${missing.join(', ')}` : null;
  }
  if ('option' in to) {
    const [target, first, second, third] = to.option.split('.');
    if (!TARGETS.includes(target as never)) return `'${to.option}' starts with no entry point`;
    if (!CATALOG.options[target as keyof typeof CATALOG.options].some((o) => o.name === first)) return `no option '${target}.${first}'`;
    const nested = CATALOG.nested[`${target}.${first}`];
    if (second && nested && !nested.some((o) => o.name === second)) return `no option '${target}.${first}.${second}'`;
    if (third && second === 'features' && !CATALOG.nested['Chart.features'].some((o) => o.name === third)) return `no chart feature '${third}'`;
    return null;
  }
  // A call on a chart or the widget names a method the class has.
  const call = /^(chart|widget)\.(\w+)\(/.exec(to.api);
  if (call && !new RegExp(`^\\s+(async\\s+)?${call[2]}\\s*[(<]`, 'm').test(METHODS[call[1] as 'chart' | 'widget'])) return `no method ${call[1]}.${call[2]}`;
  return null;
}

describe('the migration tables', () => {
  it('the check itself catches a name that is not real', () => {
    expect(badTarget({ feature: 'noSuchSwitch' })).toMatch(/no feature/);
    expect(badTarget({ styleKey: 'no.such.key' })).toMatch(/no style key/);
    expect(badTarget({ indicator: 'rsi', params: { length: 'noSuchParam' } })).toMatch(/no param/);
    expect(badTarget({ drawing: 'noSuchTool' })).toMatch(/no drawing/);
    expect(badTarget({ option: 'ChartWidget.noSuchOption' })).toMatch(/no option/);
    expect(badTarget({ option: 'ChartWidget.chartOptions.noSuch' })).toMatch(/no option/);
    expect(badTarget({ api: 'chart.noSuchMethod()' })).toMatch(/no method/);
    expect(badTarget({ api: 'widget.setSymbol(symbol)' })).toBeNull();
  });

  for (const name of SOURCES) {
    const table = TABLES[name];

    it(`${name}: names only real TradeCanvas options, switches, style keys, indicators, drawings and methods`, () => {
      const bad = table.entries.flatMap((e) => e.to.map(badTarget).filter(Boolean).map((why) => `${e.kind} ${e.name}: ${why}`));
      expect(bad).toEqual([]);
    });

    it(`${name}: says what to do where there is no equivalent, and lists each name once`, () => {
      expect(table.entries.filter((e) => !KINDS.includes(e.kind)).map((e) => e.name)).toEqual([]);
      expect(table.entries.filter((e) => e.to.length === 0 && !e.note?.trim()).map((e) => e.name)).toEqual([]);
      const keys = table.entries.map((e) => `${e.kind}:${e.name}`);
      expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
      expect(table.docs).toMatch(/https:\/\//);
    });
  }
});

describe('migration_plan', () => {
  it('gives the steps, what to search for and the size of the table', () => {
    const { data } = runTool('migration_plan', {}) as { data: { steps: string[]; search: { pattern: string }[]; table: { entries: Record<string, number> } } };
    expect(data.steps.length).toBeGreaterThan(5);
    for (const { pattern } of data.search) expect(() => new RegExp(pattern)).not.toThrow();
    expect(data.table.entries.featureset).toBeGreaterThan(100);
  });

  it('has a plan for Lightweight Charts and refuses an unknown source', () => {
    expect(runTool('migration_plan', { source: 'lightweight-charts' }).isError).toBeFalsy();
    expect(runTool('migration_plan', { source: 'highcharts' }).isError).toBe(true);
  });
});

describe('migration_lookup', () => {
  it('maps a featureset to its switch, with how to set it', () => {
    const { data } = runTool('migration_lookup', { name: 'header_widget', kind: 'featureset' }) as { data: { entries: { to: { feature?: string; usage?: string }[] }[] } };
    expect(data.entries[0].to[0]).toMatchObject({ feature: expect.any(String), usage: expect.stringContaining('features') });
  });

  it('says plainly when there is no equivalent', () => {
    const none = TABLES.tradingview.entries.find((e) => e.to.length === 0)!;
    const { data } = runTool('migration_lookup', { name: none.name, kind: none.kind }) as { data: { entries: { equivalent: boolean; note: string }[] } };
    expect(data.entries[0]).toMatchObject({ equivalent: false, note: none.note });
  });

  it('turns a resolution into a timeframe', () => {
    expect(runTool('migration_lookup', { name: '240' }).data).toMatchObject({ to: [{ timeframe: '4h' }] });
    expect(runTool('migration_lookup', { name: 'D', kind: 'resolution' }).data).toMatchObject({ to: [{ timeframe: '1d' }] });
    expect(runTool('migration_lookup', { name: 'xyz', kind: 'resolution' }).isError).toBe(true);
  });

  it('offers the names close to a misspelt one, and searches by words', () => {
    const miss = runTool('migration_lookup', { name: 'header_widgt', kind: 'featureset' });
    expect(miss.isError).toBe(true);
    expect((miss.data as { suggestions: string[] }).suggestions).toContain('header_widget');
    const found = runTool('migration_lookup', { query: 'header', kind: 'featureset' }).data as { count: number };
    expect(found.count).toBeGreaterThan(0);
  });

  it('reads a name as code writes it: on a chart, a series or a subscription', () => {
    const names = (name: string, source?: string) =>
      ((runTool('migration_lookup', { name, ...(source ? { source } : {}) }).data as { entries?: { name: string }[] }).entries ?? []).map((e) => e.name);
    expect(names('tvWidget.activeChart().createStudy')).toContain('chart.createStudy');
    expect(names('createStudy')).toContain('chart.createStudy');
    expect(names("widget.subscribe('onTick', cb)")).toContain('subscribe:onTick');
    expect(names('setData', 'lightweight-charts')).toContain('series.setData');
  });

  it('asks for a name or a query', () => {
    expect(runTool('migration_lookup', {}).isError).toBe(true);
    expect(runTool('migration_lookup', { name: 'x', kind: 'nope' }).isError).toBe(true);
  });
});

describe('convert_widget_options', () => {
  type Result = { target: string; options: Record<string, unknown>; calls: unknown[]; unmapped: { from: string }[]; problems: unknown[] };

  it('turns the widget options, featuresets and datafeed into ChartWidget options that validate', () => {
    const { data } = runTool('convert_widget_options', {
      options: {
        symbol: 'AAPL',
        interval: '60',
        container: 'tv_chart_container',
        datafeed: 'new Datafeeds.UDFCompatibleDatafeed(url)',
        library_path: '/charting_library/',
        locale: 'en',
        disabled_features: ['header_widget', 'no_such_featureset'],
      },
    }) as { data: Result };
    expect(data.target).toBe('ChartWidget');
    expect(data.options).toMatchObject({ symbol: 'AAPL', timeframe: '1h', locale: 'en', feed: 'feedFromJsApi(new Datafeeds.UDFCompatibleDatafeed(url))' });
    expect(data.unmapped.map((u) => u.from)).toContain('disabled_features["no_such_featureset"]');
    expect(data.problems).toEqual([]);
  });

  it('puts overrides with a style key in the chart options, line styles by name', () => {
    const entry = TABLES.tradingview.entries.find((e) => e.kind === 'override' && e.to.some((t) => 'styleKey' in t && CATALOG.styleKeys[t.styleKey] === 'lineStyle'))!;
    const key = (entry.to.find((t) => 'styleKey' in t) as { styleKey: string }).styleKey;
    const { data } = runTool('convert_widget_options', { options: { overrides: { [entry.name]: 2 } } }) as { data: Result };
    expect((data.options.chartOptions as { overrides: Record<string, unknown> }).overrides[key]).toBe('dashed');
    expect(data.problems).toEqual([]);
  });

  it('converts Lightweight Charts options for a Chart', () => {
    const { data } = runTool('convert_widget_options', { source: 'lightweight-charts', options: { width: 600, height: 300 } }) as { data: Result };
    expect(data.target).toBe('Chart');
    expect(data.problems).toEqual([]);
  });

  it('reads an option that is a switch by its on and off values, not as it is', () => {
    const fixed = runTool('convert_widget_options', { source: 'lightweight-charts', options: { timeScale: { fixLeftEdge: true } } }).data as Result;
    expect(fixed.options.freePan).toBe(false);
    const loose = runTool('convert_widget_options', { source: 'lightweight-charts', options: { timeScale: { fixLeftEdge: false } } }).data as Result;
    expect(loose.options.freePan).toBeUndefined();
  });

  it('says so when the options are not an object', () => {
    const { data } = runTool('convert_widget_options', { options: 'nope' }) as { data: Result };
    expect(data.unmapped).toEqual([{ from: '(options)', note: expect.any(String) }]);
  });
});
