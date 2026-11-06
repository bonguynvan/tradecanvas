---
"@tradecanvas/chart": patch
---

ChartWidget loads less up front: the chart settings, an indicator's and a drawing's settings, Go to and the shortcut sheet load their code the first time one opens, or once the page is idle after the widget is up, whichever comes first. `new ChartWidget()` now brings in 394.6 kB of JavaScript gzipped instead of 405.3 kB (1,491 kB instead of 1,549 kB before compression). A bundler puts the dialogs in files of their own; if you serve the package's files yourself, copy the whole `dist` folder, not only the entry files. If a dialog's code can't be loaded (a dropped connection), the widget says so and tries again the next time it is opened. `widget.setTheme()` now gives the watermark the ink of the new mode, as the theme button does; before, it kept the old one.
