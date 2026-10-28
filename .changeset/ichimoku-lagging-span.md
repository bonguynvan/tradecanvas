---
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
'@tradecanvas/chart': minor
---

Ichimoku Cloud draws its lagging span. Each bar's close is plotted the displacement back (the `displacement` input, 26 by default), as the standard definition has it, so the last 26 bars have none yet. It is the line `chikou` ("Lagging Span") in the indicator's fifth colour: it has a value in the legend, a column in the CSV and JSON export (`Ichimoku 9 26 52 Lagging Span`), a style of its own in the indicator settings, and `indicatorSource(id, 'chikou')` reads it. Hide it with `plots: { chikou: { visible: false } }`. With only four colours of your own it takes the series palette's fifth, not the conversion line's. The cloud is unchanged: its two lead lines are still drawn on the bar they are worked out for, not the displacement ahead. `getIndicatorOutput` already held a `chikou` field, which was the bar's own close; it is now the close the displacement on, and the `displacement` input, which did nothing before, sets it.
