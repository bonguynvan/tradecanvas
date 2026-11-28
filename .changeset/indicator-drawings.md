---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

An indicator can draw labels, lines and boxes of its own: an output's `drawings` (`IndicatorDrawing`, at `{ bar, value }` points) are drawn over its plots on its scale. A label is a bubble pointing at its point, or text alone; a line can be carried on to the pane's edge; a box can be filled and hold text. They show and hide with the indicator, and no layout saves them.
