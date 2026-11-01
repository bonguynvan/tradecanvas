---
'@tradecanvas/commons': patch
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The legend is drawn around the trading tags, so a tag under it (a target near the top of a narrow chart) stays whole and its buttons can be pressed. The OHLCV legend and the data window write volumes in the number locale's decimal mark (`66,10K` under `de-DE`), and `formatVolumeLoc` writes a locale it has no table for as `Intl` does.
