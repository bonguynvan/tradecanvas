// Grade a finished eval's answers again, with the graders as they are now
// and the packages as this repo has built them: a grader fixed after a run,
// without paying for the agents again. After `pnpm build`:
//
//   pnpm eval:regrade [evals/results/<time>]   (the latest finished run by default)
//
// Writes `regraded.jsonl` and `regraded.md` beside the run's own files, which
// stay as they were. Free; the agents' figures are read again from their
// transcripts.
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { loadTasks } from './lib/tasks.mjs';
import { REPO, createWorkspace } from './lib/workspace.mjs';
import { grade } from './lib/grade.mjs';
import { latestRun, regradeRow } from './lib/regrade.mjs';
import { summaryTable } from './lib/report.mjs';

let dir;
try {
  dir = resolve(process.argv[2] ?? latestRun(join(REPO, 'evals', 'results')));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
const stamp = basename(dir);
const version = JSON.parse(readFileSync(join(REPO, 'packages', 'library', 'package.json'), 'utf8')).version;
console.log(`Grading ${dir} again, with TradeCanvas ${version} as built here`);
const rows = readFileSync(join(dir, 'runs.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
const tasks = new Map((await loadTasks(null)).map((task) => [task.id, task]));
const root = join(tmpdir(), 'tradecanvas-evals-regrade');
rmSync(root, { recursive: true, force: true });

const readEvents = (file) => readFileSync(file, 'utf8').split('\n').flatMap((line) => {
  try {
    return line.trim() ? [JSON.parse(line)] : [];
  } catch {
    // A run cut off mid-line: the line is lost, the rest is read.
    return [];
  }
});

// One project a task, made the first time an answer of it is graded: the graders read the answer, not the arm.
const ready = new Set();
function gradeAnswer(task, answer) {
  const ws = join(root, task.id);
  if (!ready.has(task.id)) {
    createWorkspace({ ws, task });
    ready.add(task.id);
  }
  copyFileSync(answer, join(ws, task.entry));
  return grade(ws, task);
}

const regraded = rows.map((row) => {
  const task = tasks.get(row.task);
  if (!task) return row;
  const name = `${row.task}.${row.arm}.${row.run}`;
  const answer = join(dir, 'answers', `${name}${task.entry.slice(task.entry.lastIndexOf('.'))}`);
  const transcript = join(dir, 'transcripts', `${name}.jsonl`);
  const next = regradeRow(row, {
    events: existsSync(transcript) ? readEvents(transcript) : null,
    grade: existsSync(answer) ? () => gradeAnswer(task, answer) : null,
    fallbackCwd: join(tmpdir(), 'tradecanvas-evals', stamp, name),
  });
  if (next.pass !== row.pass) console.log(`${next.pass ? 'now passes' : 'now fails '} ${name}`);
  return next;
});
rmSync(root, { recursive: true, force: true });

const spent = rows.reduce((total, row) => total + (row.costUsd ?? 0), 0);
const header = [
  `# TradeCanvas evals, ${stamp.slice(0, 10)}, graded again`,
  '',
  `The answers of ${stamp}, ${rows.length} runs, $${spent.toFixed(2)} in all, graded again on ${new Date().toISOString().slice(0, 10)}: the graders of that day, TradeCanvas ${version} as built in the repo.`,
  'A cell: runs passed · mean turns · mean cost. Sources: runs that opened the package README, its types, its compiled code (read or searched), the skill, or called the MCP server.',
  '',
];
writeFileSync(join(dir, 'regraded.jsonl'), `${regraded.map((row) => JSON.stringify(row)).join('\n')}\n`);
writeFileSync(join(dir, 'regraded.md'), `${header.join('\n')}${summaryTable(regraded)}\n`);
console.log(`\n${summaryTable(regraded)}`);
