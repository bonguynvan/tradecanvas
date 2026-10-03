---
"@tradecanvas/core": patch
"@tradecanvas/chart": patch
---

Panning by dragging no longer stops halfway with a "no drop" cursor: quick presses could leave text on the chart selected, and the next press then started the browser's own drag of it. The chart's text can't be selected now, and a native drag that starts on the chart, or while a press on it is held, is cancelled.
