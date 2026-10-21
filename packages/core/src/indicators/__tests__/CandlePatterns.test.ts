import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig, OHLCBar } from '@tradecanvas/commons';
import { CANDLE_PATTERNS, detectCandlePatterns } from '../candles/detect.js';
import { CandlePatternsIndicator } from '../overlay/CandlePatterns.js';

type Ohlc = [open: number, high: number, low: number, close: number];

/** Twelve bars falling 1 a bar (black bodies of 1), from 130 down to 119. */
function falling(): Ohlc[] {
  return Array.from({ length: 12 }, (_, k) => {
    const close = 130 - k;
    return [close + 1, close + 1.3, close - 0.3, close];
  });
}

/** Twelve bars rising 1 a bar (white bodies of 1), from 100 up to 111. */
function rising(): Ohlc[] {
  return Array.from({ length: 12 }, (_, k) => {
    const close = 100 + k;
    return [close - 1, close + 0.3, close - 1.3, close];
  });
}

function series(bars: Ohlc[]): DataSeries {
  return bars.map(([open, high, low, close], i): OHLCBar => ({ time: i * 60_000, open, high, low, close, volume: 100 }));
}

/** The pattern ids found on the last bar. */
function lastIds(bars: Ohlc[]): string[] {
  const data = series(bars);
  return detectCandlePatterns(data).filter((m) => m.index === data.length - 1).map((m) => m.pattern.id);
}

describe('the pattern catalogue', () => {
  it('names each pattern once, with a short label and its length', () => {
    const ids = CANDLE_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(64);
    for (const p of CANDLE_PATTERNS) {
      expect(p.short.length, p.id).toBeLessThanOrEqual(11);
      expect(p.bars).toBeGreaterThanOrEqual(1);
      expect(p.bars).toBeLessThanOrEqual(5);
    }
  });
});

describe('one-bar patterns', () => {
  it('finds a hammer after a fall, and the same bar is a hanging man after a rise', () => {
    // Body 0.5 at the top of a 3.5 range: a long lower shadow.
    expect(lastIds([...falling(), [118.5, 119.1, 115.6, 119]])).toContain('hammer');
    expect(lastIds([...rising(), [111.5, 112.1, 108.6, 112]])).toContain('hangingMan');
    expect(lastIds([...rising(), [111.5, 112.1, 108.6, 112]])).not.toContain('hammer');
  });

  it('finds a shooting star after a rise', () => {
    expect(lastIds([...rising(), [112, 115.5, 111.9, 112.4]])).toContain('shootingStar');
  });

  it('finds a doji anywhere, and a gravestone after a rise', () => {
    expect(lastIds([...falling(), [118, 119, 117, 118.05]])).toContain('doji');
    expect(lastIds([...rising(), [112, 115, 111.98, 112.02]])).toContain('gravestoneDoji');
  });
});

describe('two-bar patterns', () => {
  it('finds engulfing bars that reverse the trend', () => {
    expect(lastIds([...falling(), [118, 121, 116.5, 120.5]])).toContain('bullishEngulfing');
    expect(lastIds([...rising(), [112, 112.5, 109, 109.5]])).toContain('bearishEngulfing');
  });

  it('wants the trend it reverses', () => {
    expect(lastIds([...rising(), [113, 113.2, 110.8, 111], [110.8, 114, 110.5, 113.5]])).not.toContain('bullishEngulfing');
  });

  it('finds a piercing line and dark cloud cover', () => {
    // A long black bar, then a white one opening under its low and closing past its middle.
    expect(lastIds([...falling(), [121, 121.2, 117.8, 118], [117, 120.2, 116.8, 120]])).toContain('piercingLine');
    expect(lastIds([...rising(), [110, 113.2, 109.8, 113], [114, 114.2, 110.8, 111]])).toContain('darkCloudCover');
  });

  it('finds a harami inside a long body', () => {
    expect(lastIds([...falling(), [122, 122.2, 117.8, 118], [119, 120.6, 118.9, 120.5]])).toContain('bullishHarami');
  });
});

describe('three-bar and longer patterns', () => {
  it('finds a morning star and an evening star', () => {
    expect(lastIds([...falling(), [122, 122.2, 117.8, 118], [116.5, 117, 115.8, 116.2], [117, 121.2, 116.8, 121]])).toContain('morningStar');
    expect(lastIds([...rising(), [110, 114.2, 109.8, 114], [115.5, 116.2, 115, 115.8], [115, 115.2, 110.8, 111]])).toContain('eveningStar');
  });

  it('finds three white soldiers', () => {
    expect(lastIds([...falling(), [119, 121.1, 118.9, 121], [120.5, 123.1, 120.4, 123], [122.5, 125.1, 122.4, 125]])).toContain('threeWhiteSoldiers');
  });

  it('finds rising three methods', () => {
    const bars: Ohlc[] = [...rising(), [111, 115.2, 110.8, 115], [114.8, 115, 114, 114.2], [114.2, 114.4, 113.4, 113.6], [113.6, 113.8, 112.8, 113], [113.2, 117.2, 113.1, 117]];
    expect(lastIds(bars)).toContain('risingThreeMethods');
    // White bars in the middle are no pullback.
    const white: Ohlc[] = [...rising(), [111, 115.2, 110.8, 115], [114, 114.6, 113.9, 114.4], [113.2, 114, 113.1, 113.8], [112.8, 113.4, 112.7, 113.2], [113.4, 117.2, 113.3, 117]];
    expect(lastIds(white)).not.toContain('risingThreeMethods');
  });
});

describe('options', () => {
  const bars = series([...falling(), [118, 121, 116.5, 120.5]]);

  it('keeps to the patterns asked for and the bars from `from`', () => {
    expect(detectCandlePatterns(bars, { patterns: ['hammer'] })).toEqual([]);
    expect(detectCandlePatterns(bars, { patterns: ['bullishEngulfing'] })).toHaveLength(1);
    expect(detectCandlePatterns(bars, { from: bars.length })).toEqual([]);
  });

  it('finds nothing in a straight line of identical bars', () => {
    const flat = series(Array.from({ length: 30 }, (): Ohlc => [10, 10, 10, 10]));
    expect(detectCandlePatterns(flat)).toEqual([]);
  });
});

describe('the indicator', () => {
  const cfg = (params: Record<string, number> = {}): IndicatorConfig => ({ id: 'candlepatterns', instanceId: 'cp-1', params, visible: true });

  it('marks a bullish pattern under its bar, with the longest pattern’s code', () => {
    const data = series([...falling(), [122, 122.2, 117.8, 118], [116.5, 117, 115.8, 116.2], [117, 121.2, 116.8, 121]]);
    const v = new CandlePatternsIndicator().calculate(data, cfg()).series.at(-1)!;
    expect(v.bull).toBe(116.8);
    expect(CANDLE_PATTERNS[v.code!].bars).toBe(3);
  });

  it('leaves indecision out unless asked', () => {
    const data = series([...falling(), [118, 119, 117, 118.05]]);
    expect(new CandlePatternsIndicator().calculate(data, cfg()).series.at(-1)).toBeNull();
    expect(new CandlePatternsIndicator().calculate(data, cfg({ indecision: 1 })).series.at(-1)?.neutral).toBe(119);
  });
});

describe('on a long random walk', () => {
  function walk(n: number, seed: number): DataSeries {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    let close = 100;
    return Array.from({ length: n }, (_, i): OHLCBar => {
      const open = close + (rnd() - 0.5) * 2;
      close = open + (rnd() - 0.5) * 4;
      const high = Math.max(open, close) + rnd() * rnd() * 3;
      const low = Math.min(open, close) - rnd() * rnd() * 3;
      return { time: i * 60_000, open, high, low, close, volume: 100 };
    });
  }

  it('finds most kinds of pattern, each on a bar where it fits', () => {
    const data = walk(50_000, 7);
    const matches = detectCandlePatterns(data);
    const kinds = new Set(matches.map((m) => m.pattern.id));
    expect(kinds.size).toBeGreaterThanOrEqual(40);
    for (const m of matches) expect(m.index - m.pattern.bars + 1).toBeGreaterThanOrEqual(0);
  });

  it('reads 100,000 bars quickly', () => {
    const data = walk(100_000, 11);
    const start = performance.now();
    detectCandlePatterns(data);
    expect(performance.now() - start).toBeLessThan(3000);
  });
});

describe('stricter shapes', () => {
  it('finds bullish separating lines only with no shadow under the white bar', () => {
    const bars: Ohlc[] = [...rising(), [112, 112.2, 109.8, 110], [112, 115.2, 112, 115]];
    expect(lastIds(bars)).toContain('bullishSeparatingLines');
    const shadowed: Ohlc[] = [...rising(), [112, 112.2, 109.8, 110], [112, 115.2, 111, 115]];
    expect(lastIds(shadowed)).not.toContain('bullishSeparatingLines');
  });

  it('doesn’t call an ordinary bar long after a halt of flat bars', () => {
    const halted: Ohlc[] = [...Array.from({ length: 12 }, (): Ohlc => [50, 50, 50, 50]), [50, 50.31, 49.99, 50.3]];
    expect(lastIds(halted)).not.toContain('bullishMarubozu');
  });

  it('needs more than one bounce to call a fall over', () => {
    // A fall, one bar back up past the average, then a white bar engulfing a black one.
    const bars: Ohlc[] = [...falling(), [118, 126, 117.8, 125.8], [126, 126.2, 124.8, 125], [124.8, 126.5, 124.5, 126.2]];
    expect(lastIds(bars)).not.toContain('bullishEngulfing');
  });
});

