---
'@tradecanvas/commons': patch
'@tradecanvas/chart': patch
---

feat: price alerts UI panel

- **Bell button + floating alerts panel** in `ChartWidget` — add, list, and
  delete price alerts from the toolbar without touching the API. The add form
  prefills the current price and offers all five conditions (crossing,
  crossing up/down, greater/less than) plus an optional note. Triggered alerts
  surface a toast and are flagged in the list. Default on; opt out with
  `alerts: false`. Bottom-sheet on phones (< 640 px).
- **Proper alert events** — the chart now emits typed `alertAdd`,
  `alertRemove`, and `alertTriggered` events (with an `AlertPayload`) instead
  of only piggybacking on `dataUpdate`. Subscribe via
  `chart.on('alertTriggered', e => …)`. The legacy `dataUpdate` alert signal is
  still emitted for back-compat.
