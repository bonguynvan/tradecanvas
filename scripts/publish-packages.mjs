// Publishes the workspace packages that are not on npm yet, one at a time,
// each after the packages it depends on, and waits for each to show on the
// registry before the next. `changeset publish` sends them all at once, so a
// package could appear before the exact version of a package it pins
// (@tradecanvas/mcp before @tradecanvas/commons on 1.59.3), and
// `npx @tradecanvas/mcp@latest` failed with ETARGET in between.
//
// Auth is npm trusted publishing: in GitHub Actions npm swaps the job's OIDC
// token for a one-time publish token, and records provenance on its own.
// `pnpm pack` writes the tarball (it turns `workspace:*` into versions), and
// `npm publish` sends it, as trusted publishing needs npm 11.5.1 or later.
//
// For each package published it creates the git tag and prints
// `New tag: <name>@<version>`, the line changesets/action reads to push the
// tag and make the GitHub release, as `changeset publish` did.
//
//   node scripts/publish-packages.mjs            publish
//   node scripts/publish-packages.mjs --dry-run  pack and dry-run, no tags
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** How long a new version may take to show on the registry before the release stops. */
const VISIBLE_TIMEOUT_MS = 180_000;
const VISIBLE_POLL_MS = 5_000;

/** The workspace packages a manifest needs at install time: its dependencies and peers. */
export function internalDeps(manifest, workspaceNames) {
  const names = ['dependencies', 'peerDependencies', 'optionalDependencies'].flatMap((field) => Object.keys(manifest[field] ?? {}));
  return [...new Set(names.filter((n) => workspaceNames.has(n)))];
}

/** Each package after all it depends on; otherwise in the order given. Throws on a loop. */
export function publishOrder(pkgs) {
  const byName = new Map(pkgs.map((p) => [p.name, p]));
  const done = new Set();
  const order = [];
  const visit = (p, path) => {
    if (done.has(p.name)) return;
    if (path.includes(p.name)) throw new Error(`publish: dependency loop ${[...path, p.name].join(' -> ')}`);
    for (const dep of p.deps) {
      const d = byName.get(dep);
      if (d) visit(d, [...path, p.name]);
    }
    done.add(p.name);
    order.push(p);
  };
  for (const p of pkgs) visit(p, []);
  return order;
}

export const tagLine = (p) => `New tag: ${p.name}@${p.version}`;

/** The tag names in `git ls-remote --tags` output; an annotated tag's peeled line counts once. */
export function remoteTagNames(output) {
  const names = output
    .split('\n')
    .map((line) => line.split('\t')[1]?.trim())
    .filter((ref) => ref?.startsWith('refs/tags/'))
    .map((ref) => ref.slice('refs/tags/'.length).replace(/\^\{\}$/, ''));
  return new Set(names);
}

/**
 * The packages on npm whose tag never reached origin: a release that stopped
 * after publishing some (the runner's tags go with it) gets their tags and
 * GitHub releases when it is run again.
 */
export const untagged = (onNpm, remoteTags) => onNpm.filter((p) => !remoteTags.has(`${p.name}@${p.version}`));

/** Run a tool and return its output; on Windows pnpm and npm are .cmd files, which only a shell starts. */
function run(command, args, cwd = ROOT) {
  const opts = { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' };
  if (process.platform !== 'win32') return execFileSync(command, args, opts);
  return execSync([command, ...args.map((a) => `"${a}"`)].join(' '), opts);
}

function readWorkspace() {
  const ignored = new Set(JSON.parse(readFileSync(join(ROOT, '.changeset', 'config.json'), 'utf8')).ignore ?? []);
  const found = readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(ROOT, 'packages', d.name, 'package.json')))
    .map((d) => {
      const dir = join(ROOT, 'packages', d.name);
      return { dir, manifest: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) };
    })
    .filter(({ manifest }) => !manifest.private && !ignored.has(manifest.name));
  const names = new Set(found.map(({ manifest }) => manifest.name));
  return found.map(({ dir, manifest }) => ({
    name: manifest.name,
    version: manifest.version,
    access: manifest.publishConfig?.access ?? 'public',
    dir,
    deps: internalDeps(manifest, names),
  }));
}

/**
 * Whether npm has this exact version. A 404 means no; any other failure stops
 * the release. `--prefer-online` asks the registry each time: npm keeps a
 * package's versions for five minutes, so a cached answer from before a
 * publish would say no until the wait ran out.
 */
function onRegistry(p) {
  try {
    return run('npm', ['view', `${p.name}@${p.version}`, 'version', '--json', '--prefer-online']).trim() !== '';
  } catch (err) {
    if (/E404|404 Not Found/.test(`${err.stdout}${err.stderr}`)) return false;
    throw err;
  }
}

async function waitUntilVisible(p) {
  const until = Date.now() + VISIBLE_TIMEOUT_MS;
  while (!onRegistry(p)) {
    if (Date.now() > until) throw new Error(`publish: ${p.name}@${p.version} not on the registry after ${VISIBLE_TIMEOUT_MS / 1000} s`);
    await new Promise((resolve) => setTimeout(resolve, VISIBLE_POLL_MS));
  }
}

function pack(p, outDir) {
  const before = new Set(readdirSync(outDir));
  run('pnpm', ['pack', '--pack-destination', outDir], p.dir);
  const made = readdirSync(outDir).find((f) => !before.has(f) && f.endsWith('.tgz'));
  if (!made) throw new Error(`publish: pnpm pack made no tarball for ${p.name}`);
  return join(outDir, made);
}

function tag(p) {
  const name = `${p.name}@${p.version}`;
  const existing = run('git', ['tag', '--list', name]).trim();
  if (!existing) run('git', ['tag', name]);
}

function tagAndAnnounce(p) {
  tag(p);
  console.log(tagLine(p));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  // Pre mode publishes under its own dist-tag, which this script does not set.
  if (existsSync(join(ROOT, '.changeset', 'pre.json'))) {
    throw new Error('publish: .changeset/pre.json found; prereleases would go out as latest');
  }
  const order = publishOrder(readWorkspace());
  const pending = order.filter((p) => !onRegistry(p));
  if (!dryRun) {
    const onNpm = order.filter((p) => !pending.includes(p));
    for (const p of untagged(onNpm, remoteTagNames(run('git', ['ls-remote', '--tags', 'origin'])))) {
      console.log(`publish: ${p.name}@${p.version} is on npm without its tag`);
      tagAndAnnounce(p);
    }
  }
  if (pending.length === 0) {
    console.log('publish: every package is on npm already');
    return;
  }
  const outDir = mkdtempSync(join(tmpdir(), 'tc-publish-'));
  try {
    for (const p of pending) {
      console.log(`publish: ${p.name}@${p.version}`);
      const tarball = pack(p, outDir);
      const args = ['publish', tarball, '--access', p.access];
      if (dryRun) args.push('--dry-run');
      process.stdout.write(run('npm', args));
      if (dryRun) continue;
      // If the wait runs out the release stops and these tags are not pushed;
      // the next run finds the package on npm without its tag and tags it then.
      tagAndAnnounce(p);
      await waitUntilVisible(p);
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err.stderr || err.message);
    process.exit(1);
  });
}
