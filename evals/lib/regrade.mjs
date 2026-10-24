import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { summariseRun } from './agent.mjs';

/** The latest run under `results` that finished (it wrote `runs.jsonl`): a run stopped half-way isn't one to grade. */
export function latestRun(results) {
  const done = existsSync(results) ? readdirSync(results).filter((name) => existsSync(join(results, name, 'runs.jsonl'))).sort() : [];
  if (done.length === 0) throw new Error(`no finished run in ${results}: give the run's folder`);
  return join(results, done.at(-1));
}

/**
 * A run's row graded again. `grade()` grades its saved answer now (null: it
 * left none); `events` is its stream, read again from the project it ran in,
 * which its first event names (`fallbackCwd` when the stream lacks it). The
 * row's cost stands as charged, a run that changed its setup stays failed,
 * and a run that failed in the setup is left as it was.
 */
export function regradeRow(row, { events = null, grade = null, fallbackCwd = '' }) {
  if (row.infra) return row;
  const cwd = events?.find((e) => e.type === 'system' && e.subtype === 'init')?.cwd ?? fallbackCwd;
  const { answer: _text, costUsd: _cost, ...figures } = events ? summariseRun(events, cwd) : {};
  if (!grade) return { ...row, ...figures };
  const graded = grade();
  return {
    ...row, ...figures,
    pass: graded.pass && !row.tampered, score: row.tampered ? 0 : graded.score,
    typecheckOk: graded.typecheck.ok, typeErrors: graded.typecheck.errors.slice(0, 5),
    failed: graded.checks.filter((c) => !c.pass).map((c) => (c.detail ? `${c.name}: ${c.detail}` : c.name)), error: graded.error,
  };
}
