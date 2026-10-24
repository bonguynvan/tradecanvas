import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { isAbsolute, join } from 'node:path';

/**
 * The tools an agent has, the same in every arm (the skill arm's Skill tool
 * is how the skill reaches it): read, search, write its files, and a shell.
 * One shell on every system (no PowerShell), so runs compare across them.
 */
const TOOLS = ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'];

/** Shell commands that only read, chained as agents chain them: refused, each costs a turn and teaches nothing. */
const READ_ONLY = ['cd', 'ls', 'cat', 'head', 'tail', 'grep', 'wc', 'pwd', 'echo', 'sort', 'cut', 'tr', 'sed -n'];

/**
 * What runs without asking: the type check and the read-only commands. Reads
 * and edits inside the project need no grant; outside it they would, and none
 * is given. No `npx` (it could download), no `node`, nothing that writes
 * through the shell.
 */
export const ALLOWED_TOOLS = ['Bash(npm run typecheck)', ...READ_ONLY.map((command) => `Bash(${command}:*)`)];

/** The project's own setup is not the agent's to change: its scripts, its config, the installed packages. */
const PROTECTED = ['package.json', 'tsconfig.json', '.claude/**', 'node_modules/**'];
export const DISALLOWED_TOOLS = ['WebFetch', 'WebSearch', 'Agent', 'Task', 'PowerShell', ...PROTECTED.flatMap((p) => [`Edit(${p})`, `Write(${p})`])];

/**
 * Nothing of the person running the evals reaches the agent: no CLAUDE.md,
 * no auto memory; with `--setting-sources project,local` their plugins,
 * skills and hooks stay out, and `--strict-mcp-config` keeps their MCP
 * servers out. The arm adds its own (a project skill, an MCP config).
 */
export const CLEAN_ENV = { CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1', CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' };

export function agentArgs({ arm = 'bare', model, maxTurns, budgetUsd, mcpConfig, mcpTools = [] }) {
  const tools = arm === 'skill' ? [...TOOLS, 'Skill'] : TOOLS;
  return [
    '-p', '--output-format', 'stream-json', '--verbose',
    '--model', model,
    '--max-turns', String(maxTurns),
    '--max-budget-usd', String(budgetUsd),
    '--permission-mode', 'acceptEdits',
    '--setting-sources', 'project,local',
    '--strict-mcp-config', '--mcp-config', mcpConfig,
    '--tools', tools.join(','),
    '--allowedTools', ...ALLOWED_TOOLS, ...(arm === 'skill' ? ['Skill'] : []), ...mcpTools,
    '--disallowedTools', ...DISALLOWED_TOOLS,
  ];
}

/** Stop a run and everything it started: on Windows a kill takes only the process itself. */
function killTree(child) {
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 3000).unref();
  }
}

/**
 * Run `claude -p` in `cwd` with the prompt on stdin; the stream is kept in
 * `transcript`. Whatever happens (it can't start, it hangs, it dies) it
 * resolves with the events it got.
 */
export function runAgent({ cwd, args, prompt, transcript, timeoutMs, command = 'claude' }) {
  return new Promise((resolve) => {
    const events = [];
    const out = createWriteStream(transcript);
    let buffer = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    const child = spawn(command, args, { cwd, env: { ...process.env, ...CLEAN_ENV }, stdio: ['pipe', 'pipe', 'pipe'] });
    const finish = (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      pushEvent(events, buffer);
      out.end();
      resolve({ events, exitCode, stderr: stderr.slice(-2000), timedOut });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);
    // Decode as text across chunks: a character split between two chunks stays whole.
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      out.write(chunk);
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) pushEvent(events, line);
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      stderr += String(error?.message ?? error);
      finish(null);
    });
    child.on('close', (code) => finish(code));
    child.stdin.on('error', () => {
      // The agent went before reading its prompt: its exit says why.
    });
    child.stdin.end(prompt);
  });
}

function pushEvent(events, line) {
  if (!line.trim()) return;
  try {
    events.push(JSON.parse(line));
  } catch {
    // A partial or non-JSON line (a warning): not an event.
  }
}

const slashes = (path) => path.replace(/\\/g, '/').replace(/^([A-Z]):/, (_, d) => `${d.toLowerCase()}:`);

/** Where a file an agent opened comes from: the package's README, docs, types or code, the skill, its own work. */
export function surfaceOf(file, cwd) {
  const root = `${slashes(cwd).replace(/\/$/, '')}/`;
  const path = slashes(isAbsolute(file) ? file : join(cwd, file));
  if (`${path.replace(/\/$/, '')}/` === root) return 'project';
  if (!path.startsWith(root)) return 'outside';
  const rel = path.slice(root.length);
  if (rel.startsWith('node_modules/@tradecanvas/')) {
    if (/\/README\.md$/i.test(rel)) return 'readme';
    if (/\.(md|txt)$/i.test(rel)) return 'docs';
    return rel.endsWith('.d.ts') ? 'types' : 'code';
  }
  if (rel.startsWith('.claude/skills/')) return 'skill';
  if (rel.startsWith('src/')) return 'own';
  return 'project';
}

/**
 * Absolute paths in a shell command that aren't in the project: a drive
 * (`C:/…`, `/c/…`), the home folder (`~`), or the root. Relative paths stay
 * in the project or climb out of it only by `..`, which `cd` within the
 * project brings back.
 */
function outsidePaths(command, cwd) {
  const root = slashes(cwd).replace(/\/$/, '');
  const gitBashRoot = root.replace(/^([a-z]):/, '/$1');
  const tokens = command.replace(/\\/g, '/').match(/(?:^|[\s"'=(])((?:[A-Za-z]:\/|\/[a-z]\/|~\/?)[^\s"';|&)]*)/g) ?? [];
  return tokens
    .map((t) => slashes(t.replace(/^[\s"'=(]/, '')))
    .filter((p) => !p.startsWith(root) && !p.startsWith(gitBashRoot));
}

/** What a run reached outside its project: reads and searches, and shell commands that name another place. */
function leaksOf(uses, cwd) {
  const leaks = [];
  for (const use of uses) {
    const input = use.input ?? {};
    if (['Read', 'Glob', 'Grep', 'Write', 'Edit'].includes(use.name)) {
      const path = input.file_path ?? input.path;
      if (path && isAbsolute(path) && surfaceOf(path, cwd) === 'outside') leaks.push(`${use.name} ${path}`);
    } else if (use.name === 'Bash' && outsidePaths(input.command ?? '', cwd).length > 0) {
      leaks.push(`Bash ${input.command}`.slice(0, 300));
    }
  }
  return leaks;
}

const toolUses = (events) => events
  .filter((e) => e.type === 'assistant')
  .flatMap((e) => (e.message?.content ?? []).filter((c) => c.type === 'tool_use'));

function tokensOf(result) {
  const usage = Object.values(result?.modelUsage ?? {});
  const sum = (key) => usage.reduce((total, u) => total + (u[key] ?? 0), 0);
  const tokens = { input: sum('inputTokens'), output: sum('outputTokens'), cacheRead: sum('cacheReadInputTokens'), cacheWrite: sum('cacheCreationInputTokens') };
  return { ...tokens, total: tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite };
}

function count(names) {
  const counts = {};
  for (const name of names) counts[name] = (counts[name] ?? 0) + 1;
  return counts;
}

/**
 * A run in figures, from its stream: turns, tokens, cost, how it ended, and
 * what it looked at (files by source, the skill, the MCP server's tools), how
 * often it type-checked, what it was refused, and what it reached outside
 * its project.
 */
export function summariseRun(events, cwd) {
  const result = events.find((e) => e.type === 'result');
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init');
  const uses = toolUses(events);
  const reads = uses.filter((u) => u.name === 'Read' && u.input?.file_path).map((u) => surfaceOf(u.input.file_path, cwd));
  return {
    ok: Boolean(result) && !result.is_error && result.subtype === 'success',
    subtype: result?.subtype ?? 'no result',
    model: init?.model ?? null,
    turns: result?.num_turns ?? events.filter((e) => e.type === 'assistant').length,
    durationMs: result?.duration_ms ?? null,
    costUsd: result?.total_cost_usd ?? 0,
    tokens: tokensOf(result),
    tools: count(uses.map((u) => u.name)),
    surfaces: count(reads.filter((s) => !['own', 'project', 'outside'].includes(s))),
    skills: uses.filter((u) => u.name === 'Skill').map((u) => u.input?.skill ?? u.input?.command ?? '?'),
    mcpTools: uses.filter((u) => u.name.startsWith('mcp__')).map((u) => u.name.split('__').slice(2).join('__')),
    typechecks: uses.filter((u) => u.name === 'Bash' && /typecheck|\btsc\b/.test(u.input?.command ?? '')).length,
    denied: (result?.permission_denials ?? []).map((d) => `${d.tool_name}: ${d.tool_input?.command ?? JSON.stringify(d.tool_input ?? {})}`),
    leaks: leaksOf(uses, cwd),
    answer: result?.result ?? '',
  };
}

/**
 * A run that never got going (it couldn't start, was refused at the door,
 * hit a rate limit): the setup's failure, kept out of the agent's rates.
 * A run that worked, or ran out of turns trying, is the agent's.
 */
export function isInfra(run, answered) {
  if (run.ok || answered) return false;
  return run.turns <= 1;
}
