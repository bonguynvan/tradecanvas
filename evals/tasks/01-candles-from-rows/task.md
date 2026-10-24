---
area: chart
max_turns: 25
---

My API returns daily candles as rows, `[timeInSeconds, open, high, low, close, volume]`, newest first.

Export `mount(host: HTMLElement, rows: [number, number, number, number, number, number][])`. It should show the rows as a candlestick chart in `host` (a div that already has a width and height) and return the chart.
