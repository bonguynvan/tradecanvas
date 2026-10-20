---
"@tradecanvas/chart": minor
---

`chart.requestRender()` draws a frame on request (after a plugin's own setting changed), and an overlay plugin with `enabled: false` stays registered but isn't drawn.
