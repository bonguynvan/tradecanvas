---
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Session shading now supports split sessions. `SessionHoursConfig` gains an
optional `windows: SessionWindow[]` — when set, a bar is "in session" only if
it falls inside one of the windows, so a market with a midday recess (e.g. SET's
10:00–12:30 and 14:30–16:30) dims its lunch break the same way pre-/post-market
is dimmed. Without `windows` the single `startMinute`/`endMinute` window is used
exactly as before (fully backward compatible).

```ts
chart.setSessionShadingConfig({
  tzOffsetMinutes: 7 * 60, // ICT
  windows: [
    { startMinute: 10 * 60,      endMinute: 12 * 60 + 30 },
    { startMinute: 14 * 60 + 30, endMinute: 16 * 60 + 30 },
  ],
});
chart.setSessionShadingVisible(true);
```

Each window handles an overnight wrap (`endMinute < startMinute`) independently.
New exports: `SessionWindow` type, `isInWindow` helper. `@tradecanvas/chart` now
also re-exports `SessionShading`, `DEFAULT_SESSION_HOURS`, `SessionHoursConfig`,
and `SessionWindow`.
