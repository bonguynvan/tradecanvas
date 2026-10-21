import { describe, it, expect, vi, afterEach } from 'vitest';
import { LayerType } from '@tradecanvas/commons';
import { RenderLoop } from '../RenderLoop.js';

afterEach(() => vi.unstubAllGlobals());

function frames() {
  const queued: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { queued.push(cb); return queued.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  return { queued, run: () => { const now = queued.splice(0); for (const cb of now) cb(0); } };
}

describe('RenderLoop — pause', () => {
  it('asks for no frames while paused, and draws once what changed when it resumes', () => {
    const { queued, run } = frames();
    const loop = new RenderLoop();
    const drawn: LayerType[][] = [];
    loop.setCallback((layers) => drawn.push([...layers]));
    loop.start();
    run();
    drawn.length = 0;
    loop.pause();
    for (let i = 0; i < 20; i++) loop.markDirty(LayerType.Main);
    expect(queued).toHaveLength(0);
    loop.resume();
    expect(queued).toHaveLength(1);
    run();
    expect(drawn).toEqual([[LayerType.Main]]);
  });

  it('resumes to nothing when nothing changed', () => {
    const { queued, run } = frames();
    const loop = new RenderLoop();
    loop.setCallback(() => {});
    loop.start();
    run();
    loop.pause();
    loop.resume();
    expect(queued).toHaveLength(0);
  });
});
