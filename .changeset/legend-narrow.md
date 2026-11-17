---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The legend takes less of a phone's chart. An indicator's row in `ChartWidget`'s legend showed its buttons (show, settings, more, remove) at all times on a touch screen, so a few rows covered the candles at the top left; they now show once a tap opens the row, as a hover does with a mouse, and a tap of its name then opens the settings. They are further apart for a thumb. A pane's first row stops short of the pane's buttons, which covered the end of its values. On a chart too narrow for the legend's prices on one line, the volume ends their last line when it fits there, instead of taking a line of its own.
