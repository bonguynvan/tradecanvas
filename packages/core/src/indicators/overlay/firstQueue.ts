/**
 * Items kept with the one to take first on top: a binary heap. The zone
 * indicators keep their open zones here (fair value gaps not yet filled,
 * order blocks not yet broken), so a bar pays for the zones it closes and
 * not for every open one. `before(a, b)` says that `a` is taken before `b`.
 */
export class FirstQueue<T> {
  private readonly heap: T[] = [];

  constructor(private readonly before: (a: T, b: T) => boolean) {}

  get first(): T | undefined {
    return this.heap[0];
  }

  add(item: T): void {
    const heap = this.heap;
    let i = heap.length;
    heap.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.before(heap[i], heap[parent])) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      i = parent;
    }
  }

  removeFirst(): void {
    const heap = this.heap;
    const last = heap.pop();
    if (heap.length === 0 || last === undefined) return;
    heap[0] = last;
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let top = i;
      if (left < heap.length && this.before(heap[left], heap[top])) top = left;
      if (right < heap.length && this.before(heap[right], heap[top])) top = right;
      if (top === i) return;
      [heap[i], heap[top]] = [heap[top], heap[i]];
      i = top;
    }
  }
}
