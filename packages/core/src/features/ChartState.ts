import type { ChartType, DrawingState, TradingOrder, TradingPosition, Theme } from '@chart-lib/commons';
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

  /** Deserialize from JSON string */
  static deserialize(json: string): ChartSnapshot {
    const data = JSON.parse(json);
    if (data.version !== CURRENT_VERSION) {
      console.warn(`Chart state version mismatch: ${data.version} vs ${CURRENT_VERSION}`);
    }
    return data;
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
  static downloadFile(snapshot: ChartSnapshot, filename = 'chart-state.json'): void {
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
