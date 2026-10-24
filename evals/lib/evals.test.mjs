import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './frontmatter.mjs';
import { ALLOWED_TOOLS, agentArgs, isInfra, runAgent, summariseRun, surfaceOf } from './agent.mjs';
import { summaryTable } from './report.mjs';
import { forgetSessions, projectDirName } from './workspace.mjs';
import { parseOptions } from './options.mjs';
import { latestRun, regradeRow } from './regrade.mjs';

test('a task file splits into its settings and its prompt', () => {
  const { meta, body } = parseFrontmatter('---\narea: chart\nmax_turns: 25\npackages: [analytics, react]\ntitle: "Live: ticks"\n---\n\nShow the bars.\n');
  assert.deepEqual(meta, { area: 'chart', max_turns: 25, packages: ['analytics', 'react'], title: 'Live: ticks' });
  assert.equal(body, 'Show the bars.');
});

test('a file without settings is all prompt', () => {
  assert.deepEqual(parseFrontmatter('Just a prompt.'), { meta: {}, body: 'Just a prompt.' });
});

test('what an agent opened is sorted by where it came from', () => {
  const cwd = 'C:\\tmp\\ws';
  assert.equal(surfaceOf('C:\\tmp\\ws\\node_modules\\@tradecanvas\\chart\\README.md', cwd), 'readme');
  assert.equal(surfaceOf('C:/tmp/ws/node_modules/@tradecanvas/chart/dist/widget/types.d.ts', cwd), 'types');
  assert.equal(surfaceOf('C:/tmp/ws/node_modules/@tradecanvas/core/dist/index.js', cwd), 'code');
  assert.equal(surfaceOf('C:/tmp/ws/.claude/skills/tradecanvas/references/recipes.md', cwd), 'skill');
  assert.equal(surfaceOf('C:/tmp/ws/src/main.ts', cwd), 'own');
  assert.equal(surfaceOf('C:/tmp/ws/package.json', cwd), 'project');
  assert.equal(surfaceOf('C:/elsewhere/notes.md', cwd), 'outside');
  // The project folder itself, as a search's root.
  assert.equal(surfaceOf('C:\\tmp\\ws', cwd), 'project');
  assert.equal(surfaceOf('C:\\tmp\\ws-other\\x', cwd), 'outside');
});

const STREAM = [
  { type: 'system', subtype: 'init', model: 'claude-sonnet-5-5', mcp_servers: [{ name: 'tradecanvas', status: 'connected' }] },
  { type: 'assistant', message: { content: [
    { type: 'text', text: 'Looking.' },
    { type: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'C:/tmp/ws/node_modules/@tradecanvas/chart/README.md' } },
    { type: 'tool_use', id: 't2', name: 'Read', input: { file_path: 'C:/tmp/ws/node_modules/@tradecanvas/chart/dist/index.d.ts' } },
  ] } },
  { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: '...' }] } },
  { type: 'assistant', message: { content: [
    { type: 'tool_use', id: 't3', name: 'Skill', input: { skill: 'tradecanvas' } },
    { type: 'tool_use', id: 't4', name: 'mcp__tradecanvas__get_indicator', input: { id: 'rsi' } },
    { type: 'tool_use', id: 't5', name: 'Write', input: { file_path: 'C:/tmp/ws/src/main.ts', content: 'x' } },
    { type: 'tool_use', id: 't6', name: 'Bash', input: { command: 'npm run typecheck' } },
  ] } },
  { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't6', content: 'error TS2345', is_error: true }] } },
  {
    type: 'result', subtype: 'success', is_error: false, num_turns: 7, duration_ms: 42_000, total_cost_usd: 0.31,
    modelUsage: { 'claude-sonnet-5-5': { inputTokens: 10, outputTokens: 900, cacheReadInputTokens: 40_000, cacheCreationInputTokens: 8_000, costUSD: 0.31 } },
    permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'npx tsc' } }],
    result: 'Done.',
  },
];

test('a run’s stream gives its turns, tokens, cost and what it looked at', () => {
  const run = summariseRun(STREAM, 'C:/tmp/ws');
  assert.equal(run.turns, 7);
  assert.equal(run.costUsd, 0.31);
  assert.equal(run.durationMs, 42_000);
  assert.equal(run.ok, true);
  assert.deepEqual(run.tokens, { input: 10, output: 900, cacheRead: 40_000, cacheWrite: 8_000, total: 48_910 });
  assert.deepEqual(run.surfaces, { readme: 1, types: 1 });
  assert.deepEqual(run.skills, ['tradecanvas']);
  assert.deepEqual(run.mcpTools, ['get_indicator']);
  assert.equal(run.typechecks, 1);
  assert.deepEqual(run.denied, ['Bash: npx tsc']);
  assert.equal(run.model, 'claude-sonnet-5-5');
});

test('a run cut off before its result says so', () => {
  const run = summariseRun(STREAM.slice(0, 3), 'C:/tmp/ws');
  assert.equal(run.ok, false);
  assert.equal(run.subtype, 'no result');
  assert.equal(run.turns, 1);
});

test('the summary shows each task by arm, and each arm’s totals', () => {
  const rows = [
    { task: 'candles', arm: 'bare', pass: true, score: 1, turns: 6, costUsd: 0.2, tokens: { total: 1000 }, surfaces: { readme: 1 } },
    { task: 'candles', arm: 'bare', pass: false, score: 0.5, turns: 10, costUsd: 0.4, tokens: { total: 3000 }, surfaces: { types: 2 } },
    { task: 'candles', arm: 'skill', pass: true, score: 1, turns: 4, costUsd: 0.1, tokens: { total: 800 }, surfaces: { skill: 1 } },
    // The Skill tool loads SKILL.md without a Read: it counts as opening the skill.
    { task: 'candles', arm: 'skill', pass: true, score: 1, turns: 4, costUsd: 0.1, tokens: { total: 800 }, surfaces: {}, skills: ['tradecanvas'] },
  ];
  const md = summaryTable(rows);
  assert.match(md, /\| candles \| 1\/2 · 8 turns · \$0\.30 \| 2\/2 · 4 turns · \$0\.10 \|/);
  assert.match(md, /\| bare \| 50% \| 0\.75 \| 8 \| \$0\.30 \| 2k \|/);
  assert.match(md, /\| skill \| 100% \| 1\.00 \| 4 \| \$0\.10 \| 1k \|/);
  // How many runs opened each source at least once.
  assert.match(md, /\| bare \| 1\/2 \| 1\/2 \| 0\/2 \| 0\/2 \| 0\/2 \|/);
  assert.match(md, /\| skill \| 0\/2 \| 0\/2 \| 0\/2 \| 2\/2 \| 0\/2 \|/);
});

test('each arm has the same tools, the skill arm the Skill tool besides; one shell on every system', () => {
  const tools = (arm) => {
    const args = agentArgs({ arm, model: 'sonnet', maxTurns: 5, budgetUsd: 1, mcpConfig: 'm.json' });
    const at = args.indexOf('--tools');
    return args[at + 1].split(',');
  };
  assert.deepEqual(tools('bare'), ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash']);
  assert.deepEqual(tools('mcp'), tools('bare'));
  assert.deepEqual(tools('skill'), [...tools('bare'), 'Skill']);
});

test('an agent may read and type-check through the shell, and nothing more', () => {
  assert.ok(ALLOWED_TOOLS.includes('Bash(npm run typecheck)'));
  assert.ok(ALLOWED_TOOLS.includes('Bash(grep:*)'));
  assert.ok(ALLOWED_TOOLS.includes('Bash(sed -n:*)'));
  assert.ok(!ALLOWED_TOOLS.some((t) => /npx|node|npm install|curl|rm|sed:|awk|find|xargs/.test(t)));
  // Reading or searching outside the project needs a grant, so none is given.
  assert.ok(!ALLOWED_TOOLS.includes('Read') && !ALLOWED_TOOLS.includes('Grep') && !ALLOWED_TOOLS.includes('Glob'));
});

test('what a run reaches outside its project is reported', () => {
  const cwd = 'C:/tmp/ws';
  const stream = [
    { type: 'assistant', message: { content: [
      { type: 'tool_use', id: 'a', name: 'Read', input: { file_path: 'C:/tmp/ws/node_modules/@tradecanvas/chart/README.md' } },
      { type: 'tool_use', id: 'b', name: 'Read', input: { file_path: 'D:/github/tradecanvas/evals/tasks/01/reference.ts' } },
      { type: 'tool_use', id: 'c', name: 'Grep', input: { pattern: 'x', path: 'C:\\Users\\me\\.claude' } },
      { type: 'tool_use', id: 'd', name: 'Bash', input: { command: 'cd node_modules/@tradecanvas && ls ../../src' } },
      { type: 'tool_use', id: 'e', name: 'Bash', input: { command: 'ls /d/github/tradecanvas && cat ~/notes.md' } },
      { type: 'tool_use', id: 'f', name: 'Bash', input: { command: 'cd C:/tmp/ws/src && ls' } },
    ] } },
  ];
  assert.deepEqual(summariseRun(stream, cwd).leaks, [
    'Read D:/github/tradecanvas/evals/tasks/01/reference.ts',
    'Grep C:\\Users\\me\\.claude',
    'Bash ls /d/github/tradecanvas && cat ~/notes.md',
  ]);
});

test('a command outside the project that Claude Code refused reached nothing: counted, not listed', () => {
  const stream = [
    { type: 'assistant', message: { content: [
      { type: 'tool_use', id: 'a', name: 'Bash', input: { command: 'ls /c/Users' } },
      { type: 'tool_use', id: 'b', name: 'Bash', input: { command: 'cat ~/notes.md' } },
    ] } },
    { type: 'result', subtype: 'success', is_error: false, num_turns: 3, permission_denials: [{ tool_name: 'Bash', tool_use_id: 'a', tool_input: { command: 'ls /c/Users' } }] },
  ];
  const run = summariseRun(stream, 'C:/tmp/ws');
  assert.deepEqual(run.leaks, ['Bash cat ~/notes.md']);
  assert.equal(run.leaksRefused, 1);
});

test('the summary counts what Claude Code refused, by arm', () => {
  const row = (arm, denied, leaksRefused) => ({ task: 't', arm, pass: true, score: 1, turns: 6, costUsd: 0.2, tokens: { total: 1000 }, surfaces: {}, denied, leaksRefused });
  const md = summaryTable([row('bare', ['Bash: a', 'Bash: b'], 1), row('bare', [], 0), row('skill', ['Bash: c'], 0)]);
  assert.match(md, /Commands refused by Claude Code, a run: bare 1\.0, skill 1\.0\. 1 of them named a path outside the project\./);
});

test('a run that never got going is the setup’s failure, not the agent’s', () => {
  assert.equal(isInfra({ ok: false, turns: 0, subtype: 'no result' }, false), true);
  assert.equal(isInfra({ ok: false, turns: 1, subtype: 'error_during_execution' }, false), true);
  // It worked and wrote an answer, or ran out of turns trying: the agent's.
  assert.equal(isInfra({ ok: false, turns: 30, subtype: 'error_max_turns' }, true), false);
  assert.equal(isInfra({ ok: true, turns: 8, subtype: 'success' }, false), false);
});

test('the setup’s failures stay out of the rates, and are counted', () => {
  const rows = [
    { task: 't', arm: 'bare', pass: true, score: 1, turns: 6, costUsd: 0.2, tokens: { total: 1000 }, surfaces: {} },
    { task: 't', arm: 'bare', pass: false, score: 0, turns: 0, costUsd: 0, tokens: { total: 0 }, surfaces: {}, infra: true },
  ];
  const md = summaryTable(rows);
  assert.match(md, /\| t \| 1\/1 · 6 turns · \$0\.20 \|/);
  assert.match(md, /\| bare \| 100% \| 1\.00 \| 6 \| \$0\.20 \| 1k \|/);
  assert.match(md, /1 run failed in the setup/);
});

test('a run’s leaks show in the summary', () => {
  const rows = [{ task: 't', arm: 'bare', pass: true, score: 1, turns: 6, costUsd: 0.2, tokens: { total: 1000 }, surfaces: {}, leaks: ['Read D:/x'] }];
  assert.match(summaryTable(rows), /Outside the project: t\.bare\.\? Read D:\/x/);
});

test('a wildcard for a folder above the project still names the project; one for the project’s own name doesn’t', () => {
  const cwd = 'C:/tmp/evals/2026-10-24/04-rsi.bare.1';
  const stream = [{ type: 'assistant', message: { content: [
    { type: 'tool_use', id: 'a', name: 'Bash', input: { command: 'cd C:/tmp/evals/*/04-rsi.bare.1/node_modules && ls' } },
    { type: 'tool_use', id: 'b', name: 'Bash', input: { command: 'ls /c/tmp/evals/*/04-rsi.bare.1/src' } },
    // Another run's project (the other arm of the same task) matches this one.
    { type: 'tool_use', id: 'c', name: 'Bash', input: { command: 'ls C:/tmp/evals/*/04*/src' } },
  ] } }];
  assert.deepEqual(summariseRun(stream, cwd).leaks, ['Bash ls C:/tmp/evals/*/04*/src']);
});

test('a run that read or searched the packages’ compiled code is counted', () => {
  const cwd = 'C:/tmp/ws';
  const run = (input, name = 'Bash') => summariseRun([{ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'a', name, input }] } }], cwd).compiled;
  assert.equal(run({ command: 'cd node_modules/@tradecanvas/chart/dist && grep -o "checkAlerts.{0,80}" index.js' }), 1);
  assert.equal(run({ command: 'grep -rn "MARKET_HOSE =" node_modules/@tradecanvas/commons/dist --include=*.js' }), 1);
  assert.equal(run({ pattern: 'followLivePrice', path: 'C:/tmp/ws/node_modules/@tradecanvas/chart/dist', glob: '*.js' }, 'Grep'), 1);
  assert.equal(run({ pattern: 'MARKET_HOSE =', path: 'node_modules/@tradecanvas/commons/dist/index.js' }, 'Grep'), 1);
  // A search of a whole folder, types and code alike, says nothing of which the agent was after.
  assert.equal(run({ pattern: 'followLivePrice', path: 'node_modules/@tradecanvas/chart/dist' }, 'Grep'), 0);
  assert.equal(run({ file_path: 'C:/tmp/ws/node_modules/@tradecanvas/react/dist/index.js' }, 'Read'), 1);
  // The types, the project's own files, and code written through the shell are not.
  assert.equal(run({ file_path: 'C:/tmp/ws/node_modules/@tradecanvas/chart/dist/Chart.d.ts' }, 'Read'), 0);
  assert.equal(run({ pattern: 'x', path: 'node_modules/@tradecanvas/chart/dist', glob: '*.d.ts' }, 'Grep'), 0);
  assert.equal(run({ command: 'cat package.json tsconfig.json' }), 0);
  assert.equal(run({ command: "cat > src/main.ts <<'EOF'\nimport { x } from './util.js';\nEOF" }), 0);
});

test('the summary counts the runs that went to the compiled code', () => {
  const rows = [
    { task: 't', arm: 'bare', pass: true, score: 1, turns: 6, costUsd: 0.2, tokens: { total: 1000 }, surfaces: {}, compiled: 3 },
    { task: 't', arm: 'bare', pass: true, score: 1, turns: 6, costUsd: 0.2, tokens: { total: 1000 }, surfaces: {}, compiled: 0 },
  ];
  assert.match(summaryTable(rows), /\| Arm \| readme \| types \| code \| skill \| mcp \|\n\|---\|---\|---\|---\|---\|---\|\n\| bare \| 0\/2 \| 0\/2 \| 1\/2 \| 0\/2 \| 0\/2 \|/);
});

const ROW = { task: 't', arm: 'skill', run: 1, pass: false, score: 0.5, costUsd: 1.5, turns: 4, tampered: false, infra: false, leaks: ['old'] };
const GRADED = { pass: true, score: 1, typecheck: { ok: true, errors: [] }, error: null, checks: [{ name: 'a', pass: true }] };
const RUN_EVENTS = [
  { type: 'system', subtype: 'init', cwd: 'C:\\tmp\\evals\\then\\t.skill.1', model: 'm' },
  { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'a', name: 'Read', input: { file_path: 'C:\\tmp\\evals\\then\\t.skill.1\\node_modules\\@tradecanvas\\chart\\README.md' } }] } },
  { type: 'result', subtype: 'success', is_error: false, num_turns: 9, total_cost_usd: 0.07, permission_denials: [] },
];

test('a run graded again: the new grade, its figures read again from where it ran, its cost as charged', () => {
  const row = regradeRow(ROW, { events: RUN_EVENTS, grade: () => GRADED });
  assert.equal(row.pass, true);
  assert.equal(row.score, 1);
  assert.deepEqual(row.failed, []);
  assert.equal(row.turns, 9);
  // The paths in its stream are its project's, wherever the results are now.
  assert.deepEqual(row.surfaces, { readme: 1 });
  assert.deepEqual(row.leaks, []);
  // A run cut off was charged its budget: the charge stands.
  assert.equal(row.costUsd, 1.5);
});

test('a run graded again stays failed if it changed its setup; a setup failure and a missing answer keep their grade', () => {
  assert.deepEqual(regradeRow({ ...ROW, tampered: true }, { events: RUN_EVENTS, grade: () => GRADED }).pass, false);
  assert.equal(regradeRow({ ...ROW, tampered: true }, { events: RUN_EVENTS, grade: () => GRADED }).score, 0);
  const infra = { ...ROW, infra: true };
  assert.equal(regradeRow(infra, { events: RUN_EVENTS, grade: () => GRADED }), infra);
  const unanswered = regradeRow(ROW, { events: RUN_EVENTS, grade: null });
  assert.equal(unanswered.pass, false);
  assert.equal(unanswered.turns, 9);
});

test('the run to grade again is the latest that finished, not the latest folder', () => {
  const root = join(tmpdir(), 'tc-evals-latest');
  rmSync(root, { recursive: true, force: true });
  for (const [name, done] of [['2026-10-24T10-00-00', true], ['2026-10-24T11-00-00', true], ['2026-10-24T12-00-00', false]]) {
    mkdirSync(join(root, name), { recursive: true });
    if (done) writeFileSync(join(root, name, 'runs.jsonl'), '{}\n');
  }
  assert.equal(latestRun(root), join(root, '2026-10-24T11-00-00'));
  assert.throws(() => latestRun(join(root, 'none')), /no finished run/);
  rmSync(root, { recursive: true, force: true });
});

test('the options are numbers in range, or the run stops before it starts', () => {
  assert.deepEqual(parseOptions(['--runs', '3', '--concurrency', '2']).runs, 3);
  assert.throws(() => parseOptions(['--runs', 'two']), /--runs/);
  assert.throws(() => parseOptions(['--concurrency', '0']), /--concurrency/);
  assert.throws(() => parseOptions(['--max-cost-usd', '-1']), /--max-cost-usd/);
  assert.throws(() => parseOptions(['--arms', 'bare,web']), /arm "web"/);
});

test('a session folder is removed only for an eval workspace', () => {
  assert.equal(projectDirName('C:\\Users\\me\\AppData\\Local\\Temp\\tc-evals\\run-1'), 'C--Users-me-AppData-Local-Temp-tc-evals-run-1');
  assert.equal(projectDirName('/tmp/tc-evals/run_1'), '-tmp-tc-evals-run-1');
  assert.throws(() => forgetSessions(''), /eval workspace/);
  assert.throws(() => forgetSessions('relative/ws'), /eval workspace/);
  assert.throws(() => forgetSessions('C:\\Users\\me\\project'), /eval workspace/);
});

const FAKE = join(dirname(fileURLToPath(import.meta.url)), 'fake-agent.mjs');

test('the agent’s stream is read whole, across chunk edges and in any script', async () => {
  const run = await runAgent({ command: process.execPath, args: [FAKE, 'stream'], cwd: tmpdir(), prompt: 'x', transcript: join(tmpdir(), 'fake-agent.jsonl'), timeoutMs: 10_000 });
  assert.equal(run.exitCode, 0);
  assert.deepEqual(run.events.map((e) => e.type), ['system', 'assistant', 'result']);
  assert.equal(run.events[1].message.content[0].text, 'Giá đã cập nhật ✓'.slice(0, 15));
});

test('an agent that hangs is stopped at the time limit', async () => {
  const started = Date.now();
  const run = await runAgent({ command: process.execPath, args: [FAKE, 'hang'], cwd: tmpdir(), prompt: 'x', transcript: join(tmpdir(), 'fake-agent.jsonl'), timeoutMs: 800 });
  assert.ok(Date.now() - started < 8000);
  assert.equal(run.timedOut, true);
});

test('an agent that cannot start is a result, not a crash', async () => {
  const run = await runAgent({ command: join(tmpdir(), 'no-such-claude'), args: [], cwd: tmpdir(), prompt: 'x', transcript: join(tmpdir(), 'fake-agent.jsonl'), timeoutMs: 2000 });
  assert.equal(run.events.length, 0);
  assert.match(run.stderr, /ENOENT|not found|cannot/i);
});
