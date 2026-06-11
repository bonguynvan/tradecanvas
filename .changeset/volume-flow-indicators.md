---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: Ease of Movement, Price Volume Trend, and Williams A/D indicators

- `emv` — Ease of Movement (Richard Arms): the bar's midpoint move per unit of
  volume, SMA-smoothed; high = price moving easily, zero-centered.
- `pvt` — Price Volume Trend: a cumulative volume line where each bar's volume
  is weighted by its percent price change (a momentum-aware OBV).
- `wad` — Williams Accumulation/Distribution: cumulative line adding the move
  from the true-range low on up-closes and from the true-range high on
  down-closes; divergence from price flags accumulation/distribution.

All three registered in the indicator menu and unit-tested.
