---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

`indicatorWorker: 'auto'` computes full indicator recomputes in a Web Worker when the series has 50,000 bars or more (default `'off'`); ticks stay on the main thread. Reads stay synchronous, and `getIndicatorOutput(id, { drawn: true })` reads what is drawn without waiting.
