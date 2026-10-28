---
'@tradecanvas/commons': minor
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

The price limits read on the light theme. With `MARKET_HOSE` or another Vietnamese preset, the REF and FL names were yellow and cyan on the cream background (under 2.5:1), and CE was magenta at 3.3:1. A limit's colour that doesn't read at 4.5:1 on the theme's background is now shaded toward the theme's text until it does, for its line, its name and its axis tag, and the tag's price is written in the background's colour or the text's, whichever reads on it. On the dark theme the colours already read and stay as they were. Themes gain an optional `priceLimits` (`{ ceiling, floor, reference }`), the colours used when the market's colour scheme gives none: the dark theme's are the magenta, cyan and gold the chart drew before, the light theme's deeper shades of them (`DARK_PRICE_LIMITS`, `LIGHT_PRICE_LIMITS`). `contrastRatio`, `readableOn` and `inkOn` are new colour helpers.
