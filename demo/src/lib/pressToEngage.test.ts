// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pressToEngage } from './pressToEngage';

/** An IntersectionObserver the test drives by hand. */
class FakeObserver {
  static last: FakeObserver | null = null;
  disconnected = false;
  constructor(private readonly callback: (entries: { isIntersecting: boolean }[]) => void) {
    FakeObserver.last = this;
  }
  observe(): void {}
  disconnect(): void {
    this.disconnected = true;
  }
  fire(...states: boolean[]): void {
    this.callback(states.map((isIntersecting) => ({ isIntersecting })));
  }
}

/** A frame holding the chart's surface and a control of its own, and something else on the page. */
function mount() {
  const frame = document.createElement('div');
  frame.innerHTML = '<div class="surface"><canvas></canvas></div><button class="control">x</button>';
  const elsewhere = document.createElement('p');
  document.body.append(frame, elsewhere);
  return {
    frame,
    elsewhere,
    surface: frame.querySelector<HTMLElement>('.surface')!,
    control: frame.querySelector<HTMLElement>('.control')!,
  };
}

/** A pointer event of `type` from a mouse or a finger (jsdom may lack PointerEvent). */
function pointer(
  type: string,
  pointerType: 'mouse' | 'touch' = 'mouse',
  init: { buttons?: number; relatedTarget?: EventTarget | null } = {},
): Event {
  const e = new MouseEvent(type, { bubbles: type !== 'pointerleave', ...init });
  Object.defineProperty(e, 'pointerType', { value: pointerType });
  return e;
}

/** A widget's dialog, mounted outside the chart's frame as widgets do. */
function dialog(): HTMLElement {
  const portal = document.createElement('div');
  portal.className = 'portal';
  portal.innerHTML = '<input class="field">';
  document.body.append(portal);
  return portal.querySelector('.field')!;
}

const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const engaged = (frame: Element) => frame.hasAttribute('data-engaged');

describe('pressToEngage', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('lets the wheel and touches pass through the surface to the page until a click', () => {
    const { frame, surface } = mount();
    pressToEngage(frame, { surface: '.surface' });
    expect(surface.style.pointerEvents).toBe('none');

    click(frame);
    expect(surface.style.pointerEvents).toBe('');
    expect(engaged(frame)).toBe(true);
  });

  it('is not engaged by a swipe that scrolls the page: no click comes of it', () => {
    const { frame } = mount();
    pressToEngage(frame, { surface: '.surface' });

    frame.dispatchEvent(pointer('pointerdown', 'touch'));
    frame.dispatchEvent(pointer('pointercancel', 'touch'));
    expect(engaged(frame)).toBe(false);
  });

  it('does not engage on a click on one of the frame controls', () => {
    const { frame, control } = mount();
    const onEngage = vi.fn();
    pressToEngage(frame, { surface: '.surface', ignore: '.control', onEngage });

    click(control);
    expect(engaged(frame)).toBe(false);
    expect(onEngage).not.toHaveBeenCalled();
  });

  it('calls onEngage and onRelease once each way', () => {
    const { frame, elsewhere } = mount();
    const onEngage = vi.fn();
    const onRelease = vi.fn();
    pressToEngage(frame, { surface: '.surface', onEngage, onRelease });

    click(frame);
    click(frame);
    expect(onEngage).toHaveBeenCalledTimes(1);

    elsewhere.dispatchEvent(pointer('pointerdown'));
    elsewhere.dispatchEvent(pointer('pointerdown'));
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('lets go on a press elsewhere on the page', () => {
    const { frame, surface, elsewhere } = mount();
    pressToEngage(frame, { surface: '.surface' });
    click(frame);

    elsewhere.dispatchEvent(pointer('pointerdown', 'touch'));
    expect(engaged(frame)).toBe(false);
    expect(surface.style.pointerEvents).toBe('none');
  });

  it('keeps hold on a press inside the frame', () => {
    const { frame, surface } = mount();
    pressToEngage(frame, { surface: '.surface' });
    click(frame);

    surface.dispatchEvent(pointer('pointerdown'));
    expect(engaged(frame)).toBe(true);
  });

  it('lets go when the mouse leaves, but not when a finger lifts', () => {
    const { frame } = mount();
    pressToEngage(frame, { surface: '.surface' });
    click(frame);

    frame.dispatchEvent(pointer('pointerleave', 'touch'));
    expect(engaged(frame)).toBe(true);

    frame.dispatchEvent(pointer('pointerleave', 'mouse'));
    expect(engaged(frame)).toBe(false);
  });

  it('keeps hold through a drag that leaves the frame, and lets go if it ends outside', () => {
    const { frame, surface, elsewhere } = mount();
    pressToEngage(frame, { surface: '.surface' });
    click(frame);

    frame.dispatchEvent(pointer('pointerleave', 'mouse', { buttons: 1 }));
    expect(engaged(frame)).toBe(true);
    elsewhere.dispatchEvent(pointer('pointerup'));
    expect(engaged(frame)).toBe(false);

    click(frame);
    frame.dispatchEvent(pointer('pointerleave', 'mouse', { buttons: 1 }));
    surface.dispatchEvent(pointer('pointerup'));
    expect(engaged(frame)).toBe(true);
  });

  it('keeps hold while the dialogs of the chart are used', () => {
    const { frame } = mount();
    const field = dialog();
    pressToEngage(frame, { surface: '.surface', outside: '.portal' });
    click(frame);

    frame.dispatchEvent(pointer('pointerleave', 'mouse', { relatedTarget: field }));
    field.dispatchEvent(pointer('pointerdown'));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(engaged(frame)).toBe(true);
  });

  it('lets go on Escape', () => {
    const { frame } = mount();
    pressToEngage(frame, { surface: '.surface' });
    click(frame);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(engaged(frame)).toBe(false);
  });

  it('lets go when scrolled out of view, going by the latest record', () => {
    const { frame } = mount();
    pressToEngage(frame, { surface: '.surface' });
    click(frame);

    FakeObserver.last!.fire(false, true);
    expect(engaged(frame)).toBe(true);
    FakeObserver.last!.fire(true, false);
    expect(engaged(frame)).toBe(false);
  });

  it('finds a surface added after it starts, as a chart mounted later', () => {
    const frame = document.createElement('div');
    document.body.append(frame);
    pressToEngage(frame, { surface: '.surface' });

    const surface = document.createElement('div');
    surface.className = 'surface';
    frame.append(surface);
    FakeObserver.last!.fire(true);
    expect(surface.style.pointerEvents).toBe('none');
  });

  it('undoes everything on destroy', () => {
    const { frame, surface, elsewhere } = mount();
    const onRelease = vi.fn();
    const action = pressToEngage(frame, { surface: '.surface', onRelease });
    const observer = FakeObserver.last!;
    click(frame);

    action.destroy();
    expect(surface.style.pointerEvents).toBe('');
    expect(engaged(frame)).toBe(false);
    expect(observer.disconnected).toBe(true);
    elsewhere.dispatchEvent(pointer('pointerdown'));
    click(frame);
    expect(engaged(frame)).toBe(false);
    expect(onRelease).not.toHaveBeenCalled();
  });

  it('works without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { frame, surface } = mount();
    pressToEngage(frame, { surface: '.surface' });

    click(frame);
    expect(surface.style.pointerEvents).toBe('');
  });
});
