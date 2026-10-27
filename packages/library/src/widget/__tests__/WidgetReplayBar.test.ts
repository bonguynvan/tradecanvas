// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetReplayBar, REPLAY_RATES, DEFAULT_REPLAY_RATE } from '../WidgetReplayBar.js';
import type { ReplayBarCallbacks } from '../WidgetReplayBar.js';

let host: HTMLDivElement;
let calls: Required<ReplayBarCallbacks>;
let bar: WidgetReplayBar;

const q = <T extends Element = HTMLElement>(sel: string) => host.querySelector(sel) as T;
/** Shown: not hidden itself nor inside something hidden. */
const shown = (sel: string) => {
  const el = host.querySelector(sel);
  return !!el && !el.closest('[hidden]');
};
const key = (el: Element, k: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
};
const STEPS = [{ value: 'bar', label: 'Bar' }, { value: '5m', label: '5m' }];

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  calls = {
    onPlay: vi.fn(), onPause: vi.fn(), onStepBack: vi.fn(), onStepForward: vi.fn(),
    onSeek: vi.fn(), onSpeedChange: vi.fn(), onRandomStart: vi.fn(), onClose: vi.fn(),
    onStepChange: vi.fn(), onSelectBar: vi.fn(), onCancelPick: vi.fn(),
  };
  bar = new WidgetReplayBar(calls, { selectHint: 'Bấm vào một nến', realtime: 'Về thời gian thực', cancel: 'Hủy', selectBar: 'Chọn nến' });
  bar.mount(host, { total: 300, mode: 'select', steps: STEPS, step: '5m' });
});

afterEach(() => {
  vi.useRealTimers();
  bar.destroy();
  host.remove();
});

describe('WidgetReplayBar: picking the start bar', () => {
  it('shows the hint, Random bar, the step and Cancel; no transport and no way back to realtime', () => {
    expect(host.textContent).toContain('Bấm vào một nến');
    expect(shown('[data-act="random"]')).toBe(true);
    expect(shown('[data-act="step"]')).toBe(true);
    expect(shown('[data-act="cancel"]')).toBe(true);
    expect(shown('[data-act="play"]')).toBe(false);
    expect(shown('[data-act="selectBar"]')).toBe(false);
    expect(shown('[data-act="realtime"]')).toBe(false);
    q<HTMLButtonElement>('[data-act="random"]').click();
    expect(calls.onRandomStart).toHaveBeenCalled();
    q<HTMLButtonElement>('[data-act="cancel"]').click();
    expect(calls.onCancelPick).toHaveBeenCalled();
  });

  it('is a named group, not a toolbar of roving buttons', () => {
    const root = q('.tcw-replay-bar');
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('aria-label')).toBe('Replay');
  });
});

describe('WidgetReplayBar: replaying', () => {
  beforeEach(() => bar.setMode('replay'));

  it('has the transport, the track, speed and step fields, Select bar and Back to realtime', () => {
    for (const act of ['stepBack', 'play', 'stepForward', 'seek', 'speed', 'step', 'selectBar', 'realtime']) {
      expect(shown(`[data-act="${act}"]`)).toBe(true);
    }
    expect(shown('[data-act="cancel"]')).toBe(false);
    q<HTMLButtonElement>('[data-act="selectBar"]').click();
    expect(calls.onSelectBar).toHaveBeenCalled();
    q<HTMLButtonElement>('[data-act="realtime"]').click();
    expect(calls.onClose).toHaveBeenCalled();
    // The fields are named by their labels.
    expect(q('[data-act="speed"]').closest('label')?.textContent).toContain('Speed');
  });

  it('offers speeds as multipliers, 1-2-3-5 a decade, 1× by default', () => {
    expect(REPLAY_RATES).toEqual([0.1, 0.2, 0.3, 0.5, 1, 2, 3, 5, 10, 20, 30, 50]);
    expect(DEFAULT_REPLAY_RATE).toBe(1);
    const options = [...host.querySelectorAll('select[data-act="speed"] option')].map((o) => o.textContent);
    expect(options[0]).toBe('0.1×');
    expect(options[4]).toBe('1×');
    expect(q<HTMLSelectElement>('select[data-act="speed"]').value).toBe('1');
    const speed = q<HTMLSelectElement>('select[data-act="speed"]');
    speed.value = '5';
    speed.dispatchEvent(new Event('change'));
    expect(calls.onSpeedChange).toHaveBeenCalledWith(5);
  });

  it('writes the multipliers in the widget\'s number format', () => {
    const de = new WidgetReplayBar(calls, {});
    const other = document.createElement('div');
    de.mount(other, { total: 10, mode: 'replay', formatRate: (r) => `${String(r).replace('.', ',')}×` });
    expect(other.querySelector('select[data-act="speed"] option')?.textContent).toBe('0,1×');
    de.destroy();
  });

  it('shows where the replay is as a date, on the track and in its readout, with the played part filled', () => {
    bar.setProgress(149, 300, 'Oct 22 · 14:05');
    expect(q('[data-tcw="time"]').textContent).toBe('Oct 22 · 14:05');
    expect(q('[data-tcw="time"]').getAttribute('aria-hidden')).toBe('true');
    const track = q<HTMLInputElement>('input[data-act="seek"]');
    expect(track.getAttribute('aria-valuetext')).toBe('Oct 22 · 14:05');
    expect(track.style.getPropertyValue('--tcw-replay-done')).toBe('49.83%');
    // A total that changes (older bars, another interval) moves the track's end.
    bar.setProgress(10, 5000, 'Oct 1');
    expect(track.max).toBe('4999');
  });

  it('reads the position as where of how many without a time', () => {
    bar.setProgress(3918, 5000);
    expect(q('[data-act="seek"]').getAttribute('aria-valuetext')).toBe('3919 / 5000');
  });

  it('at the end disables Play and puts the way back to realtime forward', () => {
    const play = q<HTMLButtonElement>('[data-act="play"]');
    play.focus();
    bar.setEnded(true);
    expect(play.disabled).toBe(true);
    expect(q('.tcw-replay-bar').classList.contains('tcw-replay-bar--ended')).toBe(true);
    expect(document.activeElement).toBe(q('[data-act="realtime"]'));
  });

  it('says Play or Pause on its one button, and names only its own key', () => {
    const play = q<HTMLButtonElement>('[data-act="play"]');
    expect(play.getAttribute('aria-label')).toBe('Play');
    expect(play.getAttribute('aria-keyshortcuts')).toBe('Space');
    bar.setState('playing');
    expect(play.getAttribute('aria-label')).toBe('Pause');
    // The steps' labels already name their keys.
    expect(q('[data-act="stepBack"]').hasAttribute('aria-keyshortcuts')).toBe(false);
  });
});

describe('WidgetReplayBar: keyboard', () => {
  beforeEach(() => bar.setMode('replay'));

  it('Space on the track plays and pauses, and goes no further', () => {
    const track = q<HTMLInputElement>('input[data-act="seek"]');
    track.focus();
    const outside = vi.fn();
    document.addEventListener('keydown', outside);
    expect(key(track, ' ').defaultPrevented).toBe(true);
    expect(calls.onPlay).toHaveBeenCalledTimes(1);
    bar.setState('playing');
    key(track, ' ');
    expect(calls.onPause).toHaveBeenCalledTimes(1);
    expect(outside).not.toHaveBeenCalled();
    document.removeEventListener('keydown', outside);
  });

  it('leaves Space to a focused button or field', () => {
    const fwd = q<HTMLButtonElement>('[data-act="stepForward"]');
    expect(key(fwd, ' ').defaultPrevented).toBe(false);
    expect(key(q('[data-act="speed"]'), ' ').defaultPrevented).toBe(false);
    expect(calls.onPlay).not.toHaveBeenCalled();
  });

  it('keeps a plain tab order: buttons, the track, then the fields', () => {
    const order = [...host.querySelectorAll<HTMLElement>('button, input, select')]
      .filter((el) => !el.closest('[hidden]'))
      .map((el) => el.dataset.act);
    expect(order).toEqual(['stepBack', 'play', 'stepForward', 'seek', 'speed', 'step', 'selectBar', 'realtime']);
    expect([...host.querySelectorAll('[tabindex="-1"]')]).toHaveLength(0);
  });
});

describe('WidgetReplayBar: focus', () => {
  it('lands on Back to realtime, not on a disabled Play, after Cancel on a finished replay', () => {
    bar.setMode('replay');
    bar.setEnded(true);
    bar.setMode('select');
    q<HTMLButtonElement>('[data-act="cancel"]').focus();
    bar.setMode('replay');
    expect(document.activeElement).toBe(q('[data-act="realtime"]'));
  });

  it('on a phone tabs in the order shown: the track and the close button first', () => {
    bar.setMode('replay');
    bar.setRoom(-1);
    expect(q('.tcw-replay-bar').dataset.fit).toBe('stack');
    const order = () => [...host.querySelectorAll<HTMLElement>('button, input, select')]
      .filter((el) => !el.closest('[hidden]'))
      .map((el) => el.dataset.act);
    expect(order()).toEqual(['seek', 'realtime', 'stepBack', 'play', 'stepForward', 'speed', 'step', 'selectBar']);
    const track = q<HTMLInputElement>('input[data-act="seek"]');
    track.focus();
    bar.setRoom(1300);
    expect(order()).toEqual(['stepBack', 'play', 'stepForward', 'seek', 'speed', 'step', 'selectBar', 'realtime']);
    expect(document.activeElement).toBe(track);
  });
});

describe('WidgetReplayBar: what assistive technology hears', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    bar.setMode('replay');
  });
  const live = () => q('[role="status"][data-tcw="announce"]').textContent;

  it('says play, pause and the end, not each step of a run', () => {
    bar.setProgress(100, 300, 'Oct 22 · 14:00');
    vi.advanceTimersByTime(400);
    bar.setState('playing');
    vi.advanceTimersByTime(400);
    expect(live()).toBe('Playing at 1×');
    bar.setProgress(101, 300, 'Oct 22 · 15:00');
    vi.advanceTimersByTime(400);
    expect(live()).toBe('Playing at 1×');
    bar.setState('paused');
    vi.advanceTimersByTime(400);
    expect(live()).toBe('Paused at Oct 22 · 15:00');
    bar.setEnded(true);
    vi.advanceTimersByTime(400);
    expect(live()).toBe('Replay ended at Oct 22 · 15:00');
  });

  it('leaves a move on the focused track to the track, which says it', () => {
    q<HTMLInputElement>('input[data-act="seek"]').focus();
    bar.setProgress(120, 300, 'Oct 22 · 16:00');
    vi.advanceTimersByTime(400);
    expect(live()).toBe('');
    expect(q('input[data-act="seek"]').getAttribute('aria-valuetext')).toBe('Oct 22 · 16:00');
  });

  it('says a burst of steps once, when the keys rest', () => {
    const region = q('[role="status"][data-tcw="announce"]');
    const writes: string[] = [];
    new MutationObserver(() => writes.push(region.textContent ?? '')).observe(region, { childList: true, characterData: true, subtree: true });
    for (let i = 0; i < 10; i++) {
      bar.setProgress(100 + i, 300, `Oct 22 · ${10 + i}:00`);
      vi.advanceTimersByTime(30);
    }
    vi.advanceTimersByTime(400);
    return Promise.resolve().then(() => {
      expect(writes).toEqual(['Oct 22 · 19:00']);
    });
  });
});

describe('WidgetReplayBar while the bars load', () => {
  it('is busy, the hint says so, and the controls that pick or move wait (Play stays)', () => {
    bar.setPending(true);
    // Its groups are busy, not the bar: the status region stays outside them.
    expect(q('.tcw-replay-bar').hasAttribute('aria-busy')).toBe(false);
    expect(q('.tcw-replay-picking').getAttribute('aria-busy')).toBe('true');
    expect(q('[data-tcw="announce"]').closest('[aria-busy]')).toBeNull();
    expect(q('.tcw-replay-hint').textContent).toBe('Loading chart...');
    for (const act of ['random', 'seek', 'stepForward', 'selectBar']) {
      expect(q<HTMLButtonElement>(`[data-act="${act}"]`).disabled).toBe(true);
    }
    expect(q<HTMLButtonElement>('[data-act="play"]').disabled).toBe(false);
    bar.setPending(false);
    expect(host.querySelector('[aria-busy]')).toBeNull();
    expect(q('.tcw-replay-hint').textContent).toBe('Bấm vào một nến');
    expect(q<HTMLButtonElement>('[data-act="random"]').disabled).toBe(false);
  });

  it('says it is loading during a replay, and moves focus off a control that waits', () => {
    vi.useFakeTimers();
    bar.setMode('replay');
    q<HTMLButtonElement>('[data-act="stepForward"]').focus();
    bar.setPending(true);
    expect(document.activeElement).toBe(q('[data-act="play"]'));
    vi.advanceTimersByTime(400);
    expect(q('[data-tcw="announce"]').textContent).toBe('Loading chart...');
  });

  it('offers new steps', () => {
    bar.setSteps([{ value: 'bar', label: 'Bar' }, { value: '15m', label: '15m' }], '15m');
    expect(q<HTMLSelectElement>('[data-act="step"]').value).toBe('15m');
    bar.setSteps([{ value: 'bar', label: 'Bar' }], 'bar');
    expect(q('[data-act="step"]')).toBeNull();
  });
});

describe('WidgetReplayBar: right to left', () => {
  it('stays left to right with time; its words read in the widget\'s direction, its figures not', () => {
    const rtl = new WidgetReplayBar(calls, {});
    const other = document.createElement('div');
    rtl.mount(other, { total: 10, mode: 'replay', dir: 'rtl', steps: STEPS });
    expect(other.querySelector('.tcw-replay-bar')?.hasAttribute('dir')).toBe(false);
    expect(other.querySelector('.tcw-replay-hint')?.getAttribute('dir')).toBe('rtl');
    expect(other.querySelector('[data-tcw="time"]')?.getAttribute('dir')).toBe('rtl');
    expect(other.querySelector('[data-act="speed"]')?.getAttribute('dir')).toBe('ltr');
    expect(other.querySelector('[data-act="step"]')?.getAttribute('dir')).toBe('ltr');
    rtl.destroy();
  });
});

describe('WidgetReplayBar: fitting the room it has', () => {
  /** The widths the bar takes in each tier, as a browser would measure them. */
  const WIDTHS: Record<string, number> = { full: 700, compact: 520, stack: 360 };
  beforeEach(() => {
    bar.setMode('replay');
    const root = q('.tcw-replay-bar');
    vi.spyOn(root, 'getBoundingClientRect').mockImplementation(
      () => ({ width: WIDTHS[root.dataset.fit ?? 'full'] }) as DOMRect,
    );
  });

  it('takes the widest tier that fits, the same each way', () => {
    bar.setRoom(1300);
    expect(q('.tcw-replay-bar').dataset.fit).toBe('full');
    bar.setRoom(600);
    expect(q('.tcw-replay-bar').dataset.fit).toBe('compact');
    bar.setRoom(380);
    expect(q('.tcw-replay-bar').dataset.fit).toBe('stack');
    bar.setRoom(1300);
    expect(q('.tcw-replay-bar').dataset.fit).toBe('full');
  });
});
