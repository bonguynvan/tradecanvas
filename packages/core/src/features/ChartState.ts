import type { ChartType, DrawingState, IndicatorStyleConfig, TradingOrder, TradingPosition, Theme } from '@tradecanvas/commons';
import type { AlertCondition, PriceAlert } from './AlertManager.js';

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

  // Indicators (captured from version 2 on; version-1 saves never had them)
  indicators: SnapshotIndicator[];

  // Drawings (fully serializable)
  drawings: DrawingState[];

  // Trading
  orders: TradingOrder[];
  positions: TradingPosition[];

  // Alerts
  alerts: PriceAlert[];
}

export interface SnapshotIndicator {
  id: string;
  /** The instance id when saved: alert channels (`<instanceId>:<key>`) refer to it. */
  instanceId: string;
  params: Record<string, unknown>;
  /** Pane position for panel indicators. */
  position?: string;
  style?: IndicatorStyleConfig;
  visible?: boolean;
  /** Its own reference levels; absent = the indicator's defaults. */
  levels?: number[];
  /** The instance (id when saved) whose pane it is drawn in, when not its own. */
  pane?: string;
  /** `'left'`: an overlay on the left price scale. */
  scale?: 'left';
}

/**
 * 2: indicators (params, pane, style, visibility) and full alerts (channel,
 * repeating, label) are captured. Version-1 saves carry no indicators.
 */
export const SNAPSHOT_VERSION = 2;
const CURRENT_VERSION = SNAPSHOT_VERSION;

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
    style: style as unknown as DrawingState['style'],
    visible: typeof raw.visible === 'boolean' ? raw.visible : true,
    locked: typeof raw.locked === 'boolean' ? raw.locked : false,
    // Checked against the tool when the drawings are set on a chart.
    options: isObject(raw.options) ? (raw.options as DrawingState['options']) : undefined,
    group: isObject(raw.group) && typeof raw.group.id === 'string' && typeof raw.group.name === 'string'
      ? { id: raw.group.id, name: raw.group.name }
      : undefined,
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

function validateIndicatorStyle(raw: unknown): IndicatorStyleConfig | undefined {
  if (!isObject(raw)) return undefined;
  const style: IndicatorStyleConfig = {};
  // Empty lists would blank the indicator's own defaults, so they are dropped.
  const colors = asArray(raw.colors).filter((c): c is string => typeof c === 'string');
  if (colors.length > 0) style.colors = colors;
  const lineWidths = asArray(raw.lineWidths).filter((w): w is number => typeof w === 'number' && Number.isFinite(w) && w > 0);
  if (lineWidths.length > 0) style.lineWidths = lineWidths;
  if (typeof raw.opacity === 'number' && Number.isFinite(raw.opacity)) style.opacity = Math.min(1, Math.max(0, raw.opacity));
  return Object.keys(style).length > 0 ? style : undefined;
}

const ALERT_CONDITIONS: readonly AlertCondition[] = ['crossingUp', 'crossingDown', 'crossing', 'greaterThan', 'lessThan'];

function validateAlert(raw: unknown): PriceAlert | null {
  if (!isObject(raw) || typeof raw.id !== 'string') return null;
  // An alert on a drawing follows the drawing: its price is only the last level seen.
  const drawingId = typeof raw.drawingId === 'string' ? raw.drawingId : undefined;
  const price = typeof raw.price === 'number' && Number.isFinite(raw.price) ? raw.price : null;
  if (price === null && !drawingId) return null;
  return {
    id: raw.id,
    price: price ?? Number.NaN,
    drawingId,
    condition: ALERT_CONDITIONS.find((c) => c === raw.condition) ?? 'crossing',
    message: typeof raw.message === 'string' ? raw.message : undefined,
    triggered: raw.triggered === true,
    repeating: raw.repeating === true,
    channel: asString(raw.channel, 'price'),
    label: typeof raw.label === 'string' ? raw.label : undefined,
  };
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

  if (typeof raw.version === 'number' && raw.version > CURRENT_VERSION) {
    console.warn(`Chart state from a newer version (${raw.version}); loading what this version understands.`);
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
      style: validateIndicatorStyle(ind.style),
      visible: typeof ind.visible === 'boolean' ? ind.visible : undefined,
      levels: Array.isArray(ind.levels)
        ? ind.levels.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
        : undefined,
      pane: typeof ind.pane === 'string' ? ind.pane : undefined,
      scale: ind.scale === 'left' ? 'left' : undefined,
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
    const v = validateAlert(a);
    if (v) alerts.push(v);
  }

  return {
    // Without an indicators list there is nothing to restore them from: read
    // it as version 1, which leaves the chart's indicators alone.
    version: typeof raw.version === 'number' && Array.isArray(raw.indicators) ? raw.version : 1,
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

/** What unreadable input becomes. Version 1: it holds no indicators to restore. */
function emptySnapshot(): ChartSnapshot {
  return {
    version: 1,
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
    getIndicators?: () => SnapshotIndicator[];
  }, meta?: { symbol?: string; timeframe?: string; chartType?: ChartType }): ChartSnapshot {
    return {
      // Version 2 promises the indicator list; without `getIndicators` it is a version-1 save.
      version: chart.getIndicators ? CURRENT_VERSION : 1,
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
