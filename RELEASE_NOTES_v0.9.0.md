# v0.9.0 — TradingView-grade interaction + analytics depth

The biggest UX leap since the project started. Every gesture you'd expect from a desktop trading chart is now in the box, the analytics package learned new tricks, and the widget gained the workflow features that separate hobby projects from tools you actually leave open all day.

**[Live demo](https://bonguynvan.github.io/tradecanvas/)** · **[Docs](https://bonguynvan.github.io/tradecanvas/docs/api)** · **[npm](https://www.npmjs.com/package/@tradecanvas/chart)**

## ✨ Chart interaction

If you've used TradingView, your hands will know what to do.

| Gesture | Result |
|---|---|
| Drag price axis ↕ | Compress / expand vertical scale (freezes auto-scale) |
| Drag time axis ↔ | Zoom time axis |
| Double-click axis | Reset (auto-scale / fit content) |
| `Shift` + drag | Measure ruler — bars × time × price Δ × % |
| `Alt` + click | Pin OHLC tooltip; live crosshair shows delta to the pinned bar |
| Hover | Price + time pill labels follow the cursor on both axes |
| `?` | Show the keyboard-shortcut sheet (widget) |

Subtle but immediate: the hovered bar now shows a soft column highlight behind the crosshair, and the price/time axes render with thin tick notches and refined typography instead of heavy per-label rectangles.

## 🪟 Widget upgrades

```ts
const widget = new ChartWidget(host, {
  symbol: 'BTCUSDT',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  adapter: new BinanceAdapter(),

  // New in 0.9
  watchlist: true,           // right-side sparkline panel
  persistLayouts: true,      // per-symbol indicators / drawings / alerts
  // dragDropImport: true (default) — drop CSV / JSON onto the chart
})
```

- **Symbol search** — toolbar symbol-click (or `Ctrl/⌘+P`) opens a fuzzy picker; the cycle-through behavior is gone.
- **Replay scrubber** — toolbar play button toggles a floating bottom bar with play/pause, step, draggable seek, and a 0.5×–100× speed select.
- **Hotkey sheet** — press `?` to see every shortcut categorized.
- **Watchlist sidebar** — last price, % change, mini sparkline per symbol; click a row to switch.
- **Saved layouts** — opt-in `localStorage` persistence: switch symbol, indicators/drawings auto-save; switch back, your setup is restored.
- **CSV / JSON drag-and-drop** — drop an OHLCV file on the chart and it loads. Auto-detects delimiter, headers, ISO 8601 / unix s / unix ms timestamps, and array-vs-object JSON shape.
- **Premium CSS refresh** — Inter + JetBrains Mono stacks, smoother cubic-bezier transitions, focus rings, gradient surfaces, animated `connected` status pulse, refined scrollbars, reduced-motion support.

## 📊 Chart visuals

- **Volume Profile** (off by default) — horizontal histogram of traded volume bucketed by price over the visible range, with point-of-control highlighting. `chart.setVolumeProfileVisible(true)`.
- **Day / week / month dividers** on intraday data, with inline date labels (`Mar 4`, `Apr '26`, `2027`). Auto-suppressed on daily-or-coarser timeframes.

## 📈 Analytics depth

```ts
import {
  Backtester,
  smaCrossStrategy,
  donchianBreakoutStrategy,
  runMonteCarlo,
} from '@tradecanvas/analytics'

const bt = new Backtester({ initialCash: 10_000 })
const result = bt.run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30 }))

// Path-dependence analysis — shuffle trade order 1000 times
const mc = runMonteCarlo(10_000, result.trades, { simulations: 1000, seed: 42 })
console.log(mc.equityBands)              // [{ step, p5, p25, p50, p75, p95 }, …]
console.log(mc.probabilityProfitable)    // 0..1
console.log(mc.worstMaxDrawdownPct)
```

- **Strategy library** — four drop-in `StrategyFn` implementations: SMA cross, RSI mean-reversion, Donchian breakout, Bollinger reversion.
- **Monte Carlo simulation** — shuffles realised trade order N times to expose path-dependence. Tight P5/P95 band = robust edge; wide band = lucky sequencing.

## 🔧 New exports

`AxisDragHandler`, `MeasureOverlay`, `PinnedTooltip`, `VolumeProfileRenderer`, `parseOHLCV`, `DragDropImporter`, plus `Viewport.scalePriceRange(factor)` for custom axis controls.

## ⚠️ Behavioural notes

- **Toolbar symbol click** opens the search modal now (was: cycle through symbols). Same prop, upgraded behavior.
- **`dragDropImport` is on by default** in the widget. Pass `dragDropImport: false` if a parent surface already handles drops.
- **`SessionBreaks`** auto-suppresses its lines on daily-or-coarser timeframes — weekly charts no longer paint a wall of separators.

No API breaks; minor version bump.

## 📦 Packages

- `@tradecanvas/chart` — 0.8.2 → **0.9.0**
- `@tradecanvas/core` — 0.8.2 → **0.9.0**
- `@tradecanvas/commons` — 0.8.2 → **0.9.0**
- `@tradecanvas/analytics` — 0.8.2 → **0.9.0**

330 tests across the four packages. See the [full changelog](https://github.com/bonguynvan/tradecanvas/blob/main/CHANGELOG.md#090-2026-06-02) for the per-export detail.

---

**Full Changelog**: https://github.com/bonguynvan/tradecanvas/compare/v0.8.1...v0.9.0
