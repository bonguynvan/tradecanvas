---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Four charts for dashboards beside the candle chart: `BarChart` (grouped or stacked, upright or sideways, up and down from zero, coloured by sign), `DonutChart` (or a pie, with a centre caption), `ScatterChart` (bubbles sized by area) and `HistogramChart` (bins by count, width or Sturges' rule, with marker lines). Each follows the pointer with a tooltip, answers clicks with what was under them, describes itself to screen readers (`ariaLabel` in your words), and draws in the dark or light theme. `histogramBins` and `niceScale` are exported. The finance charts' canvases now have an image role and `setLabel`.
