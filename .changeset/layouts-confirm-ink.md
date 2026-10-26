---
'@tradecanvas/chart': patch
---

The button that confirms deleting a saved layout reads in the dark theme. Its word was white on the dark theme's red, at 3.1:1; it now takes the ink of the widget's accent buttons, dark there (5.9:1) and white in the light theme as before. The dark theme's muted text (`--tcw-text-muted`) is a shade lighter, `#918f8a`, so it reads at 4.5:1 on a dialog's selected row too, where the symbol search's venue and kind read at 4.3:1; the light theme's is a shade darker, `#6b6f76` (it was `#6c7077`), where they read at 4.49:1 as the browser draws the row, and the fields' chevrons and calendar icons, drawn in it, follow.
