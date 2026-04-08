/**
 * Typed event emitter. Foundation for adapters and stream manager.
 * Keeps listeners in insertion order, supports once() for one-shot listeners.
 */
export class Emitter<EventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof EventMap, Set<(data: any) => void>>();

  on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => set!.delete(listener);
  }

  once<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): () => void {
    const wrapper = (data: EventMap[K]) => {
      unsub();
      listener(data);
    };
    const unsub = this.on(event, wrapper);
    return unsub;
  }

  off<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  protected emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        listener(data);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
