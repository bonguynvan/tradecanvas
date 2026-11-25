import type { IndicatorCategory, IndicatorDescriptor, IndicatorGroup } from '@tradecanvas/commons';

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
    'rsi', 'rsidiv', 'macd', 'stochastic', 'williamsR', 'cci', 'roc', 'tsi', 'ao', 'uo', 'crsi', 'coppock', 'kst',
    'elderray', 'stc', 'fisher', 'dpo', 'bop', 'cmo', 'trix', 'rvi', 'stochrsi', 'ppo', 'ac', 'rmi',
    'disparity', 'qstick', 'pgo', 'bbpb', 'mom', 'smi', 'smiergodic', 'po', 'psy', 'newpsy', 'sonar',
    'binarywave', 'sroc', 'abratio', 'advdecline',
  ],
  volatility: [
    'atr', 'stddev', 'chaikinvol', 'bbw', 'hv', 'ulcer', 'rvix', 'stderror', 'adr', 'volohlc', 'volzt',
    'sigma', 'tr', 'massindex',
  ],
  volume: [
    'vwap', 'avwap', 'svwap', 'volumeProfile', 'svp', 'obv', 'mfi', 'cmf', 'ad', 'vroc', 'chaikinOsc', 'voldelta',
    'fi', 'kvo', 'emv', 'pvt', 'wad', 'vo', 'netvolume', 'vr', 'nvi', 'pvi', 'iii', 'volpct', 'volchange',
    'tradevalue',
  ],
  bands: ['bb', 'keltner', 'donchian', 'envelope', 'lrc', 'seb', 'machannel'],
  patterns: ['pivots', 'zigzag', 'fractals', 'candlepatterns', 'fvg', 'demark', 'avgprice', 'medprice', 'typprice', 'wclose'],
};

const KINDS = new Set<IndicatorCategory>(INDICATOR_CATEGORIES);

const BY_ID = new Map<string, IndicatorCategory>(
  Object.entries(BUILT_IN).flatMap(([category, ids]) => ids.map((id) => [id, category as IndicatorCategory] as const)),
);

/**
 * The kind an indicator is listed under: its own `category`, else the
 * built-in's, else `'other'`. One in a group of the app's own
 * (`indicatorGroup`) gets the built-in's kind, else `'other'`.
 */
export function indicatorCategory(descriptor: Pick<IndicatorDescriptor, 'id' | 'category'>): IndicatorCategory {
  const own: unknown = descriptor.category;
  // A kind the picker has no tab for (from code without types) would list the indicator nowhere.
  const kind = KINDS.has(own as IndicatorCategory) ? own as IndicatorCategory : null;
  return kind ?? BY_ID.get(descriptor.id) ?? 'other';
}

/** The app's own group an indicator is listed in, its name trimmed, or null: a group needs an id and a name. */
export function indicatorGroup(descriptor: Pick<IndicatorDescriptor, 'category'>): IndicatorGroup | null {
  const own: unknown = descriptor.category;
  if (typeof own !== 'object' || own === null) return null;
  const { id, label } = own as Partial<IndicatorGroup>;
  return typeof id === 'string' && id.trim() && typeof label === 'string' && label.trim() ? { id, label: label.trim() } : null;
}
