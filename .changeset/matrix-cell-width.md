---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
'@tradecanvas/mcp': minor
---

`MatrixChart` takes `cellWidth`: `'square'` (default) keeps square cells, `'fill'` spreads the columns over the width beside the row names, and a number sets each column's width in pixels, no wider than the room. Rows keep their height, so a matrix of a few columns, such as a statement's lines by period, uses the chart. Cells in the layout carry `width` and `height` beside `size`, and the layout `pitchX` and `pitchY` beside `pitch`.
