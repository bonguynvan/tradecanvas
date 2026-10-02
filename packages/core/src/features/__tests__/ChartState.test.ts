import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  DrawingState,
  TradingOrder,
  TradingPosition,
  Theme,
} from '@tradecanvas/commons';
import { ChartStateManager, SNAPSHOT_VERSION } from '../ChartState.js';
import type { PriceAlert } from '../AlertManager.js';

const fakeTheme = { name: 'dark' } as unknown as Theme;

const drawing: DrawingState = {
  id: 'd1',
  type: 'trendLine',
  anchors: [
    { time: 0, price: 100 },
    { time: 10, price: 120 },
  ],
  style: { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid' },
  visible: true,
  locked: false,
};

const order: TradingOrder = {
  id: 'o1',
  side: 'buy',
  type: 'limit',
  price: 99.5,
  quantity: 1,
};

const position: TradingPosition = {
  id: 'p1',
  side: 'buy',
  entryPrice: 100,
  quantity: 5,
  closedQuantity: 1,
  stopLoss: 95,
  takeProfit: 110,
};

const alert: PriceAlert = {
  id: 'a1',
  price: 105,
  condition: 'crossingUp',
  message: 'breakout',
  triggered: false,
  repeating: true,
  channel: 'rsi-1:value',
  label: 'RSI',
};

const fullChart = {
  getDrawings: () => [drawing],
  getOrders: () => [order],
  getPositions: () => [position],
  getAlerts: () => [alert],
  getTheme: () => fakeTheme,
  getIndicators: () => [
    { id: 'sma', instanceId: 'sma-1', params: { period: 20 } },
    {
      id: 'rsi', instanceId: 'rsi-1', params: { period: 14 }, position: 'top',
      style: { colors: ['#ff00aa'], lineWidths: [2], opacity: 0.5 }, visible: false,
    },
  ],
};

const minimalChart = {
  getDrawings: () => [],
  getTheme: () => fakeTheme,
};

describe('ChartStateManager.capture', () => {
  it('produces a versioned snapshot with all sections', () => {
    const snap = ChartStateManager.capture(fullChart, {
      symbol: 'BTCUSDT',
      timeframe: '1m',
      chartType: 'candlestick',
    });

    expect(snap.version).toBe(SNAPSHOT_VERSION);
    expect(snap.timestamp).toBeGreaterThan(0);
    expect(snap.symbol).toBe('BTCUSDT');
    expect(snap.timeframe).toBe('1m');
    expect(snap.chartType).toBe('candlestick');
    expect(snap.theme).toBe('dark');
    expect(snap.drawings).toEqual([drawing]);
    expect(snap.orders).toEqual([order]);
    expect(snap.positions).toEqual([position]);
    expect(snap.alerts).toEqual([alert]);
    expect(snap.indicators).toHaveLength(2);
  });

  it('defaults optional sections to empty arrays when getters are absent', () => {
    const snap = ChartStateManager.capture(minimalChart);
    expect(snap.indicators).toEqual([]);
    expect(snap.orders).toEqual([]);
    expect(snap.positions).toEqual([]);
    expect(snap.alerts).toEqual([]);
    expect(snap.chartType).toBe('candlestick');
  });
});

describe('ChartStateManager serialize/deserialize round-trip', () => {
  it('preserves drawings, indicators, orders, positions, alerts through JSON', () => {
    const snap = ChartStateManager.capture(fullChart, { chartType: 'heikinAshi' });
    const json = ChartStateManager.serialize(snap);
    const restored = ChartStateManager.deserialize(json);

    expect(restored).toEqual(snap);
    expect(restored.drawings[0].anchors).toEqual(drawing.anchors);
    expect(restored.indicators[0].params.period).toBe(20);
    expect(restored.indicators[1]).toMatchObject({
      position: 'top', style: { colors: ['#ff00aa'], lineWidths: [2], opacity: 0.5 }, visible: false,
    });
    expect(restored.alerts[0]).toEqual(alert);
    expect(restored.positions[0].closedQuantity).toBe(1);
  });

  it('preserves chart type and viewport defaults', () => {
    const snap = ChartStateManager.capture(minimalChart, { chartType: 'rangeBars' });
    const restored = ChartStateManager.deserialize(ChartStateManager.serialize(snap));
    expect(restored.chartType).toBe('rangeBars');
    expect(restored.viewport.barWidth).toBe(8);
  });

  it('warns on version mismatch but still returns the parsed snapshot', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tampered = JSON.stringify({
      ...ChartStateManager.capture(minimalChart),
      version: 999,
    });

    const restored = ChartStateManager.deserialize(tampered);
    expect(restored.version).toBe(999);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('throws on malformed JSON input', () => {
    expect(() => ChartStateManager.deserialize('{not json')).toThrow();
  });
});

describe('ChartStateManager drawing options', () => {
  it('keeps a drawing’s own options through a save', () => {
    const withOptions = {
      id: 'fib', type: 'fibRetracement', anchors: [{ time: 1, price: 2 }, { time: 3, price: 4 }],
      style: { color: '#fff', lineWidth: 1, lineStyle: 'solid' }, visible: true, locked: false,
      options: { reverse: true, levels: [{ value: 0.5, visible: true }] },
    };
    const restored = ChartStateManager.deserialize(JSON.stringify({ version: SNAPSHOT_VERSION, drawings: [withOptions] }));
    expect(restored.drawings[0].options).toEqual(withOptions.options);
  });
});

describe('ChartStateManager.deserialize validation', () => {
  it('returns an empty snapshot when the JSON parses to a non-object', () => {
    const restored = ChartStateManager.deserialize('null');
    expect(restored.drawings).toEqual([]);
    expect(restored.indicators).toEqual([]);
    expect(restored.chartType).toBe('candlestick');
  });

  it('drops malformed drawings instead of crashing the renderer', () => {
    const tampered = JSON.stringify({
      version: 1,
      chartType: 'candlestick',
      drawings: [
        { id: 'good', type: 'trendLine', anchors: [
          { time: 0, price: 1 }, { time: 1, price: 2 },
        ], style: { color: '#000', lineWidth: 1, lineStyle: 'solid' }, visible: true, locked: false },
        // Missing anchors — should be filtered out
        { id: 'bad', type: 'trendLine', style: { color: '#000', lineWidth: 1, lineStyle: 'solid' } },
        // Anchor with NaN — also filtered
        { id: 'nan', type: 'trendLine', anchors: [{ time: NaN, price: 1 }], style: { color: '#000', lineWidth: 1, lineStyle: 'solid' } },
        // Not even an object
        'oops',
      ],
    });
    const restored = ChartStateManager.deserialize(tampered);
    expect(restored.drawings.map((d) => d.id)).toEqual(['good']);
  });

  it('drops malformed orders and positions', () => {
    const tampered = JSON.stringify({
      version: 1,
      chartType: 'candlestick',
      orders: [
        { id: 'o1', side: 'buy', type: 'limit', price: 100, quantity: 1 },
        { id: 'o2' /* missing fields */ },
        null,
      ],
      positions: [
        { id: 'p1', side: 'buy', entryPrice: 100, quantity: 1 },
        { side: 'buy' /* missing id */ },
        42,
      ],
    });
    const restored = ChartStateManager.deserialize(tampered);
    expect(restored.orders.map((o) => o.id)).toEqual(['o1']);
    expect(restored.positions.map((p) => p.id)).toEqual(['p1']);
  });

  it('coerces missing viewport fields to defaults', () => {
    const restored = ChartStateManager.deserialize(
      JSON.stringify({ version: 1, chartType: 'candlestick' }),
    );
    expect(restored.viewport).toEqual({ barWidth: 8, barSpacing: 2, offset: 0 });
  });

  it('coerces wrong-typed viewport fields back to defaults', () => {
    const restored = ChartStateManager.deserialize(
      JSON.stringify({
        version: 1,
        chartType: 'candlestick',
        viewport: { barWidth: 'wide', barSpacing: null, offset: Infinity },
      }),
    );
    expect(restored.viewport).toEqual({ barWidth: 8, barSpacing: 2, offset: 0 });
  });

  it('reads unreadable input and saves without an indicator list as version 1', () => {
    for (const json of ['null', '42', '[]']) expect(ChartStateManager.deserialize(json).version).toBe(1);
    expect(ChartStateManager.deserialize(JSON.stringify({ version: 2, chartType: 'line' })).version).toBe(1);
    expect(ChartStateManager.capture(minimalChart).version).toBe(1);
  });

  it('treats a save without a version as version 1', () => {
    expect(ChartStateManager.deserialize(JSON.stringify({ chartType: 'line' })).version).toBe(1);
  });

  it('does not warn about older saves', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    ChartStateManager.deserialize(JSON.stringify({ version: 1, chartType: 'line' }));
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('fills alert fields older saves left out and drops alerts without a usable price', () => {
    const restored = ChartStateManager.deserialize(JSON.stringify({
      version: 1,
      alerts: [
        { id: 'a1', price: 100, condition: 'crossingDown' },
        { id: 'a2', price: 'high', condition: 'crossing' },
        { id: 'a3', price: 101, condition: 'sideways', channel: 7 },
        { price: 102 },
      ],
    }));
    expect(restored.alerts).toEqual([
      { id: 'a1', price: 100, condition: 'crossingDown', message: undefined, triggered: false, repeating: false, channel: 'price', label: undefined },
      { id: 'a3', price: 101, condition: 'crossing', message: undefined, triggered: false, repeating: false, channel: 'price', label: undefined },
    ]);
  });

  it('keeps only well-formed indicator style fields', () => {
    const restored = ChartStateManager.deserialize(JSON.stringify({
      version: 2,
      indicators: [
        { id: 'ema', instanceId: 'e1', params: {}, style: { colors: ['#fff', 3], lineWidths: [1, 'x'], opacity: 'half' }, visible: 'no' },
        { id: 'sma', instanceId: 's1', params: {}, style: 'red' },
      ],
    }));
    expect(restored.indicators[0].style).toEqual({ colors: ['#fff'], lineWidths: [1] });
    const blank = ChartStateManager.deserialize(JSON.stringify({
      version: 2, indicators: [{ id: 'ema', instanceId: 'e', params: {}, style: { colors: [], lineWidths: [0], opacity: 3 } }],
    }));
    expect(blank.indicators[0].style).toEqual({ opacity: 1 });
    expect(restored.indicators[0].visible).toBeUndefined();
    expect(restored.indicators[1].style).toBeUndefined();
  });

  it('drops indicators missing id, instanceId, or params', () => {
    const tampered = JSON.stringify({
      version: 1,
      chartType: 'candlestick',
      indicators: [
        { id: 'sma', instanceId: 'sma-1', params: { period: 20 } },
        { id: 'ema', instanceId: 'ema-1' /* no params */ },
        { instanceId: 'orphan', params: {} },
      ],
    });
    const restored = ChartStateManager.deserialize(tampered);
    expect(restored.indicators).toHaveLength(1);
    expect(restored.indicators[0].id).toBe('sma');
  });
});

describe('ChartStateManager localStorage round-trip', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() {
          return store.size;
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('round-trips a snapshot through saveToStorage / loadFromStorage', () => {
    const snap = ChartStateManager.capture(fullChart, { chartType: 'candlestick' });
    ChartStateManager.saveToStorage('tc-state', snap);
    const restored = ChartStateManager.loadFromStorage('tc-state');
    expect(restored).toEqual(snap);
  });

  it('returns null when the key has no stored value', () => {
    expect(ChartStateManager.loadFromStorage('missing')).toBeNull();
  });
});
