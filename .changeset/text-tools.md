---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Text on the chart gets a style of its own. `DrawingStyle` takes `bold`, `italic`, `textColor`, `textAlign`, `textBackground` (in `fillColor`), `textBorder` (in `borderColor`) and `textWrap`, and the text tools use them: a Text writes several lines, wraps at a width when given one, and is picked anywhere on its text as drawn; a Note and a Callout can drop their box or border; a Price Label and an Arrow Mark write in bold, italics and their text colour. The widget's Text tab sets all of them; a Text, a Note or a Callout opens on that tab as soon as it is drawn (Cancel takes it back) and when double-clicked; the toolbar over a selection sets the fill and the text colour. The widget now starts with the drawing magnet off, so a drawing goes where it is placed until the magnet button turns it on. `chart.takeBackDrawing(id)` takes back a drawing just made, with its undo step when that is the last one, and `drawingCreate` says `drawn: true` for one the pointer just made.
