# TradeCanvas — Road to v1.0

> Status: **planning → executing**. Current release line: `0.14.0`. Target: a stable, semver-locked **`1.0.0`**.

## The 1.0 story

The JS charting market is bifurcated: free-but-dumb (lightweight-charts v5 still ships **zero** indicators and **zero** drawing tools) vs. expensive-and-closed (Highcharts Stock, SciChart, AnyChart, TradingView's own Charting Library). TradeCanvas is the **only open-source, MIT, zero-dependency library that bundles indicators + drawing tools + a trading overlay + a backtester**.

**Headline:** *"Everything TradingView's paid Charting Library gives you — indicators, drawings, trading — MIT-licensed and zero-dependency."*

Batteries-included is the umbrella; **three pillars** hold it up, and every v1 workstream reinforces one:

| Pillar | What it means | v1 workstreams |
|---|---|---|
| 📈 Trading-first | A real trading surface, not just display | Execution adapter, alerts→automation |
| ⚡ Performance | A number we can point at | Benchmark + LTTB downsampling |
| 🛠️ Developer experience | Extend us without us breaking you | Plugin SDK, more adapters, starter CLI |

## Guiding strategy: broaden additively, freeze the *contracts*

We are broadening before we freeze. The discipline that makes that safe: new chart types / adapters / indicators never create 1.0 regret — but **interfaces** must be right *once*. The contracts we lock at 1.0 and then never break:

- `ExecutionAdapter` (order placement/modify/cancel)
- `DataAdapter` (generalized so any feed plugs in)
- **Plugin SDK** (custom indicators / drawings / chart types / overlays)
- Event names + payload shapes

## Scope

### ✅ In v1
- **Broker/execution adapter** — `ExecutionAdapter` interface + drag-to-*create* orders. Turns the display-only overlay into a trading surface.
- **Public Plugin SDK** — promote `PluginManager` to a documented, *stable* extension contract.
- **More data adapters** — Coinbase, Bybit, Kraken + generic WebSocket + generic REST/polling.
- **Alerts → automation** — webhook / desktop-notification / sound pipeline on `AlertManager`.
- **First-class multi-pane** — resizable, reorderable indicator panes with independent price scales.
- **Mobile/touch gestures** — pinch-zoom, long-press, touch-friendly drawing.
- **Accessibility pass** — keyboard nav, ARIA, focus states, contrast for the widget.
- **`create-tradecanvas` starter** — CLI scaffold + StackBlitz/CodeSandbox templates.
- **Performance** — benchmark harness + published numbers + LTTB downsampling / history virtualization.
- **Freeze & harden** — see Definition of Done.

### ⏭️ Deferred to 1.1
- Published, version-aligned, tested **React / Vue / Svelte** packages (wrappers exist but are `private` and version-drifted).

### 🌙 Deferred to v2
- **WebGL / WebGPU renderer** (1M+ points). Needs the unstable API window that 1.0 closes. WebGPU went fully cross-browser in Jan 2026 — strong v2 headline.

## Phases (dependency-ordered)

Contracts are first because the additive work hangs off them. After Phase 0, the **Batteries/Data**, **Reach/UX**, and **Perf** tracks can run in parallel with the **Trading** track.

- **Phase 0 — Foundation & contracts** *(blocks everything)*
  - [x] Fix version blocker (build-time injection from `package.json`)
  - [x] Lock `ExecutionAdapter` contract + ship `PaperExecutionAdapter` reference (6 tests)
  - [x] Freeze `DataAdapter` contract as-is (generic WS/Polling base adapters → Phase 1)
  - [x] Define the **Plugin SDK** contract + registry — global + constructor + instance (6 tests)
  - [ ] Benchmark harness baseline (measure as we add)
  - [ ] Stand up `commons` test infra (currently 0 tests)
- **Phase 1 — Batteries & data**
  - [x] `WebSocketAdapter` + `PollingAdapter` generic base classes (14 tests)
  - [x] Coinbase (polling) / Bybit (WS) / Kraken (WS) exchange adapters — docs-verified, 15 parser tests
  - [ ] First-class multi-pane (resizable, reorderable, independent scales)
  - [x] Render-time consumption of `ChartTypePlugin` — custom chart types render (6 tests)
  - [ ] Render-time consumption of `OverlayPlugin` (needs a core engine render hook)
- **Phase 2 — Trading surface**
  - [x] `chart.connectExecution(adapter)` wiring (intents → adapter, adapter → render) + `executionError` event (5 tests)
  - [x] Drag-to-create orders — `OrderDraftTool` + `chart.startOrderDraft()`, limit/stop inferred vs market (7 tests)
  - [ ] Alerts → automation (webhook / notification / sound)
- **Phase 3 — Reach & UX** — mobile/touch gestures, accessibility pass.
- **Phase 4 — Performance** — LTTB downsampling + virtualization; publish benchmark numbers.
- **Phase 5 — DX & onboarding** — Plugin SDK docs + examples, `create-tradecanvas`, typed-events cleanup.
- **Phase 6 — Freeze & harden gate** — close DoD, changeset, tag `1.0.0`.

## Definition of Done (the freeze gate for the 1.0 tag)

- [ ] Version blocker fixed; no hardcoded/drifted versions.
- [ ] Public API audited: every export marked **public** or **internal**; barrel pruned.
- [ ] Contracts locked & documented: `ExecutionAdapter`, `DataAdapter`, Plugin SDK, event names.
- [ ] API-freeze cleanups: standardize `replay()` → `startReplay()` (do it now, while breaking is allowed).
- [ ] Test gaps filled: `commons` covered; `library` / `analytics` / widget depth raised.
- [ ] Type-safety: remove `any` event-handler casts (`StreamManager` et al.); drop stray `console.warn`.
- [ ] Build hygiene: `sourcemap` + `target` consistent across all package vite configs.
- [ ] Docs: "Stability & Public API" page, migration notes from 0.14, published benchmark page.
- [ ] All CI green; changeset prepared.

## Audit baseline (from v1-readiness pass)

~75% ready. One **BLOCKER** (version mismatch — now fixed). SHOULD-FIX: `commons` 0 tests, `StreamManager` `any` handlers, React/Vue vite config gaps. NICE: `replay()` naming, `console.warn` in `ChartState.ts`. No stubs, no TODOs, no architectural debt. CI / changesets / builds are production-grade.
