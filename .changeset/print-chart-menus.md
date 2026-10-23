---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
---

The chart's right-click menus, rebuilt. The plot's menu adds Paste (drawings copied here or on another chart of the page) and Remove indicators (a comparison with another symbol stays). The price axis's menu has its reset, auto, invert and the left-hand scale; its four modes (regular, logarithmic, percentage, indexed to 100) as one choice; Labels and Lines submenus; an alert at the price; and the settings, open on their Scales tab. The time axis's menu adds the time zone. An entry names the widget's shortcut for it while that key is on, and Alt+R, new, resets the view. Context menus take radio entries, shortcuts and submenus (a click, Enter, the right arrow or a resting pointer opens one; the left arrow or Escape closes it; on a phone its first row leads back), and the wheel scrolls a long menu instead of closing it. New switches: `menu.chart.indicators`, `menu.chart.timezone`, `hotkeys.resetView`. `chart.canPasteDrawings()` says whether there is something to paste (`DrawingManager.canPaste()` in core), and `chart.removeIndicators(ids)` removes several indicators as one undo step.
