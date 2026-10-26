import { describe, it, expect } from 'vitest';
import { DARK_THEME, type OHLCBar, type ViewportState } from '@tradecanvas/commons';
import { computeMarketProfile, computeSessionProfiles, tpoLetter, assignSessionLetters } from '../marketProfile.js';
import { MarketProfileRenderer } from '../MarketProfileRenderer.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

function bar(low: number, high: number): OHLCBar {
  return { time: 0, open: low, high, low, close: high, volume: 1 };
}

function barAt(time: number, low: number, high: number): OHLCBar {
  return { time, open: low, high, low, close: high, volume: 1 };
}

describe('computeMarketProfile', () => {
  it('returns null for empty input or non-positive span', () => {
    expect(computeMarketProfile([], 0, 100)).toBeNull();
    expect(computeMarketProfile([bar(1, 2)], 100, 100)).toBeNull();
    expect(computeMarketProfile([bar(1, 2)], 100, 0)).toBeNull();
  });

  it('counts a TPO for every bucket a bar overlaps', () => {
    // 10 buckets over [0,100] → each bucket is 10 wide.
    // Bar spanning 0..100 touches all 10 buckets.
    const mp = computeMarketProfile([bar(0, 100)], 0, 100, { buckets: 10 })!;
    expect(mp.buckets).toHaveLength(10);
    expect(mp.buckets.every((b) => b.count === 1)).toBe(true);
    expect(mp.totalCount).toBe(10);
  });

  it('locates the point of control at the busiest price', () => {
    // Many bars cluster around 50; a few span the whole range.
    const bars = [
      bar(0, 100),
      bar(48, 52),
      bar(49, 51),
      bar(50, 50.5),
    ];
    const mp = computeMarketProfile(bars, 0, 100, { buckets: 10 })!;
    // Bucket containing 50 is index 5 ([50,60)) or 4 ([40,50)). The 50-ish bars
    // concentrate around the 40–60 region; POC should be one of those.
    expect(mp.buckets[mp.pocIndex].low).toBeGreaterThanOrEqual(40);
    expect(mp.buckets[mp.pocIndex].high).toBeLessThanOrEqual(60);
    expect(mp.maxCount).toBe(mp.buckets[mp.pocIndex].count);
  });

  it('produces a value area that brackets the POC and holds ~70% of TPOs', () => {
    const bars = [
      bar(0, 100),
      bar(40, 60),
      bar(45, 55),
      bar(48, 52),
      bar(49, 51),
    ];
    const mp = computeMarketProfile(bars, 0, 100, { buckets: 20, valueAreaPct: 0.7 })!;
    const poc = mp.buckets[mp.pocIndex].mid;
    expect(mp.valueAreaLow).toBeLessThanOrEqual(poc);
    expect(mp.valueAreaHigh).toBeGreaterThanOrEqual(poc);
    expect(mp.valueAreaHigh).toBeGreaterThan(mp.valueAreaLow);
  });

  it('ignores bars fully outside the price window', () => {
    // First bar sits inside bucket 0 ([0,10)); second is fully out of range.
    const mp = computeMarketProfile([bar(1, 9), bar(200, 210)], 0, 100, { buckets: 10 })!;
    expect(mp.totalCount).toBe(1);
    expect(mp.buckets[0].count).toBe(1);
  });

  it('clamps bucket count into the valid range', () => {
    const mp = computeMarketProfile([bar(0, 100)], 0, 100, { buckets: 1 })!;
    expect(mp.buckets.length).toBeGreaterThanOrEqual(4); // min 4
  });
});

describe('computeSessionProfiles', () => {
  const D1 = Date.UTC(2023, 0, 2, 10, 0, 0); // Mon
  const D2 = Date.UTC(2023, 0, 3, 10, 0, 0); // Tue

  it('returns empty for empty input', () => {
    expect(computeSessionProfiles([], 0, 100)).toEqual([]);
  });

  it('splits bars into one profile per calendar day', () => {
    const bars = [
      barAt(D1, 10, 20),
      barAt(D1 + 3_600_000, 12, 22),
      barAt(D2, 30, 40),
      barAt(D2 + 3_600_000, 32, 42),
    ];
    const sessions = computeSessionProfiles(bars, 0, 100, { buckets: 20 });
    expect(sessions).toHaveLength(2);
    expect(sessions[0].startIndex).toBe(0);
    expect(sessions[0].endIndex).toBe(1);
    expect(sessions[0].startTime).toBe(Date.UTC(2023, 0, 2));
    expect(sessions[1].startIndex).toBe(2);
    expect(sessions[1].endIndex).toBe(3);
    expect(sessions[1].startTime).toBe(Date.UTC(2023, 0, 3));
  });

  it('splits by the day in the exchange’s zone, and names each by its date', () => {
    // ASX sessions, 10:00–15:00 in Sydney: 23:00 UTC the day before to 04:00 UTC.
    const day = (d: number) => [0, 1, 2].map((h) => barAt(Date.UTC(2026, 9, 25 + d, 23) + h * 3_600_000, 10 + d, 20 + d));
    const bars = [...day(0), ...day(1)];
    const zoned = computeSessionProfiles(bars, 0, 100, { buckets: 10 }, 'Australia/Sydney');
    expect(zoned.map((s) => [s.startIndex, s.endIndex, s.startTime])).toEqual([
      [0, 2, Date.UTC(2026, 9, 26)],
      [3, 5, Date.UTC(2026, 9, 27)],
    ]);
    // UTC's days cut each session after its first bar.
    expect(computeSessionProfiles(bars, 0, 100, { buckets: 10 })).toHaveLength(3);
    // So does a zone the browser does not know, rather than throwing.
    expect(computeSessionProfiles(bars, 0, 100, { buckets: 10 }, 'Mars/Olympus_Mons')).toHaveLength(3);
  });

  it('shares the price window across sessions', () => {
    const bars = [barAt(D1, 10, 20), barAt(D2, 80, 90)];
    const sessions = computeSessionProfiles(bars, 0, 100, { buckets: 10 });
    // Both profiles span the same 0..100 window (10 buckets each).
    expect(sessions[0].profile.buckets).toHaveLength(10);
    expect(sessions[1].profile.buckets).toHaveLength(10);
  });
});

describe('tpoLetter', () => {
  it('maps 0..25 to A..Z then 26..51 to a..z and wraps', () => {
    expect(tpoLetter(0)).toBe('A');
    expect(tpoLetter(25)).toBe('Z');
    expect(tpoLetter(26)).toBe('a');
    expect(tpoLetter(51)).toBe('z');
    expect(tpoLetter(52)).toBe('A'); // wraps
  });
});

describe('assignSessionLetters', () => {
  it('records each bracket index in every bucket it touches', () => {
    // 10 buckets over [0,100]; bar 0 spans 0..50 (buckets 0..5), bar 1 sits in bucket 5.
    const cols = assignSessionLetters([bar(0, 50), bar(52, 58)], 0, 100, 10);
    expect(cols).toHaveLength(10);
    expect(cols[0]).toEqual([0]);        // only bar 0
    expect(cols[5]).toEqual([0, 1]);     // both bars touch bucket 5 ([50,60))
    expect(cols[9]).toEqual([]);         // untouched
  });

  it('ignores bars outside the window', () => {
    const cols = assignSessionLetters([bar(1, 9), bar(200, 210)], 0, 100, 10);
    expect(cols[0]).toEqual([0]);
    expect(cols.flat()).toEqual([0]);
  });
});

describe('MarketProfileRenderer.drawsText', () => {
  it('says it writes text with its stats readout, or split by session with letters', async () => {
    const { MarketProfileRenderer } = await import('../MarketProfileRenderer.js');
    const r = new MarketProfileRenderer();
    expect(r.drawsText()).toBe(true);
    r.setShowStats(false);
    expect(r.drawsText()).toBe(false);
    r.setSplitBySession(true);
    expect(r.drawsText()).toBe(false);
    r.setLetters(true);
    expect(r.drawsText()).toBe(true);
  });
});

describe('MarketProfileRenderer stats', () => {
  function statsTexts(viewport: ViewportState) {
    const r = new MarketProfileRenderer();
    r.setVisible(true);
    const data = Array.from({ length: 20 }, (_, i) => barAt(i, 99_500 + i * 10, 100_200 + i * 10));
    const { ctx, texts } = recordingCtx();
    r.render(ctx, data, viewport, DARK_THEME);
    // Each row writes its name, then its value.
    const values = ['POC', 'VAH', 'VAL'].map((name) => texts[texts.indexOf(name) + 1]);
    return { values, stats: r.getStats()! };
  }

  it('write POC, VAH and VAL in the market’s decimals and the number locale', () => {
    const near100k = { ...unitViewport, priceRange: { min: 99_000, max: 101_000 }, pricePrecision: 1, numberLocale: 'de-DE' };
    const { values, stats } = statsTexts(near100k);
    const de = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    expect(values).toEqual([de(stats.poc), de(stats.vah), de(stats.val)]);
    expect(values[0]).toMatch(/^\d{2,3}\.\d{3},\d$/);
  });

  it('keep the decimals they had without a market precision, grouped', () => {
    const { values } = statsTexts({ ...unitViewport, priceRange: { min: 99_000, max: 101_000 } });
    expect(values[0]).toMatch(/^\d{2,3},\d{3}\.\d{2}$/);
  });
});
