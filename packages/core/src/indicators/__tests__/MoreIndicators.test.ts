import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { PsychologicalLineIndicator, NewPsychologicalLineIndicator } from '../panel/PsychologicalLine.js';
import { VolumeRatioIndicator } from '../panel/VolumeRatio.js';
import { ABRatioIndicator } from '../panel/ABRatio.js';
import { SonarIndicator } from '../panel/Sonar.js';
import { SigmaIndicator } from '../panel/Sigma.js';
import { VerticalHorizontalFilterIndicator } from '../panel/VerticalHorizontalFilter.js';
import { RSquaredIndicator } from '../panel/RSquared.js';
import { RandomWalkIndexIndicator } from '../panel/RandomWalkIndex.js';
import { NegativeVolumeIndexIndicator, PositiveVolumeIndexIndicator } from '../panel/VolumeIndexes.js';
import { TrueRangeIndicator } from '../panel/TrueRange.js';
import { IntradayIntensityIndicator } from '../panel/IntradayIntensity.js';
import { VolumeVsAverageIndicator, VolumeChangeIndicator, TradeValueIndicator } from '../panel/VolumeComparisons.js';
import { BinaryWaveIndicator } from '../panel/BinaryWave.js';
import { SmoothedROCIndicator } from '../panel/SmoothedROC.js';
import { TimeSeriesForecastIndicator } from '../overlay/TimeSeriesForecast.js';
import { WeightedCloseIndicator } from '../overlay/PriceAverages.js';
import { DeMarkRangeIndicator } from '../overlay/DeMarkRange.js';
import { MARainbowIndicator } from '../overlay/MARainbow.js';
import { registerBuiltInIndicators } from '../registry.js';
import { IndicatorEngine } from '../IndicatorEngine.js';

function bar(i: number, open: number, high: number, low: number, close: number, volume = 100): DataSeries[number] {
  return { time: i * 60_000, open, high, low, close, volume };
}

/** Closes in a row, each bar 1 either side of its close and opening at the previous close. */
function fromCloses(closes: number[], volumes?: number[]): DataSeries {
  return closes.map((c, i) => bar(i, i === 0 ? c : closes[i - 1], c + 1, c - 1, c, volumes?.[i] ?? 100));
}

const cfg = (id: string, params: Record<string, number> = {}): IndicatorConfig => ({ id, instanceId: `${id}-1`, params, visible: true });
const last = (series: (IndicatorValue | null)[]) => series[series.length - 1]!;

describe('psychological lines', () => {
  it('counts the share of up closes over the period', () => {
    // 7 up, 3 down over the last ten changes.
    const closes = [10, 11, 12, 11, 12, 13, 12, 13, 14, 13, 14];
    const out = new PsychologicalLineIndicator().calculate(fromCloses(closes), cfg('psy', { period: 10 }));
    expect(out.series[9]).toBeNull();
    expect(last(out.series).value).toBeCloseTo(70);
  });

  it('weighs the new line by the size of the moves, from -100 to 100', () => {
    const up = new NewPsychologicalLineIndicator().calculate(fromCloses([1, 2, 3, 4, 5, 6]), cfg('newpsy', { period: 5 }));
    expect(last(up.series).value).toBeCloseTo(100);
    // Up 1, 1, 1 and down 3, 0: (3·3 − 1·3) / (6 · 5) · 100 = 20.
    const mixed = new NewPsychologicalLineIndicator().calculate(fromCloses([10, 11, 12, 13, 10, 10]), cfg('newpsy', { period: 5 }));
    expect(last(mixed.series).value).toBeCloseTo(20);
  });
});

describe('volume ratio', () => {
  it('sets the volume of up days against down days, unchanged days split between them', () => {
    // Changes: up (200), down (100), flat (100), up (300).
    const data = fromCloses([10, 11, 10, 10, 12], [0, 200, 100, 100, 300]);
    const out = new VolumeRatioIndicator().calculate(data, cfg('vr', { period: 4 }));
    expect(last(out.series).value).toBeCloseTo(((500 + 50) / (100 + 50)) * 100);
  });

  it('has no value while nothing fell', () => {
    const out = new VolumeRatioIndicator().calculate(fromCloses([1, 2, 3, 4]), cfg('vr', { period: 3 }));
    expect(last(out.series)).toBeNull();
  });
});

describe('AB ratio', () => {
  it('measures the pull above the open (A) and the previous close (B)', () => {
    const data: DataSeries = [bar(0, 10, 12, 9, 11), bar(1, 11, 14, 10, 13), bar(2, 13, 15, 12, 14)];
    const out = new ABRatioIndicator().calculate(data, cfg('abratio', { period: 2 }));
    const v = last(out.series);
    expect(v.a).toBeCloseTo(((3 + 2) / (1 + 1)) * 100);
    expect(v.b).toBeCloseTo(((14 - 11 + (15 - 13)) / (11 - 10 + (13 - 12))) * 100);
  });
});

describe('sonar, sigma and smoothed ROC', () => {
  const rising = fromCloses(Array.from({ length: 80 }, (_, i) => 100 + i));
  const falling = fromCloses(Array.from({ length: 80 }, (_, i) => 200 - i));

  it('sonar is the EMA’s change over the lookback, with a signal line', () => {
    const v = last(new SonarIndicator().calculate(rising, cfg('sonar')).series);
    // A steady climb of 1 a bar: the EMA climbs 9 in nine bars.
    expect(v.sonar).toBeCloseTo(9, 5);
    expect(v.signal).toBeCloseTo(9, 5);
    expect(last(new SonarIndicator().calculate(falling, cfg('sonar')).series).sonar).toBeLessThan(0);
  });

  it('sigma is the close’s distance from its average in standard deviations', () => {
    const flat = fromCloses([...Array.from({ length: 18 }, (_, i) => (i % 2 ? 9 : 11)), 10, 10]);
    expect(last(new SigmaIndicator().calculate(flat, cfg('sigma', { period: 20 })).series).value).toBeCloseTo(0, 1);
    expect(last(new SigmaIndicator().calculate(rising, cfg('sigma')).series).value).toBeGreaterThan(1.5);
  });

  it('smoothed ROC is the percent change of an EMA', () => {
    expect(last(new SmoothedROCIndicator().calculate(rising, cfg('sroc')).series).value).toBeGreaterThan(0);
    expect(last(new SmoothedROCIndicator().calculate(falling, cfg('sroc')).series).value).toBeLessThan(0);
  });
});

describe('trend statistics', () => {
  const line = fromCloses(Array.from({ length: 40 }, (_, i) => 50 + 2 * i));
  const zigzag = fromCloses(Array.from({ length: 40 }, (_, i) => (i % 2 ? 49 : 51)));

  it('VHF is 1 on a straight trend and small in a range', () => {
    expect(last(new VerticalHorizontalFilterIndicator().calculate(line, cfg('vhf')).series).value).toBeCloseTo(1);
    expect(last(new VerticalHorizontalFilterIndicator().calculate(zigzag, cfg('vhf')).series).value).toBeLessThan(0.1);
  });

  it('R-squared is 1 on a straight line', () => {
    expect(last(new RSquaredIndicator().calculate(line, cfg('rsquared')).series).value).toBeCloseTo(1);
    expect(last(new RSquaredIndicator().calculate(zigzag, cfg('rsquared')).series).value).toBeLessThan(0.2);
  });

  it('the forecast is the regression line one bar on', () => {
    const v = last(new TimeSeriesForecastIndicator().calculate(line, cfg('tsf', { period: 14 })).series);
    expect(v.value).toBeCloseTo(50 + 2 * 40);
  });

  it('RWI high leads in an uptrend, RWI low in a downtrend', () => {
    const up = last(new RandomWalkIndexIndicator().calculate(line, cfg('rwi')).series);
    expect(up.high).toBeGreaterThan(up.low);
    const down = fromCloses(Array.from({ length: 40 }, (_, i) => 200 - 2 * i));
    const d = last(new RandomWalkIndexIndicator().calculate(down, cfg('rwi')).series);
    expect(d.low).toBeGreaterThan(d.high);
  });
});

describe('volume indexes', () => {
  // Volume: down, up, down; closes: +10%, +10%, −10%.
  const data = fromCloses([100, 110, 121, 108.9], [100, 50, 80, 40]);

  it('NVI moves only on bars where volume fell', () => {
    const out = new NegativeVolumeIndexIndicator().calculate(data, cfg('nvi', { signal: 2 }));
    expect(out.series[0]?.value).toBe(1000);
    expect(out.series[1]?.value).toBeCloseTo(1100);
    expect(out.series[2]?.value).toBeCloseTo(1100);
    expect(out.series[3]?.value).toBeCloseTo(990);
    expect(out.series[3]?.signal).toBeDefined();
  });

  it('PVI moves only on bars where volume rose', () => {
    const out = new PositiveVolumeIndexIndicator().calculate(data, cfg('pvi', { signal: 2 }));
    expect(out.series[1]?.value).toBe(1000);
    expect(out.series[2]?.value).toBeCloseTo(1100);
    expect(out.series[3]?.value).toBeCloseTo(1100);
  });
});

describe('ranges and intensity', () => {
  it('true range reaches to the previous close', () => {
    const data: DataSeries = [bar(0, 10, 11, 9, 10), bar(1, 13, 14, 12, 13)];
    expect(new TrueRangeIndicator().calculate(data, cfg('tr')).series[1]?.value).toBe(4);
  });

  it('intraday intensity is +100 when every bar closes on its high', () => {
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => bar(i, 10, 11, 9, 11));
    expect(last(new IntradayIntensityIndicator().calculate(data, cfg('iii')).series).value).toBeCloseTo(100);
  });
});

describe('volume comparisons', () => {
  it('volume against its average, in percent', () => {
    const data = fromCloses([1, 2, 3, 4, 5], [100, 100, 100, 100, 200]);
    expect(last(new VolumeVsAverageIndicator().calculate(data, cfg('volpct', { period: 4 })).series).value).toBeCloseTo(((200 - 125) / 125) * 100);
  });

  it('marks each bar’s volume up or down from the bar before', () => {
    const out = new VolumeChangeIndicator().calculate(fromCloses([1, 2, 3], [100, 50, 80]), cfg('volchange'));
    expect(out.series.map((v) => v?.up)).toEqual([1, 0, 1]);
    expect(out.series[1]?.value).toBe(50);
  });

  it('estimates the value traded as close times volume', () => {
    const out = new TradeValueIndicator().calculate(fromCloses([25.5], [2000]), cfg('tradevalue'));
    expect(out.series[0]?.value).toBe(51_000);
  });
});

describe('binary wave', () => {
  it('scores four votes from -4 to 4', () => {
    const up = last(new BinaryWaveIndicator().calculate(fromCloses(Array.from({ length: 80 }, (_, i) => 100 + i * (1 + i / 40))), cfg('binarywave')).series);
    expect(up.value).toBe(4);
    const down = last(new BinaryWaveIndicator().calculate(fromCloses(Array.from({ length: 80 }, (_, i) => 300 - i * (1 + i / 40))), cfg('binarywave')).series);
    expect(down.value).toBe(-4);
  });
});

describe('price overlays', () => {
  it('weighted close counts the close twice', () => {
    expect(new WeightedCloseIndicator().calculate([bar(0, 9, 12, 8, 10)], cfg('wclose')).series[0]?.value).toBe(10);
  });

  it('projects the next bar’s high and low from the bar before', () => {
    // An up bar: X = 2H + L + C = 24 + 8 + 11 = 43.
    const data: DataSeries = [bar(0, 9, 12, 8, 11), bar(1, 11, 13, 10, 12)];
    const out = new DeMarkRangeIndicator().calculate(data, cfg('demark'));
    expect(out.series[0]).toBeNull();
    expect(out.series[1]?.high).toBeCloseTo(43 / 2 - 8);
    expect(out.series[1]?.low).toBeCloseTo(43 / 2 - 12);
  });

  it('draws as many averages as asked, from the first period by the step, at most 20', () => {
    const data = fromCloses(Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i / 5)));
    const out = new MARainbowIndicator().calculate(data, cfg('rainbow', { first: 5, step: 5, count: 4 }));
    expect(Object.keys(last(out.series)).sort()).toEqual(['ma1', 'ma2', 'ma3', 'ma4']);
    const many = new MARainbowIndicator().calculate(data, cfg('rainbow', { first: 2, step: 1, count: 50 }));
    expect(Object.keys(last(many.series))).toHaveLength(20);
  });
});

describe('the registry', () => {
  it('has every new indicator, each giving a value for each of its plots', () => {
    const engine = new IndicatorEngine();
    registerBuiltInIndicators(engine);
    const registered = new Set(engine.getAvailableIndicators().map((d) => d.id));
    const plugins = [
      new PsychologicalLineIndicator(), new NewPsychologicalLineIndicator(), new VolumeRatioIndicator(), new ABRatioIndicator(),
      new SonarIndicator(), new SigmaIndicator(), new VerticalHorizontalFilterIndicator(), new RSquaredIndicator(),
      new RandomWalkIndexIndicator(), new NegativeVolumeIndexIndicator(), new PositiveVolumeIndexIndicator(), new TrueRangeIndicator(),
      new IntradayIntensityIndicator(), new VolumeVsAverageIndicator(), new VolumeChangeIndicator(), new TradeValueIndicator(),
      new BinaryWaveIndicator(), new SmoothedROCIndicator(), new TimeSeriesForecastIndicator(), new WeightedCloseIndicator(),
      new DeMarkRangeIndicator(), new MARainbowIndicator(),
    ];
    const data = fromCloses(Array.from({ length: 300 }, (_, i) => 100 + 10 * Math.sin(i / 9) + i / 10), Array.from({ length: 300 }, (_, i) => 1000 + (i % 7) * 150));
    for (const plugin of plugins) {
      const { id, defaultConfig, plots } = plugin.descriptor;
      expect(registered.has(id), id).toBe(true);
      const v = last(plugin.calculate(data, cfg(id, defaultConfig as Record<string, number>)).series);
      expect(v, id).not.toBeNull();
      for (const plot of plots ?? []) {
        if (id === 'rainbow' && !(plot.key in v)) continue;
        expect(Number.isFinite(v[plot.key]), `${id}.${plot.key}`).toBe(true);
      }
    }
  });
});

describe('flat prices and no volume', () => {
  const flat = Array.from({ length: 40 }, (_, i) => bar(i, 12.3, 12.3, 12.3, 12.3, 0));

  it('gives 0, not noise, where nothing moves', () => {
    expect(last(new SigmaIndicator().calculate(flat, cfg('sigma')).series).value).toBe(0);
    expect(last(new IntradayIntensityIndicator().calculate(flat, cfg('iii')).series).value).toBe(0);
    expect(last(new NewPsychologicalLineIndicator().calculate(flat, cfg('newpsy')).series).value).toBe(0);
    expect(last(new PsychologicalLineIndicator().calculate(flat, cfg('psy')).series).value).toBe(0);
  });

  it('has no value where a ratio would divide by nothing', () => {
    expect(last(new VerticalHorizontalFilterIndicator().calculate(flat, cfg('vhf')).series)).toBeNull();
    expect(last(new VolumeVsAverageIndicator().calculate(flat, cfg('volpct')).series)).toBeNull();
    expect(last(new VolumeRatioIndicator().calculate(flat, cfg('vr')).series)).toBeNull();
  });

  it('keeps intensity within ±100 after fractional volumes', () => {
    const data = Array.from({ length: 200 }, (_, i) => bar(i, 10, 11, 9, i % 3 ? 10.7 : 9.2, i < 150 ? 0.1 + (i % 7) * 0.013 : 0));
    for (const v of new IntradayIntensityIndicator().calculate(data, cfg('iii')).series) {
      if (v) expect(Math.abs(v.value)).toBeLessThanOrEqual(100);
    }
  });
});

