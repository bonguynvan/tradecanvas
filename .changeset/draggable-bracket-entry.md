---
'@tradecanvas/commons': patch
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

feat: draggable bracket order entry

- **Place an entry + stop-loss + take-profit bracket by dragging.**
  `chart.startBracket('buy' | 'sell', entry?)` opens a live preview — an entry
  line plus shaded red (risk) and green (reward) zones with price and R:R
  labels. Drag any of the three lines to retune (entry translates the whole
  bracket; SL/TP clamp to the correct side). Confirm with <kbd>Enter</kbd> /
  `confirmBracket()`, cancel with <kbd>Esc</kbd> / `cancelBracket()`.
- Emits a single typed **`bracketPlace`** event
  (`{ side, entry, stopLoss, takeProfit, riskReward }`) — the chart never places
  orders itself, matching the host-owned trading model.
- Widget: green/red **Long/Short toolbar buttons** start a bracket at the
  latest price; a floating **Place / Cancel** bar appears while placing.
- Core: new `BracketTool` with pure, tested helpers (`computeBracketDefaults`,
  `bracketRiskReward`) housed in the `TradingManager` pointer/render pipeline;
  `InteractionManager` gains an Enter-to-confirm hook.
