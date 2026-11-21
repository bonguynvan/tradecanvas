---
'@tradecanvas/chart': major
'@tradecanvas/core': major
'@tradecanvas/commons': major
---

**Breaking:** `PaperExecutionAdapter` no longer fills a `stopLimit` order at its stop: once the stop is reached it becomes a limit order at its `price`, and fills only within that limit. `TimeInForce` has three more members (`'gtd'`, `'ioc'`, `'fok'`), which code that handles every member needs.

Orders say more: `ocoGroup` names a group of which one cancels the others (the paper account cancels the rest when one fills, and the tags read OCO), and `timeInForce` takes `'gtd'` with an `expireTime`, `'ioc'` and `'fok'`. `new PaperExecutionAdapter({ positions: 'net' })` keeps one net position: fills the same way average in, fills the other way take from it and realise that part, and a larger one turns it round.
