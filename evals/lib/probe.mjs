import { parseArgs } from 'node:util';

/**
 * The probe asks what a model picks for a trading chart when nobody names
 * TradeCanvas. Its arms:
 *
 * - `memory`: no tools, so the answer is what the model learned in training;
 * - `search`: web search and fetch, as a chat assistant answers today;
 * - `build`: it sets up a project in an empty folder, and the pick is the
 *   chart library it puts in package.json.
 */
export const PROBE_ARMS = ['memory', 'search', 'build'];

const ARM_TOOLS = { memory: [], search: ['WebSearch', 'WebFetch'], build: ['Read', 'Glob', 'Write', 'Edit'] };
const ARM_TURNS = { memory: 2, search: 15, build: 20 };

/**
 * Chart libraries by the names an answer gives them, in prose or as a
 * package. A name counts only as a whole word: "recharts" holds "echarts"
 * and is not it. A library missing here still shows in a run's pick as
 * `other: <name>`.
 */
const LIBRARIES = [
  ['tradecanvas', 'trade-?canvas'],
  ['lightweight-charts', 'lightweight[- ]?charts'],
  ['react-financial-charts', 'react-financial-charts|react[- ]stockcharts'],
  ['highcharts', 'highcharts|highstock'],
  ['echarts', 'echarts'],
  ['apexcharts', 'apex ?charts'],
  ['chart.js', 'chart\\.?js'],
  ['recharts', 'recharts'],
  ['plotly', 'plotly'],
  ['d3', 'd3'],
  ['amcharts', 'amcharts'],
  ['anychart', 'anychart'],
  ['klinecharts', 'kline ?charts'],
  ['scichart', 'scichart'],
  ['syncfusion', 'syncfusion'],
  ['dxcharts', 'dxcharts'],
  ['uplot', 'uplot'],
  ['visx', 'visx'],
  ['nivo', 'nivo'],
].map(([id, pattern]) => ({ id, re: new RegExp(`(?<![a-z0-9])(?:${pattern})(?![a-z0-9])`, 'i') }));

/** The library a package or a name is, `other: <name>` when the table has none, null for nothing. */
export function libraryOf(name) {
  const clean = String(name ?? '').trim();
  if (!clean) return null;
  return LIBRARIES.find((l) => l.re.test(clean))?.id ?? `other: ${clean}`;
}

/** The libraries a text names, in the order it first names them, each once. */
export function mentionsOf(text) {
  const found = [];
  for (const lib of LIBRARIES) {
    const at = String(text ?? '').search(new RegExp(lib.re.source, 'i'));
    if (at >= 0) found.push({ id: lib.id, at });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.id);
}

/** An `ask` answer's pick: its last `PICK:` line, read as a library. */
export function pickOf(text) {
  const lines = String(text ?? '').split(/\r?\n/).map((l) => l.match(/PICK:\s*\**\s*(.+)$/i)).filter(Boolean);
  if (!lines.length) return null;
  // The whole line, so a name in two words ("Lightweight Charts") is still read; an unknown one by its first word.
  const raw = lines.at(-1)[1].replace(/[`*"']/g, '').trim();
  // It found nothing that fits: a pick of its own, not a library called "none".
  if (/^none\b/i.test(raw)) return 'none';
  const lib = libraryOf(raw);
  return lib?.startsWith('other: ') ? libraryOf(raw.split(/\s+/)[0].replace(/[.,;]$/, '')) : lib;
}

/** What a project needs whatever chart it draws: not a pick. */
const BOILERPLATE = /^(?:react|react-dom|vue|svelte|typescript|vite|ws|tslib|vitest|jest|prettier|eslint.*|@types\/.+|@vitejs\/.+|@sveltejs\/.+|@typescript-eslint\/.+)$/;

/**
 * A `build` run's pick: the libraries in the package.json it wrote, past the
 * ones every project has; the first chart library the table knows, else the
 * first other one.
 */
export function pickFromPackage(text) {
  let pkg;
  try {
    pkg = text == null ? null : JSON.parse(text);
  } catch {
    pkg = null;
  }
  if (!pkg || typeof pkg !== 'object') return { pick: 'no package.json', deps: [] };
  const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})].filter((n) => !BOILERPLATE.test(n));
  const all = [...new Set(names.map(libraryOf).filter(Boolean))];
  const known = all.filter((l) => !l.startsWith('other: '));
  const others = all.filter((l) => l.startsWith('other: '));
  // d3 is drawn with more often than chosen as the chart: another library beside it is the pick.
  const pick = known.find((l) => l !== 'd3') ?? known[0] ?? others[0] ?? 'none';
  return { pick, deps: [...known, ...others] };
}

/**
 * `claude -p` for an arm. As in the evals, nothing of the person running it
 * reaches the model: no settings but the folder's, no MCP servers; the
 * folder is an empty one outside the repo.
 */
export function probeArgs({ arm, model, budgetUsd }) {
  const tools = ARM_TOOLS[arm];
  return [
    '-p', '--output-format', 'stream-json', '--verbose',
    '--model', model,
    '--max-turns', String(ARM_TURNS[arm]),
    '--max-budget-usd', String(budgetUsd),
    '--permission-mode', 'acceptEdits',
    '--setting-sources', 'project,local',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--tools', tools.join(','),
    ...(tools.length ? ['--allowedTools', ...tools] : []),
  ];
}

function positive(values, name, { integer = false } = {}) {
  const value = Number(values[name]);
  if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
    throw new Error(`probe: --${name} takes a ${integer ? 'whole ' : ''}number above 0, not "${values[name]}"`);
  }
  return value;
}

const list = (value) => value.split(',').map((s) => s.trim()).filter(Boolean);

/** `pnpm eval:probe`'s options, checked. */
export function parseProbeOptions(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      arms: { type: 'string', default: PROBE_ARMS.join(',') },
      models: { type: 'string', default: 'sonnet' },
      prompts: { type: 'string' },
      runs: { type: 'string', default: '2' },
      concurrency: { type: 'string', default: '3' },
      'budget-usd': { type: 'string', default: '0.5' },
      'max-cost-usd': { type: 'string', default: '10' },
    },
  });
  const arms = list(values.arms);
  for (const arm of arms) if (!PROBE_ARMS.includes(arm)) throw new Error(`probe: no arm "${arm}"; the arms are ${PROBE_ARMS.join(', ')}`);
  return {
    arms,
    models: list(values.models),
    prompts: values.prompts ? list(values.prompts) : null,
    runs: positive(values, 'runs', { integer: true }),
    concurrency: Math.min(8, positive(values, 'concurrency', { integer: true })),
    budgetUsd: positive(values, 'budget-usd'),
    maxCostUsd: positive(values, 'max-cost-usd'),
  };
}

const pct = (n, of) => `${n} (${of ? Math.round((n / of) * 100) : 0}%)`;

function tally(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => `${k} ${n}`).join(', ');
}

/**
 * The probe's report: TradeCanvas picked and named, by model, arm and the
 * prompts' focus (a generic question, or one about what TradeCanvas does
 * well, which says less about the generic one); what was picked; each
 * prompt's picks. A run that failed is counted beside its row, not in it.
 */
export function probeSummary(runs, { version, date, skipped = 0 }) {
  const done = runs.filter((r) => !r.error);
  const failed = runs.length - done.length;
  const cost = runs.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
  const focus = (r) => r.focus ?? 'generic';
  const groups = [...new Set(runs.map((r) => `${r.model}\u0000${r.arm}\u0000${focus(r)}`))];
  const rows = groups.map((key) => {
    const [model, arm, f] = key.split('\u0000');
    const all = runs.filter((r) => r.model === model && r.arm === arm && focus(r) === f);
    const of = all.filter((r) => !r.error);
    const picked = of.filter((r) => r.pick === 'tradecanvas').length;
    const named = of.filter((r) => r.mentions?.includes('tradecanvas')).length;
    return `| ${model} | ${arm} | ${f} | ${of.length} | ${all.length - of.length} | ${pct(picked, of.length)} | ${pct(named, of.length)} | ${tally(of.map((r) => r.pick ?? 'no pick'))} |`;
  });
  const prompts = [...new Set(done.map((r) => r.prompt))];
  const byPrompt = prompts.map((p) => {
    const of = done.filter((r) => r.prompt === p);
    return `| ${p} | ${tally(of.map((r) => `${r.arm}: ${r.pick ?? 'no pick'}`))} |`;
  });
  return [
    `# Recommendation probe, ${date}`,
    '',
    `TradeCanvas ${version} on npm. Prompts that name no chart library; how often the model picks TradeCanvas, and how often it names it at all. Generic prompts ask what anyone building a trading chart asks; feature prompts ask for what TradeCanvas does well (replay, a full widget, self-hosting without attribution, Vietnamese price limits, agents), so they show whether it is found when it fits.`,
    '',
    '| Model | Arm | Prompts | Runs | Failed | Picks TradeCanvas | Names TradeCanvas | Picks |',
    '|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
    `Picks overall: ${tally(done.map((r) => r.pick ?? 'no pick'))}.`,
    '',
    '## By prompt',
    '',
    '| Prompt | Picks |',
    '|---|---|',
    ...byPrompt,
    '',
    `${done.length} runs${failed ? `, ${failed} failed` : ''}${skipped ? `, ${skipped} not started (past --max-cost-usd)` : ''}; $${cost.toFixed(2)} in all.`,
    '',
  ].join('\n');
}
