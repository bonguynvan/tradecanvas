/** Where a run looked, in the order the report shows them. */
export const SURFACES = ['readme', 'types', 'skill', 'mcp'];

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const money = (usd) => `$${usd.toFixed(2)}`;
const thousands = (n) => `${Math.round(n / 1000)}k`;

function groupBy(rows, key) {
  const groups = new Map();
  for (const row of rows) groups.set(row[key], [...(groups.get(row[key]) ?? []), row]);
  return groups;
}

/** A cell: runs passed of runs, mean turns, mean cost. */
function cell(runs) {
  if (!runs?.length) return '—';
  const passed = runs.filter((r) => r.pass).length;
  return `${passed}/${runs.length} · ${Math.round(mean(runs.map((r) => r.turns)))} turns · ${money(mean(runs.map((r) => r.costUsd)))}`;
}

/** Whether a run opened a source at least once: the MCP server by calling a tool of it, the skill also through the Skill tool. */
function looked(run, surface) {
  if (surface === 'mcp') return (run.mcpTools?.length ?? 0) > 0;
  if (surface === 'skill' && run.skills?.includes('tradecanvas')) return true;
  return (run.surfaces?.[surface] ?? 0) > 0;
}

/**
 * The results as Markdown: each task by arm, each arm's totals (pass rate,
 * mean score, turns, cost and tokens), and how many runs opened each source
 * the library offers an agent. Runs that failed in the setup (a rate limit,
 * an agent that couldn't start) are counted apart, out of the rates; what a
 * run reached outside its project is listed.
 */
export function summaryTable(all) {
  const rows = all.filter((r) => !r.infra);
  const infra = all.length - rows.length;
  const leaks = all.filter((r) => r.leaks?.length).map((r) => `- Outside the project: ${r.task}.${r.arm}.${r.run ?? '?'} ${r.leaks.join('; ')}`);
  const notes = [
    ...(infra ? [`${infra} run${infra === 1 ? '' : 's'} failed in the setup, not counted above.`] : []),
    ...leaks,
  ];
  return [table(rows), ...(notes.length ? ['', ...notes] : [])].join('\n');
}

function table(rows) {
  const arms = [...groupBy(rows, 'arm').keys()];
  const lines = [`| Task | ${arms.join(' | ')} |`, `|---|${arms.map(() => '---').join('|')}|`];
  for (const [task, runs] of groupBy(rows, 'task')) {
    const byArm = groupBy(runs, 'arm');
    lines.push(`| ${task} | ${arms.map((arm) => cell(byArm.get(arm))).join(' | ')} |`);
  }
  lines.push('', '| Arm | Passed | Score | Turns | Cost | Tokens |', '|---|---|---|---|---|---|');
  for (const [arm, runs] of groupBy(rows, 'arm')) {
    const passed = runs.filter((r) => r.pass).length / runs.length;
    lines.push(`| ${arm} | ${Math.round(passed * 100)}% | ${mean(runs.map((r) => r.score)).toFixed(2)} | ${Math.round(mean(runs.map((r) => r.turns)))} | ${money(mean(runs.map((r) => r.costUsd)))} | ${thousands(mean(runs.map((r) => r.tokens?.total ?? 0)))} |`);
  }
  lines.push('', `| Arm | ${SURFACES.join(' | ')} |`, `|---|${SURFACES.map(() => '---').join('|')}|`);
  for (const [arm, runs] of groupBy(rows, 'arm')) {
    lines.push(`| ${arm} | ${SURFACES.map((s) => `${runs.filter((r) => looked(r, s)).length}/${runs.length}`).join(' | ')} |`);
  }
  return lines.join('\n');
}
