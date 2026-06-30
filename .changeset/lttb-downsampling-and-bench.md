---
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Performance: LTTB downsampling for line/area charts, plus a benchmark harness.

- **LTTB downsampling** — `LineRenderer` and `AreaRenderer` automatically downsample the visible range to ~2 points per pixel using Largest-Triangle-Three-Buckets when the bar count far exceeds the pixel width, keeping 100k+ bar line charts smooth. Visually identical, and a no-op at normal zoom. The pure `lttbDownsample` / `lttbVisibleIndices` utilities are exported.
- **Benchmark** — a `pnpm bench` script (vitest bench). Downsampling 100k points to 1,600 runs in ~0.32 ms (3,100/s); 1M in ~2.6 ms — well inside a 16.6 ms frame budget.
