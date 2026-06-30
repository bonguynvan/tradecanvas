---
"@tradecanvas/commons": minor
"@tradecanvas/chart": minor
---

Add `chart.connectExecution(adapter)` — wire an `ExecutionAdapter` into the chart to make the trading overlay live. The chart routes its emitted order/position intents (`orderPlace`, `orderModify`, `orderCancel`, `positionModify`, `positionClose`) into the adapter's commands, and renders the authoritative `orders` / `positions` the adapter emits back. The adapter is the single source of truth. `disconnectExecution()` and `getExecutionAdapter()` round out the API.

- Failures — adapter-reported or a failed command — surface on a single new `executionError` chart event: `chart.on('executionError', (e) => …)`.
- Fully backward-compatible: with no execution adapter connected, the intents remain plain events as before.
- `OrderModifyIntent.previousPrice` is now optional, so the chart's `orderModify` event payload routes straight into an adapter.

Pair with `PaperExecutionAdapter` for a zero-setup live trading sandbox.
