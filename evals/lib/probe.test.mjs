import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASK_SUFFIX, PROMPTS, SEARCH_SUFFIX } from '../probe/prompts.mjs';
import { PROBE_ARMS, libraryOf, mentionsOf, parseProbeOptions, pickOf, pickFromPackage, probeArgs, probeSummary } from './probe.mjs';

test('a package or a name is read as the library it is', () => {
  assert.equal(libraryOf('@tradecanvas/chart'), 'tradecanvas');
  assert.equal(libraryOf('TradeCanvas'), 'tradecanvas');
  assert.equal(libraryOf('lightweight-charts'), 'lightweight-charts');
  assert.equal(libraryOf('Lightweight Charts'), 'lightweight-charts');
  assert.equal(libraryOf('highcharts/highstock'), 'highcharts');
  assert.equal(libraryOf('echarts-for-react'), 'echarts');
  assert.equal(libraryOf('chartjs-chart-financial'), 'chart.js');
  assert.equal(libraryOf('klinecharts'), 'klinecharts');
  assert.equal(libraryOf('some-new-lib'), 'other: some-new-lib');
  assert.equal(libraryOf(''), null);
});

test('the libraries an answer names, in the order it names them, each once', () => {
  const text = 'For candles, Lightweight Charts is light; ECharts can too. TradeCanvas adds drawings. lightweight-charts again.';
  assert.deepEqual(mentionsOf(text), ['lightweight-charts', 'echarts', 'tradecanvas']);
  assert.deepEqual(mentionsOf('Use d3 or Chart.js'), ['d3', 'chart.js']);
  // A word that only contains a name is not that name.
  assert.deepEqual(mentionsOf('the address and ordering'), []);
});

test('the pick is the PICK line, the last one if it wrote several', () => {
  assert.equal(pickOf('Long answer.\nPICK: `@tradecanvas/chart`'), 'tradecanvas');
  assert.equal(pickOf('PICK: echarts\n...\n**PICK:** lightweight-charts'), 'lightweight-charts');
  assert.equal(pickOf('No line here, but Highcharts is good.'), null);
  assert.equal(pickOf('Answer.\r\nPICK: Lightweight Charts\r\n'), 'lightweight-charts');
  assert.equal(pickOf('PICK: @antv/g2 because it is flexible'), 'other: @antv/g2');
  assert.equal(pickOf('PICK: none (build it yourself)'), 'none');
});

test('in a project it set up, the pick is the chart library it put in package.json', () => {
  const pkg = JSON.stringify({ dependencies: { react: '^18', 'lightweight-charts': '^4' }, devDependencies: { typescript: '^5' } });
  assert.deepEqual(pickFromPackage(pkg), { pick: 'lightweight-charts', deps: ['lightweight-charts'] });
  assert.deepEqual(pickFromPackage(JSON.stringify({ dependencies: { '@tradecanvas/chart': '*', echarts: '*' } })), { pick: 'tradecanvas', deps: ['tradecanvas', 'echarts'] });
  assert.deepEqual(pickFromPackage(JSON.stringify({ dependencies: { vite: '*', '@types/node': '*' } })), { pick: 'none', deps: [] });
  // A chart library the table lacks is still the pick, not none.
  assert.deepEqual(pickFromPackage(JSON.stringify({ dependencies: { react: '*', '@antv/g2': '*' } })), { pick: 'other: @antv/g2', deps: ['other: @antv/g2'] });
  // d3 beside a chart library: the chart library is the pick.
  assert.equal(pickFromPackage(JSON.stringify({ dependencies: { d3: '*', echarts: '*' } })).pick, 'echarts');
  assert.deepEqual(pickFromPackage(null), { pick: 'no package.json', deps: [] });
  assert.deepEqual(pickFromPackage('{ not json'), { pick: 'no package.json', deps: [] });
});

test('every prompt is neutral: it never names TradeCanvas or a chart library', () => {
  assert.ok(PROMPTS.length >= 10);
  const ids = new Set();
  for (const p of PROMPTS) {
    assert.ok(!ids.has(p.id), p.id);
    ids.add(p.id);
    assert.ok(['ask', 'build'].includes(p.kind), p.id);
    assert.ok(['generic', 'feature'].includes(p.focus), p.id);
    assert.deepEqual(mentionsOf(p.text), [], p.id);
  }
  for (const kind of ['ask', 'build']) {
    for (const focus of ['generic', 'feature']) assert.ok(PROMPTS.some((p) => p.kind === kind && p.focus === focus), `${kind} ${focus}`);
  }
  assert.deepEqual(mentionsOf(ASK_SUFFIX + SEARCH_SUFFIX), []);
});

test('the arms: what each may use', () => {
  assert.deepEqual(PROBE_ARMS, ['memory', 'search', 'build']);
  const tools = (args) => args[args.indexOf('--tools') + 1];
  assert.equal(tools(probeArgs({ arm: 'memory', model: 'sonnet', budgetUsd: 0.3 })), '');
  assert.equal(tools(probeArgs({ arm: 'search', model: 'sonnet', budgetUsd: 0.3 })), 'WebSearch,WebFetch');
  assert.equal(tools(probeArgs({ arm: 'build', model: 'sonnet', budgetUsd: 0.3 })), 'Read,Glob,Write,Edit');
  const build = probeArgs({ arm: 'build', model: 'opus', budgetUsd: 0.5 });
  assert.equal(build[build.indexOf('--model') + 1], 'opus');
  assert.ok(build.includes('--strict-mcp-config'));
  assert.equal(build[build.indexOf('--setting-sources') + 1], 'project,local');
});

test('options: arms, runs and models are checked', () => {
  const o = parseProbeOptions([]);
  assert.deepEqual(o.arms, PROBE_ARMS);
  assert.deepEqual(o.models, ['sonnet']);
  assert.equal(o.runs, 2);
  assert.deepEqual(parseProbeOptions(['--models', 'sonnet,opus', '--arms', 'memory']).models, ['sonnet', 'opus']);
  assert.throws(() => parseProbeOptions(['--arms', 'web']), /no arm "web"/);
  assert.throws(() => parseProbeOptions(['--runs', '0']), /--runs/);
});

test('the summary: how often TradeCanvas is picked and named, by arm, and what was picked instead', () => {
  const runs = [
    { model: 'sonnet', arm: 'memory', prompt: 'a', pick: 'lightweight-charts', mentions: ['lightweight-charts', 'echarts'], costUsd: 0.01 },
    { model: 'sonnet', arm: 'memory', prompt: 'b', pick: 'echarts', mentions: ['echarts'], costUsd: 0.01 },
    { model: 'sonnet', arm: 'search', prompt: 'a', pick: 'tradecanvas', mentions: ['tradecanvas', 'lightweight-charts'], costUsd: 0.05 },
    { model: 'sonnet', arm: 'search', prompt: 'b', pick: 'lightweight-charts', mentions: ['lightweight-charts', 'tradecanvas'], costUsd: 0.05 },
    { model: 'sonnet', arm: 'search', prompt: 'c', error: 'rate limit', costUsd: 0 },
    { model: 'sonnet', arm: 'search', prompt: 'r', focus: 'feature', pick: 'tradecanvas', mentions: ['tradecanvas'], costUsd: 0 },
    { model: 'opus', arm: 'build', prompt: 'b', error: 'error_max_budget_usd', costUsd: 0 },
  ];
  const md = probeSummary(runs, { version: '1.73.2', date: '2026-11-08', skipped: 4 });
  assert.match(md, /\| sonnet \| memory \| generic \| 2 \| 0 \| 0 \(0%\) \| 0 \(0%\) \|/);
  assert.match(md, /\| sonnet \| search \| generic \| 2 \| 1 \| 1 \(50%\) \| 2 \(100%\) \|/);
  assert.match(md, /\| sonnet \| search \| feature \| 1 \| 0 \| 1 \(100%\) \|/);
  // A row whose every run failed still shows.
  assert.match(md, /\| opus \| build \| generic \| 0 \| 1 \| 0 \(0%\) \|/);
  assert.match(md, /lightweight-charts 2/);
  assert.match(md, /2 failed, 4 not started/);
  assert.match(md, /\$0\.12/);
});
