import type { IndicatorOutput, IndicatorPlugin } from '@tradecanvas/commons';

/**
 * A built-in whose `update` reads what its `calculate` kept beside the
 * output (running averages, the bars' times). The worker sends that with
 * the output and the main thread puts it back, so the ticks after a
 * recompute in the worker stay incremental instead of computing in full.
 */
export interface WorkerStateful {
  /** What `calculate` kept beside `output`, as a structured clone can carry it. */
  workerState(output: IndicatorOutput): unknown;
  /**
   * Keep `state` beside `output` again, as `calculate` would have; `times`
   * are the times of the bars it was computed on.
   */
  adoptWorkerState(output: IndicatorOutput, state: unknown, times: ArrayLike<number>): void;
}

export function isWorkerStateful(plugin: IndicatorPlugin): plugin is IndicatorPlugin & WorkerStateful {
  const p = plugin as Partial<WorkerStateful>;
  return typeof p.workerState === 'function' && typeof p.adoptWorkerState === 'function';
}

/** Arrays of numbers this long or longer travel as a `Float64Array`. */
const PACK_MIN_LENGTH = 1024;

/** An array of numbers (some missing) as it travels: a buffer transferred, not a million values cloned one by one. */
interface PackedNumbers {
  tcPacked: 'numbers';
  values: Float64Array;
  /** 1 where the array had no number (undefined, or a hole); null when it had one everywhere. */
  missing: Uint8Array | null;
}

function isNumberArray(value: unknown): value is (number | undefined)[] {
  if (!Array.isArray(value) || value.length < PACK_MIN_LENGTH) return false;
  for (let i = 0; i < value.length; i++) {
    const v: unknown = value[i];
    if (v !== undefined && typeof v !== 'number') return false;
  }
  return true;
}

function packNumbers(array: readonly (number | undefined)[], transfer: ArrayBuffer[]): PackedNumbers {
  const values = new Float64Array(array.length);
  let missing: Uint8Array | null = null;
  for (let i = 0; i < array.length; i++) {
    const v = array[i];
    if (v !== undefined) values[i] = v;
    else (missing ??= new Uint8Array(array.length))[i] = 1;
  }
  transfer.push(values.buffer as ArrayBuffer);
  if (missing) transfer.push(missing.buffer as ArrayBuffer);
  return { tcPacked: 'numbers', values, missing };
}

/** Whether `value` is an object literal (or has no prototype): what packing walks into. */
function isPlainObject(value: object): boolean {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * A plugin's state made ready to post: its long arrays of numbers as
 * buffers, added to `transfer`; everything else as it is. Only arrays,
 * plain objects and primitives: a Map, a typed array or a class instance
 * would come back as something else, so it throws, and the worker answers
 * with an error that has the main thread compute the indicator itself.
 */
export function packWorkerState(state: unknown, transfer: ArrayBuffer[]): unknown {
  if (isNumberArray(state)) return packNumbers(state, transfer);
  if (Array.isArray(state)) return state.map((item) => packWorkerState(item, transfer));
  if (!state || typeof state !== 'object') return state;
  if (!isPlainObject(state)) throw new Error('An indicator state to send from the worker must be plain arrays and objects');
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) out[key] = packWorkerState(value, transfer);
  return out;
}

function isPacked(value: unknown): value is PackedNumbers {
  return !!value && typeof value === 'object' && (value as Partial<PackedNumbers>).tcPacked === 'numbers';
}

function unpackNumbers({ values, missing }: PackedNumbers): (number | undefined)[] {
  const out: (number | undefined)[] = Array.from(values);
  if (missing) for (let i = 0; i < out.length; i++) if (missing[i] === 1) out[i] = undefined;
  return out;
}

/** The state as the plugin kept it, from what `packWorkerState` made of it. */
export function unpackWorkerState(state: unknown): unknown {
  if (isPacked(state)) return unpackNumbers(state);
  if (Array.isArray(state)) return state.map(unpackWorkerState);
  if (!state || typeof state !== 'object') return state;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) out[key] = unpackWorkerState(value);
  return out;
}
