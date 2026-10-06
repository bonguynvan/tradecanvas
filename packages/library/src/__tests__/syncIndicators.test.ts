import { describe, it, expect, vi } from 'vitest';
import { syncIndicators } from '../frameworks/syncIndicators.js';

function fakeChart() {
  let next = 1;
  return {
    addIndicator: vi.fn((..._args: unknown[]) => `i${next++}`),
    removeIndicator: vi.fn(),
  };
}

describe('syncIndicators', () => {
  it('adds names as they are, and indicators with their inputs and place', () => {
    const chart = fakeChart();
    const current = new Map<string, string>();
    syncIndicators(chart, ['rsi', { id: 'ema', params: { period: 20 } }, { id: 'macd', position: 'top' }], current);
    expect(chart.addIndicator.mock.calls).toEqual([['rsi'], ['ema', { period: 20 }], ['macd', {}, 'top']]);
    expect(current.size).toBe(3);
  });

  it('leaves the unchanged alone, puts back one whose inputs changed, and takes away the rest', () => {
    const chart = fakeChart();
    const current = new Map<string, string>();
    syncIndicators(chart, ['rsi', { id: 'ema', params: { period: 20 } }], current);
    chart.addIndicator.mockClear();
    syncIndicators(chart, [{ id: 'ema', params: { period: 50 } }], current);
    expect(chart.removeIndicator.mock.calls).toEqual([['i1'], ['i2']]);
    expect(chart.addIndicator.mock.calls).toEqual([['ema', { period: 50 }]]);
    chart.addIndicator.mockClear();
    chart.removeIndicator.mockClear();
    syncIndicators(chart, [{ id: 'ema', params: { period: 50 } }], current);
    expect(chart.addIndicator).not.toHaveBeenCalled();
    expect(chart.removeIndicator).not.toHaveBeenCalled();
  });

  it('reads inputs in any order as the same, and keeps two alike as two', () => {
    const chart = fakeChart();
    const current = new Map<string, string>();
    syncIndicators(chart, [{ id: 'bb', params: { period: 20, stdDev: 2 } }, 'ema', 'ema'], current);
    chart.addIndicator.mockClear();
    syncIndicators(chart, [{ id: 'bb', params: { stdDev: 2, period: 20 } }, 'ema', 'ema'], current);
    expect(chart.addIndicator).not.toHaveBeenCalled();
    expect(current.size).toBe(3);
  });

  it('reads an id and the same id with no inputs as one', () => {
    const chart = fakeChart();
    const current = new Map<string, string>();
    syncIndicators(chart, ['rsi'], current);
    syncIndicators(chart, [{ id: 'rsi' }], current);
    expect(chart.addIndicator).toHaveBeenCalledTimes(1);
    expect(chart.removeIndicator).not.toHaveBeenCalled();
  });

  it('forgets one the chart would not add', () => {
    const chart = { addIndicator: vi.fn(() => null), removeIndicator: vi.fn() };
    const current = new Map<string, string>();
    syncIndicators(chart, ['nope'], current);
    expect(current.size).toBe(0);
  });
});
