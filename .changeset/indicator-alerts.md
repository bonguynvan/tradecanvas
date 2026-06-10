---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: indicator-value alerts

- Alerts can now fire on an **indicator line** crossing a level, not just price
  (e.g. "RSI crossing up 70", "MACD histogram crossing 0"). The `AlertManager`
  generalised to per-channel evaluation (`checkChannel`), each alert carrying a
  `channel` (`'price'` or `<instanceId>:<key>`) and a source `label`.
  Indicator-channel alerts don't render as price lines and aren't price-drag
  targets.
- **Chart**: `addAlert(price, condition, message, channel?, label?)`; latest
  indicator values are fed to matching alerts on every update.
- **Widget**: the alerts panel's add-form gains a **source dropdown** listing
  price plus every active indicator line, prefilling the threshold with that
  source's current value; alert rows show the source label.
