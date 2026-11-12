import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { publishOrder, internalDeps, remoteTagNames, untagged, releasePlan, waitUntil, packedInOrder, eachSettled, hasWork, fileInTarball, releaseNotes, firstCommitOf, tagTarget, distTag } from './publish-packages.mjs';

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

test('a release publishes every version not on npm, in order, and tags the ones on npm without a tag', () => {
  // 1.71.0 went out while releases were staged and was never tagged; react's 1.4.3 is new.
  const order = [
    { name: '@tradecanvas/commons', version: '1.71.0' },
    { name: '@tradecanvas/chart', version: '1.72.0' },
    { name: '@tradecanvas/react', version: '1.4.3' },
    { name: '@tradecanvas/vue', version: '1.4.2' },
  ];
  const live = new Set(['@tradecanvas/commons@1.71.0', '@tradecanvas/vue@1.4.2']);
  const released = new Set(['@tradecanvas/vue@1.4.2']);
  const key = (p) => `${p.name}@${p.version}`;
  const plan = releasePlan(order, (p) => live.has(key(p)), (p) => released.has(key(p)));
  assert.deepEqual(plan.tag.map((p) => p.name), ['@tradecanvas/commons']);
  assert.deepEqual(plan.publish.map((p) => p.name), ['@tradecanvas/chart', '@tradecanvas/react']);
});

test('with every version on npm and tagged, a release does nothing, so a later push publishes nothing again', () => {
  const order = [{ name: '@tradecanvas/commons', version: '1.71.0' }];
  const plan = releasePlan(order, () => true, () => true);
  assert.deepEqual(plan, { tag: [], publish: [] });
});

test('a version tagged on origin whose GitHub release was never made is finished, not skipped', () => {
  const order = [{ name: '@tradecanvas/core', version: '1.71.0' }];
  // The tag went up, then gh release create failed: the release is what is missing.
  const plan = releasePlan(order, () => true, () => false);
  assert.deepEqual(plan.tag.map((p) => p.name), ['@tradecanvas/core']);
});

test('the tarballs packed for a release go out in the order of the workspace, each the version it has now', () => {
  const order = [
    { name: '@tradecanvas/commons', version: '1.72.0' },
    { name: '@tradecanvas/chart', version: '1.72.0' },
  ];
  const packed = [
    { name: '@tradecanvas/chart', version: '1.72.0', access: 'public', file: 'chart.tgz' },
    { name: '@tradecanvas/commons', version: '1.72.0', access: 'public', file: 'commons.tgz' },
  ];
  assert.deepEqual(packedInOrder(packed, order).map((t) => t.file), ['commons.tgz', 'chart.tgz']);
});

test('a tarball of another version than the workspace has stops the release before anything goes out', () => {
  const order = [{ name: '@tradecanvas/commons', version: '1.72.0' }];
  assert.throws(() => packedInOrder([{ name: '@tradecanvas/commons', version: '1.71.0', access: 'public', file: 'x.tgz' }], order), /commons@1.71.0/);
  assert.throws(() => packedInOrder([{ name: '@tradecanvas/other', version: '1.0.0', access: 'public', file: 'y.tgz' }], order), /other@1.0.0/);
});

test('the list a packing job hands over names only a tarball in its folder and an npm access, nothing for the command line', () => {
  const order = [{ name: '@tradecanvas/commons', version: '1.72.0' }];
  const entry = (more) => [{ name: '@tradecanvas/commons', version: '1.72.0', access: 'public', file: 'tradecanvas-commons-1.72.0.tgz', ...more }];
  assert.equal(packedInOrder(entry({}), order).length, 1);
  assert.throws(() => packedInOrder(entry({ file: '../../etc/x.tgz' }), order), /tarball name/);
  assert.throws(() => packedInOrder(entry({ file: 'a.tgz --tag next' }), order), /tarball name/);
  assert.throws(() => packedInOrder(entry({ access: 'public --otp 1' }), order), /access/);
});

test('a push with nothing to publish and nothing to finish skips the build and the publishing job', () => {
  assert.equal(hasWork({ tag: [], publish: [] }), false);
  assert.equal(hasWork({ tag: [{ name: 'a' }], publish: [] }), true);
  assert.equal(hasWork({ tag: [], publish: [{ name: 'a' }] }), true);
});

/** A one-file-at-a-time tar, as npm and pnpm write them: a 512-byte header, then the body padded to 512. */
function tarball(files) {
  const blocks = [];
  for (const [path, text] of files) {
    const body = Buffer.from(text);
    const header = Buffer.alloc(512);
    header.write(path, 0);
    header.write(body.length.toString(8).padStart(11, '0'), 124);
    header.write('0', 156);
    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

test("the manifest npm will publish is read from inside the tarball, not from the list beside it", () => {
  const tgz = tarball([
    ['package/README.md', 'x'.repeat(700)],
    ['package/package.json', '{"name":"@tradecanvas/commons","version":"1.72.0"}'],
  ]);
  assert.deepEqual(JSON.parse(fileInTarball(tgz, 'package/package.json')), { name: '@tradecanvas/commons', version: '1.72.0' });
  assert.equal(fileInTarball(tgz, 'package/missing.json'), null);
});

test('one version that fails to tag does not stop the others, and the failures are given back', async () => {
  const done = [];
  const failures = await eachSettled(['a', 'b', 'c'], async (x) => {
    if (x === 'b') throw new Error('push refused');
    done.push(x);
  });
  assert.deepEqual(done, ['a', 'c']);
  assert.deepEqual(failures.map((f) => [f.item, f.error.message]), [['b', 'push refused']]);
});

test('the next package waits until the one before is live on npm, so none is installed before a version it pins', async () => {
  let t = 0;
  let checks = 0;
  const clock = { now: () => t, sleep: async (ms) => { t += ms; } };
  await waitUntil(() => ++checks === 3, { timeoutMs: 60_000, pollMs: 5_000, ...clock, what: 'commons@1.72.0' });
  assert.equal(checks, 3);
  assert.equal(t, 10_000);
});

test('a version that never shows on npm stops the release instead of publishing what pins it', async () => {
  let t = 0;
  const clock = { now: () => t, sleep: async (ms) => { t += ms; } };
  await assert.rejects(
    waitUntil(() => false, { timeoutMs: 20_000, pollMs: 5_000, ...clock, what: 'commons@1.72.0' }),
    /commons@1.72.0 is not live on npm after 20 s/,
  );
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

test('a version is tagged on main as it is now when its package has not changed since, as Actions may not tag an older workflow', () => {
  // 1.69.0: only CI changed after the version commit, publish.yml among it.
  assert.equal(tagTarget({ versionSha: 'bump', headSha: 'head', changedSince: false }), 'head');
});

test('a version whose package changed since is tagged on its own commit, so the tag holds what was released', () => {
  assert.equal(tagTarget({ versionSha: 'bump', headSha: 'head', changedSince: true }), 'bump');
});

test('a prerelease goes out under its own dist-tag, so latest stays the last full release', () => {
  assert.equal(distTag('2.0.0-beta.0'), 'beta');
  assert.equal(distTag('2.0.0-beta.12'), 'beta');
  assert.equal(distTag('2.0.0-rc.1'), 'rc');
  assert.equal(distTag('2.0.0-0'), 'next');
  assert.equal(distTag('2.0.0'), null);
  assert.equal(distTag('1.84.1'), null);
});
