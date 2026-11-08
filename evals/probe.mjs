// The recommendation probe: does a model pick TradeCanvas when nobody names
// it? Each prompt (evals/probe/prompts.mjs) goes to Claude Code, headless, in
// an empty folder outside the repo, in each arm:
//
//   pnpm eval:probe [--arms memory,search,build] [--models sonnet,opus] [--prompts react-crypto,svelte]
//                   [--runs 2] [--concurrency 3] [--budget-usd 0.5] [--max-cost-usd 10]
//
// Each run is a session on your own Claude login, and costs money. Results go
// to evals/results/probe-<time>/ (not committed): summary.md, runs.jsonl and
// each run's transcript. Run it again later to see whether the answer moves.
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO } from './lib/workspace.mjs';
import { runAgent, summariseRun } from './lib/agent.mjs';
import { mentionsOf, parseProbeOptions, pickFromPackage, pickOf, probeArgs, probeSummary } from './lib/probe.mjs';
import { ASK_SUFFIX, PROMPTS, SEARCH_SUFFIX } from './probe/prompts.mjs';

const RUN_TIMEOUT_MS = 6 * 60_000;
/** A build writes two files and checks them: it needs more than an answer. */
const BUILD_BUDGET_FACTOR = 3;

let opts;
try {
  opts = parseProbeOptions(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

const version = JSON.parse(readFileSync(join(REPO, 'packages', 'library', 'package.json'), 'utf8')).version;
const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const out = join(REPO, 'evals', 'results', `probe-${stamp}`);
// The folder's path is in what the model sees: it names nothing, or the answer leans on it.
const root = join(tmpdir(), 'chart-probe', stamp);
mkdirSync(join(out, 'transcripts'), { recursive: true });

// `--prompts` matches by part of an id: `react` is react-crypto and build-react.
const prompts = PROMPTS.filter((p) => !opts.prompts || opts.prompts.some((id) => p.id.includes(id)));
// A build prompt runs only in the build arm, an ask prompt in the others.
const jobs = [];
for (const model of opts.models) {
  for (const arm of opts.arms) {
    for (const prompt of prompts.filter((p) => (arm === 'build') === (p.kind === 'build'))) {
      for (let n = 1; n <= opts.runs; n++) jobs.push({ model, arm, prompt, n });
    }
  }
}
if (!jobs.length) {
  console.error(`probe: no runs: no prompt matches --prompts ${opts.prompts?.join(',')} in the arms ${opts.arms.join(', ')} (build prompts run only in build)`);
  process.exit(2);
}
console.log(`Probe · TradeCanvas ${version} · ${jobs.length} runs (${opts.models.join('/')} × ${opts.arms.join('/')} × ${opts.runs}) · results in ${out}`);

let spent = 0;
const runs = [];

async function probe(job) {
  const { model, arm, prompt, n } = job;
  const name = `${model}-${arm}-${prompt.id}-${n}`;
  const cwd = join(root, `app-${jobs.indexOf(job) + 1}`);
  mkdirSync(cwd, { recursive: true });
  const { events, timedOut } = await runAgent({
    cwd,
    args: probeArgs({ arm, model, budgetUsd: arm === 'build' ? opts.budgetUsd * BUILD_BUDGET_FACTOR : opts.budgetUsd }),
    prompt: prompt.kind === 'ask' ? prompt.text + (arm === 'search' ? SEARCH_SUFFIX : '') + ASK_SUFFIX : prompt.text,
    transcript: join(out, 'transcripts', `${name}.jsonl`),
    timeoutMs: RUN_TIMEOUT_MS,
  });
  const run = summariseRun(events, cwd);
  spent += run.costUsd;
  const pkgPath = join(cwd, 'package.json');
  const pkg = existsSync(pkgPath) ? readFileSync(pkgPath, 'utf8') : null;
  const fromPackage = arm === 'build' ? pickFromPackage(pkg) : null;
  const record = {
    model,
    arm,
    prompt: prompt.id,
    focus: prompt.focus,
    n,
    modelId: run.model,
    pick: fromPackage ? fromPackage.pick : pickOf(run.answer),
    deps: fromPackage?.deps,
    mentions: mentionsOf(`${run.answer}\n${pkg ?? ''}`),
    searches: run.tools.WebSearch ?? 0,
    costUsd: run.costUsd,
    turns: run.turns,
    ...(run.ok ? {} : { error: timedOut ? 'timed out' : run.subtype }),
    answer: run.answer,
  };
  appendFileSync(join(out, 'runs.jsonl'), `${JSON.stringify(record)}\n`);
  runs.push(record);
  rmSync(cwd, { recursive: true, force: true });
  console.log(`${name}: ${record.error ?? record.pick ?? 'no pick'}${record.mentions.includes('tradecanvas') ? ' · names TradeCanvas' : ''} · $${run.costUsd.toFixed(3)}`);
}

let next = 0;
let stopped = false;
async function worker() {
  while (next < jobs.length) {
    if (spent >= opts.maxCostUsd) {
      if (!stopped) console.log(`Stopped: $${spent.toFixed(2)} spent, past --max-cost-usd ${opts.maxCostUsd}.`);
      stopped = true;
      return;
    }
    const job = jobs[next++];
    try {
      await probe(job);
    } catch (error) {
      // A run that broke the harness (a folder, a file) is a failed run, not the end of the probe.
      const record = { model: job.model, arm: job.arm, prompt: job.prompt.id, focus: job.prompt.focus, n: job.n, error: String(error?.message ?? error), costUsd: 0 };
      appendFileSync(join(out, 'runs.jsonl'), `${JSON.stringify(record)}\n`);
      runs.push(record);
    }
  }
}
await Promise.all(Array.from({ length: opts.concurrency }, worker));

const summary = probeSummary(runs, { version, date: now.toISOString().slice(0, 10), skipped: jobs.length - next });
writeFileSync(join(out, 'summary.md'), summary);
rmSync(root, { recursive: true, force: true });
console.log(`\n${summary}`);
