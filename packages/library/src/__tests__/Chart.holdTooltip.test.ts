// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FeaturesConfig, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const T0 = Date.UTC(2025, 0, 1);
const bars: OHLCBar[] = Array.from({ length: 120 }, (_, i) => ({
  time: T0 + i * 60_000, open: 100, high: 101, low: 99, close: 100 + (i % 3), volume: 5,
}));
/** Longer than a press is held before it counts. */
const A_HOLD_MS = 600;

let host: HTMLDivElement;
let chart: Chart;

type Inside = {
  viewport: { getState(): ViewportState };
  crosshairHandler: { callback(barIndex: number | null, point: { x: number; y: number } | null): void };
  crosshairTooltip: { show(point: unknown, bar: OHLCBar): void; hide(): void };
};
const inside = () => chart as unknown as Inside;

function make(crosshairTooltip: FeaturesConfig['crosshairTooltip']): void {
  chart = new Chart(host, { chartType: 'candlestick', features: crosshairTooltip === undefined ? {} : { crosshairTooltip } });
  chart.setData(bars);
}

/** A point in the middle of the plot. */
const middle = () => {
  const plot = inside().viewport.getState().chartRect;
  return { x: plot.x + plot.width / 2, y: plot.y + plot.height / 2 };
};
/** The crosshair comes to rest on bar `index`, as a frame reports it. */
const rest = (index: number) => inside().crosshairHandler.callback(index, { x: middle().x, y: middle().y - 40 });
const press = () => host.dispatchEvent(new MouseEvent('mousedown', { clientX: middle().x, clientY: middle().y, button: 0, buttons: 1, bubbles: true }));
const letGo = () => document.dispatchEvent(new MouseEvent('mouseup', { clientX: middle().x, clientY: middle().y, button: 0, bubbles: true }));

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// The price popup followed every move of the mouse. Asked for with a press held still, it shows while the button is down.
describe('Chart: the floating tooltip on a press held (crosshairTooltip: \'hold\')', () => {
  it('stays away under a pointer that only moves', () => {
    make('hold');
    const shown = vi.spyOn(inside().crosshairTooltip, 'show');
    rest(60);
    rest(61);
    expect(shown).not.toHaveBeenCalled();
  });

  it('shows the bar under a press held still, follows it to the next bar, and goes when the button is let go', () => {
    make('hold');
    const shown = vi.spyOn(inside().crosshairTooltip, 'show');
    const hidden = vi.spyOn(inside().crosshairTooltip, 'hide');
    rest(60);
    press();
    vi.advanceTimersByTime(A_HOLD_MS);
    expect(shown).toHaveBeenCalledTimes(1);
    expect(shown.mock.calls[0][1].time).toBe(bars[60].time);
    // Beside the press, wherever on this bar the pointer first came.
    expect(shown.mock.calls[0][0]).toEqual(middle());
    rest(61);
    expect(shown).toHaveBeenCalledTimes(2);
    expect(shown.mock.calls[1][1].time).toBe(bars[61].time);
    hidden.mockClear();
    letGo();
    expect(hidden).toHaveBeenCalled();
    rest(62);
    expect(shown).toHaveBeenCalledTimes(2);
  });

  it('shows nothing on a press let go before the wait is over', () => {
    make('hold');
    const shown = vi.spyOn(inside().crosshairTooltip, 'show');
    rest(60);
    press();
    vi.advanceTimersByTime(100);
    letGo();
    vi.advanceTimersByTime(A_HOLD_MS);
    expect(shown).not.toHaveBeenCalled();
  });

  it('follows the feature as it is switched: to hover, to a press held, to none', () => {
    make('hold');
    const shown = vi.spyOn(inside().crosshairTooltip, 'show');
    chart.setFeatures({ crosshairTooltip: true });
    rest(60);
    expect(shown).toHaveBeenCalledTimes(1);
    // A press held shows nothing more than the hover does, and takes no pan from the mouse.
    chart.setFeatures({ crosshairTooltip: false });
    rest(61);
    press();
    vi.advanceTimersByTime(A_HOLD_MS);
    letGo();
    expect(shown).toHaveBeenCalledTimes(1);
    chart.setFeatures({ crosshairTooltip: 'hold' });
    rest(62);
    expect(shown).toHaveBeenCalledTimes(1);
    press();
    vi.advanceTimersByTime(A_HOLD_MS);
    expect(shown).toHaveBeenCalledTimes(2);
  });
});

describe('Chart: the floating tooltip as it was', () => {
  it('follows the pointer when the feature is left out, or true', () => {
    make(undefined);
    const shown = vi.spyOn(inside().crosshairTooltip, 'show');
    rest(60);
    expect(shown).toHaveBeenCalledTimes(1);
  });

  it('never shows when it is false, under a pointer or a press held', () => {
    make(false);
    const shown = vi.spyOn(inside().crosshairTooltip, 'show');
    rest(60);
    press();
    vi.advanceTimersByTime(A_HOLD_MS);
    expect(shown).not.toHaveBeenCalled();
  });
});
