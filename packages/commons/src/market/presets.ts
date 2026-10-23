import type { MarketConfig, MarketColorScheme, PriceStepBand, TradingSession, VN30FContract } from './types.js';
import type { Theme } from '../types/theme.js';
import { stepDecimals } from '../utils/symbols.js';
import { isValidTimeZone, zoneOffsetMinutes } from '../utils/timezone.js';

/**
 * Vietnamese price boards: green up, red down, purple at the ceiling (trần),
 * cyan at the floor (sàn), yellow at the reference price (tham chiếu).
 */
export const VN_COLORS: MarketColorScheme = {
  up: '#22C55E',
  down: '#EF4444',
  unchanged: '#EAB308',
  ceiling: '#D946EF',
  floor: '#06B6D4',
  reference: '#EAB308',
};

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Session times and rules: the exchanges' trading rules as of May 2025 (the
// HOSE KRX system went live on 5 May 2025).
export const HOSE_SESSIONS: TradingSession[] = [
  { name: 'ATO', startTime: '09:00', endTime: '09:15', type: 'preOpen' },
  { name: 'Phiên 1', startTime: '09:15', endTime: '11:30', type: 'continuous' },
  { name: 'Nghỉ trưa', startTime: '11:30', endTime: '13:00', type: 'closed' },
  { name: 'Phiên 2', startTime: '13:00', endTime: '14:30', type: 'continuous' },
  { name: 'ATC', startTime: '14:30', endTime: '14:45', type: 'preClose' },
];

export const HNX_SESSIONS: TradingSession[] = [
  { name: 'Phiên 1', startTime: '09:15', endTime: '11:30', type: 'continuous' },
  { name: 'Nghỉ trưa', startTime: '11:30', endTime: '13:00', type: 'closed' },
  { name: 'Phiên 2', startTime: '13:00', endTime: '14:30', type: 'continuous' },
  { name: 'ATC', startTime: '14:30', endTime: '14:45', type: 'preClose' },
  { name: 'PLO', startTime: '14:45', endTime: '15:00', type: 'postClose' },
];

export const UPCOM_SESSIONS: TradingSession[] = [
  { name: 'Phiên 1', startTime: '09:15', endTime: '11:30', type: 'continuous' },
  { name: 'Nghỉ trưa', startTime: '11:30', endTime: '13:00', type: 'closed' },
  { name: 'Phiên 2', startTime: '13:00', endTime: '14:30', type: 'continuous' },
];

export const VN30F_SESSIONS: TradingSession[] = [
  { name: 'ATO', startTime: '08:45', endTime: '09:00', type: 'preOpen' },
  { name: 'Phiên 1', startTime: '09:00', endTime: '11:30', type: 'continuous' },
  { name: 'Nghỉ trưa', startTime: '11:30', endTime: '13:00', type: 'closed' },
  { name: 'Phiên 2', startTime: '13:00', endTime: '14:30', type: 'continuous' },
  { name: 'ATC', startTime: '14:30', endTime: '14:45', type: 'preClose' },
];

/** HOSE shares and closed funds, in thousands of dong: 10, 50 and 100 dong steps. */
const HOSE_STEPS: readonly PriceStepBand[] = [
  { from: 0, step: 0.01 },
  { from: 10, step: 0.05 },
  { from: 50, step: 0.1 },
];

// Market presets. Vietnamese prices are in thousands of dong (25.35 is 25,350
// dong), as price boards show them; scaleMarketPrices(preset, 1000) for dong.
export const MARKET_HOSE: MarketConfig = {
  type: 'stock',
  exchange: 'HOSE',
  currency: 'VND',
  pricePrecision: 2,
  volumeUnit: 100,
  priceStep: 0.01,
  priceSteps: HOSE_STEPS,
  timeZone: VN_TIME_ZONE,
  priceLimits: { enabled: true, ceilingPercent: 7, floorPercent: 7 },
  sessions: HOSE_SESSIONS,
  colorScheme: VN_COLORS,
};

/** HOSE ETFs and covered warrants: 10 dong at every price. */
export const MARKET_HOSE_ETF: MarketConfig = {
  ...MARKET_HOSE,
  priceSteps: undefined,
};

export const MARKET_HNX: MarketConfig = {
  type: 'stock',
  exchange: 'HNX',
  currency: 'VND',
  pricePrecision: 1,
  volumeUnit: 100,
  priceStep: 0.1,
  timeZone: VN_TIME_ZONE,
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
  timeZone: VN_TIME_ZONE,
  priceLimits: { enabled: true, ceilingPercent: 15, floorPercent: 15 },
  sessions: UPCOM_SESSIONS,
  colorScheme: VN_COLORS,
};

/** VN30 index futures on HNX: index points, 0.1 a step, 100,000 dong a point. */
export const MARKET_VN30F: MarketConfig = {
  type: 'futures',
  exchange: 'HNX',
  currency: 'VND',
  pricePrecision: 1,
  volumeUnit: 1,
  priceStep: 0.1,
  contractMultiplier: 100_000,
  timeZone: VN_TIME_ZONE,
  priceLimits: { enabled: true, ceilingPercent: 7, floorPercent: 7 },
  sessions: VN30F_SESSIONS,
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
  timeZone: 'America/New_York',
  priceLimits: { enabled: false },
  sessions: [
    { name: 'Pre-Market', startTime: '04:00', endTime: '09:30', type: 'preOpen' },
    { name: 'Regular', startTime: '09:30', endTime: '16:00', type: 'continuous' },
    { name: 'After-Hours', startTime: '16:00', endTime: '20:00', type: 'postClose' },
  ],
};

/**
 * A theme variant for the Vietnamese stock market: its candle colours. Volume
 * keeps the theme's own (neutral in the built-in themes; a candle-coloured
 * preset's follows the new candles).
 */
export function createVNTheme(base: Theme): Theme {
  return {
    ...base,
    candleUp: VN_COLORS.up,
    candleDown: VN_COLORS.down,
    candleUpWick: VN_COLORS.up,
    candleDownWick: VN_COLORS.down,
  };
}

/** Rounding slack, so 27.1 / 0.05 (541.999…) still counts as 542 steps. */
const STEP_EPSILON = 1e-9;

/**
 * The price step at `price`: the band it falls in, else the market's
 * `priceStep`; undefined when the market names no step.
 */
export function priceStepAt(price: number, config: MarketConfig): number | undefined {
  let step = config.priceStep;
  for (const band of config.priceSteps ?? []) {
    if (price + STEP_EPSILON >= band.from) step = band.step;
  }
  return step !== undefined && step > 0 ? step : undefined;
}

/** The step of the band just below `price`, for one step down from it. */
function stepBelow(price: number, config: MarketConfig): number | undefined {
  let step = config.priceStep;
  for (const band of config.priceSteps ?? []) {
    if (price - STEP_EPSILON > band.from) step = band.step;
  }
  return step !== undefined && step > 0 ? step : undefined;
}

/**
 * `price` on the step of its band: to the nearest step, or `'down'` / `'up'`.
 * A market without a step leaves it as it is.
 */
export function roundToPriceStep(price: number, config: MarketConfig, mode: 'nearest' | 'down' | 'up' = 'nearest'): number {
  const step = priceStepAt(price, config);
  if (step === undefined || !Number.isFinite(price)) return price;
  const steps = price / step;
  const count = mode === 'down'
    ? Math.floor(steps + STEP_EPSILON)
    : mode === 'up'
      ? Math.ceil(steps - STEP_EPSILON)
      : Math.round(steps);
  return Number((count * step).toFixed(stepDecimals(step)));
}

/**
 * The day's ceiling, floor and reference prices. With a price step, the
 * ceiling rounds down and the floor up to a valid price; when one would land
 * back on the reference it moves a step off it, and a reference of one step
 * keeps the floor at the reference (the exchanges' rules).
 */
export function computePriceLimits(referencePrice: number, config: MarketConfig): { ceiling: number; floor: number; reference: number } | null {
  if (!config.priceLimits?.enabled || !config.priceLimits.ceilingPercent) return null;
  const ceilPct = config.priceLimits.ceilingPercent / 100;
  const floorPct = (config.priceLimits.floorPercent ?? config.priceLimits.ceilingPercent) / 100;
  const reference = referencePrice;
  const rawCeiling = reference * (1 + ceilPct);
  const rawFloor = reference * (1 - floorPct);
  const refStep = priceStepAt(reference, config);
  if (refStep === undefined) return { ceiling: rawCeiling, floor: rawFloor, reference };

  const oneUp = roundToPriceStep(reference + refStep, config);
  if (Math.abs(reference - refStep) < STEP_EPSILON) return { ceiling: oneUp, floor: reference, reference };

  let ceiling = roundToPriceStep(rawCeiling, config, 'down');
  let floor = roundToPriceStep(rawFloor, config, 'up');
  if (ceiling <= reference) ceiling = oneUp;
  if (floor >= reference) floor = roundToPriceStep(reference - (stepBelow(reference, config) ?? refStep), config);
  if (floor <= 0) floor = reference;
  return { ceiling, floor, reference };
}

/** `value * factor` without float dust (0.05 * 1000 is 50, not 50.00000000000001). */
const scaled = (value: number, factor: number) => Math.round(value * factor * 1e9) / 1e9;

/**
 * A copy of `config` for prices `factor` times larger (a power of ten):
 * steps, bands, the reference price and the decimals follow; a contract's
 * multiplier stays. `scaleMarketPrices(MARKET_HOSE, 1000)` reads prices in
 * dong (25350) instead of thousands (25.35).
 */
export function scaleMarketPrices(config: MarketConfig, factor: number): MarketConfig {
  const decimalsLess = Math.round(Math.log10(factor));
  return {
    ...config,
    pricePrecision: config.pricePrecision === undefined ? undefined : Math.max(0, config.pricePrecision - decimalsLess),
    priceStep: config.priceStep === undefined ? undefined : scaled(config.priceStep, factor),
    priceSteps: config.priceSteps?.map((band) => ({ from: scaled(band.from, factor), step: scaled(band.step, factor) })),
    priceLimits: config.priceLimits && {
      ...config.priceLimits,
      referencePrice: config.priceLimits.referencePrice === undefined ? undefined : scaled(config.priceLimits.referencePrice, factor),
    },
  };
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** `HH:mm` of `now` in `timeZone`, or on this computer's clock without one. */
function wallClock(now: number, timeZone?: string): string {
  let hours: number;
  let minutes: number;
  if (timeZone) {
    const local = new Date(now + zoneOffsetMinutes(timeZone, now) * MINUTE_MS);
    hours = local.getUTCHours();
    minutes = local.getUTCMinutes();
  } else {
    const local = new Date(now);
    hours = local.getHours();
    minutes = local.getMinutes();
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * The session `now` falls in: by the clock of `timeZone` (a market's
 * `timeZone`), or of this computer without one. Null outside them all, and
 * for a time zone it doesn't know. By the time of day only: weekends and
 * holidays are yours to tell.
 */
export function getCurrentSession(sessions: TradingSession[], now: number = Date.now(), timeZone?: string): TradingSession | null {
  if (timeZone !== undefined && !isValidTimeZone(timeZone)) return null;
  const hhmm = wallClock(now, timeZone);
  for (const session of sessions) {
    if (hhmm >= session.startTime && hhmm < session.endTime) return session;
  }
  return null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const isoDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};
const THURSDAY = 4;
/** Vietnam is UTC+7 all year. */
const VN_OFFSET_MS = 7 * 3_600_000;

/**
 * The last trading day of the VN30 futures contract of `month` (1–12): the
 * third Thursday, or the trading day before it when that is a holiday
 * (`isHoliday` gets `YYYY-MM-DD`). As `YYYY-MM-DD`.
 */
export function vn30fLastTradingDay(year: number, month: number, isHoliday?: (day: string) => boolean): string {
  const first = Date.UTC(year, month - 1, 1);
  const firstThursday = 1 + ((THURSDAY - new Date(first).getUTCDay() + 7) % 7);
  let day = Date.UTC(year, month - 1, firstThursday + 14);
  const closed = (ms: number) => {
    const weekday = new Date(ms).getUTCDay();
    return weekday === 0 || weekday === 6 || (isHoliday?.(isoDay(ms)) ?? false);
  };
  while (closed(day)) day -= DAY_MS;
  return isoDay(day);
}

/**
 * The VN30 futures contracts listed at `now`: this month's (until its last
 * trading day), the next month's, and the last months of the two quarters
 * after that.
 */
export function vn30fContracts(now: number, isHoliday?: (day: string) => boolean): VN30FContract[] {
  const today = isoDay(now + VN_OFFSET_MS);
  const contract = (year: number, month: number): VN30FContract => ({
    symbol: `VN30F${pad2(year % 100)}${pad2(month)}`,
    year,
    month,
    lastTradingDay: vn30fLastTradingDay(year, month, isHoliday),
  });
  const next = (c: VN30FContract) => (c.month === 12 ? contract(c.year + 1, 1) : contract(c.year, c.month + 1));

  const vnNow = new Date(now + VN_OFFSET_MS);
  let front = contract(vnNow.getUTCFullYear(), vnNow.getUTCMonth() + 1);
  if (today > front.lastTradingDay) front = next(front);
  const listed = [front, next(front)];
  let candidate = next(listed[1]);
  while (listed.length < 4) {
    if (candidate.month % 3 === 0) listed.push(candidate);
    candidate = next(candidate);
  }
  return listed;
}
