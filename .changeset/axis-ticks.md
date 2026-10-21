---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

The time axis labels the bars that start the largest calendar steps (a year in bold, a month, a day, a round hour) at least 80 px apart, as `2024`, `Mar`, `15`, `13:00`; the labels stay on their bars through pans and history loads, month names follow the number locale, and the grid's lines follow the labels. The price scale fits its labels to its height (30 px apart at least), labels a log scale from top to bottom, ticks percent and indexed scales in round percents and index points, and keeps a log scale above zero when it pads the range (`padPriceRange`). `TimeFormatContext.kind` adds `'year'` and `'month'`. Session break lines and labels thin out instead of piling up when zoomed far out.
