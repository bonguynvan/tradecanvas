import { describe, it, expect, vi } from 'vitest';
import { LazyPart, lazyModule } from '../lazyPart';

type Part = { name: string; destroy: () => void };
const part = (name: string): Part => ({ name, destroy: vi.fn() });
const module = (name = 'a') => lazyModule(async () => ({ make: () => part(name) }));
const lazy = (ref = module(), onError?: (e: Error) => void) =>
  new LazyPart(ref, (m) => m.make(), (p) => p.destroy(), onError);

describe('lazyModule', () => {
  it('imports once however often it is asked for, and holds the module after', async () => {
    const importer = vi.fn(async () => ({ x: 1 }));
    const ref = lazyModule(importer);
    expect(ref.get()).toBeNull();
    const [one, two] = await Promise.all([ref.load(), ref.load()]);
    expect(one).toBe(two);
    expect(ref.get()).toBe(one);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('imports again after a failure', async () => {
    let fail = true;
    const ref = lazyModule(async () => {
      if (fail) throw new Error('offline');
      return { x: 1 };
    });
    await expect(ref.load()).rejects.toThrow('offline');
    fail = false;
    expect(await ref.load()).toEqual({ x: 1 });
  });
});

describe('LazyPart', () => {
  it('has nothing until it is loaded', async () => {
    const p = lazy();
    expect(p.get()).toBeNull();
    expect(p.now()).toBeNull();
    const loaded = await p.load();
    expect(loaded?.name).toBe('a');
    expect(p.get()).toBe(loaded);
  });

  it('is made at once where another widget loaded its module', async () => {
    const ref = module();
    await lazy(ref).load();
    const second = lazy(ref);
    expect(second.now()?.name).toBe('a');
  });

  it('is made once however often it is asked for', async () => {
    const build = vi.fn((m: { make: () => Part }) => m.make());
    const p = new LazyPart(module(), build, (x) => x.destroy());
    const [one, two] = await Promise.all([p.load(), p.load()]);
    expect(one).toBe(two);
    p.now();
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('says whether a load is under way', async () => {
    const p = lazy();
    const loading = p.load();
    expect(p.isLoading()).toBe(true);
    await loading;
    expect(p.isLoading()).toBe(false);
  });

  it('destroys what it made and gives nothing after', async () => {
    const p = lazy();
    const loaded = await p.load();
    p.destroy();
    expect(loaded!.destroy).toHaveBeenCalledTimes(1);
    expect(p.get()).toBeNull();
    expect(p.now()).toBeNull();
    expect(await p.load()).toBeNull();
  });

  it('makes nothing when its owner went while the module loaded', async () => {
    const build = vi.fn((m: { make: () => Part }) => m.make());
    const p = new LazyPart(module(), build, (x) => x.destroy());
    const loading = p.load();
    p.destroy();
    expect(await loading).toBeNull();
    expect(build).not.toHaveBeenCalled();
  });

  it('reports a failed load and tries again on the next ask', async () => {
    const onError = vi.fn();
    let fail = true;
    const ref = lazyModule(async () => {
      if (fail) throw new Error('offline');
      return { make: () => part('a') };
    });
    const p = lazy(ref, onError);
    expect(await p.load()).toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'offline' }));
    fail = false;
    expect((await p.load())?.name).toBe('a');
  });
});
