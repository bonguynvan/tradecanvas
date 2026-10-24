---
area: markets
max_turns: 35
---

Export `mount(host: HTMLElement, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[], reference: number)` and return the chart. `host` already has a size.

The bars are a Vietnamese stock listed on HOSE: daily, oldest first, times in milliseconds, prices in thousands of dong (`25.35` is 25,350 dong). `reference` is yesterday's close. Show it the way Vietnamese traders expect: prices on HOSE's price steps, the day's ceiling and floor from the reference price, the axis in Vietnam's time, and numbers written the Vietnamese way.
