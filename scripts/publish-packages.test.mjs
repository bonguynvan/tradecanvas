import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishOrder, internalDeps, tagLine, remoteTagNames, untagged } from './publish-packages.mjs';

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

test('the tag line is the one the release action reads to make a GitHub release', () => {
  const line = tagLine({ name: '@tradecanvas/chart', version: '1.68.1' });
  assert.equal(line, 'New tag: @tradecanvas/chart@1.68.1');
  // The action's own pattern for a monorepo.
  const m = line.match(/New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/);
  assert.deepEqual([m[1], m[2]], ['@tradecanvas/chart', '1.68.1']);
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
