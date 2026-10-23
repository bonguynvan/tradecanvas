import { describe, it, expect } from 'vitest';
import {
  MARKET_HOSE,
  MARKET_HOSE_ETF,
  MARKET_HNX,
  MARKET_UPCOM,
  MARKET_VN30F,
  MARKET_NYSE,
  MARKET_CRYPTO,
  VN_COLORS,
  createVNTheme,
  priceStepAt,
  roundToPriceStep,
  computePriceLimits,
  getCurrentSession,
  scaleMarketPrices,
  vn30fLastTradingDay,
  vn30fContracts,
  DARK_THEME,
  type MarketConfig,
} from '@tradecanvas/commons';

/** A wall-clock time in Vietnam (UTC+7, no clock changes), as ms. */
const vn = (iso: string) => Date.parse(`${iso}+07:00`);

describe('price steps by price band', () => {
  it('follows HOSE’s bands for shares, in thousands of dong', () => {
    expect(priceStepAt(9.99, MARKET_HOSE)).toBe(0.01);
    expect(priceStepAt(10, MARKET_HOSE)).toBe(0.05);
    expect(priceStepAt(49.95, MARKET_HOSE)).toBe(0.05);
    expect(priceStepAt(50, MARKET_HOSE)).toBe(0.1);
    expect(priceStepAt(120.5, MARKET_HOSE)).toBe(0.1);
  });

  it('is one step at every price elsewhere', () => {
    expect(priceStepAt(5, MARKET_HOSE_ETF)).toBe(0.01);
    expect(priceStepAt(80, MARKET_HOSE_ETF)).toBe(0.01);
    expect(priceStepAt(12.3, MARKET_HNX)).toBe(0.1);
    expect(priceStepAt(0.3, MARKET_UPCOM)).toBe(0.1);
    expect(priceStepAt(1350.5, MARKET_VN30F)).toBe(0.1);
    expect(priceStepAt(150, MARKET_NYSE)).toBe(0.01);
  });

  it('is undefined when the market names no step', () => {
    expect(priceStepAt(100, MARKET_CRYPTO)).toBeUndefined();
  });

  it('rounds a price onto the step of its band', () => {
    expect(roundToPriceStep(10.486, MARKET_HOSE, 'down')).toBe(10.45);
    expect(roundToPriceStep(9.765, MARKET_HOSE, 'up')).toBe(9.77);
    expect(roundToPriceStep(25.37, MARKET_HOSE)).toBe(25.35);
    expect(roundToPriceStep(25.38, MARKET_HOSE)).toBe(25.4);
    expect(roundToPriceStep(13.53, MARKET_HNX, 'down')).toBe(13.5);
    expect(roundToPriceStep(100.123, MARKET_CRYPTO)).toBe(100.123);
  });
});

describe('ceiling and floor prices', () => {
  it('round the ceiling down and the floor up to a valid price', () => {
    expect(computePriceLimits(25.35, MARKET_HOSE)).toEqual({ ceiling: 27.1, floor: 23.6, reference: 25.35 });
    // The ceiling lands in the next band up, the floor in the one below.
    expect(computePriceLimits(9.8, MARKET_HOSE)).toEqual({ ceiling: 10.45, floor: 9.12, reference: 9.8 });
    expect(computePriceLimits(50.5, MARKET_HOSE)).toEqual({ ceiling: 54, floor: 47, reference: 50.5 });
    expect(computePriceLimits(12.3, MARKET_HNX)).toEqual({ ceiling: 13.5, floor: 11.1, reference: 12.3 });
    expect(computePriceLimits(1350.5, MARKET_VN30F)).toEqual({ ceiling: 1445, floor: 1256, reference: 1350.5 });
  });

  it('move one step off the reference when the band would round back onto it', () => {
    expect(computePriceLimits(0.3, MARKET_UPCOM)).toEqual({ ceiling: 0.4, floor: 0.2, reference: 0.3 });
  });

  it('keep the floor at the reference when the reference is one step', () => {
    expect(computePriceLimits(0.01, MARKET_HOSE)).toEqual({ ceiling: 0.02, floor: 0.01, reference: 0.01 });
  });

  it('are unrounded where the market names no step, and absent without limits', () => {
    const plain: MarketConfig = { type: 'stock', priceLimits: { enabled: true, ceilingPercent: 10 } };
    const limits = computePriceLimits(100, plain);
    expect(limits?.ceiling).toBeCloseTo(110);
    expect(limits?.floor).toBeCloseTo(90);
    expect(computePriceLimits(100, MARKET_CRYPTO)).toBeNull();
  });
});

describe('prices quoted in dong', () => {
  it('scales a preset’s steps, bands and decimals', () => {
    const hose = scaleMarketPrices(MARKET_HOSE, 1000);
    expect(hose.pricePrecision).toBe(0);
    expect(priceStepAt(9_990, hose)).toBe(10);
    expect(priceStepAt(25_350, hose)).toBe(50);
    expect(priceStepAt(120_500, hose)).toBe(100);
    expect(computePriceLimits(25_350, hose)).toEqual({ ceiling: 27_100, floor: 23_600, reference: 25_350 });
    // The preset itself is left as it was.
    expect(priceStepAt(25.35, MARKET_HOSE)).toBe(0.05);
  });
});

describe('Vietnamese sessions', () => {
  it('reads the session in the exchange’s time zone', () => {
    const at = (iso: string, market: MarketConfig) => getCurrentSession(market.sessions ?? [], vn(iso), market.timeZone)?.type ?? null;
    expect(MARKET_HOSE.timeZone).toBe('Asia/Ho_Chi_Minh');
    expect(at('2026-10-21T09:05:00', MARKET_HOSE)).toBe('preOpen');
    expect(at('2026-10-21T10:00:00', MARKET_HOSE)).toBe('continuous');
    expect(at('2026-10-21T12:00:00', MARKET_HOSE)).toBe('closed');
    expect(at('2026-10-21T14:40:00', MARKET_HOSE)).toBe('preClose');
    expect(at('2026-10-21T14:50:00', MARKET_HOSE)).toBeNull();
    // HNX: no opening auction, a closing auction and a post-close session.
    expect(at('2026-10-21T09:05:00', MARKET_HNX)).toBeNull();
    expect(at('2026-10-21T09:20:00', MARKET_HNX)).toBe('continuous');
    expect(at('2026-10-21T14:50:00', MARKET_HNX)).toBe('postClose');
    // UPCoM: continuous trading only, to 14:30.
    expect(at('2026-10-21T14:20:00', MARKET_UPCOM)).toBe('continuous');
    expect(at('2026-10-21T14:35:00', MARKET_UPCOM)).toBeNull();
    // VN30F opens at 8:45.
    expect(at('2026-10-21T08:50:00', MARKET_VN30F)).toBe('preOpen');
    expect(at('2026-10-21T09:00:00', MARKET_VN30F)).toBe('continuous');
  });

  it('knows no session in a time zone it doesn’t know, and reads the clock only', () => {
    expect(getCurrentSession(MARKET_HOSE.sessions ?? [], vn('2026-10-21T10:00:00'), 'Asia/Saigonn')).toBeNull();
    // A Saturday at 10:00 still falls in the morning session: trading days are the caller's.
    expect(getCurrentSession(MARKET_HOSE.sessions ?? [], vn('2026-10-24T10:00:00'), MARKET_HOSE.timeZone)?.type).toBe('continuous');
  });

  it('still reads the local clock when no time zone is given', () => {
    const now = new Date(2026, 9, 21, 10, 0).getTime();
    expect(getCurrentSession(MARKET_HOSE.sessions ?? [], now)?.type).toBe('continuous');
  });
});

describe('VN30 futures contracts', () => {
  it('stop trading on the third Thursday of their month, earlier on a holiday', () => {
    expect(vn30fLastTradingDay(2026, 10)).toBe('2026-10-15');
    expect(vn30fLastTradingDay(2026, 11)).toBe('2026-11-19');
    expect(vn30fLastTradingDay(2027, 3)).toBe('2027-03-18');
    expect(vn30fLastTradingDay(2026, 10, (day) => day === '2026-10-15')).toBe('2026-10-14');
  });

  it('lists this month and the next, then the last months of the next two quarters', () => {
    const symbols = (iso: string) => vn30fContracts(vn(iso)).map((c) => c.symbol);
    expect(symbols('2026-10-01T10:00:00')).toEqual(['VN30F2610', 'VN30F2611', 'VN30F2612', 'VN30F2703']);
    // The October contract still trades on its last day, and is gone the day after.
    expect(symbols('2026-10-15T14:00:00')).toEqual(['VN30F2610', 'VN30F2611', 'VN30F2612', 'VN30F2703']);
    expect(symbols('2026-10-21T10:00:00')).toEqual(['VN30F2611', 'VN30F2612', 'VN30F2703', 'VN30F2706']);
    expect(vn30fContracts(vn('2026-10-21T10:00:00'))[0]).toEqual({
      symbol: 'VN30F2611', year: 2026, month: 11, lastTradingDay: '2026-11-19',
    });
  });
});

describe('Vietnamese colours', () => {
  it('are green up, red down, purple ceiling, cyan floor and yellow reference', () => {
    expect(VN_COLORS).toMatchObject({ up: '#22C55E', down: '#EF4444', ceiling: '#D946EF', floor: '#06B6D4', reference: '#EAB308' });
    const theme = createVNTheme(DARK_THEME);
    expect(theme.candleUp).toBe(VN_COLORS.up);
    expect(theme.candleDown).toBe(VN_COLORS.down);
    // Volume keeps the theme's own: the candles carry the colours.
    expect(theme.volumeUp).toBe(DARK_THEME.volumeUp);
    expect(theme.volumeDown).toBe(DARK_THEME.volumeDown);
  });
});
