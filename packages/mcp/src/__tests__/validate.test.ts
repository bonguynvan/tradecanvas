import { describe, it, expect } from 'vitest';
import { validateFinanceOptions, validateOptions } from '../validate.js';

const problems = (target: 'ChartWidget' | 'Chart' | 'ChartWidgetGrid', options: unknown) =>
  validateOptions(target, options).problems;

describe('validateOptions', () => {
  it('passes options the library takes', () => {
    const result = validateOptions('ChartWidget', {
      symbol: 'BTCUSDT',
      timeframe: '5m',
      theme: 'dark',
      ui: 'terminal',
      trading: true,
      historyLimit: 500,
      chartTypes: ['candlestick', 'heikinAshi'],
      features: { alerts: false, 'toolbar.screenshot': false },
      chartOptions: { renderer: 'webgl', overrides: { 'grid.vertical.visible': false } },
    });
    expect(result).toEqual({ valid: true, problems: [], notes: [] });
  });

  it('names an unknown option and the one that was meant', () => {
    const [problem] = problems('ChartWidget', { timeFrame: '5m' });
    expect(problem.path).toBe('timeFrame');
    expect(problem.suggestion).toBe('timeframe');
  });

  it('says where an option of another entry point goes', () => {
    const [problem] = problems('ChartWidget', { chartType: 'line' });
    expect(problem.path).toBe('chartType');
    expect(problem.message).toMatch(/chartOptions/);
    // Not a typo of `chartTypes`: no look-alike is offered.
    expect(problem.suggestion).toBeUndefined();
  });

  it('checks a value against the ones a union allows', () => {
    const [problem] = problems('Chart', { chartType: 'candles' });
    expect(problem.path).toBe('chartType');
    expect(problem.suggestion).toBe('candlestick');
    expect(problems('Chart', { renderer: 'gpu' })[0].message).toMatch(/'canvas'/);
  });

  it('checks each item of an array of union values', () => {
    const [problem] = problems('ChartWidget', { chartTypes: ['candlestick', 'renco'] });
    expect(problem.path).toBe('chartTypes[1]');
    expect(problem.suggestion).toBe('renko');
  });

  it('takes a drawing tool of a plugin, and notes a name that looks like a built-in one mistyped', () => {
    const result = validateOptions('ChartWidget', { drawingFavorites: ['trendLine', 'targetLine', 'trendLIne'] });
    expect(result.problems).toEqual([]);
    expect(result.notes.join(' ')).toContain('trendLIne');
    expect(result.notes.join(' ')).toContain("'trendLine'");
    expect(result.notes.join(' ')).not.toContain('targetLine');
  });

  it('checks plain kinds: a number given as a string is wrong', () => {
    const [problem] = problems('ChartWidget', { historyLimit: '500' });
    expect(problem.path).toBe('historyLimit');
    expect(problem.message).toMatch(/number/);
  });

  it('reads intervals the way the library does', () => {
    expect(problems('ChartWidget', { timeframe: '90m' })).toEqual([]);
    expect(problems('ChartWidget', { timeframe: '5min' })[0].path).toBe('timeframe');
    expect(problems('ChartWidget', { timeframes: ['1m', 'daily'] })[0].path).toBe('timeframes[1]');
  });

  it('knows the widget feature switches', () => {
    const [problem] = problems('ChartWidget', { features: { 'toolbar.screenshots': false, alerts: 'no' } });
    expect(problem.path).toBe('features.toolbar.screenshots');
    expect(problem.suggestion).toBe('toolbar.screenshot');
    expect(problems('ChartWidget', { features: { alerts: 'no' } })[0].message).toMatch(/true or false/);
  });

  it('checks style overrides with the library\'s own reader', () => {
    const found = problems('Chart', { overrides: { 'grid.vertical.visibel': false, 'grid.vertical.width': 99 } });
    expect(found.map((p) => p.path)).toEqual(['overrides.grid.vertical.visibel', 'overrides.grid.vertical.width']);
    expect(found[0].suggestion).toBe('grid.vertical.visible');
  });

  it('checks the nested options: chartOptions, Chart.features, a grid\'s widget and cells', () => {
    expect(problems('ChartWidget', { chartOptions: { chartTyp: 'line' } })[0].path).toBe('chartOptions.chartTyp');
    expect(problems('Chart', { features: { drawing: true } })[0].suggestion).toBe('drawings');
    expect(problems('ChartWidgetGrid', { layout: '2x2', widget: { theme: 'dim' } })[0].path).toBe('widget.theme');
    expect(problems('ChartWidgetGrid', { cells: [{ symbol: 'ETHUSDT' }, { simbol: 'BTCUSDT' }] })[0].path).toBe('cells[1].simbol');
    expect(problems('ChartWidgetGrid', { layout: '4x4' })[0].path).toBe('layout');
  });

  it('accepts a function written as a placeholder string, since JSON has no functions', () => {
    expect(problems('ChartWidget', { onReady: '(chart) => chart.addIndicator("rsi")' })).toEqual([]);
  });

  it('tells how to load a language that is not built in', () => {
    const result = validateOptions('ChartWidget', { locale: 'ja' });
    expect(result.valid).toBe(true);
    expect(result.notes.join(' ')).toMatch(/registerWidgetLocales/);
    expect(problems('ChartWidget', { locale: 'jp' })[0].path).toBe('locale');
  });

  it('checks a number locale is one Intl can write numbers in', () => {
    expect(problems('ChartWidget', { chartOptions: { numberLocale: 'ko-KR' } })).toEqual([]);
    expect(problems('Chart', { numberLocale: 'de-DE' })).toEqual([]);
    const bad = problems('ChartWidget', { chartOptions: { numberLocale: 'korean' } });
    expect(bad[0].path).toBe('chartOptions.numberLocale');
    expect(bad[0].message).toMatch(/BCP 47/);
    expect(problems('Chart', { numberLocale: 'en_US' })[0].suggestion).toBe('en-US');
  });

  it('takes tick-bar intervals, as the library does', () => {
    expect(problems('ChartWidget', { timeframe: '100T' })).toEqual([]);
    expect(problems('ChartWidget', { timeframes: ['1m', '500T'] })).toEqual([]);
    expect(problems('Chart', { features: { timeframes: ['5m', '1000T'] } })).toEqual([]);
  });

  it('knows the options the Chart constructor takes beyond ChartOptions: plugins', () => {
    expect(problems('Chart', { plugins: [] })).toEqual([]);
  });

  it('reads chartOptions as its type says: ChartOptions, without the constructor\'s plugins', () => {
    expect(problems('ChartWidget', { chartOptions: { plugins: [] } })[0].path).toBe('chartOptions.plugins');
  });

  it('lets a grid cell use the messages of the grid\'s widget options', () => {
    const result = validateOptions('ChartWidgetGrid', { widget: { messages: { 'toolbar.indicators': 'X' } }, cells: [{ locale: 'xx' }] });
    expect(result.valid).toBe(true);
  });

  it('lets a language outside the built-in ones through when messages carry its strings', () => {
    const result = validateOptions('ChartWidget', { locale: 'xx', messages: { 'toolbar.indicators': 'X' } });
    expect(result.valid).toBe(true);
    expect(result.notes.join(' ')).toMatch(/messages/);
  });

  it('says a Chart switch in the widget\'s features goes in chartOptions.features', () => {
    const [problem] = problems('ChartWidget', { features: { drawings: false } });
    expect(problem.path).toBe('features.drawings');
    expect(problem.message).toMatch(/chartOptions\.features/);
    expect(problem.suggestion).toBeUndefined();
  });

  it('does not mistake an object\'s built-in names for style keys', () => {
    const [problem] = problems('Chart', { overrides: { constructor: 1 } });
    expect(problem.message).toMatch(/Unknown style key/);
  });

  it('checks a union of numbers: weekStartsOn is 0 or 1', () => {
    expect(problems('ChartWidget', { weekStartsOn: 1 })).toEqual([]);
    expect(problems('ChartWidget', { weekStartsOn: 2 })[0].path).toBe('weekStartsOn');
  });

  it('turns away what is not an options object', () => {
    expect(problems('Chart', null)[0].path).toBe('');
    expect(problems('Chart', [1, 2])[0].message).toMatch(/object/);
  });
});

describe('validateFinanceOptions', () => {
  const check = async (chart: string, options: unknown) => validateFinanceOptions(chart, options);

  it('passes options a finance chart takes', async () => {
    expect(await check('BarChart', { categories: ['Mon'], series: [{ name: 'Net', values: [1] }], mode: 'stacked', theme: 'light', locale: 'vi', font: { family: 'Tahoma' } }))
      .toEqual({ valid: true, problems: [], notes: [] });
    expect(await check('DepthChart', { data: { bids: [], asks: [] }, spreadLabel: 'Spread', crosshair: false })).toMatchObject({ valid: true });
    expect(await check('GaugeChart', { value: 62, pointer: 'needle' })).toMatchObject({ valid: true });
  });

  it('names an unknown option and the one that was meant, with no word of another entry point', async () => {
    const result = (await check('EquityCurveChart', { data: [], benchmarkLable: 'Index', symbol: 'BTCUSDT' }))!;
    expect(result.problems.map((p) => p.path)).toEqual(['benchmarkLable', 'symbol']);
    expect(result.problems[0].suggestion).toBe('benchmarkLabel');
    // `symbol` is ChartWidget's, which has nothing to do with a finance chart: no hint that sends it there.
    expect(result.problems[1].message).toBe("Unknown option 'symbol' for EquityCurveChart.");
  });

  it('says which value a choice takes, and what a plain option is', async () => {
    const result = (await check('BarChart', { categories: [], series: [], mode: 'stack', showValues: 'yes', theme: 'blue' }))!;
    const byPath = Object.fromEntries(result.problems.map((p) => [p.path, p]));
    expect(byPath.mode.suggestion).toBe('stacked');
    expect(byPath.showValues.message).toContain('boolean');
    expect(byPath.theme).toBeDefined();
  });

  it('says what a chart cannot be made without', async () => {
    expect((await check('BarChart', { series: [] }))!.problems.map((p) => p.message)).toEqual(["BarChart needs 'categories'."]);
    expect((await check('GaugeChart', {}))!.problems.map((p) => p.message)).toEqual(["GaugeChart needs 'value'."]);
    expect((await check('WaterfallChart', {}))!.problems.map((p) => p.message)).toEqual(["WaterfallChart needs 'data'."]);
    expect((await check('PerformanceDashboard', { title: 'Run' }))!.problems.map((p) => p.message)).toEqual(["PerformanceDashboard needs 'result'."]);
    expect((await check('MatrixChart', { values: null }))!.problems.map((p) => p.message)).toEqual(["MatrixChart needs 'rows'.", "MatrixChart needs 'values'."]);
    // Read from the declarations, for every chart: each needs something, and nothing optional is asked for.
    const { CATALOG } = await import('../catalog.js');
    for (const chart of CATALOG.financeCharts) {
      const needed = chart.options.filter((o) => o.required).map((o) => o.name);
      expect(needed.length, chart.name).toBeGreaterThan(0);
      expect(needed, chart.name).not.toContain('theme');
      expect((await check(chart.name, {}))!.problems.map((p) => p.path)).toEqual(needed);
    }
  });

  it('says when a locale is no language tag', async () => {
    const data = { categories: [], series: [] };
    expect((await check('BarChart', { ...data, locale: 'xx_invalid' }))!.problems.map((p) => p.path)).toEqual(['locale']);
    expect((await check('BarChart', { ...data, locale: '' }))!.valid).toBe(false);
    expect((await check('BarChart', { ...data, locale: 'vi' }))!.valid).toBe(true);
    expect((await check('CalendarChart', { data: [], locale: 'de-DE' }))!.valid).toBe(true);
  });

  it('knows no chart by another name, and leaves the three entry points as they were', async () => {
    expect(await check('PieChart', {})).toBeNull();
    // A finance chart's option on the widget is unknown there, and is not sent to a chart it has nothing to do with.
    const [problem] = validateOptions('ChartWidget', { benchmarkLabel: 'Index' }).problems;
    expect(problem.message).toBe("Unknown option 'benchmarkLabel' for ChartWidget.");
  });
});
