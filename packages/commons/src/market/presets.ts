import type { MarketConfig, MarketColorScheme, TradingSession } from './types.js';
import type { Theme } from '../types/theme.js';

// Vietnam stock color convention:
// Purple/Red = ceiling (trần) - max up
// Green/Cyan = floor (sàn) - max down
// Yellow = reference (tham chiếu)
// Red = up, Blue = down (common VN convention)
export const VN_COLORS: MarketColorScheme = {
  up: '#FF0000',         // Đỏ - tăng
  down: '#0000FF',       // Xanh dương - giảm
  unchanged: '#FFD700',  // Vàng - tham chiếu
  ceiling: '#FF00FF',    // Tím - trần
  floor: '#00FFFF',      // Xanh lam - sàn
  reference: '#FFD700',  // Vàng - tham chiếu
};

export const HOSE_SESSIONS: TradingSession[] = [
  { name: 'ATO', startTime: '09:00', endTime: '09:15', type: 'preOpen' },
  { name: 'Phiên 1', startTime: '09:15', endTime: '11:30', type: 'continuous' },
  { name: 'Nghỉ trưa', startTime: '11:30', endTime: '13:00', type: 'closed' },
  { name: 'Phiên 2', startTime: '13:00', endTime: '14:30', type: 'continuous' },
  { name: 'ATC', startTime: '14:30', endTime: '14:45', type: 'preClose' },
];

export const HNX_SESSIONS: TradingSession[] = [
  { name: 'Phiên 1', startTime: '09:00', endTime: '11:30', type: 'continuous' },
  { name: 'Nghỉ trưa', startTime: '11:30', endTime: '13:00', type: 'closed' },
  { name: 'Phiên 2', startTime: '13:00', endTime: '14:30', type: 'continuous' },
  { name: 'ATC', startTime: '14:30', endTime: '14:45', type: 'preClose' },
];

// Market presets
export const MARKET_HOSE: MarketConfig = {
  type: 'stock',
  exchange: 'HOSE',
  currency: 'VND',
  pricePrecision: 2,
  volumeUnit: 10,
  priceStep: 0.05,
  priceLimits: { enabled: true, ceilingPercent: 7, floorPercent: 7 },
  sessions: HOSE_SESSIONS,
  colorScheme: VN_COLORS,
};

export const MARKET_HNX: MarketConfig = {
  type: 'stock',
  exchange: 'HNX',
  currency: 'VND',
  pricePrecision: 1,
  volumeUnit: 100,
  priceStep: 0.1,
  priceLimits: { enabled: true, ceilingPercent: 10, floorPercent: 10 },
  sessions: HNX_SESSIONS,
  colorScheme: VN_COLORS,
};

export const MARKET_UPCOM: MarketConfig = {
  type: 'stock',
  exchange: 'UPCOM',
  currency: 'VND',
  pricePrecision: 1,
  volumeUnit: 100,
  priceStep: 0.1,
  priceLimits: { enabled: true, ceilingPercent: 15, floorPercent: 15 },
  sessions: HNX_SESSIONS,
  colorScheme: VN_COLORS,
};

export const MARKET_CRYPTO: MarketConfig = {
  type: 'crypto',
  currency: 'USDT',
  pricePrecision: 2,
  priceLimits: { enabled: false },
};

export const MARKET_NYSE: MarketConfig = {
  type: 'stock',
  exchange: 'NYSE',
  currency: 'USD',
  pricePrecision: 2,
  priceStep: 0.01,
  priceLimits: { enabled: false },
  sessions: [
    { name: 'Pre-Market', startTime: '04:00', endTime: '09:30', type: 'preOpen' },
    { name: 'Regular', startTime: '09:30', endTime: '16:00', type: 'continuous' },
    { name: 'After-Hours', startTime: '16:00', endTime: '20:00', type: 'preClose' },
  ],
};

// Build a theme variant for VN stock market
export function createVNTheme(base: Theme): Theme {
  return {
    ...base,
    candleUp: VN_COLORS.up,
    candleDown: VN_COLORS.down,
    candleUpWick: VN_COLORS.up,
    candleDownWick: VN_COLORS.down,
    volumeUp: 'rgba(255, 0, 0, 0.3)',
    volumeDown: 'rgba(0, 0, 255, 0.3)',
  };
}

export function computePriceLimits(referencePrice: number, config: MarketConfig): { ceiling: number; floor: number; reference: number } | null {
  if (!config.priceLimits?.enabled || !config.priceLimits.ceilingPercent) return null;
  const ceilPct = config.priceLimits.ceilingPercent / 100;
  const floorPct = (config.priceLimits.floorPercent ?? config.priceLimits.ceilingPercent) / 100;
  return {
    ceiling: referencePrice * (1 + ceilPct),
    floor: referencePrice * (1 - floorPct),
    reference: referencePrice,
  };
}

export function getCurrentSession(sessions: TradingSession[]): TradingSession | null {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  for (const session of sessions) {
    if (hhmm >= session.startTime && hhmm < session.endTime) return session;
  }
  return null;
}
