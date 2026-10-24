// The eval: coding agents (Claude Code, headless) do each task in a fresh
// project, in each arm, and their answers are graded. After `pnpm build`:
//
//   pnpm eval [--tasks 01,03] [--arms bare,skill,mcp] [--runs 2] [--model sonnet]
//             [--concurrency 2] [--budget-usd 1.5] [--max-cost-usd 20] [--keep] [--no-preflight]
//
// Each run is a full agent session on your own Claude login, and costs money.
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadTasks } from './lib/tasks.mjs';
import { REPO, createWorkspace, fingerprint, forgetSessions, packAll, stageDevTools } from './lib/workspace.mjs';
import { agentArgs, isInfra, runAgent, summariseRun } from './lib/agent.mjs';
import { grade } from './lib/grade.mjs';
import { verifyTask } from './lib/verify.mjs';
import { summaryTable } from './lib/report.mjs';
import { parseOptions } from './lib/options.mjs';

const AGENT_TIMEOUT_MS = 15 * 60_000;
/** Setup failures in a row (a rate limit, a logged-out CLI) that stop the run: the rest would fail the same way. */
const INFRA_STREAK_LIMIT = 3;

let opts;
try {
  opts = parseOptions(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
const tasks = await loadTasks(opts.tasks);
const version = JSON.parse(readFileSync(join(REPO, 'packages', 'library', 'package.json'), 'utf8')).version;

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const out = join(REPO, 'evals', 'results', stamp);
const root = join(tmpdir(), 'tradecanvas-evals', stamp);
for (const dir of ['transcripts', 'answers']) mkdirSync(join(out, dir), { recursive: true });
console.log(`TradeCanvas ${version} · ${tasks.length} tasks × ${opts.arms.join('/')} × ${opts.runs} · ${opts.model} · results in ${out}`);
const tarballs = packAll(join(root, 'tgz'));
const staged = stageDevTools(join(root, 'tools'));

/**
 * Before any agent: every task's answers through its grader, in a project
 * installed as the agents' will be. A setup that breaks (an install, a
 * grader) breaks here, for nothing, not after an hour of paid runs.
 */
if (opts.preflight) {
  const broken = [];
  for (const task of tasks) {
    for (const o of verifyTask(task, join(root, 'preflight', task.id), { tarballs, staged })) {
      if (!o.ok) broken.push(`${task.id}: ${o.name} ${o.expect === 'pass' ? 'fails' : 'passes'} (${o.result.error ?? o.result.typecheck?.errors?.[0] ?? o.result.checks?.find((c) => !c.pass)?.name ?? ''})`);
    }
  }
  rmSync(join(root, 'preflight'), { recursive: true, force: true });
  if (broken.length) {
    console.error(`Preflight: the graders don't hold in installed projects; no agent was run.\n${broken.join('\n')}`);
    process.exit(1);
  }
  console.log('Preflight: every grader holds in installed projects.');
}

// Run by run, then task by task, the arms side by side: a cost ceiling stops every arm at the same place.
const jobs = [];
for (let n = 1; n <= opts.runs; n++) for (const task of tasks) for (const arm of opts.arms) jobs.push({ task, arm, n });

let spent = 0;
let infraStreak = 0;
const rows = [];

function record(row) {
  appendFileSync(join(out, 'runs.jsonl'), `${JSON.stringify(row)}\n`);
  rows.push(row);
  infraStreak = row.infra ? infraStreak + 1 : 0;
}

async function runJob({ task, arm, n }) {
  const name = `${task.id}.${arm}.${n}`;
  const ws = join(root, name);
  try {
    const { mcpConfig, mcpTools } = createWorkspace({ ws, task, arm, tarballs, staged });
    const before = fingerprint(ws);
    const args = agentArgs({ arm, model: opts.model, maxTurns: task.maxTurns, budgetUsd: opts.budgetUsd, mcpConfig, mcpTools });
    const { events, exitCode, stderr, timedOut } = await runAgent({ cwd: ws, args, prompt: task.prompt, transcript: join(out, 'transcripts', `${name}.jsonl`), timeoutMs: AGENT_TIMEOUT_MS });
    const agent = summariseRun(events, ws);
    // A run cut off before its result reports no cost: count what it may have spent.
    const cost = events.some((e) => e.type === 'result') ? agent.costUsd : opts.budgetUsd;
    spent += cost;
    const answer = join(ws, task.entry);
    const answered = existsSync(answer);
    if (answered) copyFileSync(answer, join(out, 'answers', `${name}${task.entry.slice(task.entry.lastIndexOf('.'))}`));
    const tampered = fingerprint(ws) !== before;
    const graded = grade(ws, task);
    const { answer: _text, ...figures } = agent;
    record({
      task: task.id, area: task.area, arm, run: n,
      pass: graded.pass && !tampered, score: tampered ? 0 : graded.score,
      typecheckOk: graded.typecheck.ok, typeErrors: graded.typecheck.errors.slice(0, 5),
      failed: graded.checks.filter((c) => !c.pass).map((c) => (c.detail ? `${c.name}: ${c.detail}` : c.name)), error: graded.error,
      ...figures, costUsd: cost, tampered, timedOut, infra: isInfra(agent, answered),
      exitCode, stderr: agent.ok ? undefined : stderr,
    });
    console.log(`${graded.pass && !tampered ? 'pass' : 'FAIL'} ${name} · score ${graded.score} · ${agent.turns} turns · $${cost.toFixed(2)} · ${agent.subtype}${tampered ? ' · CHANGED ITS SETUP' : ''} · total $${spent.toFixed(2)}`);
  } catch (error) {
    // The harness's own failure (an install, a crash): recorded, and the run goes on.
    record({ task: task.id, area: task.area, arm, run: n, pass: false, score: 0, infra: true, error: String(error?.stack ?? error).slice(0, 1500), turns: 0, costUsd: 0, tokens: { total: 0 }, surfaces: {} });
    console.log(`ERR  ${name} · ${String(error?.message ?? error).split('\n')[0]}`);
  } finally {
    if (!opts.keep) {
      forgetSessions(ws);
      rmSync(ws, { recursive: true, force: true });
    }
  }
}

// A small pool: up to `concurrency` agents at once, none started past the ceiling or after repeated setup failures.
let next = 0;
let stopped = '';
async function worker() {
  while (next < jobs.length) {
    if (spent >= opts.maxCostUsd) stopped ||= `the $${opts.maxCostUsd} ceiling`;
    if (infraStreak >= INFRA_STREAK_LIMIT) stopped ||= `${INFRA_STREAK_LIMIT} setup failures in a row (rate limit, login?)`;
    if (stopped) return;
    await runJob(jobs[next++]);
  }
}
await Promise.all(Array.from({ length: opts.concurrency }, worker));
if (stopped) console.log(`Stopped at ${stopped}: ${jobs.length - next} runs not started.`);

const header = [
  `# TradeCanvas evals, ${stamp.slice(0, 10)}`,
  '',
  `TradeCanvas ${version}, model \`${opts.model}\`, ${opts.runs} run(s) per task and arm, ${rows.length} runs, $${spent.toFixed(2)} in all.${stopped ? ` Stopped at ${stopped}.` : ''}`,
  'A cell: runs passed · mean turns · mean cost. Sources: runs that opened the package README, its types, its compiled code (read or searched), the skill, or called the MCP server.',
  '',
];
writeFileSync(join(out, 'summary.md'), `${header.join('\n')}${summaryTable(rows)}\n`);
if (!opts.keep) rmSync(root, { recursive: true, force: true });
console.log(`\n${summaryTable(rows)}`);
