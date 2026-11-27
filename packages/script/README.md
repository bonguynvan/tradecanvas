# @tradecanvas/script

Indicators written bar by bar for [TradeCanvas](https://tradecanvas.dev/): state kept from bar to bar, past values read back, `ta` sums that run one bar at a time, and a live bar run again on each tick.

Not published yet: the package is being built in steps, and its API can still change.

```ts
import { defineScript, scriptIndicator, ta } from '@tradecanvas/script';

const emaCross = defineScript({
  id: 'emaCross',
  name: 'EMA Cross',
  overlay: true,
  inputs: { fast: { default: 9, kind: 'int', min: 1 }, slow: { default: 21, kind: 'int', min: 1 } },
  setup({ inputs, plot, shape }) {
    const fast = ta.ema(inputs.fast);
    const slow = ta.ema(inputs.slow);
    const up = ta.crossover();
    const fastLine = plot('Fast', { color: '#f5c542' });
    const slowLine = plot('Slow', { color: '#3b82f6' });
    const mark = shape('Cross up', { shape: 'triangleUp', position: 'belowBar', color: '#22c55e' });
    return (bar) => {
      const f = fastLine.set(fast(bar.close));
      const s = slowLine.set(slow(bar.close));
      mark.set(up(f, s));
    };
  },
});

chart.registerIndicator(scriptIndicator(emaCross));
chart.addIndicator('emaCross');
```

## How it runs

- `setup` runs once: it declares the plots, marks and levels, makes the `ta` sums and the kept state (`state.var`, `state.array`, `state.series`), and returns what each bar runs.
- Each `ta` sum keeps its own state: two calls of `ta.ema(9)` are two averages. Make them in `setup`, never on a bar. Their values are the chart's built-in indicators' (the MACD's averages start as simple ones).
- The closed bars run once. The last bar stays live: a tick runs it again from the state the bar before left, so a tick costs one bar.
- `ScriptRun` runs a script without a chart (`load`, `tick`, `next`, `update`); its output is a typed array a plot.
- Only what the script keeps through `state` and the `ta` sums is put back before a tick. A plain `let` in `setup` is not: keep values in `state.var`.
- Feed each `ta` sum on every bar for the values the chart's indicators have: a sum fed on some bars only averages those bars.
- A missing value (NaN) is handled as `@tradecanvas/core`'s `ta` handles it: a simple or weighted average needs its period of numbers in a row, a smoothing skips it, and RSI, MACD, the bands, HMA, ROC and momentum compute over it as the last value and give none there.
- `ta.macd`'s averages start as simple ones, like every EMA here; the chart's built-in MACD starts its own at the first close, so their first hundred bars or so differ by a hair.
- A bar that throws stops the script there; `output.errors` (`meta.errors` of the indicator's output) says which bar and why. A tick on the live bar runs it again; once that bar closes, the script stays stopped until the bars are loaded again.

## Not drawn yet

The chart does not draw yet: a plot's colour per bar (`plot.set(value, color)` keeps it in `output.colors`), marks in a pane of their own, and an `hline`'s colour and title (its price is drawn as a level).
