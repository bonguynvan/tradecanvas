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
      indicators={['ema', 'rsi']}
      onReady={(chart) => chart.setIndicatorValueLabelsVisible(true)}
      style={{ height: 480 }}
    />
  );
}
```

`@tradecanvas/vue` and `@tradecanvas/svelte` take the same data props (Vue
emits `ready` and `crosshairMove` instead of the callback props). To drive the
widget or a bare `Chart` from a framework, create it in the mount hook on a
sized element and call `destroy()` in the unmount hook.

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

## Alerts beyond a price level

A line crossing another line, a fast move, a close past a level, and an end
date. They check on every price the feed sends, with the lines they watch
taken at the same moment:

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
  locale: 'vi',
  chartOptions: { numberLocale: 'vi-VN' },
});
```
