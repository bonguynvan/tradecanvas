/** Pause before the first tooltip shows. */
export const TOOLTIP_DELAY_MS = 300;
/** After one hides, the next shows at once within this window (moving along a toolbar). */
export const TOOLTIP_WARM_MS = 500;
const GAP_PX = 8;
const EDGE_PX = 4;
const SLIDE_PX = 3;

type Side = 'top' | 'bottom' | 'left' | 'right';
const TIPPED = '[title]:not([title=""]), [data-tip]:not([data-tip=""])';

/**
 * Quick, styled tooltips for the widget's controls, in place of the
 * browser's `title` tooltip (a fixed ~1 s wait, unstyled). Any element in
 * the widget with a `title` gets one. While the pointer is on it, its title
 * is lifted into `data-tip` so the browser's own tooltip can't appear, and
 * put back when the pointer leaves — so the title keeps doing its other jobs
 * (accessible description, selectors). Keyboard focus shows the tooltip too,
 * leaving the title in place. `data-tip-side` picks a side.
 */
export class WidgetTooltip {
  private readonly el: HTMLDivElement;
  private target: HTMLElement | null = null;
  private source: 'pointer' | 'focus' | null = null;
  /** The control just pressed (or keyed): no tooltip on it until the pointer leaves. */
  private pressed: HTMLElement | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private watchFrame = 0;
  private warmUntil = 0;
  private readonly observer: MutationObserver;

  constructor(private readonly root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-tooltip';
    this.el.setAttribute('aria-hidden', 'true'); // the control's title still describes it
    root.appendChild(this.el);

    root.addEventListener('pointerover', this.onOver);
    root.addEventListener('pointerout', this.onOut);
    root.addEventListener('pointerdown', this.onPress, true);
    root.addEventListener('keydown', this.onPress, true);
    root.addEventListener('focusin', this.onFocus);
    root.addEventListener('focusout', this.onBlur);
    root.addEventListener('wheel', this.hide, { passive: true });

    // Code that sets the title while the pointer is on the control (e.g.
    // "Magnet ON" ↔ "Magnet OFF" on click) mustn't bring the browser's back.
    this.observer = new MutationObserver(() => {
      const t = this.target;
      if (!t || this.source !== 'pointer' || !t.hasAttribute('title')) return;
      lift(t);
      if (this.isVisible()) this.show(t);
    });
    this.observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['title'] });
  }

  destroy(): void {
    this.hide();
    if (this.pressed) restore(this.pressed);
    this.observer.disconnect();
    this.root.removeEventListener('pointerover', this.onOver);
    this.root.removeEventListener('pointerout', this.onOut);
    this.root.removeEventListener('pointerdown', this.onPress, true);
    this.root.removeEventListener('keydown', this.onPress, true);
    this.root.removeEventListener('focusin', this.onFocus);
    this.root.removeEventListener('focusout', this.onBlur);
    this.root.removeEventListener('wheel', this.hide);
    this.el.remove();
  }

  private readonly onOver = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    const target = this.tipTarget(e.target);
    if (!target || target === this.pressed) return;
    if (target === this.target && this.source === 'pointer') return;
    lift(target);
    this.schedule(target, 'pointer', Date.now() < this.warmUntil || this.isVisible());
  };

  private readonly onOut = (e: PointerEvent): void => {
    const next = e.relatedTarget as Node | null;
    const within = (el: HTMLElement | null) => !!el && !!next && el.contains(next); // still on that control
    if (this.pressed && !within(this.pressed)) {
      restore(this.pressed);
      this.pressed = null;
    }
    if (this.source === 'pointer' && !within(this.target)) this.hide();
  };

  private readonly onPress = (): void => {
    const was = this.target;
    const lifted = this.source === 'pointer';
    this.warmUntil = 0;
    this.clearTimer();
    cancelAnimationFrame(this.watchFrame);
    this.el.classList.remove('tcw-tooltip--visible');
    this.target = null;
    this.source = null;
    // The title stays lifted while the pointer stays, or the browser's tooltip would take over.
    if (this.pressed && this.pressed !== was) restore(this.pressed);
    this.pressed = lifted ? was : null;
  };

  private readonly onFocus = (e: FocusEvent): void => {
    const target = this.tipTarget(e.target);
    // Keyboard focus only: a click focuses the control too, and that is no time for a tooltip.
    if (!target || !isFocusVisible(target) || target === this.pressed) return;
    this.schedule(target, 'focus', true);
  };

  private readonly onBlur = (e: FocusEvent): void => {
    if (this.source !== 'focus') return;
    const next = e.relatedTarget as Node | null;
    if (this.target && next && this.target.contains(next)) return;
    this.hide();
  };

  private readonly hide = (): void => {
    this.clearTimer();
    cancelAnimationFrame(this.watchFrame);
    if (this.isVisible()) this.warmUntil = Date.now() + TOOLTIP_WARM_MS;
    this.el.classList.remove('tcw-tooltip--visible');
    if (this.target && this.source === 'pointer') restore(this.target);
    this.target = null;
    this.source = null;
  };

  private tipTarget(node: EventTarget | null): HTMLElement | null {
    if (!(node instanceof Element)) return null;
    const el = node.closest<HTMLElement>(TIPPED);
    return el && el !== this.el && this.root.contains(el) ? el : null;
  }

  private schedule(target: HTMLElement, source: 'pointer' | 'focus', now: boolean): void {
    const previous = this.target;
    this.clearTimer();
    cancelAnimationFrame(this.watchFrame);
    if (previous && previous !== target && this.source === 'pointer') restore(previous);
    this.target = target;
    this.source = source;
    if (now) {
      this.show(target);
      return;
    }
    this.el.classList.remove('tcw-tooltip--visible');
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      if (this.target === target) this.show(target);
    }, TOOLTIP_DELAY_MS);
  }

  private show(target: HTMLElement): void {
    if (!isShown(target)) {
      this.hide();
      return;
    }
    this.el.textContent = tipText(target);
    this.place(target);
    this.el.classList.add('tcw-tooltip--visible');
    this.watch(target);
  }

  /** While shown, follow the control: gone, hidden or disabled takes the tooltip with it. */
  private watch(target: HTMLElement): void {
    cancelAnimationFrame(this.watchFrame);
    this.watchFrame = requestAnimationFrame(() => {
      if (this.target !== target) return;
      if (!isShown(target)) this.hide();
      else this.watch(target);
    });
  }

  /** Beside the control on its preferred side, flipped and clamped to stay inside the widget. */
  private place(target: HTMLElement): void {
    const box = this.root.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    const left = t.left - box.left;
    const top = t.top - box.top;
    let side = preferredSide(target);
    if (side === 'bottom' && top + t.height + GAP_PX + h > box.height) side = 'top';
    else if (side === 'top' && top - GAP_PX - h < 0) side = 'bottom';
    else if (side === 'right' && left + t.width + GAP_PX + w > box.width) side = 'left';

    let x: number;
    let y: number;
    if (side === 'top' || side === 'bottom') {
      x = left + t.width / 2 - w / 2;
      y = side === 'bottom' ? top + t.height + GAP_PX : top - GAP_PX - h;
    } else {
      x = side === 'right' ? left + t.width + GAP_PX : left - GAP_PX - w;
      y = top + t.height / 2 - h / 2;
    }
    x = Math.max(EDGE_PX, Math.min(box.width - w - EDGE_PX, x));
    y = Math.max(EDGE_PX, Math.min(box.height - h - EDGE_PX, y));
    this.el.style.left = `${Math.round(x)}px`;
    this.el.style.top = `${Math.round(y)}px`;
    // It slides in from the control's side.
    const slide = { top: [0, SLIDE_PX], bottom: [0, -SLIDE_PX], left: [SLIDE_PX, 0], right: [-SLIDE_PX, 0] }[side];
    this.el.style.setProperty('--tcw-tip-dx', `${slide[0]}px`);
    this.el.style.setProperty('--tcw-tip-dy', `${slide[1]}px`);
    this.el.dataset.side = side;
  }

  private isVisible(): boolean {
    return this.el.classList.contains('tcw-tooltip--visible');
  }

  private clearTimer(): void {
    if (this.showTimer === null) return;
    clearTimeout(this.showTimer);
    this.showTimer = null;
  }
}

/** Take the title off while the pointer is on the control, keeping its text in `data-tip`. */
function lift(el: HTMLElement): void {
  const title = el.getAttribute('title');
  if (title === null) return;
  el.dataset.tip = title;
  el.removeAttribute('title');
}

/** Put a lifted title back. */
function restore(el: HTMLElement): void {
  if (el.dataset.tip !== undefined && !el.hasAttribute('title')) {
    el.setAttribute('title', el.dataset.tip);
    delete el.dataset.tip;
  }
}

function tipText(el: HTMLElement): string {
  return el.dataset.tip ?? el.getAttribute('title') ?? '';
}

/** Still on screen and usable: attached, laid out, not disabled. */
function isShown(el: HTMLElement): boolean {
  return el.isConnected && el.getClientRects().length > 0 && !(el as HTMLButtonElement).disabled;
}

function isFocusVisible(el: HTMLElement): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return false; // engines without :focus-visible
  }
}

function preferredSide(el: HTMLElement): Side {
  const side = el.dataset.tipSide as Side | undefined;
  if (side) return side;
  if (el.closest('.tcw-sidebar')) return 'right';
  if (el.closest('.tcw-statusbar, .tcw-replay-bar')) return 'top';
  return 'bottom';
}
