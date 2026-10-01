export type SignalDirection = 'long' | 'short' | 'neutral';

export interface SignalMarker {
  id: string;
  time: number;
  price: number;
  direction: SignalDirection;
  confidence: number;
  source: string;
  label?: string;
  color?: string;
  meta?: Record<string, unknown>;
}

export interface SignalMarkerStyle {
  longColor?: string;
  shortColor?: string;
  neutralColor?: string;
  arrowSize?: number;
  showLabel?: boolean;
  showConfidence?: boolean;
  sourceColors?: Record<string, string>;
}

export const DEFAULT_SIGNAL_STYLE: SignalMarkerStyle = {
  longColor: '#1fa874',
  shortColor: '#e8505b',
  neutralColor: '#9E9E9E',
  arrowSize: 12,
  showLabel: true,
  showConfidence: true,
};

export type TradeZoneDirection = 'long' | 'short';

export interface TradeZone {
  id: string;
  entryTime: number;
  entryPrice: number;
  exitTime?: number;
  exitPrice?: number;
  direction: TradeZoneDirection;
  pnl?: number;
  pnlPercent?: number;
  label?: string;
  meta?: Record<string, unknown>;
}

export interface TradeZoneStyle {
  profitColor?: string;
  lossColor?: string;
  activeColor?: string;
  fillOpacity?: number;
  borderWidth?: number;
  showLabel?: boolean;
  showPnl?: boolean;
}

export const DEFAULT_TRADE_ZONE_STYLE: TradeZoneStyle = {
  profitColor: '#1fa874',
  lossColor: '#e8505b',
  activeColor: '#4c8dff',
  fillOpacity: 0.12,
  borderWidth: 1,
  showLabel: true,
  showPnl: true,
};
