---
"@tradecanvas/chart": patch
---

ChartWidget loads less up front again: the indicators dialog, the command palette and the symbol search load their code the first time one opens, or once the page is idle after the widget is up, like the settings dialogs. `new ChartWidget()` now brings in 385.8 kB of JavaScript gzipped instead of 394.6 kB (1,457 kB instead of 1,491 kB before compression). Letters typed on the chart while the symbol search's code loads are all kept: it opens with every one of them.
