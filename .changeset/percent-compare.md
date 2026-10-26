---
'@tradecanvas/core': patch
'@tradecanvas/chart': minor
---

**A symbol compared in percent reads as a percent, not as a price.** `widget.addCompareSymbol(symbol)` drew the other symbol's percent line on your price axis, so a 0.10 coin compared with a 3,000 coin seemed to trade at about 3,000, and no legend said otherwise. The widget now puts the price scale in percent while a symbol is compared in percent, and back to your scale when the last one goes; a logarithmic, percentage or indexed-to-100 scale is left alone, and a scale you pick while comparing (the status bar, the chart's menu, the settings) is kept. The percent scale is never saved in a layout or a shared link, and the chart's menu and the settings show the scale on screen. The legend lists each symbol compared in percent above the indicators, with its own price and its change in its line's colour at the bar under the cursor, an eye to hide it and a button to take it off; it follows a pan, since the change is counted from the first bar on screen. Each line's label is at its end, where the lines part, not at their shared start.

Every percent line now starts at the chart's close on the first bar on screen, the price a percent scale reads 0% at, so a symbol whose bars begin later reads its own change rather than the chart's move plus its own; on a regular scale such a line now starts level with the first bar on screen. The widget fetches the other symbol's bars as deep as the chart's, and again when the chart loads older bars. Overlay indicator tags on the price axis (an EMA's) read in percent on a percent or indexed scale, as the scale does.

New on `Chart`: `getCompareValues(barIndex?)` gives each compare line's close at a bar and its change in percent as its line reads, with its last close and `stale: true` past its last bar; `setCompareVisible(id, visible)` hides a line and leaves it out of the auto scale. `CompareRenderer.valuesAt` and the `CompareValue` type are what they read.
