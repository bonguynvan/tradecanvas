---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Four charts for dashboards beside the candle chart: `BarChart` (grouped or stacked, upright or sideways, up and down from zero, coloured by sign), `DonutChart` (or a pie, with a centre caption), `ScatterChart` (bubbles sized by area) and `HistogramChart` (bins by count, width or Sturges' rule, with marker lines). Each follows the pointer with a tooltip, answers clicks with what was under them, describes itself to screen readers (`ariaLabel` in your words), and draws in the dark or light theme. `histogramBins` and `niceScale` are exported. The finance charts' canvases now have an image role and `setLabel`.

Three more: `CalendarChart` (a value a day in week columns, a calendar year to a band, Monday to Friday with `weekdays: 5`), `MatrixChart` (a coloured value per row and column, half a square matrix with `triangle`, and `correlationMatrix` for Pearson correlations of returns), and `HeatmapChart`'s `grouped` option (a market map by sector, each group under its name and weighted change). `ColorScale` colours can be left out to keep the chart's own.
