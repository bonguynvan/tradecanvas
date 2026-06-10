---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Market Profile (TPO)

- **`computeMarketProfile(bars, priceMin, priceMax, opts)`** (core, pure) — a
  time-at-price histogram where each bar contributes one TPO to every price
  bucket its [low, high] range touched. Returns the Point of Control (busiest
  price) and the value area (the smallest band, grown out from the POC by the
  heavier neighbour, holding `valueAreaPct` — default 70% — of all TPOs).
- **`MarketProfileRenderer`** draws it as a left-pinned histogram (so it can sit
  alongside the right-pinned Volume Profile), value-area rows highlighted, a
  dashed POC line. Rebins against the visible range on pan/zoom.
- **Stats readout**: a compact POC / VAH / VAL label, dotted value-area
  boundary lines, and `chart.getMarketProfileStats()` returning the live
  `{ poc, vah, val, valueAreaPct }`. Toggle the label with
  `setMarketProfileConfig({ showStats: false })`.
- **Chart API**: `setMarketProfileVisible()` / `isMarketProfileVisible()` /
  `setMarketProfileConfig()` / `getMarketProfileStats()`, plus a
  "Market Profile (TPO)" toggle in the widget settings sheet. (Footprint charts
  need per-trade bid/ask data and are out of scope for an OHLCV library.)
