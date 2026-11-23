// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InteractionManager } from '../InteractionManager.js';
import { PanHandler } from '../PanHandler.js';

let el: HTMLDivElement;
let im: InteractionManager;
let pan: ReturnType<typeof vi.fn>;
/** What the chart was told: held or let go, and where. */
let told: [boolean, number][];
let clicks: number[];

const at = (type: string, x: number, init: MouseEventInit = {}) =>
  new MouseEvent(type, { clientX: x, clientY: 50, bubbles: true, ...init });
const press = (x: number, init: MouseEventInit = {}) => el.dispatchEvent(at('mousedown', x, { button: 0, buttons: 1, ...init }));
const move = (x: number) => document.dispatchEvent(at('mousemove', x, { buttons: 1 }));
const letGo = (x: number) => document.dispatchEvent(at('mouseup', x, { button: 0 }));
/** Longer than a press is held before it counts. */
const A_HOLD_MS = 600;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  el = document.createElement('div');
  document.body.appendChild(el);
  // jsdom has no layout: give the chart a 400×300 box at the origin.
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) });
  pan = vi.fn();
  told = [];
  clicks = [];
  im = new InteractionManager(el);
  im.setPanHandler(new PanHandler(pan));
  im.setHoldHandler((held, pos) => told.push([held, pos.x]));
  im.setClickHandler((pos) => clicks.push(pos.x));
  im.attach();
});

afterEach(() => {
  im.detach();
  el.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// The price popup followed every move of the mouse; it is asked for with a press held still, as on a touch screen.
describe('InteractionManager: a mouse press held still on the plot', () => {
  it('is told as held, and as let go when the button is: it is no click', () => {
    press(200);
    vi.advanceTimersByTime(A_HOLD_MS);
    expect(told).toEqual([[true, 200]]);
    letGo(200);
    expect(told).toEqual([[true, 200], [false, 200]]);
    expect(clicks).toEqual([]);
  });

  it('is a pan once it moves before the wait is over, and is never held', () => {
    press(200);
    move(150);
    vi.advanceTimersByTime(A_HOLD_MS);
    letGo(150);
    expect(told).toEqual([]);
    expect(pan.mock.calls.map((c) => c[0])).toEqual([50]);
  });

  it('pans nothing while held: the pointer moves the crosshair alone', () => {
    press(200);
    vi.advanceTimersByTime(A_HOLD_MS);
    move(120);
    move(90);
    letGo(90);
    expect(pan).not.toHaveBeenCalled();
    expect(told.at(-1)).toEqual([false, 90]);
  });

  it('keeps the few pixels a hand shakes for a press held still', () => {
    press(200);
    move(202);
    vi.advanceTimersByTime(A_HOLD_MS);
    expect(told).toEqual([[true, 200]]);
  });

  it('is a click when let go before the wait is over, as before', () => {
    press(200);
    vi.advanceTimersByTime(100);
    letGo(200);
    vi.advanceTimersByTime(A_HOLD_MS);
    expect(told).toEqual([]);
    expect(clicks).toEqual([200]);
  });

  it('is let go when the button was released outside the window', () => {
    press(200);
    vi.advanceTimersByTime(A_HOLD_MS);
    // No mouseup ever arrives; the next move reports no button held.
    document.dispatchEvent(at('mousemove', 120, { buttons: 0 }));
    expect(told).toEqual([[true, 200], [false, 120]]);
  });

  it('is not held where the press was taken by something else: an Alt-click pins the tooltip', () => {
    im.setAltClickHandler(() => {});
    press(200, { altKey: true });
    vi.advanceTimersByTime(A_HOLD_MS);
    expect(told).toEqual([]);
  });

  it('is a pan that has not moved with no one to tell: a click when let go', () => {
    im.setHoldHandler(null);
    press(200);
    vi.advanceTimersByTime(A_HOLD_MS);
    letGo(200);
    expect(told).toEqual([]);
    expect(clicks).toEqual([200]);
  });

  it('waits no longer once the chart is taken off the page', () => {
    press(200);
    im.detach();
    vi.advanceTimersByTime(A_HOLD_MS);
    expect(told).toEqual([]);
  });
});
