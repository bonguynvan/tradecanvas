---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Volumes in Korean units on the chart: with `numberLocale: 'ko-KR'` the legend, the crosshair tooltip and ChartWidget's data window write them in 만, 억 and 조 (`3.45억`), as `formatVolumeLoc` does. Other locales keep K, M and B. `usesKoreanUnits(locale)` tells which locales write them so.
