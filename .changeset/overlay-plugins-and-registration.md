---
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Overlay plugins now render, and the plugin registration surface is complete.

- **`OverlayPlugin` render-time consumption** — registered overlays draw each frame on their chosen layer (`main` / `overlay` / `ui`) via a new engine render hook, receiving the live `{ viewport, data, theme }`.
- **Per-chart plugin registration** — `new Chart(el, { plugins: [...] })` and a `chart.plugins` accessor (`register` / `unregister` / `list`) join the existing global `registerPlugin`, completing the global + constructor + instance model.

Docs + demo updated: new Plugins docs page; the realtime page's `DataAdapter` / `ReconnectManager` examples corrected and the new adapters added; the trading page gains live-execution + drag-to-create sections.
