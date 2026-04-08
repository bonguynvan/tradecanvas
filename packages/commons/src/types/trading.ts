export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stopLimit';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';
export type OrderLabel = 'LIMIT' | 'STOP' | 'SL' | 'TP' | 'STOP LIMIT';

export interface TradingOrder {
  id: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  stopPrice?: number;
  quantity: number;
  label?: OrderLabel;
  draggable?: boolean;
  meta?: Record<string, unknown>;
}

export interface TradingPosition {
  id: string;
  side: OrderSide;
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  meta?: Record<string, unknown>;
}

export interface DepthLevel {
  price: number;
  volume: number;
}

export interface DepthData {
  bids: DepthLevel[];
  asks: DepthLevel[];
}

export interface TradingConfig {
  enabled: boolean;
  orderColors?: { buy?: string; sell?: string };
  positionColors?: { profit?: string; loss?: string; entry?: string };
  depthOverlay?: {
    enabled?: boolean;
    bidColor?: string;
    askColor?: string;
    maxWidth?: number;
  };
  contextMenu?: { enabled?: boolean };
  pricePrecision?: number;
  dragThreshold?: number;
}

export interface OrderPlaceIntent {
  side: OrderSide;
  type: OrderType;
  price: number;
  stopPrice?: number;
  quantity?: number;
}

export interface OrderModifyIntent {
  orderId: string;
  newPrice: number;
  previousPrice: number;
}

export interface OrderCancelIntent {
  orderId: string;
}

export interface PositionModifyIntent {
  positionId: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PositionCloseIntent {
  positionId: string;
}

export const DEFAULT_TRADING_CONFIG: TradingConfig = {
  enabled: true,
  orderColors: { buy: '#26A69A', sell: '#EF5350' },
  positionColors: { profit: '#26A69A', loss: '#EF5350', entry: '#2196F3' },
  depthOverlay: { enabled: false, bidColor: 'rgba(38,166,154,0.15)', askColor: 'rgba(239,83,80,0.15)', maxWidth: 100 },
  contextMenu: { enabled: true },
  pricePrecision: 2,
  dragThreshold: 3,
};
