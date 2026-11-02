---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

The widget fits wide screens, and texts are typed in place. Its bars, buttons, icons and type grow with its width (`ui.scale: 'auto'`, the default): as set up to full HD, then a sixth of φ bigger from 1800 px, a third from 2560 and a half from 3400, the chart's axis type with them; a number sets the scale at every width and `1` keeps the sizes. A text, a note, a callout, a signpost, a balloon or an anchored text or note opens a box over its words when it is drawn and on a double-click: Enter or a click away keeps them, Shift+Enter starts a line, Escape puts them back, and one undo takes a text just drawn and its words away. `DrawingPlugin.textBox`, `Chart.getDrawingTextRect` and `Chart.amendNewDrawing` are new.
