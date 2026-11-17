---
'@tradecanvas/chart': minor
---

`ChartWidget` takes `plugins` (your indicators, drawing tools, chart types and overlays), typed, and `chartOptions.plugins` is typed too. They are registered with the widget's chart before it restores a saved layout, a template or a shared view, so a layout that names an indicator of your own gets it back.
