import type { ChartType, DrawingState, TradingOrder, TradingPosition, Theme } from '@tradecanvas/commons';
import type { PriceAlert } from './AlertManager.js';

/**
 * Serializable chart state for save/load functionality.
 * Contains everything needed to restore a chart to its exact state.
 */
export interface ChartSnapshot {
  version: number;
  timestamp: number;

  // Chart config
  symbol?: string;
  timeframe?: string;
  chartType: ChartType;

  // Viewport
  viewport: {
    barWidth: number;
    barSpacing: number;
    offset: number;
  };

  // Visual
  theme?: string | Theme;
  locale?: string;

  // Indicators
  indicators: {
    id: string;
    instanceId: string;
    params: Record<string, unknown>;
    position?: string;
  }[];

  // Drawings (fully serializable)
  drawings: DrawingState[];

  // Trading
  orders: TradingOrder[];
  positions: TradingPosition[];

  // Alerts
  alerts: PriceAlert[];
}

const CURRENT_VERSION = 1;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function validateDrawing(raw: unknown): DrawingState | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== 'string' || typeof raw.type !== 'string') return null;
  if (!Array.isArray(raw.anchors) || raw.anchors.length === 0) return null;
  if (!isObject(raw.style)) return null;

  const anchors: DrawingState['anchors'] = [];
  for (const a of raw.anchors) {
    if (!isObject(a)) return null;
    if (typeof a.time !== 'number' || typeof a.price !== 'number') return null;
    if (!Number.isFinite(a.time) || !Number.isFinite(a.price)) return null;
    anchors.push({ time: a.time, price: a.price });
  }

  const style = raw.style;
  if (typeof style.color !== 'string' || typeof style.lineWidth !== 'number') {
    return null;
  }

  return {
    id: raw.id,
    type: raw.type as DrawingState['type'],
    anchors,
    style: style as DrawingState['style'],
    visible: typeof raw.visible === 'boolean' ? raw.visible : true,
    locked: typeof raw.locked === 'boolean' ? raw.locked : false,
    meta: isObject(raw.meta) ? raw.meta : undefined,
  };
}

function validateOrder(raw: unknown): TradingOrder | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== 'string' || typeof raw.side !== 'string') return null;
  if (typeof raw.type !== 'string' || typeof raw.price !== 'number') return null;
  if (typeof raw.quantity !== 'number') return null;
  return raw as unknown as TradingOrder;
}

function validatePosition(raw: unknown): TradingPosition | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== 'string' || typeof raw.side !== 'string') return null;
  if (typeof raw.entryPrice !== 'number' || typeof raw.quantity !== 'number') return null;
  return raw as unknown as TradingPosition;
}

export function validateSnapshot(raw: unknown): ChartSnapshot {
  if (!isObject(raw)) {
    return emptySnapshot();
  }

  if (typeof raw.version === 'number' && raw.version !== CURRENT_VERSION) {
    console.warn(`Chart state version mismatch: ${raw.version} vs ${CURRENT_VERSION}`);
  }

  const viewport = isObject(raw.viewport) ? raw.viewport : {};

  const indicators: ChartSnapshot['indicators'] = [];
  for (const ind of asArray(raw.indicators)) {
    if (!isObject(ind)) continue;
    if (typeof ind.id !== 'string' || typeof ind.instanceId !== 'string') continue;
    if (!isObject(ind.params)) continue;
    indicators.push({
      id: ind.id,
      instanceId: ind.instanceId,
      params: ind.params,
      position: typeof ind.position === 'string' ? ind.position : undefined,
    });
  }

  const drawings: DrawingState[] = [];
  for (const d of asArray(raw.drawings)) {
    const v = validateDrawing(d);
    if (v) drawings.push(v);
  }

  const orders: TradingOrder[] = [];
  for (const o of asArray(raw.orders)) {
    const v = validateOrder(o);
    if (v) orders.push(v);
  }

  const positions: TradingPosition[] = [];
  for (const p of asArray(raw.positions)) {
    const v = validatePosition(p);
    if (v) positions.push(v);
  }

  const alerts: PriceAlert[] = [];
  for (const a of asArray(raw.alerts)) {
    if (isObject(a) && typeof a.id === 'string') alerts.push(a as unknown as PriceAlert);
  }

  return {
    version: typeof raw.version === 'number' ? raw.version : CURRENT_VERSION,
    timestamp: asNumber(raw.timestamp, Date.now()),
    symbol: typeof raw.symbol === 'string' ? raw.symbol : undefined,
    timeframe: typeof raw.timeframe === 'string' ? raw.timeframe : undefined,
    chartType: asString(raw.chartType, 'candlestick') as ChartType,
    viewport: {
      barWidth: asNumber(viewport.barWidth, 8),
      barSpacing: asNumber(viewport.barSpacing, 2),
      offset: asNumber(viewport.offset, 0),
    },
    theme: typeof raw.theme === 'string' ? raw.theme : undefined,
    locale: typeof raw.locale === 'string' ? raw.locale : undefined,
    indicators,
    drawings,
    orders,
    positions,
    alerts,
  };
}

function emptySnapshot(): ChartSnapshot {
  return {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    chartType: 'candlestick',
    viewport: { barWidth: 8, barSpacing: 2, offset: 0 },
    indicators: [],
    drawings: [],
    orders: [],
    positions: [],
    alerts: [],
  };
}

export class ChartStateManager {
  /**
   * Capture current chart state as a serializable snapshot.
   */
  static capture(chart: {
    getDrawings: () => DrawingState[];
    getOrders?: () => TradingOrder[];
    getPositions?: () => TradingPosition[];
    getAlerts?: () => PriceAlert[];
    getTheme: () => Theme;
    getIndicators?: () => { id: string; instanceId: string; params: Record<string, unknown> }[];
  }, meta?: { symbol?: string; timeframe?: string; chartType?: ChartType }): ChartSnapshot {
    return {
      version: CURRENT_VERSION,
      timestamp: Date.now(),
      chartType: meta?.chartType ?? 'candlestick',
      symbol: meta?.symbol,
      timeframe: meta?.timeframe,
      viewport: { barWidth: 8, barSpacing: 2, offset: 0 },
      theme: chart.getTheme().name,
      indicators: chart.getIndicators?.() ?? [],
      drawings: chart.getDrawings(),
      orders: chart.getOrders?.() ?? [],
      positions: chart.getPositions?.() ?? [],
      alerts: chart.getAlerts?.() ?? [],
    };
  }

  /** Serialize to JSON string */
  static serialize(snapshot: ChartSnapshot): string {
    return JSON.stringify(snapshot);
  }

  /**
   * Deserialize from JSON string. Validates the top-level shape and filters
   * malformed array entries instead of trusting `JSON.parse`. Missing or
   * wrong-typed fields fall back to safe defaults so older saves still load.
   */
  static deserialize(json: string): ChartSnapshot {
    const raw: unknown = JSON.parse(json);
    return validateSnapshot(raw);
  }

  /** Save to localStorage */
  static saveToStorage(key: string, snapshot: ChartSnapshot): void {
    localStorage.setItem(key, this.serialize(snapshot));
  }

  /** Load from localStorage */
  static loadFromStorage(key: string): ChartSnapshot | null {
    const json = localStorage.getItem(key);
    return json ? this.deserialize(json) : null;
  }

  /** Download as JSON file */
  static downloadFile(snapshot: ChartSnapshot, filename = 'tc-chart-state.json'): void {
    const blob = new Blob([this.serialize(snapshot)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /** Load from file (returns promise) */
  static loadFromFile(): Promise<ChartSnapshot> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { reject(new Error('No file selected')); return; }
        const text = await file.text();
        resolve(this.deserialize(text));
      };
      input.click();
    });
  }
}
