import type { Candles } from './candleShape.js';
import { pattern, type PatternDef } from './patternDef.js';

/** Three white bars of real size, each closing higher, opening within the body before and closing near its high. */
function soldiers(c: Candles, a: number): boolean {
  for (let k = a; k < a + 3; k++) {
    if (!c.white(k) || c.short(k, a) || c.upper(k) > c.body(k) * 0.25) return false;
    if (k > a && (c.close(k) <= c.close(k - 1) || c.open(k) < c.open(k - 1) || c.open(k) > c.close(k - 1))) return false;
  }
  return true;
}

function crows(c: Candles, a: number): boolean {
  for (let k = a; k < a + 3; k++) {
    if (!c.black(k) || c.short(k, a) || c.lower(k) > c.body(k) * 0.25) return false;
    if (k > a && (c.close(k) >= c.close(k - 1) || c.open(k) > c.open(k - 1) || c.open(k) < c.close(k - 1))) return false;
  }
  return true;
}

/** Bars from..to, each closing past the one before it the way `down` says. */
function stepping(c: Candles, from: number, to: number, down: boolean): boolean {
  for (let k = from + 1; k <= to; k++) if (down ? c.close(k) >= c.close(k - 1) : c.close(k) <= c.close(k - 1)) return false;
  return true;
}

/** Bars from..to (inclusive): small bodies of the colour `black` says, held inside bar a's range. */
function heldInside(c: Candles, a: number, from: number, to: number, black: boolean): boolean {
  for (let k = from; k <= to; k++) {
    if ((black ? !c.black(k) : !c.white(k)) || c.long(k, a) || c.high(k) > c.high(a) || c.low(k) < c.low(a)) return false;
  }
  return true;
}

/** Three-bar patterns: `a`, `b` and the last bar `i`. */
export const TRIPLE_PATTERNS: readonly PatternDef[] = [
  pattern('morningStar', 'Morning Star', 'M. Star', 'bullish', 'reversal', 3, 'down', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.black(a) && c.long(a, a) && c.short(b, a) && !c.doji(b) && c.bodyGapDown(a, b) && c.white(i) && c.close(i) > c.mid(a);
  }),
  pattern('eveningStar', 'Evening Star', 'E. Star', 'bearish', 'reversal', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.white(a) && c.long(a, a) && c.short(b, a) && !c.doji(b) && c.bodyGapUp(a, b) && c.black(i) && c.close(i) < c.mid(a);
  }),
  pattern('morningDojiStar', 'Morning Doji Star', 'M. Doji', 'bullish', 'reversal', 3, 'down', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.black(a) && c.long(a, a) && c.doji(b) && c.bodyGapDown(a, b) && c.white(i) && c.close(i) > c.mid(a);
  }),
  pattern('eveningDojiStar', 'Evening Doji Star', 'E. Doji', 'bearish', 'reversal', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.white(a) && c.long(a, a) && c.doji(b) && c.bodyGapUp(a, b) && c.black(i) && c.close(i) < c.mid(a);
  }),
  pattern('bullishAbandonedBaby', 'Bullish Abandoned Baby', 'Abandoned', 'bullish', 'reversal', 3, 'down', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.black(a) && c.long(a, a) && c.doji(b) && c.high(b) < c.low(a) && c.white(i) && !c.short(i, a) && c.low(i) > c.high(b);
  }),
  pattern('bearishAbandonedBaby', 'Bearish Abandoned Baby', 'Abandoned', 'bearish', 'reversal', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.white(a) && c.long(a, a) && c.doji(b) && c.low(b) > c.high(a) && c.black(i) && !c.short(i, a) && c.high(i) < c.low(b);
  }),
  pattern('threeWhiteSoldiers', 'Three White Soldiers', '3 Soldiers', 'bullish', 'reversal', 3, null, (c, i) => soldiers(c, i - 2)),
  pattern('threeBlackCrows', 'Three Black Crows', '3 Crows', 'bearish', 'reversal', 3, null, (c, i) => crows(c, i - 2)),
  pattern('threeInsideUp', 'Three Inside Up', '3 Inside', 'bullish', 'reversal', 3, 'down', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.black(a) && c.long(a, a) && c.white(b) && c.bodyInside(a, b) && c.white(i) && c.close(i) > c.open(a);
  }),
  pattern('threeInsideDown', 'Three Inside Down', '3 Inside', 'bearish', 'reversal', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.white(a) && c.long(a, a) && c.black(b) && c.bodyInside(a, b) && c.black(i) && c.close(i) < c.open(a);
  }),
  pattern('threeOutsideUp', 'Three Outside Up', '3 Outside', 'bullish', 'reversal', 3, 'down', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.black(a) && c.white(b) && c.open(b) <= c.close(a) && c.close(b) >= c.open(a) && c.body(b) > c.body(a) && c.white(i) && c.close(i) > c.close(b);
  }),
  pattern('threeOutsideDown', 'Three Outside Down', '3 Outside', 'bearish', 'reversal', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.white(a) && c.black(b) && c.open(b) >= c.close(a) && c.close(b) <= c.open(a) && c.body(b) > c.body(a) && c.black(i) && c.close(i) < c.close(b);
  }),
  pattern('upsideGapTwoCrows', 'Upside Gap Two Crows', '2 Crows Gap', 'bearish', 'reversal', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.white(a) && c.long(a, a) && c.black(b) && c.short(b, a) && c.bodyGapUp(a, b) && c.black(i) && c.open(i) > c.open(b) && c.close(i) < c.close(b) && c.close(i) > c.close(a);
  }),
  pattern('twoCrows', 'Two Crows', '2 Crows', 'bearish', 'reversal', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.white(a) && c.long(a, a) && c.black(b) && c.bodyGapUp(a, b) && c.black(i)
      && c.open(i) < c.open(b) && c.open(i) > c.close(b) && c.close(i) < c.close(a) && c.close(i) > c.open(a);
  }),
  pattern('bullishTriStar', 'Bullish Tri-Star', 'Tri-Star', 'bullish', 'reversal', 3, 'down', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.doji(a) && c.doji(b) && c.doji(i) && c.bodyGapDown(a, b) && c.bodyGapUp(b, i);
  }),
  pattern('bearishTriStar', 'Bearish Tri-Star', 'Tri-Star', 'bearish', 'reversal', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.doji(a) && c.doji(b) && c.doji(i) && c.bodyGapUp(a, b) && c.bodyGapDown(b, i);
  }),
  pattern('upsideTasukiGap', 'Upside Tasuki Gap', 'Tasuki', 'bullish', 'continuation', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.white(a) && c.white(b) && c.low(b) > c.high(a) && c.black(i)
      && c.open(i) < c.close(b) && c.open(i) > c.open(b) && c.close(i) < c.low(b) && c.close(i) > c.high(a);
  }),
  pattern('downsideTasukiGap', 'Downside Tasuki Gap', 'Tasuki', 'bearish', 'continuation', 3, 'down', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.black(a) && c.black(b) && c.high(b) < c.low(a) && c.white(i)
      && c.open(i) > c.close(b) && c.open(i) < c.open(b) && c.close(i) > c.high(b) && c.close(i) < c.low(a);
  }),
  pattern('stickSandwich', 'Stick Sandwich', 'Sandwich', 'bullish', 'reversal', 3, 'down', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.black(a) && c.white(b) && c.low(b) > c.close(a) && c.black(i) && c.same(c.close(i), c.close(a), a);
  }),
  pattern('advanceBlock', 'Advance Block', 'Adv Block', 'bearish', 'reversal', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.white(a) && c.long(a, a) && c.white(b) && c.white(i) && c.close(b) > c.close(a) && c.close(i) > c.close(b)
      && c.open(b) > c.open(a) && c.open(b) <= c.close(a) && c.open(i) > c.open(b) && c.open(i) <= c.close(b)
      && c.body(i) < c.body(b) && c.body(b) < c.body(a) && c.upper(i) > c.upper(a);
  }),
  pattern('identicalThreeCrows', 'Identical Three Crows', 'Ident Crows', 'bearish', 'reversal', 3, 'up', (c, i) => {
    const a = i - 2, b = i - 1;
    return c.black(a) && c.black(b) && c.black(i) && c.close(b) < c.close(a) && c.close(i) < c.close(b)
      && c.same(c.open(b), c.close(a), a) && c.same(c.open(i), c.close(b), a)
      && c.lower(a) <= c.body(a) * 0.25 && c.lower(b) <= c.body(b) * 0.25 && c.lower(i) <= c.body(i) * 0.25;
  }),
];

/** Four- and five-bar patterns, ending at `i`. */
export const LONG_PATTERNS: readonly PatternDef[] = [
  pattern('bullishThreeLineStrike', 'Bullish Three-Line Strike', 'Strike', 'bullish', 'continuation', 4, 'up', (c, i) => {
    const a = i - 3;
    return c.white(a) && c.white(a + 1) && c.white(a + 2) && stepping(c, a, a + 2, false)
      && c.open(a + 1) >= c.open(a) && c.open(a + 1) <= c.close(a) && c.open(a + 2) >= c.open(a + 1) && c.open(a + 2) <= c.close(a + 1)
      && c.black(i) && c.open(i) > c.close(a + 2) && c.close(i) < c.open(a);
  }),
  pattern('bearishThreeLineStrike', 'Bearish Three-Line Strike', 'Strike', 'bearish', 'continuation', 4, 'down', (c, i) => {
    const a = i - 3;
    return c.black(a) && c.black(a + 1) && c.black(a + 2) && stepping(c, a, a + 2, true)
      && c.open(a + 1) <= c.open(a) && c.open(a + 1) >= c.close(a) && c.open(a + 2) <= c.open(a + 1) && c.open(a + 2) >= c.close(a + 1)
      && c.white(i) && c.open(i) < c.close(a + 2) && c.close(i) > c.open(a);
  }),
  pattern('risingThreeMethods', 'Rising Three Methods', 'Rising 3', 'bullish', 'continuation', 5, 'up', (c, i) => {
    const a = i - 4;
    return c.white(a) && c.long(a, a) && heldInside(c, a, a + 1, a + 3, true) && stepping(c, a + 1, a + 3, true)
      && c.white(i) && c.long(i, a) && c.open(i) > c.close(i - 1) && c.close(i) > c.close(a);
  }),
  pattern('fallingThreeMethods', 'Falling Three Methods', 'Falling 3', 'bearish', 'continuation', 5, 'down', (c, i) => {
    const a = i - 4;
    return c.black(a) && c.long(a, a) && heldInside(c, a, a + 1, a + 3, false) && stepping(c, a + 1, a + 3, false)
      && c.black(i) && c.long(i, a) && c.open(i) < c.close(i - 1) && c.close(i) < c.close(a);
  }),
  pattern('matHold', 'Mat Hold', 'Mat Hold', 'bullish', 'continuation', 5, 'up', (c, i) => {
    const a = i - 4;
    if (!(c.white(a) && c.long(a, a) && c.black(a + 1) && c.short(a + 1, a) && c.bodyGapUp(a, a + 1))) return false;
    for (let k = a + 1; k <= a + 3; k++) if (c.long(k, a) || c.bodyBottom(k) < c.mid(a)) return false;
    const top = Math.max(c.high(a + 1), c.high(a + 2), c.high(a + 3));
    return c.close(a + 3) < c.close(a + 1) && c.white(i) && c.open(i) > c.close(i - 1) && c.close(i) > top;
  }),
  pattern('bullishBreakaway', 'Bullish Breakaway', 'Breakaway', 'bullish', 'reversal', 5, 'down', (c, i) => {
    const a = i - 4;
    return c.black(a) && c.long(a, a) && c.black(a + 1) && c.bodyGapDown(a, a + 1)
      && c.close(a + 2) < c.close(a + 1) && c.close(a + 3) < c.close(a + 2) && c.black(a + 3)
      && c.white(i) && c.close(i) > c.open(a + 1) && c.close(i) < c.close(a);
  }),
  pattern('bearishBreakaway', 'Bearish Breakaway', 'Breakaway', 'bearish', 'reversal', 5, 'up', (c, i) => {
    const a = i - 4;
    return c.white(a) && c.long(a, a) && c.white(a + 1) && c.bodyGapUp(a, a + 1)
      && c.close(a + 2) > c.close(a + 1) && c.close(a + 3) > c.close(a + 2) && c.white(a + 3)
      && c.black(i) && c.close(i) < c.open(a + 1) && c.close(i) > c.close(a);
  }),
  pattern('concealingBabySwallow', 'Concealing Baby Swallow', 'Swallow', 'bullish', 'reversal', 4, 'down', (c, i) => {
    const a = i - 3;
    return c.black(a) && c.marubozu(a, a) && c.black(a + 1) && c.marubozu(a + 1, a)
      && c.black(a + 2) && c.open(a + 2) < c.close(a + 1) && c.high(a + 2) > c.close(a + 1)
      && c.black(i) && c.open(i) > c.high(a + 2) && c.close(i) < c.low(a + 2);
  }),
  pattern('ladderBottom', 'Ladder Bottom', 'Ladder', 'bullish', 'reversal', 5, 'down', (c, i) => {
    const a = i - 4;
    for (let k = a; k <= a + 3; k++) if (!c.black(k)) return false;
    for (let k = a + 1; k <= a + 2; k++) if (c.open(k) >= c.open(k - 1) || c.close(k) >= c.close(k - 1)) return false;
    return c.upper(a + 3) > c.body(a + 3) && c.white(i) && c.open(i) > c.open(a + 3) && c.close(i) > c.high(a + 3);
  }),
];
