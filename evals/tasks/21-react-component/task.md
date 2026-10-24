---
area: frameworks
packages: [react]
entry: src/main.tsx
max_turns: 35
---

In my React app I need a chart component. Export `PriceChart` with the props `{ bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[]; showRsi: boolean; onReady?: (chart: Chart) => void }` (`Chart` from `@tradecanvas/chart`; bars oldest first, times in milliseconds).

It shows `bars` as candles, and only those: no live feed of its own. While `showRsi` is true it shows a 14-period RSI in a pane under them. It follows later changes to both props, calls `onReady` with the chart once there is one, and frees the chart when it unmounts. It fills its parent, which has a size.
