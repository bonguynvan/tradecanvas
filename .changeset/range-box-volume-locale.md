---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The Date and Price Range box writes its volume as the chart's numbers read: in 만, 억 and 조 with `numberLocale: 'ko-KR'`, and with the locale's decimal mark elsewhere (`Vol 2,75M` under `de-DE`).
