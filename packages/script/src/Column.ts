type TypedArray = Float64Array | Uint16Array | Uint8Array;

const FIRST_CAPACITY = 256;

/** A value a bar that grows with the bars, in a typed array. */
export class Column<T extends TypedArray> {
  private data: T;
  private filled = 0;

  constructor(
    private readonly make: (capacity: number) => T,
    private readonly empty: number,
  ) {
    this.data = make(FIRST_CAPACITY);
    this.data.fill(empty);
  }

  /** Set bar `index`, growing to it. */
  set(index: number, value: number): void {
    this.reach(index + 1);
    this.data[index] = value;
  }

  get(index: number): number {
    return index >= 0 && index < this.filled ? this.data[index] : this.empty;
  }

  /** Make room for `length` bars, the new ones empty. */
  reach(length: number): void {
    if (length > this.data.length) {
      let capacity = this.data.length;
      while (capacity < length) capacity *= 2;
      const next = this.make(capacity);
      next.fill(this.empty);
      next.set(this.data);
      this.data = next;
    }
    if (length > this.filled) this.filled = length;
  }

  /** Its first `length` bars, without copying them: good until a bar is set past what it holds. */
  view(length: number): T {
    this.reach(length);
    return this.data.subarray(0, length) as T;
  }
}

export const floatColumn = (): Column<Float64Array> => new Column((n) => new Float64Array(n), Number.NaN);
export const colorColumn = (): Column<Uint16Array> => new Column((n) => new Uint16Array(n), 0);
export const flagColumn = (): Column<Uint8Array> => new Column((n) => new Uint8Array(n), 0);
