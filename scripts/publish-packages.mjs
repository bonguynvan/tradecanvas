// The release's publish step, run by the Publish workflow on every push to
// main (and by hand to finish a release that stopped).
//
// Each workspace package not on npm at its version is published, one at a
// time, each after the packages it depends on, and the next waits until the
// one before is live. `changeset publish` sent them all at once, so a package
// could appear before the exact version of a package it pins
// (@tradecanvas/mcp before @tradecanvas/commons on 1.59.3), and
// `npx @tradecanvas/mcp@latest` failed with ETARGET in between.
//
// Each version once live gets its git tag and a GitHub release with its
// changelog section. A version on npm without its tag or its release (a run
// that stopped part way) is finished after the new ones go out, so running it
// again finishes a release, and one that cannot be tagged holds back nothing.
//
// In CI the packing and the publishing are two jobs: installing and building
// run the dependencies' own code, so the job that does it may not publish,
// and the job that publishes installs nothing. Auth is npm trusted
// publishing: npm swaps the job's OIDC token for a one-time token, and
// records provenance on its own. `pnpm pack` writes the tarball (it turns
// `workspace:*` into versions) and `npm publish` sends it (npm 11.5.1 or later).
//
//   node scripts/publish-packages.mjs                    pack, publish, tag and release
//   node scripts/publish-packages.mjs --check            whether there is anything to publish, tag or
//                                                        release (work=true|false in $GITHUB_OUTPUT)
//   node scripts/publish-packages.mjs --pack-to <dir>    pack each version not on npm, listed in packed.json
//   node scripts/publish-packages.mjs --publish-from <dir>  publish what --pack-to packed, tag and release
//   node scripts/publish-packages.mjs --tag-only         tag and release what is on npm; publish nothing
//                                                        (on a machine signed in to git and gh, when
//                                                        Actions may not push a tag)
//   node scripts/publish-packages.mjs --dry-run          pack and dry-run the publishing, no tags
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, existsSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/**
 * How long a new version may take to show on npm before the release stops.
 * npm has taken more than three minutes (1.72.2's commons: about 190 s).
 */
const LIVE_TIMEOUT_MS = 600_000;
const LIVE_POLL_MS = 5_000;
const TARBALL_NAME = /^[\w.-]+\.tgz$/;
const ACCESS = new Set(['public', 'restricted']);

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

/**
 * What a release does, in publishing order: publish the versions not on npm,
 * and finish the ones on npm without their tag on origin or their GitHub
 * release. Every version not on npm goes out, so once a release is done a
 * later push publishes nothing, and a push after a release that was missed
 * publishes it.
 */
export function releasePlan(order, isLive, isReleased) {
  const live = order.filter((p) => isLive(p));
  return {
    tag: live.filter((p) => !isReleased(p)),
    publish: order.filter((p) => !live.includes(p)),
  };
}

/**
 * The tarballs a release packed, in publishing order. Each must be the
 * version its package has in this checkout, so a tarball from another commit
 * never goes out.
 */
export function packedInOrder(packed, order) {
  for (const t of packed) {
    // The list comes from a job that ran the build's tools: it may name a file
    // in its own folder and an npm access, and put nothing else on npm's command line.
    if (!TARBALL_NAME.test(t.file ?? '')) throw new Error(`publish: ${JSON.stringify(t.file)} is not a tarball name`);
    if (!ACCESS.has(t.access)) throw new Error(`publish: ${JSON.stringify(t.access)} is not an npm access`);
    if (!order.some((p) => p.name === t.name && p.version === t.version)) {
      throw new Error(`publish: the tarball of ${t.name}@${t.version} is not a version this checkout has`);
    }
  }
  return order.flatMap((p) => packed.filter((t) => t.name === p.name && t.version === p.version));
}

const TAR_BLOCK = 512;

/**
 * A file's text in a .tgz, or null when it has none. Reads the plain ustar
 * headers npm and pnpm write (the name at 0, the size in octal at 124), so
 * it needs no `tar`, whose GNU build takes `D:\...` for a remote host.
 */
export function fileInTarball(tgz, path) {
  const tar = gunzipSync(tgz);
  for (let at = 0; at + TAR_BLOCK <= tar.length; ) {
    const header = tar.subarray(at, at + TAR_BLOCK);
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/s, '');
    if (!name) break;
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/s, '').trim() || '0', 8);
    const body = at + TAR_BLOCK;
    if (name === path) return tar.subarray(body, body + size).toString('utf8');
    at = body + Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
  }
  return null;
}

/** Whether a release has anything to publish or finish; without, the build and the publishing job are skipped. */
export const hasWork = (plan) => plan.tag.length > 0 || plan.publish.length > 0;

/** Runs `fn` on each item in turn; one that throws does not stop the rest. Gives back the failures. */
export async function eachSettled(items, fn) {
  const failures = [];
  for (const item of items) {
    try {
      await fn(item);
    } catch (error) {
      failures.push({ item, error });
    }
  }
  return failures;
}

/**
 * Resolves once `check` says yes, asking every `pollMs`; throws after
 * `timeoutMs`, so a version that never shows stops the release before the
 * packages that pin it.
 */
export async function waitUntil(check, { timeoutMs, pollMs, what, now = Date.now, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const until = now() + timeoutMs;
  while (!check()) {
    if (now() >= until) throw new Error(`publish: ${what} is not live on npm after ${timeoutMs / 1000} s`);
    await sleep(pollMs);
  }
}

/** A version's section of a changesets CHANGELOG.md, without its heading; empty when it has none. */
export function releaseNotes(markdown, version) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf(`## ${version}`);
  if (start === -1) return '';
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
}

/**
 * The npm dist-tag a version is published under, or null for `latest`: a
 * prerelease takes its own name (`2.0.0-beta.0` is `beta`), `next` when it
 * has only a number, so `npm install` goes on giving the last full release.
 */
export function distTag(version) {
  const pre = /^\d+\.\d+\.\d+-([0-9A-Za-z-]+)/.exec(version);
  if (!pre) return null;
  return /^[A-Za-z]/.test(pre[1]) ? pre[1].toLowerCase() : 'next';
}

/**
 * Why a release cannot go out as it stands, or null. In changesets' pre mode
 * every version is a prerelease and takes the mode's dist-tag; out of it none
 * is. Anything else is a version PR merged half way into or out of pre mode,
 * and would put a prerelease on `latest` or a full release under `beta`.
 */
export function preModeProblem(packages, pre) {
  const inPre = pre?.mode === 'pre';
  for (const p of packages) {
    const tag = distTag(p.version);
    if (inPre && tag !== pre.tag) return `${p.name}@${p.version} is not a ${pre.tag} prerelease, and .changeset/pre.json is in pre mode`;
    if (!inPre && tag) return `${p.name}@${p.version} is a prerelease, and .changeset/pre.json is not in pre mode`;
  }
  return null;
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
 * Whether npm has this exact version. A 404 means
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

/** Whether GitHub has a release for this tag. */
function hasRelease(name) {
  try {
    run('gh', ['release', 'view', name, '--json', 'tagName']);
    return true;
  } catch (err) {
    if (/release not found/i.test(`${err.stderr}`)) return false;
    throw err;
  }
}

/** The tag (see `tagTarget`), pushed, and its GitHub release with the changelog section, each unless it is there. */
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
  if (hasRelease(name)) {
    console.log(`publish: tagged ${name}; its GitHub release was there`);
    return;
  }
  const changelog = join(p.dir, 'CHANGELOG.md');
  const notes = existsSync(changelog) ? releaseNotes(readFileSync(changelog, 'utf8'), p.version) : '';
  const notesDir = mkdtempSync(join(tmpdir(), 'tc-notes-'));
  try {
    const notesFile = join(notesDir, 'notes.md');
    writeFileSync(notesFile, notes || `${name}`);
    const args = ['release', 'create', name, '--verify-tag', '--title', name, '--notes-file', notesFile];
    // A prerelease is marked as one, and is not the repository's latest release.
    if (distTag(p.version)) args.push('--prerelease');
    run('gh', args);
  } finally {
    rmSync(notesDir, { recursive: true, force: true });
  }
  console.log(`publish: tagged and released ${name}`);
}

const PACKED_LIST = 'packed.json';

/** Packs each package into `dir` and lists the tarballs in `packed.json`. */
function packAll(pkgs, dir) {
  mkdirSync(dir, { recursive: true });
  const packed = pkgs.map((p) => {
    console.log(`publish: packing ${p.name}@${p.version}`);
    return { name: p.name, version: p.version, access: p.access, file: basename(pack(p, dir)) };
  });
  writeFileSync(join(dir, PACKED_LIST), `${JSON.stringify(packed, null, 2)}\n`);
  return packed;
}

/** npm publishes the manifest inside the tarball, so it must be the package and version listed. */
function checkTarball(file, p) {
  const text = fileInTarball(readFileSync(file), 'package/package.json');
  if (text === null) throw new Error(`publish: ${basename(file)} has no package/package.json`);
  const manifest = JSON.parse(text);
  if (manifest.name !== p.name || manifest.version !== p.version) {
    throw new Error(`publish: ${basename(file)} holds ${manifest.name}@${manifest.version}, not ${p.name}@${p.version}`);
  }
}

/** Publishes each tarball in turn and, once it is live, tags and releases its version. */
async function publishPacked(packed, dir, order, dryRun) {
  for (const t of packedInOrder(packed, order)) {
    const p = order.find((o) => o.name === t.name);
    if (!dryRun && onRegistry(p)) {
      console.log(`publish: ${p.name}@${p.version} is on npm already`);
      continue;
    }
    console.log(`publish: ${p.name}@${p.version}`);
    checkTarball(join(dir, t.file), p);
    const args = ['publish', join(dir, t.file), '--access', t.access];
    const tag = distTag(p.version);
    if (tag) args.push('--tag', tag);
    if (dryRun) args.push('--dry-run');
    process.stdout.write(run('npm', args));
    if (dryRun) continue;
    await waitUntil(() => onRegistry(p), { timeoutMs: LIVE_TIMEOUT_MS, pollMs: LIVE_POLL_MS, what: `${p.name}@${p.version}` });
    // If tagging fails, the version is on npm without its tag: the next run tags it.
    tagAndRelease(p);
  }
}

/** Tags and releases the versions on npm a release never finished; one that fails does not stop the rest. */
async function finish(pkgs) {
  const failures = await eachSettled(pkgs, (p) => {
    console.log(`publish: ${p.name}@${p.version} is on npm without its tag or GitHub release`);
    tagAndRelease(p);
  });
  if (failures.length > 0) {
    throw new Error(failures.map(({ item, error }) => `${item.name}@${item.version}: ${error.stderr || error.message}`).join('\n'));
  }
}

function argAfter(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  const value = process.argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`publish: ${flag} needs a folder`);
  // pnpm pack runs in each package's folder, so a relative path would land there.
  return resolve(value);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const order = publishOrder(readWorkspace());
  const remoteTags = remoteTagNames(run('git', ['ls-remote', '--tags', 'origin']));
  const isReleased = (p) => !untagged([p], remoteTags).length && hasRelease(`${p.name}@${p.version}`);

  const plan = releasePlan(order, onRegistry, isReleased);
  // A prerelease goes out under its own dist-tag (`distTag`): what is waiting must agree with the mode.
  const preFile = join(ROOT, '.changeset', 'pre.json');
  const problem = preModeProblem(plan.publish, existsSync(preFile) ? JSON.parse(readFileSync(preFile, 'utf8')) : null);
  if (problem) throw new Error(`publish: ${problem}`);
  // In CI, before the install: whether this push has anything to do.
  if (process.argv.includes('--check')) {
    const work = hasWork(plan);
    console.log(work ? `publish: ${plan.publish.length} to publish, ${plan.tag.length} to tag or release` : 'publish: nothing to publish, tag or release');
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `work=${work}\n`);
    return;
  }

  // Packing runs the build's tools; it has no npm or git rights of its own.
  const packTo = argAfter('--pack-to');
  if (packTo) {
    packAll(plan.publish, packTo);
    console.log(plan.publish.length ? `publish: packed ${plan.publish.length} into ${packTo}` : 'publish: every version is on npm already');
    return;
  }

  if (process.argv.includes('--tag-only')) {
    for (const p of plan.publish) console.log(`publish: ${p.name}@${p.version} is not on npm; left for a release`);
    await finish(plan.tag);
    return;
  }

  // From the tarballs a packing job made, or packed here when run by hand.
  const from = argAfter('--publish-from');
  const dir = from ?? mkdtempSync(join(tmpdir(), 'tc-publish-'));
  try {
    const packed = from ? JSON.parse(readFileSync(join(dir, PACKED_LIST), 'utf8')) : packAll(plan.publish, dir);
    if (packed.length === 0) console.log('publish: every version is on npm already');
    await publishPacked(packed, dir, order, dryRun);
  } finally {
    if (!from) rmSync(dir, { recursive: true, force: true });
  }
  // Last, so a version that cannot be tagged here holds back none of the new
  // ones. A failed publish above skips it; the next run finishes them.
  if (dryRun) {
    for (const p of plan.tag) console.log(`publish: ${p.name}@${p.version} would be tagged and released`);
    return;
  }
  await finish(plan.tag);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err.stderr || err.message);
    process.exit(1);
  });
}
