import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingChangesets, dateChangelog, newVersions } from './release-version.mjs';

test('the changesets to version are the files in .changeset, the README and the config aside', () => {
  assert.deepEqual(pendingChangesets(['config.json', 'README.md', 'wide-panes.md', 'axis-tags.md'], null), ['axis-tags', 'wide-panes']);
  assert.deepEqual(pendingChangesets(['config.json'], null), []);
});

test('in pre mode the changesets it versioned already stay on disk and are not waiting', () => {
  const pre = { mode: 'pre', tag: 'beta', changesets: ['airy-defaults', 'one-spelling'] };
  assert.deepEqual(pendingChangesets(['config.json', 'pre.json', 'airy-defaults.md', 'one-spelling.md'], pre), []);
  assert.deepEqual(pendingChangesets(['pre.json', 'airy-defaults.md', 'one-spelling.md', 'new-fix.md'], pre), ['new-fix']);
});

test('leaving pre mode versions every changeset on disk once more', () => {
  const pre = { mode: 'exit', tag: 'beta', changesets: ['airy-defaults'] };
  assert.deepEqual(pendingChangesets(['pre.json', 'airy-defaults.md'], pre), ['airy-defaults']);
});

test('the root changelog’s Unreleased section takes the version and the day', () => {
  const before = '# Changelog\n\n## Unreleased\n\n### Chart\n\n- A fix.\n\n## 1.84.1 (2026-11-12)\n';
  assert.equal(
    dateChangelog(before, '2.0.0-beta.2', '2026-11-13'),
    '# Changelog\n\n## 2.0.0-beta.2 (2026-11-13)\n\n### Chart\n\n- A fix.\n\n## 1.84.1 (2026-11-12)\n',
  );
});

test('a changelog with no Unreleased section, or with the version in it already, is left as it is', () => {
  const none = '# Changelog\n\n## 1.84.1 (2026-11-12)\n';
  assert.equal(dateChangelog(none, '1.84.2', '2026-11-13'), none);
  const twice = '# Changelog\n\n## Unreleased\n\n- More.\n\n## 1.84.2 (2026-11-13)\n';
  assert.equal(dateChangelog(twice, '1.84.2', '2026-11-13'), twice);
  // A heading that only begins like the version is another version.
  const longer = '# Changelog\n\n## Unreleased\n\n- More.\n\n## 1.84.20 (2026-11-13)\n';
  assert.notEqual(dateChangelog(longer, '1.84.2', '2026-11-14'), longer);
});

test('a changelog keeps its line endings', () => {
  const crlf = '# Changelog\r\n\r\n## Unreleased\r\n\r\n- A fix.\r\n';
  assert.equal(dateChangelog(crlf, '1.85.0', '2026-11-13'), '# Changelog\r\n\r\n## 1.85.0 (2026-11-13)\r\n\r\n- A fix.\r\n');
});

test('the versions a release set are the ones that differ from before', () => {
  const before = [{ name: 'a', version: '1.0.0' }, { name: 'b', version: '1.0.0' }];
  const after = [{ name: 'a', version: '1.0.1' }, { name: 'b', version: '1.0.0' }, { name: 'c', version: '0.1.0' }];
  assert.deepEqual(newVersions(before, after), [{ name: 'a', version: '1.0.1' }, { name: 'c', version: '0.1.0' }]);
});
