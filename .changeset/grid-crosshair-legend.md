---
"@tradecanvas/commons": patch
"@tradecanvas/chart": patch
---

A grid's other charts show the bar the linked crosshair is on: their OHLC legend, indicator rows and data window read it, and go back to the latest bar when the pointer leaves. The new `crosshairSync` event (`{ barIndex, bar, time, prevClose }`, `barIndex: null` when it goes) says which bar `setCrosshairTime` put the line on; it never fires as `crosshairMove`.
