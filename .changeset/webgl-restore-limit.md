---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

WebGL renderer: a chart whose WebGL context is lost draws with it again once the browser hands it back (`rendererChange` with `reason: 'contextRestored'`). At most 8 charts on a page draw with WebGL at once, as Chrome and Safari drop the oldest context past about 16; a chart past the limit draws with Canvas 2D (`reason: 'limit'`) and takes WebGL as soon as another lets go, and `setMaxWebGLCharts(n)` sets the limit. Checked in Chrome, Firefox and WebKit; Firefox no longer warns about the deprecated `WEBGL_debug_renderer_info`. Baseline, Kagi and point & figure charts draw on the GPU too: baseline and Kagi lines are drawn whole, round where they bend, instead of in pieces with notches at each bend, and an X's two strokes are drawn apart. Point & figure columns are drawn in boxes of the size they were built with (they were drawn in boxes of 1, a smear of specks at prices far from 1).
