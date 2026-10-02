// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import type { AlertCondition } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

function bars(n: number): OHLCBar[] {
  const t0 = Date.UTC(2026, 0, 1);
  return Array.from({ length: n }, (_, i) => {
    const p = 100 + Math.sin(i / 5) * 3;
    return { time: t0 + i * 60_000, open: p, high: p + 1, low: p - 1, close: p + 0.5, volume: 1000 };
  });
}

type AlertProbe = {
  alertManager: {
    addAlert(price: number, condition: AlertCondition, message?: string, repeating?: boolean, channel?: string, label?: string): string;
  };
  layoutManager: { getPanels(): { id: string; position: string }[] };
  indicatorEngine: { getIndicatorStyle(instanceId: string): unknown };
};

let hosts: HTMLDivElement[];

function makeChart(): Chart {
  const host = sizedHost();
  hosts.push(host);
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars(200));
  return chart;
}

const probe = (chart: Chart) => chart as unknown as AlertProbe;

beforeEach(() => {
  hosts = [];
  vi.useFakeTimers();
  installChartStubs();
  localStorage.clear();
});

afterEach(() => {
  for (const host of hosts) host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart save/load', () => {
  it('restores indicators with their parameters, pane, style and visibility', () => {
    const source = makeChart();
    const ema = source.addIndicator('ema', { period: 50 })!;
    source.addIndicator('ema', { period: 20 });
    const rsi = source.addIndicator('rsi', { period: 7 }, 'top')!;
    source.updateIndicatorStyle(ema, { colors: ['#ff00aa'], lineWidths: [3] });
    source.setIndicatorVisible(rsi, false);
    const json = source.saveState()!;
    source.destroy();

    const target = makeChart();
    target.addIndicator('sma', { period: 9 }); // replaced by the saved set
    target.loadState(json);

    const restored = target.getActiveIndicators();
    expect(restored.map((i) => [i.id, i.params.period, i.visible])).toEqual([
      ['ema', 50, true],
      ['ema', 20, true],
      ['rsi', 7, false],
    ]);
    const newEma = restored[0].instanceId;
    expect(probe(target).indicatorEngine.getIndicatorStyle(newEma))
      .toMatchObject({ colors: ['#ff00aa'], lineWidths: [3] });
    const rsiPanel = probe(target).layoutManager.getPanels().find((p) => p.id === restored[2].instanceId);
    expect(rsiPanel?.position).toBe('top');
    target.destroy();
  });

  it('keeps alert channels pointing at the restored indicator, with repeat and label', () => {
    const source = makeChart();
    const rsi = source.addIndicator('rsi', { period: 14 })!;
    probe(source).alertManager.addAlert(70, 'crossingUp', 'overbought', true, `${rsi}:value`, 'RSI 70');
    source.addAlert(101.5, 'crossingDown', 'support');
    const json = source.saveState()!;
    source.destroy();

    const target = makeChart();
    target.loadState(json);
    const newRsi = target.getActiveIndicators()[0].instanceId;
    expect(newRsi).not.toBe(rsi);
    expect(target.getAlerts().map((a) => [a.price, a.condition, a.channel, a.repeating, a.label])).toEqual([
      [70, 'crossingUp', `${newRsi}:value`, true, 'RSI 70'],
      [101.5, 'crossingDown', 'price', false, undefined],
    ]);
    target.destroy();
  });

  it('leaves indicators alone when loading a version-1 save, which never had them', () => {
    const chart = makeChart();
    chart.addIndicator('ema', { period: 21 });
    chart.loadState(JSON.stringify({ version: 1, timestamp: 0, chartType: 'line', drawings: [], indicators: [], alerts: [] }));
    expect(chart.getActiveIndicators().map((i) => [i.id, i.params.period])).toEqual([['ema', 21]]);
    chart.destroy();
  });

  it('auto-saves after indicator changes', () => {
    const chart = makeChart();
    chart.setAutoSave('layout', 100);
    const id = chart.addIndicator('ema', { period: 10 })!;
    vi.advanceTimersByTime(150);
    expect(JSON.parse(localStorage.getItem('layout') ?? '{}').indicators?.[0]).toMatchObject({ id: 'ema', params: { period: 10 } });

    chart.updateIndicator(id, { period: 30 });
    vi.advanceTimersByTime(150);
    expect(JSON.parse(localStorage.getItem('layout')!).indicators[0].params.period).toBe(30);

    chart.setIndicatorVisible(id, false);
    vi.advanceTimersByTime(150);
    expect(JSON.parse(localStorage.getItem('layout')!).indicators[0].visible).toBe(false);

    chart.removeIndicator(id);
    vi.advanceTimersByTime(150);
    expect(JSON.parse(localStorage.getItem('layout')!).indicators).toEqual([]);
    chart.destroy();
  });
});

describe('Chart save/load — damaged or partial layouts', () => {
  it('restores what it can when an indicator is unknown, and keeps the rest for later', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const chart = makeChart();
    chart.addIndicator('sma', { period: 9 });
    const saved = JSON.parse(chart.saveState()!);
    saved.indicators = [
      { id: 'from-a-plugin', instanceId: 'p1', params: { length: 3 } },
      { id: 'ema', instanceId: 'e1', params: { period: 34 } },
    ];
    saved.alerts = [{ id: 'a1', price: 101, condition: 'crossing', triggered: false, repeating: false, channel: 'e1:value' }];
    chart.loadState(JSON.stringify(saved));

    const active = chart.getActiveIndicators();
    expect(active.map((i) => [i.id, i.params.period])).toEqual([['ema', 34]]);
    expect(chart.getAlerts()[0].channel).toBe(`${active[0].instanceId}:value`);
    const again = JSON.parse(chart.saveState()!);
    expect(again.indicators.map((i: { id: string }) => i.id)).toEqual(['ema', 'from-a-plugin']);
    expect(warn).toHaveBeenCalled();
    chart.destroy();
  });

  it('leaves indicators alone for unreadable input or a save without an indicator list', () => {
    const chart = makeChart();
    chart.addIndicator('ema', { period: 21 });
    chart.loadState('null');
    chart.loadState(JSON.stringify({ version: 2, chartType: 'candlestick' }));
    expect(chart.getActiveIndicators().map((i) => i.id)).toEqual(['ema']);
    chart.destroy();
  });

  it('does not re-arm a one-shot alert that already fired', () => {
    const chart = makeChart();
    const saved = JSON.parse(chart.saveState()!);
    saved.alerts = [
      { id: 'a1', price: 101, condition: 'crossing', triggered: true, repeating: false, channel: 'price' },
      { id: 'a2', price: 102, condition: 'crossing', triggered: true, repeating: true, channel: 'price' },
    ];
    chart.loadState(JSON.stringify(saved));
    expect(chart.getAlerts().map((a) => a.price)).toEqual([102]);
    chart.destroy();
  });
});
