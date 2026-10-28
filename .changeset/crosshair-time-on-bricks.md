---
'@tradecanvas/commons': minor
'@tradecanvas/chart': patch
---

The crosshair's tooltip dates a Renko brick, a Kagi line or a point & figure column as the time axis does. It showed the brick's own time, which only counts bricks from the first bar's, so a brick of 2026 read 4 Jan 2016 with seconds while the axis under it read 2026. The `crosshairMove` payload gains `time`, that same date (a candle's own time), and `prevClose`, the close of the bar drawn before it (the brick before, on Renko).
