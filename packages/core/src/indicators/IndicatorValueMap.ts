import type { IndicatorValue } from '@tradecanvas/commons';

/**
 * Drop-in `Map<number, IndicatorValue>` for `IndicatorOutput.values`, tuned
 * for how indicators fill it: one entry per bar, in ascending time order.
 *
 * A plain `Map` keyed by millisecond timestamps (heap doubles, hashed per
 * insert) costs ~6x more to build than the indicator math itself — at 100k
 * bars that was most of a `setData()`. While keys keep arriving in ascending
 * order, entries live in two parallel arrays instead (cheap pushes) and are
 * looked up by binary search; insertion order equals key order, so every Map
 * operation can be answered from them. The first write that breaks the order
 * (a new key older than the newest), or any iteration, folds the arrays into
 * the underlying Map, after which it behaves exactly like one.
 *
 * Caveat: APIs that read a Map's internal slots directly instead of calling
 * its methods (`structuredClone`, `postMessage`) only see folded entries —
 * copy with `new Map(values)` first.
 */
export class IndicatorValueMap extends Map<number, IndicatorValue> {
  private keyBuf: number[] = [];
  private valBuf: IndicatorValue[] = [];
  private folded = false;

  // No entries argument: Map's constructor would call the overridden `set`
  // before this class's fields exist.
  constructor() {
    super();
  }

  override set(key: number, value: IndicatorValue): this {
    if (this.folded) return super.set(key, value);
    const keys = this.keyBuf;
    const n = keys.length;
    if (n === 0 || key > keys[n - 1]) {
      keys.push(key);
      this.valBuf.push(value);
      return this;
    }
    const idx = this.indexOf(key);
    if (idx >= 0) {
      // Overwrite in place — Map keeps an existing key's insertion position.
      this.valBuf[idx] = value;
      return this;
    }
    this.fold();
    return super.set(key, value);
  }

  override get(key: number): IndicatorValue | undefined {
    if (this.folded) return super.get(key);
    const idx = this.indexOf(key);
    return idx >= 0 ? this.valBuf[idx] : undefined;
  }

  override has(key: number): boolean {
    return this.folded ? super.has(key) : this.indexOf(key) >= 0;
  }

  override delete(key: number): boolean {
    if (this.folded) return super.delete(key);
    const idx = this.indexOf(key);
    if (idx < 0) return false;
    this.keyBuf.splice(idx, 1);
    this.valBuf.splice(idx, 1);
    return true;
  }

  override clear(): void {
    super.clear();
    this.keyBuf = [];
    this.valBuf = [];
    this.folded = false;
  }

  override get size(): number {
    return this.folded ? super.size : this.keyBuf.length;
  }

  override forEach(
    callback: (value: IndicatorValue, key: number, map: Map<number, IndicatorValue>) => void,
    thisArg?: unknown,
  ): void {
    this.fold();
    super.forEach(callback, thisArg);
  }

  override entries(): ReturnType<Map<number, IndicatorValue>['entries']> {
    this.fold();
    return super.entries();
  }

  override keys(): ReturnType<Map<number, IndicatorValue>['keys']> {
    this.fold();
    return super.keys();
  }

  override values(): ReturnType<Map<number, IndicatorValue>['values']> {
    this.fold();
    return super.values();
  }

  override [Symbol.iterator](): ReturnType<Map<number, IndicatorValue>['entries']> {
    this.fold();
    return super[Symbol.iterator]();
  }

  private indexOf(key: number): number {
    const keys = this.keyBuf;
    let lo = 0;
    let hi = keys.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const k = keys[mid];
      if (k === key) return mid;
      if (k < key) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }

  private fold(): void {
    if (this.folded) return;
    this.folded = true;
    const keys = this.keyBuf;
    const vals = this.valBuf;
    for (let i = 0; i < keys.length; i++) super.set(keys[i], vals[i]);
    this.keyBuf = [];
    this.valBuf = [];
  }
}
