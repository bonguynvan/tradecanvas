export interface OHLCBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickData {
  time: number;
  price: number;
  volume?: number;
}

export type TimeFrame =
  | '1s' | '5s' | '15s' | '30s'
  | '1m' | '3m' | '5m' | '15m' | '30m' | '45m'
  | '1h' | '2h' | '3h' | '4h' | '6h' | '8h' | '12h'
  | '1d' | '2d' | '3d'
  | '1w' | '2w'
  | '1M' | '3M' | '6M' | '12M';

export type DataSeries = OHLCBar[];
