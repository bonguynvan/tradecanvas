import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishOrder, internalDeps, remoteTagNames, untagged, stageId, approvalSteps, bumped, releaseNotes, firstCommitOf } from './publish-packages.mjs';

const pkg = (name, deps = []) => ({ name, version: '1.0.0', deps });

test('a package goes out after every package it depends on', () => {
  // The order changesets listed them in on the 1.68.1 release: analytics and mcp before commons.
  const pkgs = [
    pkg('@tradecanvas/analytics', ['@tradecanvas/commons']),
    pkg('@tradecanvas/commons'),
    pkg('@tradecanvas/core', ['@tradecanvas/commons']),
    pkg('@tradecanvas/chart', ['@tradecanvas/commons', '@tradecanvas/core']),
    pkg('@tradecanvas/mcp', ['@tradecanvas/commons']),
    pkg('@tradecanvas/react', ['@tradecanvas/chart']),
  ];
  const order = publishOrder(pkgs).map((p) => p.name);
  assert.equal(order.length, pkgs.length);
  for (const p of pkgs) {
    for (const dep of p.deps) {
      assert.ok(order.indexOf(dep) < order.indexOf(p.name), `${dep} before ${p.name}: ${order.join(', ')}`);
    }
  }
});

test('packages with nothing between them keep the order they were listed in', () => {
  const order = publishOrder([pkg('b'), pkg('a'), pkg('c', ['a'])]).map((p) => p.name);
  assert.deepEqual(order, ['b', 'a', 'c']);
});

test('a loop between packages stops the release instead of picking an order', () => {
  assert.throws(() => publishOrder([pkg('a', ['b']), pkg('b', ['a'])]), /a -> b -> a|b -> a -> b/);
});

test('only workspace packages count as dependencies, from dependencies, peers and optionals', () => {
  const manifest = {
    dependencies: { '@tradecanvas/commons': 'workspace:*', lodash: '^4' },
    peerDependencies: { '@tradecanvas/chart': 'workspace:*', react: '>=18' },
    optionalDependencies: { '@tradecanvas/extra': 'workspace:*' },
    devDependencies: { '@tradecanvas/core': 'workspace:*' },
  };
  const workspace = new Set(['@tradecanvas/commons', '@tradecanvas/chart', '@tradecanvas/core', '@tradecanvas/extra']);
  assert.deepEqual(internalDeps(manifest, workspace).sort(), ['@tradecanvas/chart', '@tradecanvas/commons', '@tradecanvas/extra']);
});

test('the tags on origin are read from git ls-remote, peeled tags once', () => {
  const out = [
    'aaa\trefs/tags/@tradecanvas/chart@1.68.1',
    'bbb\trefs/tags/v1.1.0',
    'ccc\trefs/tags/v1.1.0^{}',
    '',
  ].join('\n');
  assert.deepEqual([...remoteTagNames(out)].sort(), ['@tradecanvas/chart@1.68.1', 'v1.1.0']);
});

test('a package on npm without its tag on origin is tagged again, so a rerun after a failure still releases it', () => {
  // commons went out, then mcp failed: the runner's tag for commons was never pushed.
  const onNpm = [
    { name: '@tradecanvas/commons', version: '1.69.0' },
    { name: '@tradecanvas/chart', version: '1.68.1' },
  ];
  const remote = new Set(['@tradecanvas/chart@1.68.1', '@tradecanvas/commons@1.68.1']);
  assert.deepEqual(untagged(onNpm, remote).map((p) => p.name), ['@tradecanvas/commons']);
});

test('the stage id is read from what npm prints after staging', () => {
  assert.equal(stageId('npm notice ...\r\n+ @tradecanvas/commons@1.69.0 (staged with id 4f2a9c)\r\n'), '4f2a9c');
  // An older registry answer has no id: the version is staged, approved on npmjs.com by name.
  assert.equal(stageId('+ @tradecanvas/commons@1.69.0 (staged)\n'), null);
});

test('the approval steps keep the staging order, so no package goes live before one it pins', () => {
  const staged = [
    { name: '@tradecanvas/commons', version: '1.69.0', id: 'a1' },
    { name: '@tradecanvas/core', version: '1.69.0', id: null },
  ];
  assert.deepEqual(approvalSteps(staged), [
    '1. @tradecanvas/commons@1.69.0: npm stage approve a1',
    '2. @tradecanvas/core@1.69.0: on npmjs.com, Staged Packages',
  ]);
});

test('only the packages this commit moved to a new version are staged, so a later push stages nothing again', () => {
  const pkgs = [
    { name: '@tradecanvas/commons', version: '1.69.0' },
    { name: '@tradecanvas/react', version: '1.3.61' },
    { name: '@tradecanvas/new', version: '0.1.0' },
  ];
  const before = new Map([['@tradecanvas/commons', '1.68.1'], ['@tradecanvas/react', '1.3.61']]);
  assert.deepEqual(bumped(pkgs, before).map((p) => p.name), ['@tradecanvas/commons', '@tradecanvas/new']);
});

test("a release's notes are its version's section of the package changelog", () => {
  const md = '# @tradecanvas/commons\n\n## 1.69.0\n\n### Minor Changes\n\n- c2ed723: A feed.\n\n## 1.68.1\n\n## 1.68.0\n';
  assert.equal(releaseNotes(md, '1.69.0'), '### Minor Changes\n\n- c2ed723: A feed.');
  assert.equal(releaseNotes(md, '1.68.1'), '');
  // A checkout on Windows has CRLF line ends.
  assert.equal(releaseNotes(md.replace(/\n/g, '\r\n'), '1.69.0'), '### Minor Changes\n\n- c2ed723: A feed.');
  assert.equal(releaseNotes(md, '9.9.9'), '');
});

test('the tag goes on the commit that set the version, not a later one that left it as it was', () => {
  // Newest first: a docs commit kept 1.69.0, the version commit set it, a revert of an
  // earlier 1.69.0 sits further back and must not be picked.
  const history = [
    { sha: 'docs', version: '1.69.0' },
    { sha: 'bump', version: '1.69.0' },
    { sha: 'prev', version: '1.68.1' },
    { sha: 'old', version: '1.69.0' },
  ];
  assert.equal(firstCommitOf(history, '1.69.0'), 'bump');
  assert.equal(firstCommitOf(history, '1.70.0'), null);
});
