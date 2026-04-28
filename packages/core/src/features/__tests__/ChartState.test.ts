import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  DrawingState,
  TradingOrder,
  TradingPosition,
  Theme,
} from '@tradecanvas/commons';
import { ChartStateManager } from '../ChartState.js';
import type { PriceAlert } from '../AlertManager.js';

const fakeTheme = { name: 'dark' } as unknown as Theme;

const drawing: DrawingState = {
  id: 'd1',
  type: 'trendLine',
  anchors: [
    { time: 0, price: 100 },
    { time: 10, price: 120 },
  ],
  style: { color: '#2196F3', lineWidth: 1, lineStyle: 'solid' },
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
  condition: 'above',
  enabled: true,
} as unknown as PriceAlert;

const fullChart = {
  getDrawings: () => [drawing],
  getOrders: () => [order],
  getPositions: () => [position],
  getAlerts: () => [alert],
  getTheme: () => fakeTheme,
  getIndicators: () => [
    { id: 'sma', instanceId: 'sma-1', params: { period: 20 } },
    { id: 'rsi', instanceId: 'rsi-1', params: { period: 14 } },
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

    expect(snap.version).toBe(1);
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
