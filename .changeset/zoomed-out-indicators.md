---
"@tradecanvas/core": patch
"@tradecanvas/chart": patch
---

Faster when zoomed out: once each bar takes less than a pixel, indicator lines, bands and histograms draw one span per pixel column instead of a stroke through thousands of points. Much the same look for a fraction of the raster work: zoomed out on 200,000 bars with Bollinger Bands, EMA, RSI and MACD, a frame went from about 54 ms to about 21 ms on integrated graphics. Supertrend draws one line per colour instead of one stroke per bar.
