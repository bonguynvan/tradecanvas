---
"@tradecanvas/analytics": patch
---

Fix: `allowShort: false` no longer blocks closing or partially closing an existing long position.

Previously the Backtester rejected **any** sell-side order when `allowShort` was disabled, including the sell that flattens a long. This made `ctx.close()` throw `Error: shorting is disabled` for long-only strategies — exactly the case `allowShort: false` is supposed to support.

The semantics now match expectation: `allowShort: false` means *don't go net short*. A sell order is allowed when:

- The current position is long, AND
- The sell quantity ≤ the long quantity

Sells that would flip net short (e.g. selling 10 when the position is +5) still throw.

```ts
const bt = new Backtester({ initialCash: 10_000, allowShort: false })

bt.run(bars, (ctx) => {
  if (!ctx.position) ctx.placeOrder({ side: 'long', type: 'market', quantity: 5 })
  else                ctx.close()                                                 // ← now works
})
```
