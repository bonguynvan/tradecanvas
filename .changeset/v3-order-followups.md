---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
---

The widget's order ticket offers IOC and FOK for a limit order, and its account panel writes OCO beside an order of a group and a good-till-date order's date. On the paper account, moving a stop order (`modifyOrder`, a drag of its line) moves its `stopPrice` with its `price`, where it kept waiting at the old stop; a stop-limit's stop and limit move by as much.
