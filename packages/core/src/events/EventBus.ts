import type { ChartEventType, ChartEvent, TauriBridgeOptions } from '@chart-lib/commons';

type Listener = (event: ChartEvent) => void;

declare global {
  interface Window {
    __TAURI__?: {
      event: {
        emit(event: string, payload: unknown): Promise<void>;
      };
    };
  }
}

export class EventBus {
  private listeners = new Map<ChartEventType, Set<Listener>>();
  private tauriBridge: TauriBridgeOptions | null = null;

  on(type: ChartEventType, listener: Listener): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  off(type: ChartEventType, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: ChartEventType, payload: unknown): void {
    const event: ChartEvent = {
      type,
      timestamp: Date.now(),
      payload,
    };

    const set = this.listeners.get(type);
    if (set) {
      for (const listener of set) {
        listener(event);
      }
    }

    if (this.tauriBridge?.enabled && window.__TAURI__) {
      const prefix = this.tauriBridge.eventPrefix ?? 'chart';
      window.__TAURI__.event.emit(`${prefix}:${type}`, event).catch(() => {});
    }
  }

  enableTauriBridge(options: TauriBridgeOptions): void {
    this.tauriBridge = options;
  }

  disableTauriBridge(): void {
    this.tauriBridge = null;
  }

  destroy(): void {
    this.listeners.clear();
    this.tauriBridge = null;
  }
}
