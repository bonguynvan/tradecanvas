import { describe, it, expect, beforeEach } from 'vitest';
import { PluginManager } from '../PluginManager.js';
import {
  registerPlugin,
  getGlobalPlugins,
  unregisterPlugin,
  clearGlobalPlugins,
} from '../registry.js';
import { pluginKey } from '../contracts.js';
import type { IndicatorEngine } from '@tradecanvas/core';
import type {
  IndicatorPlugin,
  IndicatorDescriptor,
  IndicatorOutput,
} from '@tradecanvas/commons';

function fakeIndicator(id: string): IndicatorPlugin {
  return {
    descriptor: { id, name: id, placement: 'overlay', defaultConfig: {} } as IndicatorDescriptor,
    calculate: (): IndicatorOutput => ({ values: new Map() }),
    render: () => {},
  };
}

function makeEngine(): { engine: IndicatorEngine; registered: string[] } {
  const registered: string[] = [];
  const engine = {
    register: (p: IndicatorPlugin) => registered.push(p.descriptor.id),
  } as unknown as IndicatorEngine;
  return { engine, registered };
}

describe('global plugin registry', () => {
  beforeEach(() => clearGlobalPlugins());

  it('registers, de-duplicates by key, and unregisters', () => {
    registerPlugin({ kind: 'indicator', plugin: fakeIndicator('foo') });
    expect(getGlobalPlugins()).toHaveLength(1);

    // same key replaces, does not duplicate
    registerPlugin({ kind: 'indicator', plugin: fakeIndicator('foo') });
    expect(getGlobalPlugins()).toHaveLength(1);

    expect(unregisterPlugin('indicator:foo')).toBe(true);
    expect(getGlobalPlugins()).toHaveLength(0);
  });
});

describe('PluginManager', () => {
  beforeEach(() => clearGlobalPlugins());

  it('inherits global plugins and flows indicators to the engine', () => {
    registerPlugin({ kind: 'indicator', plugin: fakeIndicator('glob') });
    const { engine, registered } = makeEngine();
    const pm = new PluginManager(engine);

    expect(pm.list().map(pluginKey)).toContain('indicator:glob');
    expect(registered).toContain('glob');
  });

  it('merges constructor plugins over globals', () => {
    registerPlugin({ kind: 'indicator', plugin: fakeIndicator('a') });
    const { engine } = makeEngine();
    const pm = new PluginManager(engine, {
      plugins: [{ kind: 'indicator', plugin: fakeIndicator('b') }],
    });

    const keys = pm.list().map(pluginKey);
    expect(keys).toEqual(expect.arrayContaining(['indicator:a', 'indicator:b']));
  });

  it('can skip global inheritance', () => {
    registerPlugin({ kind: 'indicator', plugin: fakeIndicator('a') });
    const { engine } = makeEngine();
    const pm = new PluginManager(engine, { inheritGlobal: false });
    expect(pm.list()).toHaveLength(0);
  });

  it('registers and unregisters instance plugins', () => {
    const { engine } = makeEngine();
    const pm = new PluginManager(engine, { inheritGlobal: false });

    pm.register({ kind: 'indicator', plugin: fakeIndicator('x') });
    expect(pm.list()).toHaveLength(1);
    expect(pm.unregister('indicator:x')).toBe(true);
    expect(pm.list()).toHaveLength(0);
  });

  it('keeps the legacy registerIndicator working', () => {
    const { engine, registered } = makeEngine();
    const pm = new PluginManager(engine, { inheritGlobal: false });

    pm.registerIndicator(fakeIndicator('legacy'));
    expect(registered).toContain('legacy');
    expect(pm.list().map(pluginKey)).toContain('indicator:legacy');
  });
});
