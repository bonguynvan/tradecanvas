---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

No more emoji or symbol characters as icons: the alert line's bell, the alert notice, the pinned tooltip, trade zones' direction, the drawing favourites' star, the palette's search, checks, keys and close buttons, and the replay controls all come from the TradeCanvas icon set, which moves to commons (`UI_ICONS`, `iconSvg`) so the chart's canvas draws it too (`drawIcon` in core). New icons: pin, search, enter, step back, step forward. `widget.toast(message, kind, icon)` takes an icon's name.
