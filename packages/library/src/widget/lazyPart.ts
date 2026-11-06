/**
 * Parts of the widget made the first time they are needed: a dialog whose code is loaded with
 * `import()`, so a page that never opens it never downloads it.
 */

/** A module loaded once, on the first ask, for every widget on the page. */
export interface ModuleRef<M> {
  /** The module, or null while it is not loaded. */
  get(): M | null;
  load(): Promise<M>;
}

/** A module loaded by `importer` the first time it is asked for; a failed load is tried again next time. */
export function lazyModule<M>(importer: () => Promise<M>): ModuleRef<M> {
  let loaded: M | null = null;
  let loading: Promise<M> | null = null;
  return {
    get: () => loaded,
    load(): Promise<M> {
      if (loaded) return Promise.resolve(loaded);
      loading ??= importer().then(
        (module) => {
          loaded = module;
          loading = null;
          return module;
        },
        (error: unknown) => {
          loading = null;
          throw error;
        },
      );
      return loading;
    },
  };
}

/** What a widget holds of a part made on first need. */
export interface Lazy<T> {
  get(): T | null;
  now(): T | null;
  isLoading(): boolean;
  load(): Promise<T | null>;
  destroy(): void;
}

/**
 * One widget's part, built from a module once it is loaded. Until then `get()` is null, and
 * what would update the part has nothing to update: the part reads the widget's state as it opens.
 */
export class LazyPart<M, T> implements Lazy<T> {
  private part: T | null = null;
  private loading: Promise<T | null> | null = null;
  private gone = false;

  constructor(
    private readonly module: ModuleRef<M>,
    private readonly build: (module: M) => T,
    private readonly dispose: (part: T) => void,
    private readonly onError: (error: Error) => void = () => {},
  ) {}

  /** The part, or null while it is not made. */
  get(): T | null {
    return this.part;
  }

  /** The part, made now when its module is in (another widget loaded it); else null. */
  now(): T | null {
    const module = this.module.get();
    if (!this.part && !this.gone && module) this.part = this.build(module);
    return this.part;
  }

  /** Whether its code is on the way. */
  isLoading(): boolean {
    return this.loading !== null;
  }

  /**
   * The part, its module loaded first. Null when its owner went meanwhile or the load failed:
   * a failure is reported, and the next call tries again (a connection back, say).
   */
  load(): Promise<T | null> {
    if (this.gone) return Promise.resolve(null);
    const ready = this.now();
    if (ready) return Promise.resolve(ready);
    this.loading ??= this.module.load().then(
      () => {
        this.loading = null;
        return this.now();
      },
      (error: unknown) => {
        this.loading = null;
        if (!this.gone) this.onError(error instanceof Error ? error : new Error(String(error)));
        return null;
      },
    );
    return this.loading;
  }

  destroy(): void {
    this.gone = true;
    if (this.part) this.dispose(this.part);
    this.part = null;
  }
}
