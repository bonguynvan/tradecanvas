---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
"@tradecanvas/react": minor
"@tradecanvas/vue": minor
"@tradecanvas/svelte": minor
---

Replay for apps. During `chart.replayStart()` signal markers and trade zones show as the replay reaches them (a trade drawn open until its exit; `revealMarks: false` shows them all). `startTime` starts at a time, `hideHistory` leaves the bars before the start out until `replayStop()`, and `duration` plays to the end in about that long however many bars: a replay quicker than a bar a frame runs on animation frames, several bars a frame, and a late frame slows it rather than skip ahead. New `replayComplete` event; `replayStep` gives the `total`. The widget's replay reveals them too (`replayRevealMarks: false` shows them all). The React, Vue and Svelte components take `indicators` as `{ id, params, position }` too (`syncIndicators` is exported), open no stream with `data` at mount or `stream={false}`, and follow `features` after mount.
