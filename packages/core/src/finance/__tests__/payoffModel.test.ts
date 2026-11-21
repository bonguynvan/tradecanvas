import { describe, it, expect } from 'vitest';
import type { OptionLeg, PayoffOptions } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { computePayoffLayout, optionPayoff, optionPrice, positionValue, renderPayoff } from '../PayoffRenderer.js';
import { measure, recorder } from './charts3dKit.js';

const W = 640;
const H = 400;

describe('what an option is worth before it expires', () => {
  it('is the textbook price: a year, 20% volatility, 5% interest, at the money', () => {
    expect(optionPrice('call', 100, 100, { years: 1, volatility: 0.2, rate: 0.05 })).toBeCloseTo(10.4506, 3);
    expect(optionPrice('put', 100, 100, { years: 1, volatility: 0.2, rate: 0.05 })).toBeCloseTo(5.5735, 3);
    // With a yield on the underlying, both ways.
    expect(optionPrice('call', 100, 100, { years: 1, volatility: 0.2, rate: 0.05, dividendYield: 0.03 })).toBeCloseTo(8.6525, 3);
    expect(optionPrice('put', 100, 100, { years: 1, volatility: 0.2, rate: 0.05, dividendYield: 0.03 })).toBeCloseTo(6.7309, 3);
  });

  it('keeps a call, a put and the underlying in step (put-call parity)', () => {
    for (const [spot, strike, years, volatility, rate] of [[100, 90, 0.5, 0.35, 0.02], [42, 50, 0.25, 0.6, 0], [1200, 1250, 2, 0.15, 0.04]]) {
      const call = optionPrice('call', spot, strike, { years, volatility, rate });
      const put = optionPrice('put', spot, strike, { years, volatility, rate });
      expect(call - put).toBeCloseTo(spot - strike * Math.exp(-rate * years), 6);
    }
  });

  it('is what it pays where no time or no movement is left', () => {
    expect(optionPrice('call', 110, 100, { years: 0, volatility: 0.3 })).toBe(10);
    expect(optionPrice('put', 110, 100, { years: 0, volatility: 0.3 })).toBe(0);
    expect(optionPrice('put', 80, 100, { years: -1, volatility: 0.3 })).toBe(20);
    // No volatility: the forward's payoff, brought back to today.
    expect(optionPrice('call', 100, 90, { years: 1, volatility: 0, rate: 0.05 })).toBeCloseTo(100 - 90 * Math.exp(-0.05), 9);
    expect(optionPrice('put', 100, 90, { years: 1, volatility: 0, rate: 0.05 })).toBe(0);
  });

  it('is worth what it must be where the underlying is at nothing, or the strike is', () => {
    // At a price of nothing a put is its strike, brought back to today, and a call nothing.
    expect(optionPrice('put', 0, 100, { years: 1, volatility: 0.3, rate: 0.05 })).toBeCloseTo(100 * Math.exp(-0.05), 9);
    expect(optionPrice('put', 0, 100, { years: 0, volatility: 0.3 })).toBe(100);
    expect(optionPrice('call', 0, 100, { years: 1, volatility: 0.3 })).toBe(0);
    // A call at a strike of nothing is the underlying itself.
    expect(optionPrice('call', 120, 0, { years: 0.5, volatility: 0.3, dividendYield: 0.02 })).toBeCloseTo(120 * Math.exp(-0.01), 9);
    expect(optionPrice('call', 120, 0, { years: 0, volatility: 0.3 })).toBe(120);
    expect(optionPrice('put', 120, 0, { years: 0.5, volatility: 0.3 })).toBe(0);
  });

  it('is never under nothing, and a number, at the far ends', () => {
    for (const [spot, strike, years, volatility, rate] of [[100, 900, 0.02, 0.1, 0], [900, 100, 0.02, 0.1, 0], [1, 1e6, 1, 0.05, 0.1], [50, 50, 1e5, 0.2, -0.05], [50, 50, Number.POSITIVE_INFINITY, 0.2, 0]]) {
      for (const type of ['call', 'put'] as const) {
        const price = optionPrice(type, spot, strike, { years, volatility, rate });
        expect(Number.isFinite(price), `${type} ${spot} ${strike} ${years}`).toBe(true);
        expect(price).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('is nothing for numbers that are none', () => {
    for (const bad of [Number.NaN, -5, Number.POSITIVE_INFINITY]) {
      expect(optionPrice('call', bad, 100, { years: 1, volatility: 0.2 })).toBe(0);
      expect(optionPrice('call', 100, bad, { years: 1, volatility: 0.2 })).toBe(0);
    }
    expect(optionPrice('call', 100, 100, { years: 1, volatility: Number.NaN })).toBe(0);
    expect(optionPrice('call', 0, 100, { years: 1, volatility: 0.2 })).toBe(0);
  });
});

describe('what a position makes or loses before expiry', () => {
  const condor: OptionLeg[] = [
    { type: 'put', side: 'long', strike: 90, premium: 1 },
    { type: 'put', side: 'short', strike: 95, premium: 2.5 },
    { type: 'call', side: 'short', strike: 105, premium: 2.5 },
    { type: 'call', side: 'long', strike: 110, premium: 1 },
  ];

  it('is the payoff at expiry on the day itself', () => {
    for (const price of [80, 92, 100, 107, 125]) {
      expect(positionValue(condor, price, { daysToExpiry: 0, volatility: 0.25 }, 100)).toBeCloseTo(optionPayoff(condor, price, 100), 9);
    }
  });

  it('is the payoff on the day at every price, the lowest and a strike of nothing among them', () => {
    const legs: OptionLeg[] = [
      { type: 'call', side: 'long', strike: 0, premium: 2 },
      { type: 'put', side: 'short', strike: 100, premium: 3 },
      { type: 'underlying', side: 'long', entry: 95 },
      { type: 'call', side: 'short', strike: 105, premium: 1 },
    ];
    for (const price of [0, 50, 100, 105, 200]) {
      expect(positionValue(legs, price, { daysToExpiry: 0, volatility: 0.3 }, 10), `at ${price}`).toBeCloseTo(optionPayoff(legs, price, 10), 9);
    }
  });

  it('has time value in it: a long option is worth more than it would pay, a short one costs more to close', () => {
    const long: OptionLeg[] = [{ type: 'call', side: 'long', strike: 100, premium: 4 }];
    const short: OptionLeg[] = [{ type: 'call', side: 'short', strike: 100, premium: 4 }];
    const model = { daysToExpiry: 30, volatility: 0.3 };
    for (const price of [90, 100, 110]) {
      expect(positionValue(long, price, model)).toBeGreaterThan(optionPayoff(long, price));
      expect(positionValue(short, price, model)).toBeLessThan(optionPayoff(short, price));
      expect(positionValue(long, price, model)).toBeCloseTo(-positionValue(short, price, model), 9);
    }
    // More time, more of it.
    expect(positionValue(long, 100, { daysToExpiry: 90, volatility: 0.3 })).toBeGreaterThan(positionValue(long, 100, model));
  });

  it('counts each leg by its quantity, the underlying by its entry, and a leg’s own days and volatility where it has them', () => {
    const covered: OptionLeg[] = [{ type: 'underlying', side: 'long', entry: 100 }, { type: 'call', side: 'short', strike: 105, premium: 2, quantity: 2 }];
    const model = { daysToExpiry: 20, volatility: 0.25 };
    const call = optionPrice('call', 103, 105, { years: 20 / 365, volatility: 0.25 });
    expect(positionValue(covered, 103, model, 10)).toBeCloseTo((3 - 2 * (call - 2)) * 10, 9);
    const calendar: OptionLeg[] = [
      { type: 'call', side: 'short', strike: 100, premium: 2, daysToExpiry: 0 },
      { type: 'call', side: 'long', strike: 100, premium: 4, daysToExpiry: 30, volatility: 0.4 },
    ];
    const far = optionPrice('call', 104, 100, { years: 30 / 365, volatility: 0.4 });
    expect(positionValue(calendar, 104, model)).toBeCloseTo(-(4 - 2) + (far - 4), 9);
  });
});

/** A stand-in context that notes each stroke's colour and whether it is dashed, and each square's colour, keeping both over save and restore as a canvas does. */
function inkWatcher(): { ctx: CanvasRenderingContext2D; strokes: { color: string; dashed: boolean }[]; squares: string[] } {
  interface Ink {
    strokeStyle: string;
    fillStyle: string;
    dash: number[];
  }
  let ink: Ink = { strokeStyle: '', fillStyle: '', dash: [] };
  const kept: Ink[] = [];
  const strokes: { color: string; dashed: boolean }[] = [];
  const squares: string[] = [];
  const other: Record<string | symbol, unknown> = { font: '10px sans-serif' };
  const ctx = new Proxy(other, {
    get: (target, prop) => {
      if (prop === 'strokeStyle' || prop === 'fillStyle') return ink[prop];
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (text: string) => ({ width: String(text).length * 6 });
      if (prop === 'save') return () => void kept.push({ ...ink, dash: [...ink.dash] });
      if (prop === 'restore') return () => void (ink = kept.pop() ?? ink);
      if (prop === 'setLineDash') return (dash: number[]) => void (ink.dash = [...dash]);
      if (prop === 'stroke') return () => void strokes.push({ color: ink.strokeStyle, dashed: ink.dash.length > 0 });
      if (prop === 'fillRect') return () => void squares.push(ink.fillStyle);
      return () => {};
    },
    set: (target, prop, value) => {
      if (prop === 'strokeStyle' || prop === 'fillStyle') ink[prop] = String(value);
      else target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, strokes, squares };
}

describe('the payoff chart with the position’s value before expiry', () => {
  const options: PayoffOptions = {
    legs: [{ type: 'call', side: 'long', strike: 100, premium: 5 }],
    multiplier: 100,
    spot: 101,
    model: { daysToExpiry: 45, volatility: 0.3, rate: 0.03 },
  };

  it('lays out a second line, smooth and inside the plot, over the same prices', () => {
    const layout = computePayoffLayout(options, W, H, DARK_THEME, measure);
    const today = layout.today;
    expect(today).not.toBeNull();
    expect(today!.length).toBeGreaterThan(40);
    expect(today![0].price).toBe(layout.xScale.min);
    expect(today![today!.length - 1].price).toBe(layout.xScale.max);
    for (const point of today!) {
      expect(point.value).toBeCloseTo(positionValue(options.legs, point.price, options.model!, 100), 9);
      expect(point.y).toBeGreaterThanOrEqual(layout.plot.y - 0.5);
      expect(point.y).toBeLessThanOrEqual(layout.plot.y + layout.plot.height + 0.5);
    }
    // Without a model there is none, and the chart is as it was.
    expect(computePayoffLayout({ ...options, model: undefined }, W, H, DARK_THEME, measure).today).toBeNull();
  });

  it('makes room on the value scale for a line that goes past the payoff', () => {
    // A short straddle is worth least at its strike, where the payoff is at its most.
    const short: PayoffOptions = {
      legs: [{ type: 'call', side: 'short', strike: 100, premium: 1 }, { type: 'put', side: 'short', strike: 100, premium: 1 }],
      range: { min: 95, max: 105 },
      model: { daysToExpiry: 60, volatility: 0.5 },
    };
    const plain = computePayoffLayout({ ...short, model: undefined }, W, H, DARK_THEME, measure);
    const withToday = computePayoffLayout(short, W, H, DARK_THEME, measure);
    expect(withToday.yScale.min).toBeLessThan(plain.yScale.min);
  });

  it('draws it dashed with a legend of the two lines, and reads both under the pointer', () => {
    const { ctx, shapes, texts } = recorder();
    const dashes: number[][] = [];
    const watched = new Proxy(ctx, {
      get: (target, prop) => (prop === 'setLineDash' ? (dash: number[]) => void dashes.push([...dash]) : Reflect.get(target, prop)),
      set: (target, prop, value) => Reflect.set(target, prop, value),
    });
    const layout = renderPayoff(watched, W, H, options, DARK_THEME, null);
    expect(dashes.some((dash) => dash.length > 0)).toBe(true);
    expect(texts).toEqual(expect.arrayContaining(['At expiry', 'In 45 days']));
    expect(shapes.length).toBeGreaterThan(2);
    const plain = recorder();
    renderPayoff(plain.ctx, W, H, { ...options, model: undefined }, DARK_THEME, null);
    expect(plain.texts).not.toContain('At expiry');
    // Under the pointer: the price, the payoff there, and the value before expiry.
    const hovered = recorder();
    const at = { x: layout.plot.x + layout.plot.width * 0.6, y: layout.plot.y + 40 };
    renderPayoff(hovered.ctx, W, H, options, DARK_THEME, at);
    expect(hovered.texts.some((text) => text.startsWith('At expiry'))).toBe(true);
    expect(hovered.texts.some((text) => text.startsWith('In 45 days'))).toBe(true);
  });

  it('has no cliff at a price of nothing: a put bought is worth its strike there', () => {
    const put: PayoffOptions = { legs: [{ type: 'put', side: 'long', strike: 100, premium: 3 }], range: { min: 0, max: 200 }, model: { daysToExpiry: 30, volatility: 0.3 } };
    const today = computePayoffLayout(put, W, H, DARK_THEME, measure).today!;
    expect(today[0].price).toBe(0);
    expect(today[0].value).toBeCloseTo(97, 6);
    // The next step along is a few units of price away, and a few units of value.
    expect(Math.abs(today[1].value - today[0].value)).toBeLessThan(5);
  });

  it('shows each line in the legend as it is drawn: the payoff in its two colours, the other dashed', () => {
    const drawn = (given: PayoffOptions) => {
      const { ctx, strokes, squares } = inkWatcher();
      renderPayoff(ctx, W, H, given, DARK_THEME, null);
      const count = (color: string, dashed: boolean) => strokes.filter((stroke) => stroke.color === color && stroke.dashed === dashed).length;
      return { profit: count(DARK_THEME.candleUp, false), loss: count(DARK_THEME.candleDown, false), dashed: count(DARK_THEME.textSecondary, true), squares };
    };
    const alone = drawn({ ...options, model: undefined });
    const both = drawn(options);
    // The payoff's sample: one more whole stroke in the profit's colour and one in the loss's.
    expect(both.profit - alone.profit).toBe(1);
    expect(both.loss - alone.loss).toBe(1);
    // Two more dashed ones in the quiet ink: the curve, and its sample.
    expect(both.dashed - alone.dashed).toBe(2);
    // And no square: a square's colour would be one no line here has.
    expect(both.squares).toEqual(alone.squares);
  });

  it('cuts a name too long for the chart', () => {
    const long: PayoffOptions = { ...options, expiryLabel: 'On the day the options expire, '.repeat(12), model: { ...options.model!, label: 'x'.repeat(400) } };
    const layout = computePayoffLayout(long, W, H, DARK_THEME, measure);
    for (const item of layout.legend!.items) expect(item.x + measure(item.label, 11)).toBeLessThanOrEqual(W);
    expect(layout.legend!.items[0].label.endsWith('…')).toBe(true);
  });

  it('names the lines as the options say, and a day as a day', () => {
    const named = recorder();
    renderPayoff(named.ctx, W, H, { ...options, model: { ...options.model!, label: 'Hôm nay' }, expiryLabel: 'Đáo hạn' }, DARK_THEME, null);
    expect(named.texts).toEqual(expect.arrayContaining(['Đáo hạn', 'Hôm nay']));
    const one = recorder();
    renderPayoff(one.ctx, W, H, { ...options, model: { daysToExpiry: 1, volatility: 0.3 } }, DARK_THEME, null);
    expect(one.texts).toContain('In 1 day');
  });
});
