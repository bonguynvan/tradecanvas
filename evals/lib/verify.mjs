import { copyFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createWorkspace } from './workspace.mjs';
import { grade } from './grade.mjs';

/**
 * A task's grader against answers known right and wrong: its reference and
 * each `right-*` must pass, each `wrong-*` must fail. A grader that passes a
 * wrong answer measures nothing; one that fails a right one wrongs the agent.
 * With `tarballs` (and `staged` tools) the project is installed as an agent
 * gets it; without, the packages are linked from the repo.
 */
export function verifyTask(task, ws, { tarballs = null, staged = null } = {}) {
  createWorkspace({ ws, task, tarballs, staged });
  const outcomes = [];
  const answers = [
    ...(task.reference ? [{ file: task.reference, expect: 'pass' }] : []),
    ...task.right.map((file) => ({ file, expect: 'pass' })),
    ...task.wrong.map((file) => ({ file, expect: 'fail' })),
  ];
  for (const { file, expect } of answers) {
    copyFileSync(file, join(ws, task.entry));
    const result = grade(ws, task);
    outcomes.push({ name: basename(file), expect, result, ok: result.pass === (expect === 'pass') });
  }
  if (!task.reference) outcomes.push({ name: 'reference', expect: 'pass', ok: false, result: { error: 'no reference answer', checks: [], typecheck: { errors: [] } } });
  return outcomes;
}
