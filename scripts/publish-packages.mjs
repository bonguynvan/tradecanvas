// A release in two steps, as the npm trusted publishers allow staging only.
//
// Stage (the version PR's merge): the packages this commit moved to a new
// version are staged on npm one at a time, each after the packages it depends
// on, and the order to approve them in is printed. `changeset publish` sent
// them all at once, so a package could appear before the exact version of a
// package it pins (@tradecanvas/mcp before @tradecanvas/commons on 1.59.3),
// and `npx @tradecanvas/mcp@latest` failed with ETARGET in between; approving
// in the printed order keeps that from happening. A maintainer approves each
// with 2FA, on npmjs.com or with `npm stage approve <id>`. Only a commit that
// moved a version stages, so a later push does not stage the same versions
// again while they wait.
//
// Tag (`--tag-only`, the workflow run by hand after approving): each version
// live on npm without its tag gets the tag, on the commit that set the
// version, and a GitHub release with its changelog section. It stages
// nothing, so a version still waiting is reported, not staged twice.
//
// Auth is npm trusted publishing: in GitHub Actions npm swaps the job's OIDC
// token for a one-time token, and records provenance on its own. `pnpm pack`
// writes the tarball (it turns `workspace:*` into versions) and
// `npm stage publish` sends it (npm 11.21 or later).
//
//   node scripts/publish-packages.mjs             stage this commit's versions
//   node scripts/publish-packages.mjs --tag-only  tag and release the approved ones
//   node scripts/publish-packages.mjs --stage-all stage every version not live (by hand;
//                                                 one already waiting is staged again)
//   node scripts/publish-packages.mjs --dry-run   pack and dry-run the staging
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

/** The id npm prints for a staged version, or null when the registry gave none. */
export function stageId(output) {
  return output.match(/\(staged with id ([^)\s]+)\)/)?.[1] ?? null;
}

/** What to approve, in staging order: a package after every one it pins. */
export function approvalSteps(staged) {
  return staged.map((p, i) => {
    const how = p.id ? `npm stage approve ${p.id}` : 'on npmjs.com, Staged Packages';
    return `${i + 1}. ${p.name}@${p.version}: ${how}`;
  });
}

/** The packages whose version differs from the one before this commit; one that was not there counts. */
export const bumped = (pkgs, versionsBefore) => pkgs.filter((p) => versionsBefore.get(p.name) !== p.version);

/** A version's section of a changesets CHANGELOG.md, without its heading; empty when it has none. */
export function releaseNotes(markdown, version) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf(`## ${version}`);
  if (start === -1) return '';
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
}

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
    rel: `packages/${basename(dir)}`,
    deps: internalDeps(manifest, names),
  }));
}

/**
 * Whether npm has this exact version live; a staged one is not. A 404 means
 * no; any other failure stops the release. `--prefer-online` asks the
 * registry each time instead of npm's five-minute cache.
 */
function onRegistry(p) {
  try {
    return run('npm', ['view', `${p.name}@${p.version}`, 'version', '--json', '--prefer-online']).trim() !== '';
  } catch (err) {
    if (/E404|404 Not Found/.test(`${err.stdout}${err.stderr}`)) return false;
    throw err;
  }
}

function pack(p, outDir) {
  const before = new Set(readdirSync(outDir));
  run('pnpm', ['pack', '--pack-destination', outDir], p.dir);
  const made = readdirSync(outDir).find((f) => !before.has(f) && f.endsWith('.tgz'));
  if (!made) throw new Error(`publish: pnpm pack made no tarball for ${p.name}`);
  return join(outDir, made);
}

/** Each package's version in the commit before HEAD (its first parent, so main before a merge). */
function versionsBefore(pkgs) {
  const before = new Map();
  for (const p of pkgs) {
    try {
      before.set(p.name, JSON.parse(run('git', ['show', `HEAD^1:${p.rel}/package.json`])).version);
    } catch {
      // Not there before: a new package, which counts as moved.
    }
  }
  return before;
}

/**
 * In a manifest's history (newest first), the oldest commit of the newest run
 * that has this version: the one that set it. Null when the newest has another.
 */
export function firstCommitOf(history, version) {
  let found = null;
  for (const { sha, version: v } of history) {
    if (v !== version) break;
    found = sha;
  }
  return found;
}

/** The commit that set this version in the manifest; a later commit on main must not carry the tag. */
function versionCommit(p) {
  const path = `${p.rel}/package.json`;
  const shas = run('git', ['log', '--format=%H', '--', path]).trim().split('\n').filter(Boolean);
  const history = [];
  for (const sha of shas) {
    const version = JSON.parse(run('git', ['show', `${sha}:${path}`])).version;
    history.push({ sha, version });
    // Past the first other version the run is over; no need to read further back.
    if (version !== p.version) break;
  }
  const sha = firstCommitOf(history, p.version);
  if (!sha) throw new Error(`publish: no commit sets ${p.name} to ${p.version}`);
  return sha;
}

/**
 * The commit a version's tag goes on: main as it is now while nothing in the
 * package changed after the version's commit (the same files, so the same
 * release), else the version's commit. Actions' token may not push a tag on
 * a commit whose workflows differ from main's, which a version's commit has
 * once a later change touched them (1.69.0, then publish.yml).
 */
export function tagTarget({ versionSha, headSha, changedSince }) {
  return changedSince ? versionSha : headSha;
}

/** Whether a file of the package changed in a commit after `sha`, up to HEAD. */
function packageChangedSince(p, sha) {
  return run('git', ['log', '-1', '--format=%H', `${sha}..HEAD`, '--', p.rel]).trim() !== '';
}

/** The tag (see `tagTarget`), pushed, and its GitHub release with the changelog section. */
function tagAndRelease(p) {
  const name = `${p.name}@${p.version}`;
  if (!run('git', ['tag', '--list', name]).trim()) {
    const versionSha = versionCommit(p);
    const headSha = run('git', ['rev-parse', 'HEAD']).trim();
    run('git', ['tag', name, tagTarget({ versionSha, headSha, changedSince: packageChangedSince(p, versionSha) })]);
  }
  try {
    run('git', ['push', 'origin', `refs/tags/${name}`]);
  } catch (err) {
    // The package changed after its version's commit, and a workflow did too: only a person's credentials may tag there.
    if (/without `workflows?` permission/.test(`${err.stderr}`)) {
      throw new Error(`publish: Actions may not tag ${name} on its version's commit (its workflows differ from main's). Run \`node scripts/publish-packages.mjs --tag-only\` on a machine signed in to git and gh.`);
    }
    throw err;
  }
  const changelog = join(p.dir, 'CHANGELOG.md');
  const notes = existsSync(changelog) ? releaseNotes(readFileSync(changelog, 'utf8'), p.version) : '';
  const notesDir = mkdtempSync(join(tmpdir(), 'tc-notes-'));
  try {
    const notesFile = join(notesDir, 'notes.md');
    writeFileSync(notesFile, notes || `${name}`);
    run('gh', ['release', 'create', name, '--verify-tag', '--title', name, '--notes-file', notesFile]);
  } finally {
    rmSync(notesDir, { recursive: true, force: true });
  }
  console.log(`publish: tagged and released ${name}`);
}

/** Tags and releases each version live on npm without its tag; stages nothing. */
function tagApproved(order) {
  const live = order.filter((p) => onRegistry(p));
  const waiting = order.filter((p) => !live.includes(p));
  const todo = untagged(live, remoteTagNames(run('git', ['ls-remote', '--tags', 'origin'])));
  for (const p of todo) tagAndRelease(p);
  if (todo.length === 0) console.log('publish: every version on npm has its tag');
  for (const p of waiting) {
    console.log(`publish: ${p.name}@${p.version} is not live on npm yet; approve it, then run this again`);
  }
}

function stage(pkgs, dryRun) {
  const staged = [];
  const outDir = mkdtempSync(join(tmpdir(), 'tc-publish-'));
  try {
    for (const p of pkgs) {
      console.log(`publish: staging ${p.name}@${p.version}`);
      const tarball = pack(p, outDir);
      const args = ['stage', 'publish', tarball, '--access', p.access];
      if (dryRun) args.push('--dry-run');
      const out = run('npm', args);
      process.stdout.write(out);
      staged.push({ ...p, id: stageId(out) });
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
    // Printed even when a package fails part way: the ones before it are staged.
    if (!dryRun && staged.length > 0) {
      console.log('\npublish: staged. Approve them in this order, then run the Publish workflow by hand for the tags and GitHub releases:');
      for (const line of approvalSteps(staged)) console.log(`  ${line}`);
    }
  }
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  // Pre mode publishes under its own dist-tag, which this script does not set.
  if (existsSync(join(ROOT, '.changeset', 'pre.json'))) {
    throw new Error('publish: .changeset/pre.json found; prereleases would go out as latest');
  }
  const order = publishOrder(readWorkspace());
  if (process.argv.includes('--tag-only')) {
    tagApproved(order);
    return;
  }
  // A dry run and --stage-all take every version not live yet, staged or not;
  // a release only the versions this commit set.
  const everything = dryRun || process.argv.includes('--stage-all');
  const candidates = everything ? order : bumped(order, versionsBefore(order));
  const pending = candidates.filter((p) => !onRegistry(p));
  if (pending.length === 0) {
    console.log('publish: this commit moved no package to a version that is not on npm; nothing to stage');
    return;
  }
  stage(pending, dryRun);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (err) {
    console.error(err.stderr || err.message);
    process.exit(1);
  }
}
