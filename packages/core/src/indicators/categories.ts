import type { IndicatorCategory, IndicatorDescriptor } from '@tradecanvas/commons';

/** The indicator picker's groups, in the order it lists them. */
export const INDICATOR_CATEGORIES: readonly IndicatorCategory[] = [
  'movingAverages', 'trend', 'oscillators', 'volatility', 'volume', 'bands', 'patterns', 'other',
];

/** The built-in indicators by group, as a trader would look for them. */
const BUILT_IN: Record<Exclude<IndicatorCategory, 'other'>, readonly string[]> = {
  movingAverages: [
    'sma', 'ema', 'wma', 'vwma', 'hma', 'tema', 'dema', 'smma', 'alma', 'kama', 'lsma', 'mcginley',
    'mtfma', 'macross', 'gmma', 'maribbon', 'hamming', 'madouble', 'matriple', 'rainbow', 'alligator', 'tsf',
  ],
  trend: [
    'ichimoku', 'psar', 'supertrend', 'chandelier', 'cks', 'volindex', 'adx', 'aroon', 'vortex', 'chop',
    'chopzone', 'vhf', 'trendstrength', 'lrslope', 'rsquared', 'rwi', 'majority', 'asi',
  ],
  oscillators: [
    'rsi', 'macd', 'stochastic', 'williamsR', 'cci', 'roc', 'tsi', 'ao', 'uo', 'crsi', 'coppock', 'kst',
    'elderray', 'stc', 'fisher', 'dpo', 'bop', 'cmo', 'trix', 'rvi', 'stochrsi', 'ppo', 'ac', 'rmi',
    'disparity', 'qstick', 'pgo', 'bbpb', 'mom', 'smi', 'smiergodic', 'po', 'psy', 'newpsy', 'sonar',
    'binarywave', 'sroc', 'abratio', 'advdecline',
  ],
  volatility: [
    'atr', 'stddev', 'chaikinvol', 'bbw', 'hv', 'ulcer', 'rvix', 'stderror', 'adr', 'volohlc', 'volzt',
    'sigma', 'tr', 'massindex',
  ],
  volume: [
    'vwap', 'avwap', 'svwap', 'volumeProfile', 'obv', 'mfi', 'cmf', 'ad', 'vroc', 'chaikinOsc', 'voldelta',
    'fi', 'kvo', 'emv', 'pvt', 'wad', 'vo', 'netvolume', 'vr', 'nvi', 'pvi', 'iii', 'volpct', 'volchange',
    'tradevalue',
  ],
  bands: ['bb', 'keltner', 'donchian', 'envelope', 'lrc', 'seb', 'machannel'],
  patterns: ['pivots', 'zigzag', 'fractals', 'candlepatterns', 'demark', 'avgprice', 'medprice', 'typprice', 'wclose'],
};

const BY_ID = new Map<string, IndicatorCategory>(
  Object.entries(BUILT_IN).flatMap(([category, ids]) => ids.map((id) => [id, category as IndicatorCategory] as const)),
);

/** The group an indicator is listed under: its own `category`, else the built-in's, else `'other'`. */
export function indicatorCategory(descriptor: Pick<IndicatorDescriptor, 'id' | 'category'>): IndicatorCategory {
  return descriptor.category ?? BY_ID.get(descriptor.id) ?? 'other';
}
