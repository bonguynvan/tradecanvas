import { parseArgs } from 'node:util';

export const ARMS = ['bare', 'skill', 'mcp'];

/** A number option in range, or the run stops before an agent starts (a NaN would run nothing, or forever). */
function number(values, name, { min, integer = false }) {
  const value = Number(values[name]);
  if (!Number.isFinite(value) || value < min || (integer && !Number.isInteger(value))) {
    throw new Error(`evals: --${name} takes ${integer ? 'a whole number' : 'a number'} of at least ${min}, not "${values[name]}"`);
  }
  return value;
}

/** `pnpm eval`'s options, checked. */
export function parseOptions(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      tasks: { type: 'string' },
      arms: { type: 'string', default: 'bare,skill' },
      runs: { type: 'string', default: '2' },
      model: { type: 'string', default: 'sonnet' },
      concurrency: { type: 'string', default: '1' },
      'budget-usd': { type: 'string', default: '1.5' },
      'max-cost-usd': { type: 'string', default: '20' },
      keep: { type: 'boolean', default: false },
      preflight: { type: 'boolean', default: true },
      'no-preflight': { type: 'boolean', default: false },
    },
  });
  const arms = values.arms.split(',').map((a) => a.trim()).filter(Boolean);
  for (const arm of arms) if (!ARMS.includes(arm)) throw new Error(`evals: no arm "${arm}"; the arms are ${ARMS.join(', ')}`);
  return {
    tasks: values.tasks ? values.tasks.split(',') : null,
    arms,
    runs: number(values, 'runs', { min: 1, integer: true }),
    model: values.model,
    concurrency: Math.min(8, number(values, 'concurrency', { min: 1, integer: true })),
    budgetUsd: number(values, 'budget-usd', { min: 0.01 }),
    maxCostUsd: number(values, 'max-cost-usd', { min: 0 }),
    keep: values.keep,
    preflight: values.preflight && !values['no-preflight'],
  };
}
