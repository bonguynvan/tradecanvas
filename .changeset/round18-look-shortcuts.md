---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

More of the look by key: `trading.buyColor`, `.sellColor`, `.profitColor`, `.lossColor`, `.entryColor` (orders and positions), `markers.longColor`, `.shortColor`, `.neutralColor` (signal markers), `tradeZones.profitColor`, `.lossColor`, `.activeColor` and `drawings.handleColor`: 101 keys in all. The widget's Settings change the grid each way, the crosshair, the scales, the last price's line, the panes' separator and the legend's text, on the user's layer. `widget.addHotkey({ keys, label, onPress })` adds a shortcut of your own (by the letter the keyboard layout types, not while typing or composing text), replacing a widget shortcut on the same keys and listed in the shortcut sheet, which now leaves out the keys that do nothing. The widget's CSS hooks (`--tcw-*`, `data-tcw-part`, `data-tcw-off`, `data-host-button`, `data-host-item`) are stable through 1.x.
