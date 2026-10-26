# TradeCanvas recipes

Worked examples. Every `ts` block here is type-checked against the library in
CI (`pnpm docs:check`), so the calls are real.

## Your own data feed over REST

`PollingAdapter` turns any "give me the last N bars" endpoint into a live feed:
it loads history, polls, updates the forming bar and closes it on rollover.

```ts
import { Chart, PollingAdapter, type OHLCBar, type TimeFrame } from '@tradecanvas/chart';

const feed = new PollingAdapter({
  name: 'my-api',
  intervalMs: 5_000,
  fetchBars: async (symbol: string, timeframe: TimeFrame, limit: number): Promise<OHLCBar[]> => {
    const res = await fetch(`/api/candles?symbol=${symbol}&tf=${timeframe}&limit=${limit}`);
    const rows: [number, number, number, number, number, number][] = await res.json();
    return rows.map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));
  },
});

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter: feed, symbol: 'AAPL', timeframe: '1h', historyLimit: 500 });
```

## Your own data feed over WebSocket

`WebSocketAdapter` handles connecting, reconnecting and the history request;
you describe the URL, the subscribe message and how to read a frame.

```ts
import { Chart, WebSocketAdapter, type OHLCBar } from '@tradecanvas/chart';

interface KlineFrame { t: number; o: string; h: string; l: string; c: string; v: string; final: boolean }

const feed = new WebSocketAdapter({
  name: 'my-exchange',
  wsUrl: () => 'wss://stream.example.com/ws',
  subscribeMessage: ({ symbol, timeframe }) => ({ op: 'subscribe', channel: `kline.${timeframe}.${symbol}` }),
  fetchHistory: async (symbol, timeframe, limit): Promise<OHLCBar[]> => {
    const res = await fetch(`https://api.example.com/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`);
    return res.json();
  },
  parseMessage: (raw) => {
    const k = (raw as { kline?: KlineFrame }).kline;
    if (!k) return null;
    const bar = { time: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v };
    return { bar, closed: k.final };
  },
});

const chart = new Chart(document.getElementById('chart')!, {});
await chart.connect({ adapter: feed, symbol: 'BTCUSDT', timeframe: '1m' });
```

A frame for a bar already past, with `closed: true` (the venue's final that
came after the next bar's first frame, or a revision), corrects that bar: the
chart replaces the bar with its time and computes the indicators again from
it, the view kept. An older frame still forming is left out. Neither is a
live price: the adapter makes a tick from a frame's close only for the newest
bar, so the price line, the alerts and the orders stay with the market. A
`DataAdapter` of your own that makes ticks from its bars should do the same.

A feed that learns the symbol's details only after connecting (its decimals,
price step or hours, say on its first message) sends a `symbolInfo` event with
the `SymbolInfo`, as it sends its other events (`emitEvent('symbolInfo', info)`
in a subclass of these adapters). The chart applies it: the price scale,
legend and tags take the symbol's decimals, and so do drawing labels, price
limits and the widget's data window, alerts list and order ticket; the scale's
ticks take its price step.

## React, Vue, Svelte

The wrapper packages give a component with reactive props:

```tsx
import { TradeCanvas } from '@tradecanvas/react';
import { BinanceAdapter } from '@tradecanvas/chart';

const adapter = new BinanceAdapter();

export function PriceChart({ symbol }: { symbol: string }) {
  return (
    <TradeCanvas
      symbol={symbol}
      timeframe="15m"
      adapter={adapter}
      indicators={['rsi', { id: 'ema', params: { period: 50 } }]}
      onReady={(chart) => chart.setIndicatorValueLabelsVisible(true)}
      style={{ height: 480 }}
    />
  );
}
```

`indicators` takes ids or `{ id, params, position }`; one whose inputs change
is put back with them. With `data` at mount the component shows your bars and
opens no stream; `stream={false}` never opens one (and closes one it had), so a
chart mounted before its bars arrive doesn't start the default Binance feed.
Bars that go on from the last given (the last bar changed, or bars added:
`setBars((bars) => [...bars, next])`) go in as live ticks, so the view isn't
reset and alerts follow the price; any other array is a new series. Vue and
Svelte take the same, and a push onto the same array too. A change to one of
the last three bars before the forming one (`CORRECTABLE_BARS`), its time the
same, goes in as `updateBar`, the view kept too: in a new array, and in Vue and
Svelte in place. A change further back is a new series. `features` follows its
changes after mount.

`@tradecanvas/vue` and `@tradecanvas/svelte` take the same data props (Vue
emits `ready` and `crosshairMove` instead of the callback props). To drive the
widget or a bare `Chart` from a framework, create it in the mount hook on a
sized element and call `destroy()` in the unmount hook.

## A feed that corrects a closed bar

A venue sends its final for a bar after the next one has started, or revises
a bar it closed. `updateBar` puts it in place, wherever the bar is: the
indicators are computed again from it, and the view, the replay and the
alerts are left as they are. It returns `false` when no loaded bar has that
time; a new bar is `appendBar`'s.

```ts
import { Chart, type OHLCBar } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, {});
const res = await fetch('/api/candles?symbol=AAPL&tf=1h');
const bars: OHLCBar[] = await res.json();
chart.setData(bars);

/** A closed bar from your own socket: a new one, the forming one's close, or the final of an older one. */
function onClosedBar(bar: OHLCBar): boolean {
  const data = chart.getData();
  const last = data[data.length - 1];
  if (!last || bar.time > last.time) chart.appendBar(bar);
  else if (bar.time === last.time) chart.updateLastBar(bar); // the live price
  else return chart.updateBar(bar); // false: no loaded bar has bar.time
  return true;
}

const corrected: number[] = [];
chart.on('dataUpdate', (e) => {
  if (e.payload.kind === 'correction') corrected.push(e.payload.time);
});

onClosedBar({ time: bars[bars.length - 2].time, open: 101, high: 104, low: 100, close: 103, volume: 1_250 });
```

Send the bar whole: a missing volume is 0, as with `setData`. The same bar
sent again computes nothing, so a feed that sends its last closed bars on
every poll costs nothing for those that didn't change. With a connected feed,
send the bar again as closed instead (see the WebSocket recipe).

## A signal from an indicator on an indicator

An SMA of RSI, drawn in RSI's pane, and a signal when RSI closes above it.
It looks at the two last *closed* bars (the forming one still moves) and fires
once per bar:

```ts
import { Chart, BinanceAdapter, indicatorSource } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter: new BinanceAdapter(), symbol: 'ETHUSDT', timeframe: '15m' });

const rsi = chart.addIndicator('rsi', { period: 14 })!;
const signal = chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })!;

let lastSignalBar = -1;
chart.on('indicatorUpdate', () => {
  const r = chart.getIndicatorOutput(rsi)?.series ?? [];
  const s = chart.getIndicatorOutput(signal)?.series ?? [];
  const i = r.length - 2; // the bar that closed last
  if (i <= lastSignalBar) return;
  const [r0, r1, s0, s1] = [r[i - 1]?.value, r[i]?.value, s[i - 1]?.value, s[i]?.value];
  if (r0 === undefined || r1 === undefined || s0 === undefined || s1 === undefined) return;
  if (r0 <= s0 && r1 > s1) {
    lastSignalBar = i;
    console.log('RSI closed above its average');
  }
});
```

## A backtest replayed on the chart

```ts
import { Chart, type OHLCBar, type SignalMarker, type TradeZone } from '@tradecanvas/chart';

declare const bars: OHLCBar[];            // the whole lookback
declare const signals: SignalMarker[];    // the backtest's buys and sells
declare const trades: TradeZone[];        // and its trades

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
chart.setData(bars);
chart.setSignalMarkers(signals);
chart.setTradeZones(trades);

// Sweep the last 30 days in about 3.5 s: only those bars on the chart, each
// mark appearing as the replay reaches it, each trade open until its exit.
const DAY = 86_400_000;
chart.replayStart({ startTime: bars[bars.length - 1].time - 30 * DAY, hideHistory: true, duration: 3500 });
chart.on('replayStep', (e) => console.log(`${e.payload.barIndex + 1} / ${e.payload.total}`));
chart.on('replayComplete', () => chart.replayStop());   // the whole series, every mark
```

`revealMarks: false` shows every mark through the replay. `duration` plays
several bars a frame when it must; a frame that comes late slows the replay
rather than skip ahead. The bars before `startTime` come back with
`replayStop()`.

## Alerts beyond a price level

A line crossing another line, a fast move, a close past a level, and an end
date. They check on every live price, with the lines they watch taken at
the same moment: a connected stream's, or your own feed's through
`updateLastBar`, `appendBar` or `setCurrentPrice`:

```ts
import { Chart, BinanceAdapter } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '1h' });

const ema = chart.addIndicator('ema', { period: 50 })!;
const rsi = chart.addIndicator('rsi', { period: 14 })!;

chart.addAlert(NaN, 'crossingUp', 'above the 50 EMA', 'price', undefined, { target: `${ema}:value` });
chart.addAlert(NaN, 'movesDown', 'dump', 'price', undefined, { percent: 4, bars: 6 });        // bars: 2–500
chart.addAlert(70, 'greaterThan', 'RSI closed above 70', `${rsi}:value`, 'RSI', { onBarClose: true });
chart.addAlert(64_000, 'crossing', 'today only', 'price', undefined, { expiresAt: Date.now() + 86_400_000 });

chart.on('alertTriggered', (e) => console.log(e.payload.message, e.payload.channel, e.payload.target));
chart.on('alertExpired', (e) => console.log('expired', e.payload.id));
```

## Practising on a replay with a paper account

Replay an hourly chart in 5-minute steps and trade it on paper: orders fill on
the replayed prices and fills land on the replayed bars. Alerts keep watching
the live market meanwhile.

```ts
import { Chart, BinanceAdapter, PaperExecutionAdapter } from '@tradecanvas/chart';

const adapter = new BinanceAdapter();
const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h' });
chart.connectExecution(new PaperExecutionAdapter());

const steps = await adapter.fetchHistory('BTCUSDT', '5m', 2000);
chart.replayStart({ steps, startIndex: 300, paused: true, speed: 5 });
chart.replayResume();
// … place orders from the chart; chart.replaySeekToBar(i) jumps, chart.replayStop() goes back to live
```

## Another symbol's change beside yours, in percent

ETH's line on BTC's chart, each reading its change since the first bar on
screen on a percent price scale, and a legend of your own from
`getCompareValues` (the widget's `addCompareSymbol` does all of this itself).
Fetch as many bars as the chart has, so the line starts where the chart does:

```ts
import { Chart, BinanceAdapter } from '@tradecanvas/chart';

const adapter = new BinanceAdapter();
const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h' });

const eth = await adapter.fetchHistory('ETHUSDT', '1h', chart.getData().length);
chart.addCompareSymbol('eth', 'ETHUSDT', eth, '#7c4dff');
chart.setScaleMode('percentage');

const legend = document.getElementById('legend')!;
chart.on('crosshairMove', (e) => {
  // Its close at the bar and its change in %, as the line reads; `stale` past its last bar.
  legend.textContent = chart.getCompareValues(e.payload.barIndex)
    .map((v) => `${v.label} ${v.close ?? ''} ${v.change?.toFixed(2) ?? ''}%`)
    .join('  ');
});
```

## Another symbol on its own scale, and the ratio of the two

ETH beside BTC on a price scale of its own, and BTC ÷ ETH in a pane. The
indicators ask for the bars of the symbol they read; fetch them again when the
interval changes:

```ts
import { Chart, BinanceAdapter } from '@tradecanvas/chart';

const adapter = new BinanceAdapter();
const chart = new Chart(document.getElementById('chart')!, { theme: 'dark' });
await chart.connect({ adapter, symbol: 'BTCUSDT', timeframe: '1h' });

const load = async (symbol: string) => chart.setSymbolSeries(symbol, await adapter.fetchHistory(symbol, '1h', 1000));
chart.on('symbolSeriesRequest', (e) => void load(e.payload.symbol));

chart.addIndicator('compareSymbol', { symbol: 'ETHUSDT' }, 'bottom', { scale: 'left' });
const ratio = chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })!;
chart.setPaneScale(ratio, { percent: true });
```

## Prices in 32nds

A bond future quoted in 32nds and half 32nds, on High-Low bars, regular
session only:

```ts
import { Chart } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, {
  chartType: 'hiLo',
  priceFormat: { denominator: 32, subDenominator: 2 },  // 110'165 = 110 and 16.5/32
  extendedHours: false,
});
chart.setSymbolInfo({ symbol: 'ZN', timeZone: 'America/Chicago', sessions: [{ start: '07:20', end: '14:00' }] });
```

## A Vietnamese stock, and VN30 futures

HOSE's rules on the chart: steps by price band, the day's ceiling and floor,
lots of 100 in the order ticket, the price board's colours. Preset prices are
in thousands of dong, as price boards show them (bars in thousands need
nothing more); `scaleMarketPrices(MARKET_HOSE, 1000)` reads dong. The axis
keeps its zone until `setTimeZone('exchange')`, and numbers their locale.

```ts
import { Chart, MARKET_HOSE, MARKET_VN30F, priceStepAt, vn30fContracts } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, { extendedHours: false, numberLocale: 'vi-VN' });
chart.setMarket(MARKET_HOSE);
chart.setTimeZone('exchange');                     // the market's zone: Asia/Ho_Chi_Minh
chart.setPriceLimits(25.35);                       // the reference: yesterday's close
console.log(chart.getPriceLimits());               // { ceiling: 27.1, floor: 23.6, reference: 25.35 }
console.log(chart.roundPrice(25.37), priceStepAt(9.5, MARKET_HOSE)); // 25.35 0.01

// VN30 futures: the front contract and its last trading day
const [front] = vn30fContracts(Date.now());
chart.setMarket(MARKET_VN30F);
console.log(front.symbol, front.lastTradingDay);   // e.g. VN30F2611 2026-11-19
```

## Bars of a day in the exchange's time

The 4H, 1D, 1W and 1M bars the library builds start at the exchange's midnight
when it knows the zone: for Ho Chi Minh City, 1D at 00:00 there and 4H at 08:00
and 12:00. Which zone depends on where the bars come from:

- **Timeframes a feed lacks** (built from its `supportedTimeframes`): only the
  `SymbolInfo.timeZone` its `resolveSymbol` answers. `setMarket` doesn't move
  them; a feed without `resolveSymbol` (or that fails to answer) gets UTC days.
- **Bars given to `widget.setData`**: the symbol's zone (`setSymbolInfo`), else
  the market's (`setMarket`).

Bars your own code builds (from trades, or hours into days) should start at the
same place: `timeframeBucketStart` with the zone. 1h and shorter keep their
floor on the epoch; daily bars stamped at 00:00 UTC keep their dates.

```ts
import { resampleBars, timeframeBucketStart, type OHLCBar, type TimeFrame, type Trade } from '@tradecanvas/chart';

const timeZone = 'Asia/Ho_Chi_Minh';

/** The bars with `trade` in them: it starts a bar of `timeframe`, or joins the last one. */
function withTrade(bars: readonly OHLCBar[], trade: Trade, timeframe: TimeFrame): OHLCBar[] {
  const time = timeframeBucketStart(trade.time, timeframe, { timeZone });
  const last = bars[bars.length - 1];
  if (last?.time !== time) {
    return [...bars, { time, open: trade.price, high: trade.price, low: trade.price, close: trade.price, volume: trade.volume }];
  }
  const merged = { ...last, high: Math.max(last.high, trade.price), low: Math.min(last.low, trade.price), close: trade.price, volume: last.volume + trade.volume };
  return [...bars.slice(0, -1), merged];
}

// 09:15 on 23 October there: its 1D bar opens at 17:00 UTC on the 22nd, its 4H bar at 08:00 there.
const at = Date.UTC(2026, 9, 23, 2, 15);
console.log(new Date(timeframeBucketStart(at, '1d', { timeZone })).toISOString()); // 2026-10-22T17:00:00.000Z
console.log(withTrade([], { time: at, price: 1250.5, volume: 3 }, '4h')[0].time === Date.UTC(2026, 9, 23, 1)); // true

// Hours into days and weeks, all at once
declare const hours: OHLCBar[];
const days = resampleBars(hours, '1d', { timeZone });
const weeks = resampleBars(days, '1w', { timeZone });
```

## A dashboard: net flows, allocation and returns

The finance charts take an element and their options, and size themselves to it.

```ts
import { BarChart, DonutChart, HistogramChart } from '@tradecanvas/chart';

new BarChart(document.getElementById('flows')!, {
  categories: ['6/10', '7/10', '8/10'],
  series: [{ name: 'Net', values: [-660, 860, -280] }],
  colorBySign: true,
  onBarClick: ({ category, value }) => console.log(category, value),
});

new DonutChart(document.getElementById('allocation')!, {
  data: [{ label: 'Stocks', value: 52 }, { label: 'Bonds', value: 23 }, { label: 'Cash', value: 25 }],
  centerLabel: 'Total',
  centerValue: '1.2B',
});

new HistogramChart(document.getElementById('returns')!, {
  values: [-1.2, 0.4, 0.8, -0.3, 1.5, 0.2],
  binWidth: 0.5,
  colorBySign: true,
  markers: [{ value: 0.23, label: 'Mean' }],
});
```

Days on a calendar, correlations in a matrix, and a market map by sector:

```ts
import { CalendarChart, MatrixChart, HeatmapChart, correlationMatrix } from '@tradecanvas/chart';

new CalendarChart(document.getElementById('sessions')!, {
  data: [{ date: '2025-01-02', value: 1.2 }, { date: '2025-01-03', value: -0.8 }],
  weekdays: 5,
  colorScale: { min: -2, max: 2 },
  onDayClick: (day) => console.log(day.date, day.value),
});

// Daily returns (not prices), one array per stock, the same days in each.
const returns = [[0.4, -1.1, 0.8, 0.2], [0.6, -0.9, 1.1, -0.1], [-0.2, 0.5, -0.4, 0.3]];
new MatrixChart(document.getElementById('correlation')!, {
  rows: ['VCB', 'BID', 'HPG'],
  values: correlationMatrix(returns),
  triangle: 'lower',
  colorScale: { min: -1, max: 1 },
});

new HeatmapChart(document.getElementById('sectors')!, {
  data: [
    { id: 'vcb', label: 'VCB', value: 0.8, weight: 480, group: 'Banks' },
    { id: 'hpg', label: 'HPG', value: 1.9, weight: 160, group: 'Steel' },
  ],
  grouped: true,
});
```

Price against volume as a counter-clock cycle, and indicators from Asian price boards:

```ts
import { Chart, CounterClockChart } from '@tradecanvas/chart';
import type { OHLCBar } from '@tradecanvas/chart';

declare const bars: OHLCBar[];
declare const chart: Chart;

const clock = new CounterClockChart(document.getElementById('clock')!, { data: bars, period: 25, points: 120 });
console.log(clock.getPhase()); // 1–8, counter-clockwise from volume rising

chart.addIndicator('psy', { period: 10 }, 'bottom');
chart.addIndicator('vr', { period: 20 }, 'bottom');
chart.addIndicator('rainbow', { first: 10, step: 10, count: 10 });
```

Candlestick patterns, on the chart or as data:

```ts
import { Chart, detectCandlePatterns } from '@tradecanvas/chart';
import type { OHLCBar } from '@tradecanvas/chart';

declare const bars: OHLCBar[];
declare const chart: Chart;

chart.addIndicator('candlepatterns'); // arrows and short names on the bars that end a pattern
for (const m of detectCandlePatterns(bars, { patterns: ['bullishEngulfing', 'hammer', 'morningStar'] })) {
  console.log(new Date(m.time).toISOString(), m.pattern.name, m.pattern.direction);
}
```

## A custom indicator

Extend `IndicatorBase` and declare what it draws (`plots`), its pane scale and
levels; the chart then draws it, scales its pane, labels its values and lists
it in the widget legend and settings with no rendering code of yours.

```ts
import { Chart, IndicatorBase, IndicatorValueMap } from '@tradecanvas/chart';
import type { DataSeries, IndicatorConfig, IndicatorDescriptor, IndicatorOutput, IndicatorValue } from '@tradecanvas/chart';

/** Where the close sits in the last `period` bars' range, 0–100. */
class RangePosition extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'rangePosition',
    name: 'Range Position',
    shortName: 'RP',
    placement: 'panel',
    category: 'oscillators', // its group in ChartWidget's Indicators dialog
    defaultConfig: { period: 20 },
    inputs: { period: { min: 2, max: 500 } },
    plots: [{ key: 'value', title: 'RP', color: 0 }],
    scale: { min: 0, max: 100 },
    levels: [20, 80],
  };

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const period = Math.max(2, Number(config.params.period) || 20);
    const values = new IndicatorValueMap();
    const series: (IndicatorValue | null)[] = new Array(data.length).fill(null);
    for (let i = period - 1; i < data.length; i++) {
      let hi = -Infinity;
      let lo = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        hi = Math.max(hi, data[j].high);
        lo = Math.min(lo, data[j].low);
      }
      const point = { value: hi > lo ? ((data[i].close - lo) / (hi - lo)) * 100 : 50 };
      values.set(data[i].time, point);
      series[i] = point;
    }
    return { values, series };
  }
}

const chart = new Chart(document.getElementById('chart')!, {});
chart.registerIndicator(new RangePosition());
chart.addIndicator('rangePosition', { period: 30 });
```

Declare `inputs: { source: { source: true } }` and read `data[i].close` to let
users run it on another price or another indicator's line.

An indicator that starts again each day, week or month reads the exchange's
IANA zone as `config.exchangeTimeZone`: the chart sets it from the symbol's
`timeZone`, else the market's (`setSymbolInfo`, `setMarket`), and leaves it
unset for UTC. Count days on that clock, not the zone the chart shows, so the
values stay the same whatever `setTimeZone` displays.

## An overlay of your own, on the price grid

An overlay plugin draws on a layer each frame. `overlayScale(context)` places
bars by time or index and prices by value exactly where the chart draws them
(log and inverted scales too); `chart.getPriceStep()` is the symbol's price
step, for rows on its grid.

```ts
import { Chart, overlayScale } from '@tradecanvas/chart';
import type { OverlayPlugin } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, {});

/** A band one price step high around each bar's close. */
const closeBands: OverlayPlugin = {
  descriptor: { id: 'closeBands', name: 'Close bands', layer: 'main' },
  render(ctx, context) {
    const s = overlayScale(context);
    const step = chart.getPriceStep();
    ctx.fillStyle = 'rgba(242, 169, 59, 0.35)';
    for (let i = s.visible.from; i <= s.visible.to; i++) {
      const close = chart.roundPrice(context.data[i].close);
      const top = s.priceToY(close + step / 2);
      const bottom = s.priceToY(close - step / 2);
      ctx.fillRect(s.indexToX(i) - s.barWidth / 2, Math.min(top, bottom), s.barWidth, Math.abs(bottom - top));
    }
  },
};
chart.plugins.register({ kind: 'overlay', plugin: closeBands });

// A switch of the overlay's own: hide it without unregistering, and show the
// change at once, even with no tick coming to redraw the chart.
closeBands.enabled = false;
chart.requestRender();
```

An indicator's own `render` gets the viewport alone: `priceToY`, `barIndexToX`,
`timeToX` and their inverses are exported for it.

## Several charts in a grid

```ts
import { ChartGrid, BinanceAdapter } from '@tradecanvas/chart';

const grid = new ChartGrid(document.getElementById('grid')!, {
  layout: '2x2',
  syncCrosshair: true,
  syncTimeAxis: true,
});
// An adapter keeps one stream: each chart needs its own.
await grid.connectAll(() => new BinanceAdapter(), ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], '5m');
grid.getChart(0)?.addIndicator('ema', { period: 50 });
```

With the full widget on each chart, `ChartWidgetGrid` adds a bar to pick the
arrangement and the sync, and saves the whole grid as a named layout:

```ts
import { ChartWidgetGrid } from '@tradecanvas/chart/widget';
import { BinanceAdapter } from '@tradecanvas/chart';

const workspace = new ChartWidgetGrid(document.getElementById('grid')!, {
  layout: '1x2',
  adapter: () => new BinanceAdapter(),   // one per chart
  cells: [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT', timeframe: '1h' }],
  sync: { crosshair: true, interval: true },
});
workspace.getActiveWidget().getChart().addIndicator('rsi', { period: 14 });
```

## Named layouts on your own server

```ts
import { ChartWidget, type LayoutStorage, type SavedLayout } from '@tradecanvas/chart/widget';

const server: LayoutStorage = {
  list: async () => (await fetch('/api/layouts')).json(),
  load: async (id) => {
    const res = await fetch(`/api/layouts/${encodeURIComponent(id)}`);
    return res.ok ? ((await res.json()) as SavedLayout) : null;
  },
  save: async (layout) => {
    await fetch(`/api/layouts/${encodeURIComponent(layout.id)}`, { method: 'PUT', body: JSON.stringify(layout) });
  },
  remove: async (id) => {
    await fetch(`/api/layouts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  layouts: { storage: server, openLast: true },   // Ctrl/Cmd+S saves, the open layout auto-saves
});
await widget.getLayoutSession()?.saveAs('Swing BTC');
```

Treat what the server returns as untrusted: the widget refuses content it
cannot read, but your API should still check who owns a layout.

## The widget, saved per symbol and in Vietnamese

```ts
import { ChartWidget } from '@tradecanvas/chart/widget';
import { BinanceAdapter } from '@tradecanvas/chart';

new ChartWidget(document.getElementById('chart')!, {
  adapter: new BinanceAdapter(),
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  persistLayouts: true,            // indicators, drawings and chart type per symbol, in localStorage
  persistSettings: true,           // the Chart Settings (overlays, crosshair, time zone…), in localStorage
  locale: 'vi',
  chartOptions: { numberLocale: 'vi-VN' },
});
```

## The widget's Chart Settings, kept on your server

`persistSettings` keeps them in one browser. To follow the user from device to
device, read them on each change and give them back on the next visit; the
widget checks what it is given.

```ts
import { ChartWidget, type ChartSettingsState } from '@tradecanvas/chart/widget';

const saved = (await (await fetch('/api/me/chart-settings')).json()) as Partial<ChartSettingsState>;

const widget = new ChartWidget(document.getElementById('chart')!, { symbol: 'BTCUSDT' });
widget.setSettings(saved);   // right after the constructor: before the first paint

const stop = widget.onSettingsChange((settings) => {
  void fetch('/api/me/chart-settings', { method: 'PUT', body: JSON.stringify(settings) });
});
// stop() when the page goes; widget.destroy() also ends it.
```

Change them in code with `widget.setSettings({ timezone: 'exchange' })`, not
`widget.getChart().setTimeZone(…)`: the widget's clock follows its own
settings, and a change made on the chart itself is told to no listener.

## The widget in a look of your own

```ts
import { ChartWidget, WIDGET_UI_PRESETS } from '@tradecanvas/chart/widget';
import { BinanceAdapter } from '@tradecanvas/chart';

// 'print' (the default: paper and ink, kept to the golden ratio), 'studio' (rounded),
// 'terminal' (dense, square) or 'capsule' (pills, floating bars)
const widget = new ChartWidget(document.getElementById('chart')!, {
  adapter: new BinanceAdapter(),
  symbol: 'BTCUSDT',
  ui: 'terminal',
});

// Your theme over a preset: what you leave out stays the preset's.
widget.setUI({
  preset: 'studio',
  radius: { md: 10, lg: 14 },   // buttons and fields take md, menus and panels lg
  density: 'compact',
  font: { family: "'Manrope', system-ui, sans-serif", labelCase: 'uppercase' },
  toolbar: 'floating',
  active: 'solid',              // tint · solid · underline
  tagRadius: 999,               // pill price tags on the chart
});
console.log(widget.getUI().sizes.control, WIDGET_UI_PRESETS.capsule.components.control);
```

The look changes shapes and sizes only; colours stay with `theme`. Print
keeps to the golden ratio: sizes in half steps of φ (16, 20, 26, 33, 42),
Fibonacci spacing and corners, type a third of φ apart (11, 13, 15, 18, 21);
`PHI`, `FIBONACCI` and `phiStep` from `@tradecanvas/commons` do the same for
yours. The widget loads no fonts, so load the families a look names (Print
names system faces only). Without `ui` the
look's CSS variables (`--tcw-radius`, `--tcw-control-h`, …) stay the
stylesheet's and your CSS can set them; with it the widget writes them inline.

## The chart's look by key

```ts
import { Chart, CHART_STYLE_KEYS, type ChartStyleKey } from '@tradecanvas/chart';

const chart = new Chart(document.getElementById('chart')!, {
  theme: 'dark',
  overrides: { 'grid.vertical.visible': false },   // the host's layer, from the start
});

// Any key of CHART_STYLE_KEYS; up/down colours fall back to series.candlestick.*
chart.applyOverrides({
  'series.candlestick.upColor': '#26a69a',
  'series.candlestick.downColor': '#ef5350',
  'grid.horizontal.style': 'dotted',
  'crosshair.vertical.style': 'solid',
  'lastPrice.style': 'solid',
});
chart.applyOverrides({ 'lastPrice.style': null });          // null takes a key away

// What the user picks: kept with the theme it was picked on, saved with saveState()
chart.applyOverrides({ 'background.color': '#0b0b0f' }, { layer: 'user' });

const macd = chart.addIndicator('macd', {});
if (macd) {
  chart.updateIndicatorStyle(macd, { plots: { signal: { lineStyle: 'dashed' }, histogram: { visible: false } } });
  chart.setPaneStyle(macd, { separator: '#f2a93b' });
}
chart.setIndicatorDefaults('ema', { colors: ['#f5a623'], lineWidths: [2] });

const keys = Object.keys(CHART_STYLE_KEYS) as ChartStyleKey[];
console.log(keys.length, chart.getStyleValue('series.bar.upColor'), chart.getStyle().grid.vertical.visible);
chart.on('styleChange', (e) => console.log(e.payload.layer));
```

`getTheme()` is the theme as set; the overrides go on it apart, so
`setTheme(getTheme())` never bakes them in. The host's layer stays through
theme switches and is never saved. A grid of charts takes them for every
chart with `grid.applyOverrides(patch)`. Orders and positions (`trading.*`),
signal markers (`markers.*`), trade zones (`tradeZones.*`) and a selected
drawing's handles (`drawings.handleColor`) read back `null` until set: they
keep their own colours. In the widget, Settings → Style and Settings →
Trading edit every key on the user's layer, with Auto for those.

## The widget with only the parts you want, and parts of your own

```ts
import { ChartWidget, WIDGET_FEATURES, type WidgetFeature } from '@tradecanvas/chart/widget';

const widget = new ChartWidget(document.getElementById('chart')!, {
  symbol: 'BTCUSDT',
  features: {
    'toolbar.replay': false,          // one button
    'sidebar.patterns': false,        // a section of drawing tools
    'menu.chart.exportData': false,   // one menu entry
    hotkeys: false,                   // every key of the widget's
  },
  drawingMenuItems: ({ id, type }) => [{ label: `Copy ${type}`, icon: 'link', onSelect: () => void navigator.clipboard.writeText(id) }],
  indicatorMenuItems: ({ indicatorId }) => [{ label: 'About', icon: 'info', onSelect: () => console.log(indicatorId) }],
});

// While it runs: a clean chart, and back
widget.setFeatures({ sidebar: false, statusBar: false });
widget.setFeatures({ sidebar: true, statusBar: true });

// A menu of switches of your own on the toolbar
const parts: WidgetFeature[] = ['sidebar', 'statusBar', 'navigation', 'indicatorLegend'];
widget.addToolbarDropdown({
  id: 'parts',
  label: 'Parts',
  icon: 'layers',
  items: () => parts.map((name) => ({
    label: name,
    checked: widget.isFeatureOn(name),
    onSelect: () => widget.setFeatures({ [name]: !widget.isFeatureOn(name) }),
  })),
});

const latency = widget.addStatusBarItem({ id: 'latency', text: '— ms', label: 'Latency' });
latency?.setText('12 ms');

// A shortcut of your own, listed in the shortcut sheet (?). It replaces a widget shortcut on the
// same keys; the chart's own keys (arrows, Delete, Ctrl+Z) still run, and it warns of those.
const shortcut = widget.addHotkey({ keys: 'Alt+L', label: 'Show the latency', onPress: () => latency?.setText('12 ms') });
shortcut?.remove();
const focus = widget.addSidebarButton({
  id: 'focus',
  label: 'Focus',
  icon: 'eye',
  toggle: true,
  onClick: () => {
    const on = !widget.isFeatureOn('toolbar');
    widget.setFeatures({ toolbar: on });
    focus?.setActive(!on);
  },
});

const badge = document.createElement('div');
badge.textContent = 'Paper account';
badge.style.cssText = 'position:absolute;right:72px;top:8px;pointer-events:auto';
widget.getSlot('chart')?.append(badge);       // a layer over the chart the pointer passes through

console.log(WIDGET_FEATURES.length, widget.getFeatures().alerts);
```

A name without a dot (`alerts`, `settings`, `hotkeys`) turns a capability off
wherever it shows; a dotted one (`toolbar.alerts`) one place. A part shows while
all of its switches are on, and `isFeatureOn` answers for one switch as set:
with `alerts: false`, `isFeatureOn('toolbar.alerts')` is still `true`. The older options
(`toolbar: false`, `drawingTools: false`…) are the same switches. They hide the
widget's own UI; `chartOptions.features` is what stops drawing, trading or zoom
on the chart. A `ChartWidgetGrid` takes them for every chart with
`grid.setFeatures(patch)`.

## Watchlists with live quotes, and a tick chart

```ts
import { ChartWidget } from '@tradecanvas/chart/widget';
import { BinanceAdapter, marketStatus } from '@tradecanvas/chart';

const widget = new ChartWidget(document.getElementById('chart')!, {
  adapter: new BinanceAdapter(),      // its subscribeQuotes fills the rows
  symbol: 'BTCUSDT',
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT'] },
      { id: 'alts', name: 'Alts', symbols: ['SOLUSDT', 'ADAUSDT'] },
    ],
    persist: true,
  },
});
widget.addToWatchlist('BNBUSDT', 'alts');
widget.openPanel('symbolInfo');        // price, market status, the day, hours, news
widget.openPanel('watchlist');         // the panels share the dock beside the chart, all shut to start with
await widget.setTimeframe('100T');     // a bar per 100 trades, from Binance's trades

// Your own feed's quotes instead
widget.setQuotes([{ symbol: 'AAPL', last: 190.2, prevClose: 188.1 }]);
console.log(marketStatus({ symbol: 'AAPL', timeZone: 'America/New_York', sessions: [{ start: '09:30', end: '16:00', days: [1, 2, 3, 4, 5] }] }, Date.now()).state);
```

Quotes come from a feed's `subscribeQuotes` (or `watchlist.quotes`, or
`setQuotes`); tick timeframes need a feed with `fetchTrades` and
`subscribeTrades`. The watchlist, alerts, object tree, data window, symbol
info and (with `depthLadder: true`) the depth ladder are panels of one dock
beside the chart, all shut to start with, opened from a rail at its edge or
with `widget.openPanel(...)`; `features: { dock: false }` drops the rail.
