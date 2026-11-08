---
'@tradecanvas/chart': patch
---

A toolbar whose width is a fraction of a pixel (a widget in half of a 1535 px grid is 767.5 px wide) no longer folds every button under "more". Once collapsed, "more" sits right at the end of the room, which the fit counted as a pixel past it, so the fit kept folding and switched to icons: your buttons on the left folded too, with half the bar empty.
