---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

Cursor kinds and a drawing's span on the axes.

- `crosshair.cursor` / `setCrosshairCursor` chooses what the pointer looks like: `'cross'` (the default), `'dot'` (the crosshair's lines with a dot for a cursor) or `'arrow'` (no lines; the price and the time still follow the pointer on the axes). ChartWidget's cursor button opens a menu of the three, and the Chart Settings have the row.
- While a drawing is selected, moved or being drawn, the axes are tinted over its span and its ends are labelled in its colour (`features.drawingAxisSpans: false` turns this off).
- The eraser glows the drawing a click would remove.
- A hidden crosshair no longer draws its lines and price in the indicator panes.
