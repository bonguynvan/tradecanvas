import { describe, it, expect } from 'vitest';
import {
  MARKET_KRX,
  MARKET_NXT,
  MARKET_UPBIT_KRW,
  MARKET_HOSE,
  KR_COLORS,
  VN_COLORS,
  KRX_SESSIONS,
  NXT_SESSIONS,
  createMarketTheme,
  createVNTheme,
  priceStepAt,
  computePriceLimits,
  getCurrentSession,
  formatVolumeLoc,
  DARK_THEME,
} from '@tradecanvas/commons';

/** A wall-clock time in Korea (UTC+9, no clock changes), as ms. */
const kst = (iso: string) => Date.parse(`${iso}+09:00`);

describe('Korean stock market presets', () => {
  it('steps KOSPI and KOSDAQ prices by KRX’s bands', () => {
    const steps = [[1_999, 1], [2_000, 5], [4_995, 5], [5_000, 10], [19_990, 10], [20_000, 50], [49_950, 50],
      [50_000, 100], [199_900, 100], [200_000, 500], [499_500, 500], [500_000, 1_000], [1_250_000, 1_000]];
    for (const [price, step] of steps) expect(priceStepAt(price, MARKET_KRX), String(price)).toBe(step);
  });

  it('works out the day’s limits as KRX does: the move rounded to the reference’s step first', () => {
    // KRX's own example: 9,980 moves 2,994, rounded down to 2,990.
    expect(computePriceLimits(9_980, MARKET_KRX)).toEqual({ ceiling: 12_970, floor: 6_990, reference: 9_980 });
    // 5,030 moves 1,509, rounded to 1,500: the floor is 3,530 (not 3,525, a 5 won step from 3,521).
    expect(computePriceLimits(5_030, MARKET_KRX)).toEqual({ ceiling: 6_530, floor: 3_530, reference: 5_030 });
    // The ceiling rounds down to the step of the price it lands on: 1,995 + 598 is 2,593, in the 5 won band.
    expect(computePriceLimits(1_995, MARKET_KRX)).toEqual({ ceiling: 2_590, floor: 1_397, reference: 1_995 });
  });

  it('leaves the Vietnamese limits as they were', () => {
    expect(computePriceLimits(25.35, MARKET_HOSE)).toEqual({ ceiling: 27.1, floor: 23.6, reference: 25.35 });
  });

  it('tells KRX’s sessions apart in Korea’s time, the After-Market among them', () => {
    const at = (iso: string) => getCurrentSession(KRX_SESSIONS, kst(iso), MARKET_KRX.timeZone)?.type ?? null;
    expect(at('2026-11-02T08:45')).toBe('preOpen');
    expect(at('2026-11-02T10:00')).toBe('continuous');
    expect(at('2026-11-02T15:25')).toBe('preClose');
    expect(at('2026-11-02T15:35')).toBeNull();
    expect(at('2026-11-02T15:50')).toBe('postClose');
    expect(at('2026-11-02T19:59')).toBe('postClose');
    expect(at('2026-11-02T20:00')).toBeNull();
  });

  it('gives Nextrade its own sessions and KRX’s steps and limits', () => {
    const at = (iso: string) => getCurrentSession(NXT_SESSIONS, kst(iso), MARKET_NXT.timeZone)?.type ?? null;
    expect(at('2026-11-02T08:10')).toBe('preOpen');
    expect(at('2026-11-02T08:55')).toBeNull();
    expect(at('2026-11-02T11:00')).toBe('continuous');
    expect(at('2026-11-02T15:25')).toBeNull();
    expect(at('2026-11-02T18:00')).toBe('postClose');
    expect(priceStepAt(72_300, MARKET_NXT)).toBe(100);
    expect(computePriceLimits(9_980, MARKET_NXT)?.ceiling).toBe(12_970);
  });
});

describe('Upbit’s KRW market', () => {
  it('steps prices by Upbit’s bands, to a hundred-millionth of a won', () => {
    const steps = [[2_500_000, 1_000], [1_000_000, 1_000], [500_000, 500], [150_000, 100], [50_000, 50], [12_000, 10],
      [5_000, 5], [1_234, 1], [100, 1], [95.5, 0.1], [5.25, 0.01], [0.5, 0.001], [0.05, 0.0001], [0.000005, 0.00000001]];
    for (const [price, step] of steps) expect(priceStepAt(price, MARKET_UPBIT_KRW), String(price)).toBe(step);
    expect(MARKET_UPBIT_KRW.priceLimits?.enabled).toBe(false);
  });
});

describe('Korean colours and numbers', () => {
  it('draws rising candles red and falling ones blue', () => {
    const theme = createMarketTheme(DARK_THEME, KR_COLORS);
    expect(theme.candleUp).toBe(KR_COLORS.up);
    expect(theme.candleDownWick).toBe(KR_COLORS.down);
    expect(MARKET_KRX.colorScheme).toBe(KR_COLORS);
    expect(createVNTheme(DARK_THEME)).toEqual(createMarketTheme(DARK_THEME, VN_COLORS));
  });

  it('shortens volumes in Korean by ten-thousands: 만, 억, 조', () => {
    expect(formatVolumeLoc(999, 'ko')).toBe('999');
    expect(formatVolumeLoc(12_345, 'ko')).toBe('1.23만');
    expect(formatVolumeLoc(99_999_999, 'ko-KR')).toBe('1.00억');
    expect(formatVolumeLoc(345_000_000, 'ko')).toBe('3.45억');
    expect(formatVolumeLoc(1_817_700_000_000, 'ko')).toBe('1.82조');
  });
});
