// Every task's grader against answers known right and wrong, with no agent:
// the graders stay true to the library as it changes. After `pnpm build`:
//
//   pnpm eval:check [--pack] [task…]
//
// `--pack` installs each project from the packed packages, as an agent gets
// it (slower); by default the packages are linked from the repo. Free; in CI.
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadTasks } from './lib/tasks.mjs';
import { packAll, stageDevTools } from './lib/workspace.mjs';
import { verifyTask } from './lib/verify.mjs';

const argv = process.argv.slice(2);
const pack = argv.includes('--pack');
const only = argv.filter((a) => !a.startsWith('--'));
const root = join(tmpdir(), 'tradecanvas-evals-check');
rmSync(root, { recursive: true, force: true });
const tasks = await loadTasks(only.length ? only : null);
const installed = pack ? { tarballs: packAll(join(root, 'tgz')), staged: stageDevTools(join(root, 'tools')) } : {};

let failed = 0;
for (const task of tasks) {
  const outcomes = verifyTask(task, join(root, task.id), installed);
  for (const { name, expect, result, ok } of outcomes) {
    const checks = result.checks ?? [];
    const why = expect === 'pass'
      ? `${checks.filter((c) => c.pass).length}/${checks.length} checks`
      : `fails: ${checks.filter((c) => !c.pass).map((c) => c.name).join('; ') || 'the type check'}`;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${task.id}: ${name} (${ok ? why : expect === 'pass' ? 'should pass' : 'passes, but it is wrong'})`);
    if (ok) continue;
    failed++;
    for (const line of result.typecheck?.errors ?? []) console.log(`       ${line}`);
    if (result.error) console.log(`       ${result.error}`);
    for (const c of checks.filter((c) => !c.pass)) console.log(`       ✗ ${c.name}${c.detail ? `: ${c.detail}` : ''}`);
  }
}
rmSync(root, { recursive: true, force: true });
console.log(`\n${failed ? `${failed} grader problem(s)` : 'every grader passes the right answers and fails the wrong ones'} (${tasks.length} tasks)`);
process.exit(failed ? 1 : 0);
