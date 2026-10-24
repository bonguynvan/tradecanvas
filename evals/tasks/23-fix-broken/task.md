---
area: debugging
max_turns: 35
---

`src/main.ts` shows our daily candles with Bollinger Bands, and users report two problems: the candles look scrambled, with dates jumping around on the axis, and the Bollinger Bands never appear. Find and fix both; keep `mount`'s signature and what it returns. The bands should be the usual 20 periods and 2 standard deviations, on the price.
