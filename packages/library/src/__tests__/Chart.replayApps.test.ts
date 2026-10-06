// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, SignalMarker, TradeZone } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const T0 = Date.UTC(2026, 0, 1);
const at = (i: number) => T0 + i * 60_000;

function bars(n: number): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => {
    const p = 100 + Math.sin(i / 5) * 3;
    return { time: at(i), open: p, high: p + 1, low: p - 1, close: p + 0.5, volume: 1000 };
  });
}

type Shown = {
  signalMarkerManager: { shownMarkers(): SignalMarker[] };
  tradeZoneManager: { shownZones(): TradeZone[] };
};

let host: HTMLDivElement;
let chart: Chart;
const shown = () => chart as unknown as Shown;
const markerIds = () => shown().signalMarkerManager.shownMarkers().map((m) => m.id);

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars(300));
  chart.setSignalMarkers([
    { id: 'early', time: at(10), price: 100, direction: 'long', confidence: 1 },
    { id: 'late', time: at(50), price: 100, direction: 'short', confidence: 1 },
  ] as SignalMarker[]);
  chart.setTradeZones([{ id: 'trade', entryTime: at(15), entryPrice: 100, exitTime: at(55), exitPrice: 104, direction: 'long', pnl: 4 }]);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Chart replay: markers and trades as the replay reaches them', () => {
  it('shows only what the replay has reached, and a trade open until its exit', () => {
    chart.replayStart({ startIndex: 20, paused: true });
    expect(markerIds()).toEqual(['early']);
    expect(shown().tradeZoneManager.shownZones()).toEqual([{ id: 'trade', entryTime: at(15), entryPrice: 100, direction: 'long' }]);
    chart.replaySeek(60);
    expect(markerIds()).toEqual(['early', 'late']);
    expect(shown().tradeZoneManager.shownZones()[0].exitTime).toBe(at(55));
    // The chart keeps them all.
    expect(chart.getSignalMarkers()).toHaveLength(2);
    chart.replayStop();
    expect(markerIds()).toEqual(['early', 'late']);
  });

  it('shows them all through a replay asked to', () => {
    chart.replayStart({ startIndex: 20, paused: true, revealMarks: false });
    expect(markerIds()).toEqual(['early', 'late']);
  });
});

describe('Chart replay: where it starts', () => {
  it('starts at the first bar from a time', () => {
    chart.replayStart({ startTime: at(100) - 1, paused: true });
    expect(chart.getData()).toHaveLength(101);
    expect(chart.getData().at(-1)!.time).toBe(at(100));
  });

  it('leaves the bars before the start out until it stops', () => {
    chart.replayStart({ startTime: at(100), hideHistory: true, paused: true });
    expect(chart.getData().map((b) => b.time)).toEqual([at(100)]);
    expect(chart.getReplayBarIndex()).toBe(0);
    chart.replaySeek(5);
    expect(chart.getData()).toHaveLength(6);
    expect(chart.getData()[0].time).toBe(at(100));
    chart.replayStop();
    expect(chart.getData()).toHaveLength(300);
  });
});

describe('Chart replay events', () => {
  it('says how many bars a step is of, and when the replay is done', () => {
    const steps: { barIndex: number; total: number }[] = [];
    const done: { barIndex: number; time: number }[] = [];
    chart.on('replayStep', (e) => steps.push(e.payload));
    chart.on('replayComplete', (e) => done.push(e.payload));
    chart.replayStart({ startIndex: 297, interval: 100, speed: 1 });
    vi.advanceTimersByTime(1000);
    expect(steps.at(-1)).toMatchObject({ barIndex: 299, total: 300 });
    expect(done).toEqual([{ barIndex: 299, time: at(299) }]);
  });
});

describe('Chart replay after review', () => {
  it('shows every mark again when a restart asks to', () => {
    chart.replayStart({ startIndex: 20, paused: true });
    expect(markerIds()).toEqual(['early']);
    chart.replayStart({ startIndex: 20, paused: true, revealMarks: false });
    expect(markerIds()).toEqual(['early', 'late']);
  });

  it('shows no mark ahead of a replay that plays from its start', () => {
    chart.replayStart({ startIndex: 0, interval: 100, speed: 1 });
    expect(markerIds()).toEqual([]);
  });

  it('shows the cut at once when it plays from a bar', () => {
    chart.replayStart({ startIndex: 120, interval: 100, speed: 1 });
    expect(chart.getData()).toHaveLength(120);
  });

  it('keeps its window on a restart, counting in it', () => {
    chart.replayStart({ startIndex: 100, hideHistory: true, paused: true });
    chart.replaySeek(10);
    chart.replayStart({ startIndex: chart.getReplayBarIndex(), paused: true });
    expect(chart.getData()[0].time).toBe(at(100));
    expect(chart.getData()).toHaveLength(11);
    expect(chart.getReplayBarIndex()).toBe(10);
  });

  it('leaves out the marks before its window', () => {
    chart.replayStart({ startIndex: 20, hideHistory: true, paused: true });
    chart.replaySeek(40);
    expect(markerIds()).toEqual(['late']);
    expect(shown().tradeZoneManager.shownZones()).toEqual([]);
  });

  it('shows the mark on a series of one bar', () => {
    chart.replayStart({ startTime: at(50), hideHistory: true, paused: true });
    chart.setData(bars(51));
    chart.replayStart({ startTime: at(50), hideHistory: true, paused: true });
    expect(chart.getData()).toHaveLength(1);
    expect(markerIds()).toEqual(['late']);
  });
});
