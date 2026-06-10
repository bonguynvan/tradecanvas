---
'@tradecanvas/chart': patch
---

feat: Data Window (per-bar OHLCV + indicator values)

- A floating Data Window shows the exact open/high/low/close/volume, bar change
  (absolute + %), and every active indicator's value at the hovered bar,
  updating live from `crosshairMove`. Toggle via the command palette
  ("Toggle Data Window"). Reads indicator values straight from
  `chart.getIndicatorOutput().series[index]` — no new core surface.
