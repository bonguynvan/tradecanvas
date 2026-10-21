import { NO_SHADOW, type Candles } from './candleShape.js';
import { pattern, type PatternDef } from './patternDef.js';

/** A small body near the top of the bar with a lower shadow at least twice it: a hammer's shape. */
function hammerShape(c: Candles, i: number): boolean {
  const range = c.range(i);
  return range > 0 && range >= c.avgRange(i) * 0.5 && c.body(i) <= range * 0.35 && c.lower(i) >= 2 * Math.max(c.body(i), range * 0.05) && c.upper(i) <= range * 0.1;
}

/** The shape upside down: a long upper shadow over a small body at the bottom. */
function starShape(c: Candles, i: number): boolean {
  const range = c.range(i);
  return range > 0 && range >= c.avgRange(i) * 0.5 && c.body(i) <= range * 0.35 && c.upper(i) >= 2 * Math.max(c.body(i), range * 0.05) && c.lower(i) <= range * 0.1;
}

/** One-bar patterns. */
export const SINGLE_PATTERNS: readonly PatternDef[] = [
  pattern('doji', 'Doji', 'Doji', 'neutral', 'indecision', 1, null, (c, i) => c.doji(i)),
  pattern('longLeggedDoji', 'Long-Legged Doji', 'LL Doji', 'neutral', 'indecision', 1, null,
    (c, i) => c.doji(i) && c.upper(i) >= c.range(i) * 0.3 && c.lower(i) >= c.range(i) * 0.3 && c.range(i) > c.avgRange(i)),
  pattern('dragonflyDoji', 'Dragonfly Doji', 'Dragonfly', 'bullish', 'reversal', 1, 'down',
    (c, i) => c.doji(i) && c.upper(i) <= c.range(i) * 0.1 && c.lower(i) >= c.range(i) * 0.6),
  pattern('gravestoneDoji', 'Gravestone Doji', 'Gravestone', 'bearish', 'reversal', 1, 'up',
    (c, i) => c.doji(i) && c.lower(i) <= c.range(i) * 0.1 && c.upper(i) >= c.range(i) * 0.6),
  pattern('hammer', 'Hammer', 'Hammer', 'bullish', 'reversal', 1, 'down', hammerShape),
  pattern('hangingMan', 'Hanging Man', 'Hanging', 'bearish', 'reversal', 1, 'up', hammerShape),
  pattern('invertedHammer', 'Inverted Hammer', 'Inv Hammer', 'bullish', 'reversal', 1, 'down', starShape),
  pattern('shootingStar', 'Shooting Star', 'Shooting', 'bearish', 'reversal', 1, 'up', starShape),
  pattern('spinningTop', 'Spinning Top', 'Spinning', 'neutral', 'indecision', 1, null,
    (c, i) => !c.doji(i) && c.body(i) <= c.range(i) * 0.3 && c.upper(i) > c.body(i) && c.lower(i) > c.body(i)),
  pattern('bullishMarubozu', 'Bullish Marubozu', 'Marubozu', 'bullish', 'continuation', 1, null, (c, i) => c.white(i) && c.marubozu(i)),
  pattern('bearishMarubozu', 'Bearish Marubozu', 'Marubozu', 'bearish', 'continuation', 1, null, (c, i) => c.black(i) && c.marubozu(i)),
  pattern('bullishBeltHold', 'Bullish Belt Hold', 'Belt Hold', 'bullish', 'reversal', 1, 'down',
    (c, i) => c.white(i) && c.long(i) && c.lower(i) <= c.range(i) * NO_SHADOW && c.upper(i) > c.range(i) * NO_SHADOW),
  pattern('bearishBeltHold', 'Bearish Belt Hold', 'Belt Hold', 'bearish', 'reversal', 1, 'up',
    (c, i) => c.black(i) && c.long(i) && c.upper(i) <= c.range(i) * NO_SHADOW && c.lower(i) > c.range(i) * NO_SHADOW),
];

/** Two-bar patterns: `a` the first bar, `i` the second. */
export const DOUBLE_PATTERNS: readonly PatternDef[] = [
  pattern('bullishEngulfing', 'Bullish Engulfing', 'Engulf', 'bullish', 'reversal', 2, 'down', (c, i) => {
    const a = i - 1;
    return c.black(a) && c.white(i) && c.open(i) <= c.close(a) && c.close(i) >= c.open(a) && c.body(i) > c.body(a);
  }),
  pattern('bearishEngulfing', 'Bearish Engulfing', 'Engulf', 'bearish', 'reversal', 2, 'up', (c, i) => {
    const a = i - 1;
    return c.white(a) && c.black(i) && c.open(i) >= c.close(a) && c.close(i) <= c.open(a) && c.body(i) > c.body(a);
  }),
  pattern('bullishHarami', 'Bullish Harami', 'Harami', 'bullish', 'reversal', 2, 'down',
    (c, i) => c.black(i - 1) && c.long(i - 1, i - 1) && !c.doji(i) && c.bodyInside(i - 1, i) && c.body(i) < c.body(i - 1) * 0.6),
  pattern('bearishHarami', 'Bearish Harami', 'Harami', 'bearish', 'reversal', 2, 'up',
    (c, i) => c.white(i - 1) && c.long(i - 1, i - 1) && !c.doji(i) && c.bodyInside(i - 1, i) && c.body(i) < c.body(i - 1) * 0.6),
  pattern('bullishHaramiCross', 'Bullish Harami Cross', 'Harami +', 'bullish', 'reversal', 2, 'down',
    (c, i) => c.black(i - 1) && c.long(i - 1, i - 1) && c.doji(i) && c.bodyInside(i - 1, i)),
  pattern('bearishHaramiCross', 'Bearish Harami Cross', 'Harami +', 'bearish', 'reversal', 2, 'up',
    (c, i) => c.white(i - 1) && c.long(i - 1, i - 1) && c.doji(i) && c.bodyInside(i - 1, i)),
  pattern('piercingLine', 'Piercing Line', 'Piercing', 'bullish', 'reversal', 2, 'down', (c, i) => {
    const a = i - 1;
    return c.black(a) && c.long(a, a) && c.white(i) && c.open(i) < c.low(a) && c.close(i) > c.mid(a) && c.close(i) < c.open(a);
  }),
  pattern('darkCloudCover', 'Dark Cloud Cover', 'Dark Cloud', 'bearish', 'reversal', 2, 'up', (c, i) => {
    const a = i - 1;
    return c.white(a) && c.long(a, a) && c.black(i) && c.open(i) > c.high(a) && c.close(i) < c.mid(a) && c.close(i) > c.open(a);
  }),
  pattern('tweezerBottom', 'Tweezer Bottom', 'Tweezer', 'bullish', 'reversal', 2, 'down',
    (c, i) => c.black(i - 1) && c.white(i) && c.same(c.low(i - 1), c.low(i), i - 1)),
  pattern('tweezerTop', 'Tweezer Top', 'Tweezer', 'bearish', 'reversal', 2, 'up',
    (c, i) => c.white(i - 1) && c.black(i) && c.same(c.high(i - 1), c.high(i), i - 1)),
  pattern('bullishKicking', 'Bullish Kicking', 'Kicking', 'bullish', 'reversal', 2, null,
    (c, i) => c.black(i - 1) && c.marubozu(i - 1, i - 1) && c.white(i) && c.marubozu(i, i - 1) && c.low(i) > c.high(i - 1)),
  pattern('bearishKicking', 'Bearish Kicking', 'Kicking', 'bearish', 'reversal', 2, null,
    (c, i) => c.white(i - 1) && c.marubozu(i - 1, i - 1) && c.black(i) && c.marubozu(i, i - 1) && c.high(i) < c.low(i - 1)),
  pattern('bullishCounterattack', 'Bullish Counterattack', 'Counter', 'bullish', 'reversal', 2, 'down',
    (c, i) => c.black(i - 1) && c.long(i - 1, i - 1) && c.white(i) && c.long(i, i - 1) && c.same(c.close(i), c.close(i - 1), i - 1)),
  pattern('bearishCounterattack', 'Bearish Counterattack', 'Counter', 'bearish', 'reversal', 2, 'up',
    (c, i) => c.white(i - 1) && c.long(i - 1, i - 1) && c.black(i) && c.long(i, i - 1) && c.same(c.close(i), c.close(i - 1), i - 1)),
  pattern('matchingLow', 'Matching Low', 'Match Low', 'bullish', 'reversal', 2, 'down',
    (c, i) => c.black(i - 1) && c.long(i - 1, i - 1) && c.black(i) && c.same(c.close(i), c.close(i - 1), i - 1)),
  pattern('homingPigeon', 'Homing Pigeon', 'Pigeon', 'bullish', 'reversal', 2, 'down',
    (c, i) => c.black(i - 1) && c.long(i - 1, i - 1) && c.black(i) && c.short(i, i - 1) && c.bodyInside(i - 1, i)),
  pattern('onNeck', 'On Neck', 'On Neck', 'bearish', 'continuation', 2, 'down', (c, i) => {
    const a = i - 1;
    return c.black(a) && c.long(a, a) && c.white(i) && c.open(i) < c.low(a) && c.same(c.close(i), c.low(a), a) && c.close(i) < c.close(a);
  }),
  pattern('inNeck', 'In Neck', 'In Neck', 'bearish', 'continuation', 2, 'down', (c, i) => {
    const a = i - 1;
    return c.black(a) && c.long(a, a) && c.white(i) && c.open(i) < c.low(a) && c.close(i) > c.close(a) && c.close(i) <= c.close(a) + c.body(a) * 0.1;
  }),
  pattern('thrusting', 'Thrusting', 'Thrusting', 'bearish', 'continuation', 2, 'down', (c, i) => {
    const a = i - 1;
    return c.black(a) && c.long(a, a) && c.white(i) && c.open(i) < c.low(a) && c.close(i) > c.close(a) + c.body(a) * 0.1 && c.close(i) < c.mid(a);
  }),
  pattern('bullishSeparatingLines', 'Bullish Separating Lines', 'Separating', 'bullish', 'continuation', 2, 'up',
    (c, i) => c.black(i - 1) && c.white(i) && c.long(i, i - 1) && c.lower(i) <= c.range(i) * NO_SHADOW && c.same(c.open(i), c.open(i - 1), i - 1)),
  pattern('bearishSeparatingLines', 'Bearish Separating Lines', 'Separating', 'bearish', 'continuation', 2, 'down',
    (c, i) => c.white(i - 1) && c.black(i) && c.long(i, i - 1) && c.upper(i) <= c.range(i) * NO_SHADOW && c.same(c.open(i), c.open(i - 1), i - 1)),
];
