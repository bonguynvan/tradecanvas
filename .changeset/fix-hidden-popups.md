---
"@tradecanvas/commons": patch
"@tradecanvas/core": patch
"@tradecanvas/chart": patch
"@tradecanvas/analytics": patch
---

Fix widget popups that could not be closed (Price Alerts panel, bracket bar). Their `display: flex` rule silently overrode the `hidden` attribute's `display: none`, so calling `el.hidden = true` left them on screen. Added a namespaced normalize rule that forces `hidden` to win for every `tcw-`-prefixed widget element, fixing the current cases and future-proofing the rest.

Also fix the Price Alerts form overflowing the panel: its grid inputs/selects now get `width: 100%; min-width: 0; box-sizing: border-box` so they shrink to their column instead of spilling past the panel edge.
