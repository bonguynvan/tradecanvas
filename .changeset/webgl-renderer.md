---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

WebGL renderer (preview): `renderer: 'webgl'` (or `'auto'`, WebGL on a hardware GPU only) draws the grid, session shading and break lines, candles and volume with WebGL 2, on a canvas under the 2D scene. `chart.setRenderer(mode)` switches at runtime, `chart.getRenderer()` says what draws, and the `rendererChange` event reports each change and why (`'unsupported'`, `'contextLost'`). Canvas 2D stays the default and takes over wherever WebGL 2 is missing or its context is lost. The WebGL code loads on first use, as a chunk of its own. Session break labels now draw over the bars instead of under them.
