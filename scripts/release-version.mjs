// The release's version step (CI only): with changesets waiting on main, sets
// the versions they ask for, dates the root changelog, commits that to main and
// tells the workflow which commit to pack and publish. There is no version pull
// request: merging a pull request with a changeset is the release.
//
//   node scripts/release-version.mjs            version, commit, push; writes `sha` to $GITHUB_OUTPUT
//   node scripts/release-version.mjs --dry-run  says what it would version; changes nothing
//
// A push that lands on main while this runs makes the push here fail: it then
// starts again from the new main, a few times, since that push's own run waits
// behind this one and would find the same changesets.
import { execFileSync, execSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** The package whose version heads the root changelog's sections. */
const CHANGELOG_PACKAGE = '@tradecanvas/chart';
const UNRELEASED = '## Unreleased';
/** How many times the version commit is made again on a main that moved. */
const PUSH_ATTEMPTS = 3;
const BOT = ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com'];

/**
 * The changesets a release has to version: the `.md` files in `.changeset`
 * (the README aside), less the ones pre mode has versioned already, which it
 * keeps on disk until the mode is left.
 */
export function pendingChangesets(files, pre) {
  const done = new Set(pre?.mode === 'pre' ? pre.changesets ?? [] : []);
  return files
    .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .map((f) => f.slice(0, -'.md'.length))
    .filter((name) => !done.has(name))
    .sort();
}

/**
 * The root changelog with its `Unreleased` section headed by the version
 * that releases it, `## 1.2.3 (2026-01-31)`. As given when there is no such
 * section, or the version has a section already.
 */
export function dateChangelog(markdown, version, date) {
  const nl = markdown.includes('\r\n') ? '\r\n' : '\n';
  const lines = markdown.split(nl);
  const at = lines.indexOf(UNRELEASED);
  if (at === -1 || lines.some((line) => line === `## ${version}` || line.startsWith(`## ${version} `))) return markdown;
  lines[at] = `## ${version} (${date})`;
  return lines.join(nl);
}

/** The versions that changed between two readings of the workspace, as `name@version`. */
export function newVersions(before, after) {
  return after.filter((p) => before.find((b) => b.name === p.name)?.version !== p.version);
}

/** Run a tool and return its output; on Windows pnpm and npm are .cmd files, which only a shell starts. */
function run(command, args, cwd = ROOT) {
  const opts = { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' };
  if (process.platform !== 'win32') return execFileSync(command, args, opts);
  return execSync([command, ...args.map((a) => `"${a}"`)].join(' '), opts);
}

function readPre() {
  const file = join(ROOT, '.changeset', 'pre.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

function readVersions() {
  return readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(ROOT, 'packages', d.name, 'package.json')))
    .map((d) => JSON.parse(readFileSync(join(ROOT, 'packages', d.name, 'package.json'), 'utf8')))
    .filter((m) => !m.private)
    .map((m) => ({ name: m.name, version: m.version }));
}

/** Whether npm has this version; asked of the registry each time, not of npm's cache. */
function onRegistry(p) {
  try {
    return run('npm', ['view', `${p.name}@${p.version}`, 'version', '--json', '--prefer-online']).trim() !== '';
  } catch {
    return false;
  }
}

function pending() {
  return pendingChangesets(readdirSync(join(ROOT, '.changeset')), readPre());
}

/** Set the versions and date the changelog in the working tree; the versions that changed. */
function version() {
  const before = readVersions();
  run('pnpm', ['changeset', 'version']);
  const changed = newVersions(before, readVersions());
  // A version npm has already is main behind npm (a version commit taken back
  // after its release began): publishing would skip it, and its changes with it.
  const taken = changed.filter(onRegistry);
  if (taken.length > 0) {
    throw new Error(`release: ${taken.map((p) => `${p.name}@${p.version}`).join(', ')} already on npm; main is behind what was published`);
  }
  const head = changed.find((p) => p.name === CHANGELOG_PACKAGE);
  const file = join(ROOT, 'CHANGELOG.md');
  if (head && existsSync(file)) {
    const text = readFileSync(file, 'utf8');
    writeFileSync(file, dateChangelog(text, head.version, new Date().toISOString().slice(0, 10)));
  }
  return changed;
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function main() {
  const waiting = pending();
  if (waiting.length === 0) {
    console.log('release: no changesets waiting');
    output('sha', run('git', ['rev-parse', 'HEAD']).trim());
    return;
  }
  console.log(`release: versioning ${waiting.join(', ')}`);
  if (process.argv.includes('--dry-run')) return;
  for (let attempt = 1; ; attempt++) {
    const changed = version();
    run('git', ['add', '-A']);
    run('git', [...BOT, 'commit', '-m', 'chore: version packages']);
    try {
      run('git', ['push', 'origin', 'HEAD:main']);
      console.log(`release: ${changed.map((p) => `${p.name}@${p.version}`).join(', ')}`);
      break;
    } catch (err) {
      if (attempt >= PUSH_ATTEMPTS) throw err;
      console.log('release: main moved; versioning again on it');
      run('git', ['fetch', 'origin', 'main']);
      run('git', ['reset', '--hard', 'origin/main']);
      if (pending().length === 0) break;
    }
  }
  output('sha', run('git', ['rev-parse', 'HEAD']).trim());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (err) {
    console.error(err.stderr ? `${err.message}\n${err.stderr}` : err.message);
    process.exit(1);
  }
}
