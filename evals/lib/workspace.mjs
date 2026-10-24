import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** The packages a task can ask for, by their folder under packages/; the chart needs the two below it. */
const PACKAGES = {
  chart: { dir: 'library', name: '@tradecanvas/chart', needs: ['commons', 'core'] },
  commons: { dir: 'commons', name: '@tradecanvas/commons', needs: [] },
  core: { dir: 'core', name: '@tradecanvas/core', needs: ['commons'] },
  analytics: { dir: 'analytics', name: '@tradecanvas/analytics', needs: ['commons'] },
  react: { dir: 'react', name: '@tradecanvas/react', needs: ['chart'] },
};

/**
 * Tools a project has from npm already, taken from the repo's own install
 * (nothing is downloaded), each with the packages it needs in turn.
 */
const DEV_TOOLS = {
  base: ['typescript'],
  react: ['react', 'react-dom', 'scheduler', '@types/react', '@types/react-dom', 'csstype'],
};

/** Where a workspace's sessions live under ~/.claude/projects is named by its path: this marks an eval's. */
const EVAL_ROOT_MARK = 'tradecanvas-evals';

/** The folder Claude Code keeps a project's sessions in: every character but a letter or digit becomes '-'. */
export function projectDirName(path) {
  return path.replace(/[^a-zA-Z0-9]/g, '-');
}

/** Remove the sessions a run left in ~/.claude/projects; only ever an eval workspace's. */
export function forgetSessions(workspace) {
  if (!workspace || !isAbsolute(workspace) || !workspace.includes(EVAL_ROOT_MARK)) {
    throw new Error(`evals: ${JSON.stringify(workspace)} is not an eval workspace; its sessions stay`);
  }
  const dir = join(homedir(), '.claude', 'projects', projectDirName(workspace));
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

/** Every package a task needs, with what each needs in turn. */
export function packagesFor(wanted) {
  const all = new Set();
  const add = (key) => {
    if (all.has(key)) return;
    all.add(key);
    for (const need of PACKAGES[key].needs) add(need);
  };
  for (const key of ['chart', ...wanted]) add(key);
  return [...all];
}

/** Run a package manager: on Windows a .cmd, which only a shell starts, given one quoted command line. */
function manager(command, args, cwd) {
  if (process.platform !== 'win32') return execFileSync(command, args, { cwd, stdio: 'pipe' });
  return execSync([command, ...args.map((a) => `"${a}"`)].join(' '), { cwd, stdio: 'pipe' });
}

/** Pack each package as npm publishes it (its `files` only), once per eval run. */
export function packAll(outDir) {
  mkdirSync(outDir, { recursive: true });
  const tarballs = {};
  for (const [key, pkg] of Object.entries(PACKAGES)) {
    const before = new Set(readdirSync(outDir));
    manager('pnpm', ['pack', '--pack-destination', outDir], join(REPO, 'packages', pkg.dir));
    const made = readdirSync(outDir).find((f) => !before.has(f) && f.endsWith('.tgz'));
    if (!made) throw new Error(`evals: pnpm pack made no tarball for ${pkg.name}`);
    tarballs[key] = join(outDir, made);
  }
  return tarballs;
}

/** A package's folder as the repo installed it, found from `from` (a package that needs it). */
function packageDir(name, from) {
  return dirname(createRequire(join(from, 'package.json')).resolve(`${name}/package.json`));
}

function devToolDirs(names) {
  const dirs = {};
  const reactDir = join(REPO, 'packages', 'react');
  for (const name of names) {
    // Each from where the repo installed it, or from the package that needs it.
    const from = { scheduler: () => dirs['react-dom'], csstype: () => dirs['@types/react'] }[name]?.() ?? (name === 'typescript' ? REPO : reactDir);
    dirs[name] = realpathSync(packageDir(name, from));
  }
  return dirs;
}

/**
 * Copy the dev tools once per eval run into a folder of their own, which
 * the workspaces link to: a link into the repo would show an agent where the
 * reference answers are.
 */
export function stageDevTools(dir) {
  const dirs = devToolDirs([...DEV_TOOLS.base, ...DEV_TOOLS.react]);
  for (const [name, source] of Object.entries(dirs)) {
    cpSync(source, join(dir, 'node_modules', name), { recursive: true, dereference: true });
  }
  return join(dir, 'node_modules');
}

function link(target, path) {
  mkdirSync(dirname(path), { recursive: true });
  symlinkSync(target, path, 'junction');
}

function linkDevTools(ws, wanted, staged) {
  const names = [...DEV_TOOLS.base, ...(wanted.includes('react') ? DEV_TOOLS.react : [])];
  const dirs = staged ? Object.fromEntries(names.map((n) => [n, join(staged, n)])) : devToolDirs(names);
  for (const name of names) {
    if (!existsSync(join(ws, 'node_modules', name))) link(dirs[name], join(ws, 'node_modules', name));
  }
}

function writeProject(ws, task) {
  const react = task.packages.includes('react');
  writeFileSync(join(ws, 'package.json'), `${JSON.stringify({
    name: 'my-app', private: true, type: 'module',
    scripts: { typecheck: 'node node_modules/typescript/bin/tsc --noEmit -p .' },
  }, null, 2)}\n`);
  writeFileSync(join(ws, 'tsconfig.json'), `${JSON.stringify({
    compilerOptions: {
      target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      strict: true, skipLibCheck: true, noEmit: true, ...(react ? { jsx: 'react-jsx' } : {}),
    },
    include: ['src'],
  }, null, 2)}\n`);
  mkdirSync(join(ws, 'src'), { recursive: true });
  if (task.seedDir) cpSync(task.seedDir, ws, { recursive: true });
}

/** What the arm adds: the skill as a project skill (what ships of it, no build leftovers), or the MCP server; no auto memory in any arm. */
function setUpArm(ws, arm) {
  mkdirSync(join(ws, '.claude'), { recursive: true });
  writeFileSync(join(ws, '.claude', 'settings.json'), `${JSON.stringify({ autoMemoryEnabled: false }, null, 2)}\n`);
  if (arm === 'skill') {
    cpSync(join(REPO, 'skills', 'tradecanvas'), join(ws, '.claude', 'skills', 'tradecanvas'), {
      recursive: true,
      filter: (source) => !basename(source).startsWith('.'),
    });
  }
  const servers = arm === 'mcp'
    ? { tradecanvas: { command: process.execPath, args: [join(REPO, 'packages', 'mcp', 'dist', 'cli.js')] } }
    : {};
  const mcpConfig = join(ws, '.claude', 'mcp.json');
  writeFileSync(mcpConfig, `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`);
  return { mcpConfig, mcpTools: arm === 'mcp' ? ['mcp__tradecanvas'] : [] };
}

/** The project's setup as it was given: a run that changed it (its scripts, its config) is not graded as it stands. */
export function fingerprint(ws) {
  const hash = createHash('sha1');
  for (const file of ['package.json', 'tsconfig.json', join('.claude', 'settings.json'), join('.claude', 'mcp.json')]) {
    hash.update(file);
    hash.update(existsSync(join(ws, file)) ? readFileSync(join(ws, file)) : '-');
  }
  return hash.digest('hex');
}

/**
 * A fresh project for one run: a package.json with a type check, a strict
 * tsconfig, the task's packages (from the packed tarballs, installed offline
 * as npm would; or linked to the repo's builds for checking the references),
 * TypeScript, and what the arm adds.
 */
export function createWorkspace({ ws, task, arm = 'bare', tarballs = null, staged = null }) {
  rmSync(ws, { recursive: true, force: true });
  mkdirSync(ws, { recursive: true });
  writeProject(ws, task);
  const keys = packagesFor(task.packages);
  if (tarballs) {
    // The React wrapper's peers (react, react-dom) come from the dev tools below, not the registry.
    manager('npm', ['install', '--offline', '--legacy-peer-deps', '--no-audit', '--no-fund', '--loglevel=error', ...keys.map((k) => tarballs[k])], ws);
  } else {
    for (const key of keys) link(join(REPO, 'packages', PACKAGES[key].dir), join(ws, 'node_modules', ...PACKAGES[key].name.split('/')));
  }
  linkDevTools(ws, task.packages, staged);
  return setUpArm(ws, arm);
}
