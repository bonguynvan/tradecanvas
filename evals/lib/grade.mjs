import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO } from './workspace.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TSC = join(REPO, 'node_modules', 'typescript', 'bin', 'tsc');
const RUN_TIMEOUT_MS = 90_000;
const TYPECHECK_TIMEOUT_MS = 120_000;

/**
 * The answer runs with little of this machine's environment, and in UTC: a
 * date read in the local zone grades the same here as in CI.
 */
function answerEnv() {
  const keep = ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE'];
  return { ...Object.fromEntries(keep.filter((k) => process.env[k]).map((k) => [k, process.env[k]])), TZ: 'UTC' };
}

/**
 * The grader's own tsconfig, strict whatever the answer did to the project's:
 * it type-checks `src` and emits it to `.grade` for the run.
 */
function writeGradeConfig(ws, task) {
  const path = join(ws, '.grade.tsconfig.json');
  writeFileSync(path, JSON.stringify({
    compilerOptions: {
      target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      strict: true, skipLibCheck: true, noEmit: false, noEmitOnError: false, outDir: '.grade', rootDir: '.',
      ...(task.packages.includes('react') ? { jsx: 'react-jsx' } : {}),
    },
    include: ['src'],
  }));
  return path;
}

/** Type errors in the answer, as `file(line,col): error TSxxxx: …` lines; the JavaScript is emitted anyway. */
export function typeCheck(ws, task) {
  const run = spawnSync(process.execPath, [TSC, '-p', writeGradeConfig(ws, task), '--pretty', 'false'], { cwd: ws, encoding: 'utf8', timeout: TYPECHECK_TIMEOUT_MS });
  if (run.error) return { ok: false, errors: [`the type check did not finish: ${run.error.message}`] };
  const errors = `${run.stdout}${run.stderr}`.split(/\r?\n/).filter((line) => /error TS\d+/.test(line));
  return { ok: run.status === 0 && errors.length === 0, errors: errors.slice(0, 20) };
}

/** The answer run under jsdom, in a process of its own, against the task's checks. */
function behaviour(ws, task) {
  const run = spawnSync(process.execPath, [join(HERE, 'grade-runner.mjs'), ws, task.dir], { cwd: ws, encoding: 'utf8', timeout: RUN_TIMEOUT_MS, env: answerEnv() });
  const last = run.stdout.trim().split(/\r?\n/).pop() ?? '';
  try {
    return JSON.parse(last);
  } catch {
    return { error: (run.error?.message ?? run.stderr ?? 'no report').slice(-1200), checks: [] };
  }
}

/**
 * An answer's grade: it passes when it type-checks and every check passes.
 * The score counts the type check as one check among the task's, so a
 * near miss scores more than nothing.
 */
export function grade(ws, task) {
  const typecheck = typeCheck(ws, task);
  const run = behaviour(ws, task);
  const passed = run.checks.filter((c) => c.pass).length;
  const total = Math.max(task.checkCount, run.checks.length) + 1;
  const score = ((typecheck.ok ? 1 : 0) + passed) / total;
  return {
    pass: typecheck.ok && !run.error && run.checks.length > 0 && passed === run.checks.length,
    score: Number(score.toFixed(3)),
    typecheck,
    error: run.error ?? null,
    checks: run.checks,
  };
}
