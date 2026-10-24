// Runs one answer under jsdom and prints its checks as JSON: `node grade-runner.mjs <workspace> <task dir>`.
import module from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { installDom } from './dom.mjs';
import * as fixtures from './fixtures.mjs';

const MOUNT_TIMEOUT_MS = 15_000;

// An answer's own files may import each other without an extension ('./feed'), as a bundler allows.
module.registerHooks?.({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (!specifier.startsWith('.')) throw error;
      for (const suffix of ['.js', '/index.js']) {
        try {
          return next(specifier + suffix, context);
        } catch {
          // Try the next form.
        }
      }
      throw error;
    }
  },
});

const [ws, taskDir] = process.argv.slice(2);
const print = (report) => {
  process.stdout.write(`\n${JSON.stringify(report)}\n`);
  process.exit(0);
};

function within(promise, ms, what) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} took over ${ms / 1000} s`)), ms))]);
}

/** The chart in what `mount` returned: a widget's, an object's `chart`, or the chart itself. */
function chartOf(result) {
  if (result && typeof result.getChart === 'function') return result.getChart();
  if (result && result.chart && typeof result.chart.getData === 'function') return result.chart;
  return result;
}

async function main() {
  const env = installDom();
  const task = await import(pathToFileURL(join(taskDir, 'check.mjs')).href);
  await task.setup?.({ env, fixtures });
  const args = task.args ? await task.args({ env, fixtures }) : [];
  const entry = ['main.js'].map((f) => join(ws, '.grade', 'src', f)).find(existsSync);
  if (!entry) return print({ error: 'no src/main.ts (or main.tsx) to run', checks: [] });
  const answer = await import(pathToFileURL(entry).href);
  const host = env.host();
  // A task whose answer is not a mount function (a React component) mounts it itself.
  let result;
  if (task.mountWith) {
    result = await within(Promise.resolve(task.mountWith({ answer, host, env, fixtures, args, ws })), MOUNT_TIMEOUT_MS, 'mount');
  } else {
    const mount = answer.mount ?? answer.default;
    if (typeof mount !== 'function') return print({ error: 'src/main.ts exports no mount function', checks: [] });
    result = await within(Promise.resolve(mount(host, ...args)), MOUNT_TIMEOUT_MS, 'mount');
  }
  await fixtures.wait(50);
  const context = { result, chart: chartOf(result), host, env, fixtures, args, answer, ws, wait: fixtures.wait };
  const checks = [];
  for (const [name, check] of task.checks) {
    try {
      const outcome = await within(Promise.resolve(check(context)), MOUNT_TIMEOUT_MS, name);
      checks.push({ name, pass: outcome !== false });
    } catch (error) {
      checks.push({ name, pass: false, detail: String(error?.message ?? error).slice(0, 400) });
    }
  }
  print({ checks });
}

main().catch((error) => print({ error: String(error?.stack ?? error).slice(0, 1200), checks: [] }));
