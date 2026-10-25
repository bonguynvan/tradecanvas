# 2026-10-25: Haiku on the tasks findings 10 to 13 touched

[The morning's Haiku run](2026-10-25-haiku.md) again on the eight tasks
whose gaps findings 10 to 13 closed (indicator ids and inputs in the types,
field notes in the `.d.ts`, the style keys, the widget's switches): what the
fixes changed.

- `main` with PR #158 merged, the code released as 1.49.0; model
  `claude-haiku-5-5`, Claude Code headless.
- Tasks 03, 04, 09, 13, 18, 21, 23 and 24 × 2 arms × 2 runs: 32 runs,
  $0.32 in all. No run failed in the setup, none timed out.
- `pnpm eval --tasks 03,04,09,13,18,21,23,24 --arms bare,skill --runs 2 --model haiku --concurrency 2`.

## What it shows

- **Without the skill, the types now carry what the agents went to the
  compiled code for.** A task took 15 turns against 20 (−24%) and 340k
  tokens against 473k (−28%), and 5 runs of 16 read the compiled code
  against 11. The indicator tasks gained most: 03 (21 turns → 13), 24
  (25 → 15), 23 (20 → 12).
- **With the skill, every run passed and none read the compiled code**
  (15 of 16 passed and 2 read it before). Turns stayed about the same, 12
  against 11.5; task 04 took 17 against 12, within the noise of two runs.
- **What the 5 runs without the skill still read the compiled code for**
  is finding 15: what `getIndicatorOutput` returns (04), and what
  `replayStart`'s `startIndex` means (13).

## Results, the same eight tasks

| Arm | Passed | Turns | Tokens | Cost a run | Compiled code |
|---|---|---|---|---|---|
| bare, before | 16/16 | 19.6 | 473k | $0.015 | 11/16 |
| bare, after | 16/16 | 14.8 | 340k | $0.012 | 5/16 |
| skill, before | 15/16 | 11.5 | 203k | $0.009 | 2/16 |
| skill, after | 16/16 | 12.1 | 199k | $0.008 | 0/16 |

Turns a task, before → after:

| Task | skill | bare |
|---|---|---|
| 03-indicator-panes | 9 → 10 | 21 → 13 |
| 04-rsi-value | 12 → 17 | 28 → 17 |
| 09-chart-look | 14 → 16 | 13 → 13 |
| 13-replay | 13 → 11 | 23 → 21 |
| 18-widget-ladder | 12 → 11 | 16 → 16 |
| 21-react-component | 13 → 11 | 12 → 14 |
| 23-fix-broken | 9 → 12 | 20 → 12 |
| 24-indicator-on-indicator | 12 → 11 | 25 → 15 |

Claude Code refused 1.6 shell commands a run without the skill and 0.8
with it.
