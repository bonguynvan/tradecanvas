---
"@tradecanvas/react": major
"@tradecanvas/vue": major
"@tradecanvas/svelte": major
---

First public release of the framework wrapper components.

`@tradecanvas/react`, `@tradecanvas/vue`, and `@tradecanvas/svelte` are no longer private — thin, reactive `<TradeCanvas>` components around `@tradecanvas/chart` with props for symbol / timeframe / theme / chart type / indicators / data / adapter / signal markers / trade zones, proper lifecycle cleanup, and access to the underlying `Chart` (for drawings, trading, execution adapters, plugins, resizable panes) via `onReady` / ref / `bind:chart`. Pinned to `@tradecanvas/chart@^1`.
