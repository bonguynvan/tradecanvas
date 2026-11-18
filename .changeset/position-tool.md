---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

The Long/Short Position drawing has a fourth handle, its right edge on the entry line, which sets how long the trade runs; the stop, the target and the entry sit on the entry's edge, and the stop's handle changes only its price. Over the bars in its span it plays the trade out: entered on the first bar at or after the entry, closed where the price first reaches the stop or the target (the stop when one bar reaches both; a bar's open when it gaps past a level), at its right edge, or still open at the last bar. The part it went through is tinted in the colour of what it made, with a dashed line from the entry to the close and a tag there: `Target hit`, `Stop hit`, `Closed` or `Open`, with the profit or loss. It is on for positions already drawn too; the `showOutcome` option turns it off. It is played on the series' own prices, and left out for a box drawn back from its entry and on chart types whose bars are not the series' (Renko and the like). Saved drawings keep their place: the second anchor still holds the stop's price and the right edge's time.
