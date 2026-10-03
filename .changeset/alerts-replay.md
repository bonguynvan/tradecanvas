---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Alerts, replay in finer steps, markers and pane scales.**

- **Alerts** take `AlertOptions` (`addAlert(…, options)`): `target` compares
  with another channel (the price crossing a moving average, one indicator
  line crossing another); `movesUp` / `movesDown` with `percent` and `bars`;
  `onBarClose` looks only at closed bars; `expiresAt` ends it (`expired`, the
  `alertExpired` event). Saved layouts and stored alerts keep them. The
  widget's alerts panel offers all of it. Alerts now also check on a
  connected feed's prices, take the lines they watch at the same moment
  (`AlertManager.checkChannels`), and keep watching the live market during
  a replay (alerts on indicator lines wait for it to end). Alert events say
  what an alert watches (`channel`, `label`, `target`, `drawingId`,
  `percent`, `bars`).
- **Replay in finer steps**: `replayStart({ steps })` grows the forming bar
  from finer bars; `replaySeekToBar`, `getReplayBarIndex`. ChartWidget's
  replay bar has a Step menu (finer intervals from the feed or the bars
  loaded).
- **Paper trading in a replay**: `ExecutionAdapter.setMarkPrice?(price,
  time)`; the chart feeds it the replayed prices (each step's low, high
  and close, every step a jump passes) and times, and
  `PaperExecutionAdapter` stamps fills with them. It only goes forward
  (after a seek back it waits until the replay is past where it was), and
  goes back to the live price when the replay ends; a mark with no time
  stamps fills now.
- **Signal markers** react to the pointer: `signalMarkerHover`,
  `signalMarkerClick`, `SignalMarkerManager.markerAt`; ChartWidget shows a
  note by the marker.
- **Pane scales**: `setPaneScale(id, { log, invert })`, `getPaneScale` (log
  works for volume-like panes too: `paneLogRange`, `getPaneValueRange(…, log)`); kept
  in saved layouts; `chartContextMenu` says which pane (`pane`); ChartWidget's
  pane menu has the switches.
