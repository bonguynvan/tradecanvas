import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseFrontmatter } from './frontmatter.mjs';

export const TASKS_DIR = resolve(join(import.meta.dirname, '..', 'tasks'));

const PACKAGE_NAMES = { chart: '@tradecanvas/chart', analytics: '@tradecanvas/analytics', react: '@tradecanvas/react' };

/** What every prompt starts with: the project as an agent finds it, and where its answer goes. */
function preamble(task) {
  const installed = ['chart', ...task.packages].map((key) => `\`${PACKAGE_NAMES[key]}\``).join(', ');
  const extra = task.packages.includes('react') ? ' React 19 is installed too.' : '';
  return [
    `This is a strict TypeScript project (ES modules) with ${installed} installed from npm.${extra}`,
    `Put your code in \`${task.entry}\` and keep it in that one file. Don't install packages or change package.json or tsconfig.json; \`npm run typecheck\` checks the types.`,
  ].join(' ');
}

/** The tasks, each a folder of tasks/ with task.md (settings and prompt), check.mjs and a reference answer. */
export async function loadTasks(only = null) {
  const ids = readdirSync(TASKS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const tasks = [];
  for (const id of ids) {
    if (only && !only.some((pattern) => id.includes(pattern))) continue;
    const dir = join(TASKS_DIR, id);
    const { meta, body } = parseFrontmatter(readFileSync(join(dir, 'task.md'), 'utf8'));
    const task = {
      id,
      dir,
      area: meta.area ?? 'chart',
      packages: meta.packages ?? [],
      maxTurns: meta.max_turns ?? 30,
      entry: meta.entry ?? 'src/main.ts',
      seedDir: existsSync(join(dir, 'seed')) ? join(dir, 'seed') : null,
      reference: ['reference.ts', 'reference.tsx'].map((f) => join(dir, f)).find(existsSync) ?? null,
      // Answers the grader must fail: the mistakes an agent makes, kept so the checks keep catching them.
      wrong: readdirSync(dir).filter((f) => /^wrong-.*\.tsx?$/.test(f)).map((f) => join(dir, f)),
      // Other right answers, written another way: the grader must pass them too.
      right: readdirSync(dir).filter((f) => /^right-.*\.tsx?$/.test(f)).map((f) => join(dir, f)),
    };
    const check = await import(pathToFileURL(join(dir, 'check.mjs')).href);
    task.checkCount = check.checks.length;
    task.prompt = `${preamble(task)}\n\n${body}`;
    tasks.push(task);
  }
  return tasks;
}
