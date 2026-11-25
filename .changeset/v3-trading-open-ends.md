---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

A take-profit level dragged on the chart, and a paper account that calls margin and stops out. A position's take-profit level is dragged by its line or its tag, as its stop is, and letting go raises `positionModify` with all its `takeProfits`. `PaperExecutionAdapter` takes `marginCallLevel` and `stopOutLevel`: it warns once as the equity falls under the first (`marginCall`) and closes positions under the second, the one losing most first (fills with `reason: 'liquidation'`). `AccountSummary` has `marginLevel`, which the widget's account panel shows. `FillReason` and `ExecutionEventType` each have a new member.
