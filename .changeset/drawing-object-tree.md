---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Drawings have names, and the object tree works on them. `DrawingState.name` names a drawing (at most 80 characters, kept in saved layouts); `updateDrawing(id, { name })` sets it and `null` clears it, and the object tree lists a drawing by it. In the tree, a click on a drawing's name selects it, a double-click renames it, a button clones it, and a grip drags it onto another row's place in the order (the arrow keys on the grip move it one row; a drawing in a group moves with its group). `moveDrawing(id, index)` takes a place in the order as well as `'front'`, `'back'`, `'forward'` and `'backward'`.
