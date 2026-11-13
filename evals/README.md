# Evals

Coding agents use TradeCanvas through what ships with it: the package's types
and README, the [skill](../skills/tradecanvas), the
[MCP server](../packages/mcp). They don't remember the library, can't see the
chart, and learn by running and fixing. These evals measure how often an
agent gets a real task right, and what it took: they show where the docs,
the types, the errors or the API trip it, and whether the skill and the MCP
server help.

## What a run is

An agent (Claude Code, headless) gets one task in a fresh TypeScript project
with TradeCanvas installed from the packed packages, as npm installs them.
It writes `src/main.ts` with the tools Read, Glob, Grep, Write, Edit and a
shell that may only read (`ls`, `cat`, `grep`, `sed -n`…) and run
`npm run typecheck`; no web, no PowerShell, no subagents, and no edits to
the project's setup (`package.json`, `tsconfig.json`, `.claude`,
`node_modules`). Then the answer is graded:

1. **Types**: a strict `tsc` with the grader's own tsconfig.
2. **Behaviour**: the answer runs under jsdom with a real chart, and the
   task's checks read it back through the library's public getters
   (`getData`, `getActiveIndicators`, `getAlerts`, `getOrders`…). The
   network is stubbed and recorded: an answer that reaches for an exchange
   is seen.

A run passes when it type-checks and every check passes; its score counts
the type check as one check among the task's. A run that changed the
project's setup fails. A run that never got going (the agent couldn't
start, a rate limit) is the setup's failure: counted apart, out of the
rates, and three in a row stop the run.

Each task runs in **arms**:

| Arm | The agent has |
|---|---|
| `bare` | the npm package only (`dist`, its `.d.ts` files, README) |
| `skill` | the same, and the skill as a project skill (`.claude/skills/tradecanvas`) |
| `mcp` | the same as `bare`, and the TradeCanvas MCP server |

Nothing of the person running the evals reaches the agent: no CLAUDE.md, no
memory, none of their plugins, skills, hooks or MCP servers. TypeScript and
React come from a copy outside the repo, so nothing in the project points
at the reference answers. Claude Code refuses a path outside the project;
what a run tried there is counted in the summary, and what got through is
listed.

## Running

```bash
pnpm build
pnpm eval:check     # each grader passes the right answers and fails the wrong ones; free, in CI
pnpm eval:check --pack   # the same in projects installed from the packed packages
pnpm eval           # the agents: costs money, on your Claude Code login
pnpm eval:regrade   # a finished run's answers through the graders as they are now; free
```

`pnpm eval` takes:

| Option | Default | |
|---|---|---|
| `--tasks 01,07` | all | tasks whose folder names contain these |
| `--arms bare,skill,mcp` | `bare,skill` | |
| `--runs 2` | `2` | runs per task and arm |
| `--model sonnet` | `sonnet` | |
| `--concurrency 2` | `1` | agents at once (one rate limit) |
| `--budget-usd 1.5` | `1.5` | the most one run may spend |
| `--max-cost-usd 20` | `20` | no run starts past this total |
| `--keep` | off | keep each run's project and its sessions |
| `--no-preflight` | off | skip checking every grader in installed projects before the first agent |

Results go to `evals/results/<time>/` (not committed): `summary.md` (pass
rate, turns, cost and tokens by task and arm, which sources the agents
opened, what Claude Code refused them), `runs.jsonl`, each run's transcript
and answer. A grader fixed after a run grades its answers again with
`pnpm eval:regrade [evals/results/<time>]`, into `regraded.md` beside them:
with the graders and the packages as this repo has them now (built, and
linked rather than packed), so a library fixed since grades the old answers
against the new code.

The runs worth keeping are in [baselines](baselines): the first,
[2026-10-24](baselines/2026-10-24-sonnet.md), is what the fixes are
measured against; [2026-10-25](baselines/2026-10-25-sonnet.md) is the same
run after the first nine, and [its Haiku run](baselines/2026-10-25-haiku.md)
the first with a smaller model (`--model haiku`), which takes more turns
and reads the compiled code more, so a gap shows sooner;
[a later one](baselines/2026-10-25-haiku-after-types.md) runs only the
tasks a fix touched (`--tasks`), to see what it changed. The latest,
[2026-11-13](baselines/2026-11-13-sonnet.md), is the whole run again on 2.1.1.
What the evals turned up so far is in [FINDINGS.md](FINDINGS.md).

## The recommendation probe

The tasks above start with TradeCanvas installed. The probe asks the
question before that one: when someone asks for a trading chart and names
no library, does the model pick TradeCanvas? The prompts are in
[`probe/prompts.mjs`](probe/prompts.mjs), and none names a chart library (a
test checks). Each runs in an empty folder outside the repo, with nothing
of yours, in an arm:

| Arm | The model has | Its pick |
|---|---|---|
| `memory` | no tools: what it learned in training | the `PICK:` line it is asked to end with |
| `search` | web search and fetch, and is told to look first | the same |
| `build` | file tools, and sets up a project | the chart library in the `package.json` it writes |

```bash
pnpm eval:probe                                  # every arm and prompt, twice, with Sonnet
pnpm eval:probe --models sonnet,opus,haiku --arms memory,search --prompts svelte,replay --runs 3
```

A prompt is `generic` (what anyone building a trading chart asks) or
`feature` (it asks for what TradeCanvas does well: replay, a full widget,
self-hosting without attribution, Vietnamese price limits); the summary
reports them apart, since a pick on a feature prompt says little about the
generic question. `--prompts` matches part of an id (`react` is both
`react-crypto` and `build-react`).

It takes `--concurrency` (3, at most 8), `--budget-usd` per run (0.5; a
build run gets three times that) and `--max-cost-usd` (10), which stops new
runs once passed but lets the ones under way finish, and counts nothing for
a run that timed out. Every arm, prompt and model twice cost about $6 on
2026-11-08. Results go to `evals/results/probe-<time>/`: `summary.md` (how
often TradeCanvas is picked and named, by model, arm and focus, and what
was picked instead), `runs.jsonl` with each answer, and the transcripts.
Run it now and then: the `memory` arm moves only when a model is trained
again, `search` and `build` move with what the web says. The first run, on
Sonnet, Opus and Haiku, is [the baseline](baselines/2026-11-08-probe.md):
TradeCanvas was picked once in 138 runs. To compare other
assistants by hand, paste a prompt with the line the probe adds: `Recommend
one library. On the last line of your answer write PICK: <npm package name>.`

## A task

A folder of `tasks/`:

- `task.md`: settings between `---` fences (`area`, `max_turns`, `packages:
  [analytics, react]`, `entry: src/main.tsx`), then the request as a user
  writes it. Name what the code must export and what it gets, never the
  library's API: finding that is what is measured.
- `check.mjs`: `args({ fixtures })` gives `mount` its arguments after the
  host; `setup({ env, fixtures })` runs first (`env.serve(url => body)`
  answers requests); `mountWith({ answer, host, ws, … })` mounts what isn't
  a `mount` function (a React component); `checks` is a list of
  `[name, (context) => …]`, each passing unless it throws or returns false.
- `reference.ts`: a right answer. `pnpm eval:check` runs it through the
  checks.
- `right-*.ts`: right answers written another way (another API, seconds
  instead of milliseconds, updates batched into a frame): the checks must
  pass them too, or they wrong the agent.
- `wrong-*.ts`: the mistakes an agent makes, each of which the checks must
  catch.
- `seed/`: files the project starts with (a task that fixes a bug).

The fixtures (`lib/fixtures.mjs`) are seeded: every run sees the same bars.
