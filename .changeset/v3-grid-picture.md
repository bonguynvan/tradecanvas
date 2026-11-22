---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

The grid's bar has a picture button: a menu that saves the charts together as an image, copies it, prints it or saves it as a PDF, named after the symbols shown. `grid.copyScreenshot()` is new; `picture: false` leaves the button out, and it goes with the charts' `screenshot` and `copyImage` switches. Three new icons: `download`, `printer`, `file`. Fixed: a grid's bar is written right to left in a language that is, as its charts are; a file named after a symbol keeps the symbol's own letters (`fileNamePart()` in core); a menu under a button gives the keyboard back to it in Safari too.
