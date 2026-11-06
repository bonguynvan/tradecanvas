// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Chart } from '../../Chart.js';
import { WidgetReplay, type ReplayHost } from '../WidgetReplay.js';
import { EN_TRANSLATOR } from '../i18n.js';
import type { WidgetLoadingOverlay } from '../WidgetLoadingOverlay.js';

/** The chart as the replay reads it, with no session started; records what it is asked. */
function fakeChart(bars: number) {
  const calls: string[] = [];
  const data = Array.from({ length: bars }, (_, i) => ({ time: i * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
  const chart = {
    calls,
    on: (event: string) => { calls.push(`on:${event}`); },
    getData: () => data,
    getPlotRect: () => ({ x: 0, y: 0, width: 600, height: 300 }),
    isReplayActive: () => false,
    getReplayProgress: () => ({ current: 0, total: bars, time: 0 }),
    getReplayState: () => 'stopped',
    replayStop: () => { calls.push('replayStop'); },
  };
  return chart;
}

let root: HTMLDivElement;
let container: HTMLDivElement;
let replays: WidgetReplay[] = [];

function make(bars: number, on = true) {
  const chart = fakeChart(bars);
  const marks: boolean[] = [];
  const host: ReplayHost = {
    chart: () => chart as unknown as Chart,
    root,
    chartContainer: container,
    options: {},
    t: EN_TRANSLATOR,
    isOn: () => on,
    isDestroyed: () => false,
    loading: { isActive: () => false, hasFailed: () => false } as unknown as WidgetLoadingOverlay,
    symbol: () => 'AAA',
    timeframe: () => '1m',
    adapter: () => null,
    baseSeries: () => null,
    baseTimeframeMs: () => 0,
    resampleOptions: () => ({ weekStartsOn: 1 }),
    textLocale: () => 'en',
    intlLocale: () => 'en',
    say: () => {},
    markActive: (active) => { marks.push(active); },
    bodyEl: () => null,
  };
  const replay = new WidgetReplay(host);
  replays.push(replay);
  return { replay, chart, marks };
}

beforeEach(() => {
  root = document.createElement('div');
  container = document.createElement('div');
  root.appendChild(container);
  document.body.appendChild(root);
});

afterEach(() => {
  for (const r of replays) r.destroy();
  replays = [];
  root.remove();
});

describe('WidgetReplay', () => {
  it('follows the chart once attached: a click on a bar, the pointer, the steps and the layout', () => {
    const { replay, chart } = make(10);
    replay.attach();
    for (const event of ['barClick', 'crosshairMove', 'replayStep', 'replayStepsLoad', 'timeframeChange', 'resize']) {
      expect(chart.calls).toContain(`on:${event}`);
    }
  });

  it('opens its panel to pick a start bar, and marks the toolbar button and the widget', () => {
    const { replay, marks } = make(10);
    replay.toggleReplay();
    expect(replay.isOpen()).toBe(true);
    expect(marks).toEqual([true]);
    expect(root.hasAttribute('data-tcw-replay')).toBe(true);
    expect(container.querySelector('.tcw-replay-shade')).not.toBeNull();
  });

  it('closes again, stopping the chart\'s session and taking its marks away', () => {
    const { replay, chart, marks } = make(10);
    replay.toggleReplay();
    replay.toggleReplay();
    expect(replay.isOpen()).toBe(false);
    expect(chart.calls).toContain('replayStop');
    expect(marks).toEqual([true, false]);
    expect(root.hasAttribute('data-tcw-replay')).toBe(false);
    expect(container.querySelector('.tcw-replay-shade')).toBeNull();
  });

  it('does not open with fewer than two bars, or with its switch off', () => {
    const few = make(1);
    few.replay.toggleReplay();
    expect(few.replay.isOpen()).toBe(false);
    const off = make(10, false);
    off.replay.toggleReplay();
    off.replay.replayFrom(3);
    expect(off.replay.isOpen()).toBe(false);
    expect(off.marks).toEqual([]);
  });
});
