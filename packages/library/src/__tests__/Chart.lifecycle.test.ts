// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

let seen: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
let host: HTMLDivElement;

beforeEach(() => {
  installChartStubs();
  seen = null;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: (entries: { isIntersecting: boolean }[]) => void) { seen = cb; }
    observe() {}
    disconnect() {}
  });
  host = sizedHost();
});

afterEach(() => {
  host.remove();
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const paused = (chart: Chart) => (chart as unknown as { engine: { renderLoop: { isPaused(): boolean } } }).engine.renderLoop.isPaused();
const hide = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('Chart — pausing when no one can see it', () => {
  it('stops drawing scrolled off screen and draws again when back', () => {
    const chart = new Chart(host, {});
    expect(chart.isSuspended()).toBe(false);
    seen!([{ isIntersecting: false }]);
    expect(chart.isSuspended()).toBe(true);
    expect(paused(chart)).toBe(true);
    seen!([{ isIntersecting: true }]);
    expect(chart.isSuspended()).toBe(false);
    expect(paused(chart)).toBe(false);
    chart.destroy();
  });

  it('stops drawing while the page is hidden', () => {
    const chart = new Chart(host, {});
    hide(true);
    expect(chart.isSuspended()).toBe(true);
    hide(false);
    expect(chart.isSuspended()).toBe(false);
    chart.destroy();
  });

  it('lets an app pause it (a WebView in the background), each reason on its own', () => {
    const chart = new Chart(host, {});
    chart.suspend();
    expect(chart.isSuspended()).toBe(true);
    seen!([{ isIntersecting: false }]);
    chart.resume();
    // Still off screen: still paused.
    expect(chart.isSuspended()).toBe(true);
    seen!([{ isIntersecting: true }]);
    expect(chart.isSuspended()).toBe(false);
    chart.destroy();
  });

  it('keeps drawing whatever happens with pauseWhenHidden off, save for the app’s own pause', () => {
    const chart = new Chart(host, { pauseWhenHidden: false });
    expect(seen).toBeNull();
    hide(true);
    expect(chart.isSuspended()).toBe(false);
    chart.suspend();
    expect(chart.isSuspended()).toBe(true);
    chart.destroy();
  });

  it('leaves a live tick’s refit for later while paused, and does it on resume', () => {
    vi.useFakeTimers();
    const chart = new Chart(host, {});
    chart.setData([{ time: 60, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }]);
    vi.advanceTimersByTime(100);
    const fit = vi.spyOn(chart as unknown as { fitDataAndAxes(): void }, 'fitDataAndAxes');
    chart.suspend();
    chart.updateLastBar({ time: 60, open: 1, high: 3, low: 0.5, close: 2.5, volume: 2 });
    vi.advanceTimersByTime(100);
    expect(fit).not.toHaveBeenCalled();
    chart.resume();
    vi.advanceTimersByTime(100);
    expect(fit).toHaveBeenCalledTimes(1);
    chart.destroy();
    vi.useRealTimers();
  });

  it('draws what changed before a screenshot of a paused chart', () => {
    vi.useFakeTimers();
    const chart = new Chart(host, {});
    chart.setData([{ time: 60, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 }]);
    vi.advanceTimersByTime(100);
    chart.suspend();
    chart.updateLastBar({ time: 60, open: 1, high: 3, low: 0.5, close: 2.5, volume: 2 });
    const engine = (chart as unknown as { engine: { renderNow(): void } }).engine;
    const fit = vi.spyOn(chart as unknown as { fitDataAndAxes(): void }, 'fitDataAndAxes');
    const draw = vi.spyOn(engine, 'renderNow');
    chart.screenshotDataURL();
    expect(fit).toHaveBeenCalledTimes(1);
    expect(draw).toHaveBeenCalledTimes(1);
    // Done already: resuming has nothing left to refit.
    chart.resume();
    vi.advanceTimersByTime(100);
    expect(fit).toHaveBeenCalledTimes(1);
    chart.destroy();
    vi.useRealTimers();
  });

  it('lets go of the page’s events when destroyed', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const chart = new Chart(host, {});
    chart.destroy();
    expect(remove.mock.calls.some(([type]) => type === 'visibilitychange')).toBe(true);
  });

  it('wakes the stream when the page comes back or the network does, paused or not', () => {
    const chart = new Chart(host, { pauseWhenHidden: false });
    const wake = vi.fn();
    (chart as unknown as { streamManager: { wake: typeof wake } }).streamManager = { wake };
    hide(true);
    hide(false);
    window.dispatchEvent(new Event('online'));
    expect(wake.mock.calls).toEqual([['visible'], ['online']]);
    (chart as unknown as { streamManager: null }).streamManager = null;
    chart.destroy();
  });
});

