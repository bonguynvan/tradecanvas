// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetReplayBar, REPLAY_SPEEDS } from '../WidgetReplayBar.js';
import type { ReplayBarCallbacks } from '../WidgetReplayBar.js';

let host: HTMLDivElement;
let calls: ReplayBarCallbacks;
let bar: WidgetReplayBar;

const q = <T extends Element = HTMLElement>(sel: string) => host.querySelector(sel) as T;
const visibleModes = () => [...host.querySelectorAll<HTMLElement>('.tcw-replay-group')].filter((g) => !g.hidden).map((g) => g.dataset.mode);

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  calls = {
    onPlay: vi.fn(), onPause: vi.fn(), onStepBack: vi.fn(), onStepForward: vi.fn(),
    onSeek: vi.fn(), onSpeedChange: vi.fn(), onRandomStart: vi.fn(), onClose: vi.fn(),
  };
  bar = new WidgetReplayBar(calls, { selectHint: 'Bấm vào một nến', barsPerSecond: 'nến/giây', realtime: 'Về thời gian thực' });
  bar.mount(host, { total: 300, speed: 5, mode: 'select' });
});

afterEach(() => {
  bar.destroy();
  host.remove();
});

describe('WidgetReplayBar', () => {
  it('starts in pick mode with the hint, random and realtime actions', () => {
    expect(visibleModes()).toEqual(['select']);
    expect(host.textContent).toContain('Bấm vào một nến');
    q<HTMLButtonElement>('[data-act="random"]').click();
    expect(calls.onRandomStart).toHaveBeenCalled();
    q<HTMLButtonElement>('[data-act="realtime"]').click();
    expect(calls.onClose).toHaveBeenCalled();
  });

  it('switches to the replay controls', () => {
    bar.setMode('replay');
    expect(visibleModes()).toEqual(['replay']);
    q<HTMLButtonElement>('[data-act="play"]').click();
    expect(calls.onPlay).toHaveBeenCalled();
  });

  it('labels speeds in bars per second', () => {
    const options = [...host.querySelectorAll('select[data-act="speed"] option')].map((o) => o.textContent);
    expect(options).toEqual(REPLAY_SPEEDS.map((s) => `${s} nến/giây`));
    expect(q<HTMLSelectElement>('select[data-act="speed"]').value).toBe('5');
  });

  it('shows the bar on screen as a 1-based position', () => {
    bar.setMode('replay');
    bar.setProgress(299, 300);
    expect(q('[data-tcw="progress"]').textContent).toBe('300 / 300');
  });

  it('at the end disables play and highlights the way back to realtime', () => {
    bar.setMode('replay');
    bar.setEnded(true);
    expect(q<HTMLButtonElement>('[data-act="play"]').disabled).toBe(true);
    expect(q('.tcw-replay-bar').classList.contains('tcw-replay-bar--ended')).toBe(true);
  });
});

describe('WidgetReplayBar while the bars load', () => {
  it('says so in the hint, busy, with the controls that pick or move off', () => {
    bar.setPending(true);
    expect(q('.tcw-replay-bar').getAttribute('aria-busy')).toBe('true');
    expect(q('.tcw-replay-hint').textContent).toBe('Loading chart...');
    expect(q<HTMLButtonElement>('[data-act="random"]').disabled).toBe(true);
    expect(q<HTMLInputElement>('[data-act="seek"]').disabled).toBe(true);
    expect(q<HTMLButtonElement>('[data-act="play"]').disabled).toBe(false);
    bar.setPending(false);
    expect(q('.tcw-replay-bar').hasAttribute('aria-busy')).toBe(false);
    expect(q('.tcw-replay-hint').textContent).toBe('Bấm vào một nến');
    expect(q<HTMLButtonElement>('[data-act="random"]').disabled).toBe(false);
  });

  it('offers new steps, and reads the position as where of how many', () => {
    bar.setSteps([{ value: 'bar', label: 'Bar' }, { value: '15m', label: '15m' }], '15m');
    const select = q<HTMLSelectElement>('[data-act="step"]');
    expect(select.value).toBe('15m');
    bar.setProgress(3918, 5000);
    expect(q('[data-act="seek"]').getAttribute('aria-valuetext')).toBe('3919 / 5000');
  });
});
