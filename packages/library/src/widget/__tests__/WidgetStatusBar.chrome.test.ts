// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WidgetStatusBar, type StatusBarClock, type StatusBarScale } from '../WidgetStatusBar.js';

let root: HTMLDivElement;
let bar: WidgetStatusBar;
let calls: string[];
let time: { time: string; zone: string };

function make(): void {
  const clock: StatusBarClock = {
    label: 'Timezone',
    now: () => time,
    options: () => ({ current: 'local', list: [{ value: 'local', label: 'Local' }, { value: 'UTC', label: 'UTC' }] }),
    onPick: (value) => calls.push(`zone ${value}`),
  };
  const scale: StatusBarScale = {
    labels: { percent: 'Percentage', log: 'Logarithmic', auto: 'Auto scale' },
    onPercent: () => calls.push('percent'),
    onLog: () => calls.push('log'),
    onAuto: () => calls.push('auto'),
  };
  bar = new WidgetStatusBar(root, undefined, { clock, scale });
}

beforeEach(() => {
  root = document.createElement('div');
  root.className = 'tcw-root';
  document.body.appendChild(root);
  calls = [];
  time = { time: '14:05:09', zone: 'UTC+7' };
  make();
});

afterEach(() => {
  bar.destroy();
  root.remove();
});

const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);

describe('the status bar', () => {
  it('no longer repeats the symbol and interval: the legend names them', () => {
    bar.update({ connectionState: 'connected', message: 'Live', symbol: 'BTCUSDT', timeframe: '5m' });
    expect(root.textContent).not.toContain('BTCUSDT');
  });

  it('shows the time in the display zone, and keeps it going', () => {
    expect(q('[data-role="clock"]')!.textContent).toBe('14:05:09 UTC+7');
    time = { time: '14:05:10', zone: 'UTC+7' };
    bar.tick();
    expect(q('[data-role="clock"]')!.textContent).toBe('14:05:10 UTC+7');
  });

  it('opens the zones from the clock, the one in use ticked', () => {
    q<HTMLButtonElement>('[data-role="clock"]')!.click();
    const items = [...root.querySelectorAll<HTMLButtonElement>('.tcw-context-menu [role^="menuitem"]')];
    expect(items.map((b) => b.textContent?.trim())).toEqual(['Local', 'UTC']);
    expect(items[0].getAttribute('aria-checked')).toBe('true');
    items[1].click();
    expect(calls).toEqual(['zone UTC']);
  });

  it('switches the price scale: percent, log, auto, each showing whether it is on', () => {
    const btn = (name: string) => q<HTMLButtonElement>(`[data-scale="${name}"]`)!;
    expect(['percent', 'log', 'auto'].map((n) => btn(n).textContent)).toEqual(['%', 'log', 'auto']);
    bar.setScale({ mode: 'logarithmic', auto: false });
    expect(btn('log').getAttribute('aria-pressed')).toBe('true');
    expect(btn('percent').getAttribute('aria-pressed')).toBe('false');
    expect(btn('auto').getAttribute('aria-pressed')).toBe('false');
    expect(btn('log').getAttribute('aria-label')).toBe('Logarithmic');
    for (const n of ['percent', 'log', 'auto']) btn(n).click();
    expect(calls).toEqual(['percent', 'log', 'auto']);
  });
});
