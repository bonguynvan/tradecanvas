---
'@tradecanvas/commons': patch
'@tradecanvas/chart': patch
---

feat: client-side timeframe resampling

- **`resampleOHLCV(bars, target)`** — aggregate a finer OHLCV series into any
  coarser timeframe (1m → 5m / 15m / 1h / 4h / 1D / 1W / 1M …). Open = first,
  high/low = extremes, close = last, volume = sum. Calendar-aware bucketing:
  intraday and daily frames anchor to UTC epoch boundaries, weeks to Monday
  (configurable via `weekStartsOn`), months/quarters/years to calendar
  boundaries. Input bars are never mutated.
- **`inferTimeframeMs(bars)`** — detect the source bar spacing from the median
  gap, robust to weekend/halt gaps.
- **`canResample(sourceMs, target)`** — guard against accidental upsampling.
- **`timeframeBucketStart(time, tf, weekStartsOn?)`** exported from
  `@tradecanvas/commons` — the calendar-aware bucket anchor used by resampling.
- **Widget integration** — `ChartWidget` now resamples locally when the
  timeframe buttons are clicked and no live adapter is attached: one loaded
  dataset drives every resolution, no refetch. New `widget.setData(bars)`
  registers the finest-resolution base series; opt out with
  `resampleTimeframes: false`. New `weekStartsOn` widget option.
