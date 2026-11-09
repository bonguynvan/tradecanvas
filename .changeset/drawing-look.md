---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

Drawings are drawn one way, and easier to read. Handles are rings in the drawing's colour filled with the chart's background, sized to the line, bigger under the pointer and filled while dragged; the others of a selection and locked drawings show small dots, and the nearest handle in reach is the one taken. A drawing under the pointer glows a little, and a drawing being made shows its placed points. Text people write is set at 14 px in the system's sans face (new `font.textFamily` on the chart, set by the widget from its look), and figures at 12 px, both growing with the chart's type; a saved size of 12, the old default, reads as none. Fills follow the line's colour unless set on their own (the old default blue reads as "follow the line"; `LINE_TINT_FILL` and `ownFillColor` in commons). Dashes, dots and arrowheads grow with the line; label boxes take the chart's surface and text colour; text on coloured tags is black or white, whichever reads. A `Chart` paints its element in the theme's background from the start unless the host gave it one, so a dark chart on a light page is no longer drawn on white. `DEFAULT_DRAWING_STYLE` no longer sets `fontSize`.
