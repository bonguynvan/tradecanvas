import { describe, expect, it } from 'vitest';
import {
  CHART_STYLE_KEYS,
  DARK_THEME,
  LIGHT_THEME,
  chartStyleValue,
  lineDash,
  readChartStyleOverrides,
  resolveChartTheme,
  type ChartStyleKey,
} from '@tradecanvas/commons';

describe('resolveChartTheme', () => {
  it('draws as the theme does with no overrides', () => {
    const t = resolveChartTheme(DARK_THEME, 'candlestick', {});
    for (const token of ['background', 'grid', 'crosshair', 'candleUp', 'candleDown', 'candleUpWick', 'candleDownWick', 'lineColor', 'areaTopColor', 'areaBottomColor', 'volumeUp', 'volumeDown', 'axisLine', 'axisLabel'] as const) {
      expect(t[token]).toBe(DARK_THEME[token]);
    }
    const s = t.style!;
    expect(s.grid.horizontal).toEqual({ visible: true, color: DARK_THEME.grid, style: 'solid', width: 1 });
    expect(s.grid.vertical).toEqual({ visible: true, color: DARK_THEME.grid, style: 'solid', width: 1 });
    expect(s.crosshair.horizontal).toEqual({ visible: true, color: DARK_THEME.crosshair, style: 'dashed', width: 1 });
    expect(s.crosshair.labelBackground).toBe(DARK_THEME.text);
    expect(s.crosshair.labelText).toBe(DARK_THEME.background);
    expect(s.panes).toEqual({ background: DARK_THEME.background, separator: DARK_THEME.axisLine, title: DARK_THEME.textSecondary });
    expect(s.axis).toEqual({ price: { line: DARK_THEME.axisLine, text: DARK_THEME.axisLabel }, time: { line: DARK_THEME.axisLine, text: DARK_THEME.axisLabel } });
    expect(s.legend).toEqual({ text: DARK_THEME.text, label: DARK_THEME.textSecondary });
    expect(s.lastPrice).toEqual({ visible: true, up: DARK_THEME.candleUp, down: DARK_THEME.candleDown, style: 'dashed', width: 1 });
    expect(s.watermark.color).toBeNull();
    expect(s.sessionBreaks).toEqual({ color: null, style: null, width: null });
    expect(s.highLow.color).toBeNull();
    expect(s.series.lineWidth).toBe(2);
    expect(s.trading).toEqual({ buy: null, sell: null, profit: null, loss: null, entry: null });
    expect(s.markers).toEqual({ long: null, short: null, neutral: null });
    expect(s.tradeZones).toEqual({ profit: null, loss: null, active: null });
    expect(s.drawings).toEqual({ handle: null });
  });

  it('colours the orders, positions, markers, trades and drawing handles by key', () => {
    const s = resolveChartTheme(DARK_THEME, 'candlestick', {
      'trading.buyColor': '#00aaff',
      'trading.lossColor': '#ff5500',
      'markers.longColor': '#11ee11',
      'tradeZones.activeColor': '#999999',
      'drawings.handleColor': '#222222',
    }).style!;
    expect(s.trading).toEqual({ buy: '#00aaff', sell: null, profit: null, loss: '#ff5500', entry: null });
    expect(s.markers.long).toBe('#11ee11');
    expect(s.tradeZones.active).toBe('#999999');
    expect(s.drawings.handle).toBe('#222222');
  });

  it('leaves the theme it was given as it was', () => {
    const before = JSON.stringify(DARK_THEME);
    const t = resolveChartTheme(DARK_THEME, 'candlestick', { 'background.color': '#000', 'series.candlestick.upColor': '#0f0' });
    expect(t).not.toBe(DARK_THEME);
    expect(JSON.stringify(DARK_THEME)).toBe(before);
  });

  it('styles the main series as the type it is drawn as, falling back to the candles', () => {
    const o = { 'series.candlestick.upColor': '#0f0', 'series.bar.downColor': '#f00', 'series.heikinAshi.upColor': '#00f' };
    expect(resolveChartTheme(DARK_THEME, 'candlestick', o).candleUp).toBe('#0f0');
    // A bar chart: its own down, the candles' up.
    const bar = resolveChartTheme(DARK_THEME, 'bar', o);
    expect(bar.candleUp).toBe('#0f0');
    expect(bar.candleDown).toBe('#f00');
    // Heikin-Ashi's own up wins; the candles' down is the theme's.
    const ha = resolveChartTheme(DARK_THEME, 'heikinAshi', o);
    expect(ha.candleUp).toBe('#00f');
    expect(ha.candleDown).toBe(DARK_THEME.candleDown);
    // A key of another type does nothing here.
    expect(resolveChartTheme(DARK_THEME, 'candlestick', o).candleDown).toBe(DARK_THEME.candleDown);
  });

  it('gives the wicks the body colour unless they have their own', () => {
    const t = resolveChartTheme(DARK_THEME, 'candlestick', { 'series.candlestick.upColor': '#0f0', 'series.candlestick.wickDownColor': '#888' });
    expect(t.candleUpWick).toBe('#0f0');
    expect(t.candleDownWick).toBe('#888');
    const ha = resolveChartTheme(DARK_THEME, 'heikinAshi', { 'series.heikinAshi.upColor': '#00f', 'series.candlestick.wickUpColor': '#123' });
    expect(ha.candleUpWick).toBe('#123');
  });

  it('chains line colours and widths through the line chart', () => {
    const o = { 'series.line.color': '#abc', 'series.line.lineWidth': 3 };
    expect(resolveChartTheme(DARK_THEME, 'stepLine', o).lineColor).toBe('#abc');
    expect(resolveChartTheme(DARK_THEME, 'stepLine', o).style!.series.lineWidth).toBe(3);
    expect(resolveChartTheme(DARK_THEME, 'area', o).lineColor).toBe('#abc');
    const own = { ...o, 'series.area.lineColor': '#def', 'series.area.lineWidth': 1 };
    expect(resolveChartTheme(DARK_THEME, 'area', own).lineColor).toBe('#def');
    expect(resolveChartTheme(DARK_THEME, 'area', own).style!.series.lineWidth).toBe(1);
    expect(resolveChartTheme(DARK_THEME, 'baseline', { 'series.baseline.lineWidth': 4 }).style!.series.lineWidth).toBe(4);
  });

  it('fills an HLC area as the area unless it has its own', () => {
    const o = { 'series.area.topColor': 'rgba(1, 2, 3, 0.5)', 'series.hlcArea.bottomColor': 'rgba(4, 5, 6, 0)' };
    const t = resolveChartTheme(DARK_THEME, 'hlcArea', o);
    expect(t.areaTopColor).toBe('rgba(1, 2, 3, 0.5)');
    expect(t.areaBottomColor).toBe('rgba(4, 5, 6, 0)');
  });

  it('puts the background behind the panes unless they have their own', () => {
    const t = resolveChartTheme(DARK_THEME, 'candlestick', { 'background.color': '#101010' });
    expect(t.background).toBe('#101010');
    expect(t.style!.panes.background).toBe('#101010');
    expect(resolveChartTheme(DARK_THEME, 'candlestick', { 'background.color': '#101010', 'panes.background': '#202020' }).style!.panes.background).toBe('#202020');
  });

  it('styles the grid lines each way apart', () => {
    const s = resolveChartTheme(LIGHT_THEME, 'candlestick', {
      'grid.horizontal.color': '#111', 'grid.horizontal.style': 'dotted', 'grid.horizontal.width': 2,
      'grid.vertical.visible': false,
    }).style!;
    expect(s.grid.horizontal).toEqual({ visible: true, color: '#111', style: 'dotted', width: 2 });
    expect(s.grid.vertical).toEqual({ visible: false, color: LIGHT_THEME.grid, style: 'solid', width: 1 });
  });

  it('styles the crosshair, the axes, the legend and the rest', () => {
    const s = resolveChartTheme(DARK_THEME, 'candlestick', {
      'crosshair.vertical.style': 'solid', 'crosshair.horizontal.visible': false, 'crosshair.labelBackground': '#222', 'crosshair.labelTextColor': '#eee',
      'axis.time.textColor': '#999', 'legend.labelColor': '#777', 'watermark.color': 'rgba(0, 0, 0, 0.1)',
      'sessionBreaks.style': 'dotted', 'highLow.color': '#f0f', 'panes.separatorColor': '#333', 'panes.titleColor': '#444',
    }).style!;
    expect(s.crosshair.vertical.style).toBe('solid');
    expect(s.crosshair.horizontal.visible).toBe(false);
    expect(s.crosshair.labelBackground).toBe('#222');
    expect(s.crosshair.labelText).toBe('#eee');
    expect(s.axis.time.text).toBe('#999');
    expect(s.axis.price.text).toBe(DARK_THEME.axisLabel);
    expect(s.legend.label).toBe('#777');
    expect(s.watermark.color).toBe('rgba(0, 0, 0, 0.1)');
    expect(s.sessionBreaks).toEqual({ color: null, style: 'dotted', width: null });
    expect(s.highLow.color).toBe('#f0f');
    expect(s.panes.separator).toBe('#333');
    expect(s.panes.title).toBe('#444');
  });

  it('colours the last price as the series unless it has its own', () => {
    const t = resolveChartTheme(DARK_THEME, 'candlestick', { 'series.candlestick.upColor': '#0f0', 'lastPrice.downColor': '#f00', 'lastPrice.style': 'solid' });
    expect(t.style!.lastPrice).toEqual({ visible: true, up: '#0f0', down: '#f00', style: 'solid', width: 1 });
  });

  it('colours the volume with its own keys', () => {
    const t = resolveChartTheme(DARK_THEME, 'candlestick', { 'volume.upColor': 'rgba(0, 255, 0, 0.3)' });
    expect(t.volumeUp).toBe('rgba(0, 255, 0, 0.3)');
    expect(t.volumeDown).toBe(DARK_THEME.volumeDown);
  });
});

describe('chartStyleValue', () => {
  it('gives what a key resolves to, for any chart type', () => {
    const o = { 'series.candlestick.upColor': '#0f0' };
    expect(chartStyleValue(DARK_THEME, o, 'series.bar.upColor')).toBe('#0f0');
    expect(chartStyleValue(DARK_THEME, o, 'series.bar.downColor')).toBe(DARK_THEME.candleDown);
    expect(chartStyleValue(DARK_THEME, o, 'series.candlestick.wickUpColor')).toBe('#0f0');
    expect(chartStyleValue(DARK_THEME, {}, 'grid.vertical.width')).toBe(1);
    expect(chartStyleValue(DARK_THEME, {}, 'series.area.lineWidth')).toBe(2);
    expect(chartStyleValue(DARK_THEME, {}, 'background.color')).toBe(DARK_THEME.background);
  });

  it('has a value for every key', () => {
    for (const key of Object.keys(CHART_STYLE_KEYS) as ChartStyleKey[]) {
      const value = chartStyleValue(DARK_THEME, {}, key);
      // Only the parts that defer to their own settings resolve to null.
      if (value === null) expect(key).toMatch(/^(watermark\.color|sessionBreaks\.|highLow\.color|trading\.|markers\.|tradeZones\.|drawings\.)/);
      else expect(typeof value).toBe(CHART_STYLE_KEYS[key] === 'color' || CHART_STYLE_KEYS[key] === 'lineStyle' ? 'string' : CHART_STYLE_KEYS[key] === 'width' ? 'number' : 'boolean');
    }
  });
});

describe('readChartStyleOverrides', () => {
  it('keeps the keys and values it knows, and says which it left out', () => {
    const { overrides, rejected } = readChartStyleOverrides({
      'grid.horizontal.color': '#123456',
      'grid.horizontal.style': 'dashed',
      'grid.horizontal.width': 2,
      'lastPrice.visible': false,
      'series.line.color': null,
      'no.such.key': '#fff',
      'grid.vertical.style': 'wavy',
      'grid.vertical.width': 0,
      'axis.price.textColor': 42,
      'background.color': 'url(https://example.com/x.png)',
      'legend.textColor': 'red; background: blue',
      'crosshair.horizontal.width': 99,
      'lastPrice.width': Number.NaN,
    });
    expect(overrides).toEqual({
      'grid.horizontal.color': '#123456',
      'grid.horizontal.style': 'dashed',
      'grid.horizontal.width': 2,
      'lastPrice.visible': false,
      'series.line.color': null,
    });
    expect(rejected.sort()).toEqual([
      'axis.price.textColor', 'background.color', 'crosshair.horizontal.width', 'grid.vertical.style',
      'grid.vertical.width', 'lastPrice.width', 'legend.textColor', 'no.such.key',
    ]);
  });

  it('takes colours as CSS writes them, and nothing that could break out of one', () => {
    const ok = ['#abc', '#aabbcc', '#aabbccdd', 'red', 'transparent', 'rgb(1, 2, 3)', 'rgba(1,2,3,0.5)', 'hsl(120 50% 50% / 0.5)', 'oklch(0.7 0.1 200)', 'color(display-p3 1 0 0)'];
    const bad = ['red"><img src=x onerror=alert(1)>', 'javascript:alert(1)', 'rgb(1,2,3);background:red', 'expression(alert(1))', '<b>', 'url(x)', 'rgb(1, 2, 3', 'red blue'];
    for (const color of ok) expect(readChartStyleOverrides({ 'legend.textColor': color }).rejected).toEqual([]);
    for (const color of bad) expect(readChartStyleOverrides({ 'legend.textColor': color }).rejected).toEqual(['legend.textColor']);
  });

  it('reads nothing from what is not an object', () => {
    expect(readChartStyleOverrides(null)).toEqual({ overrides: {}, rejected: [] });
    expect(readChartStyleOverrides(['#fff'])).toEqual({ overrides: {}, rejected: [] });
  });
});

describe('lineDash', () => {
  it('turns a line style into a dash pattern', () => {
    expect(lineDash('solid', [4, 4])).toEqual([]);
    expect(lineDash('dashed', [4, 3])).toEqual([4, 3]);
    expect(lineDash('dotted', [4, 4])).toEqual([1, 2]);
    expect(lineDash('dotted', [4, 4], 2)).toEqual([2, 4]);
  });
});
