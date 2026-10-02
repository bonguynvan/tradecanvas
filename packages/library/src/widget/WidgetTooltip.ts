/** Pause before the first tooltip shows. */
export const TOOLTIP_DELAY_MS = 300;
/** After one hides, the next shows at once within this window (moving along a toolbar). */
export const TOOLTIP_WARM_MS = 500;
const GAP_PX = 8;
const EDGE_PX = 4;
const SLIDE_PX = 3;

type Side = 'top' | 'bottom' | 'left' | 'right';

/**
 * Quick, styled tooltips for the widget's controls, in place of the
 * browser's `title` tooltip (a fixed ~1 s wait, unstyled). Any element in
 * the widget with a `title` gets one: on first hover or focus the title moves
 * to `data-tip` — and becomes the accessible name of an icon-only control —
 * so the browser's own never appears. `data-tip-side` picks a side.
 */
export class WidgetTooltip {
  private readonly el: HTMLDivElement;
  private target: HTMLElement | null = null;
  /** The control just pressed: no tooltip on it until the pointer leaves. */
  private pressed: HTMLElement | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private warmUntil = 0;
  private readonly observer: MutationObserver;

  constructor(private readonly root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-tooltip';
    this.el.setAttribute('aria-hidden', 'true'); // the control's own name carries the text
    root.appendChild(this.el);

    root.addEventListener('pointerover', this.onOver);
    root.addEventListener('pointerout', this.onOut);
    root.addEventListener('pointerdown', this.onPress, true);
    root.addEventListener('focusin', this.onFocus);
    root.addEventListener('focusout', this.onOut);
    root.addEventListener('wheel', this.hide, { passive: true });

    // Code that sets a title again later (e.g. "Magnet ON" ↔ "Magnet OFF")
    // must not bring the browser's tooltip back on a control already taken over.
    this.observer = new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        if (!el.hasAttribute('title') || !('tip' in el.dataset)) continue;
        adopt(el);
        if (el === this.target) this.el.textContent = el.dataset.tip ?? '';
      }
    });
    this.observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['title'] });
  }

  destroy(): void {
    this.clearTimer();
    this.observer.disconnect();
    this.root.removeEventListener('pointerover', this.onOver);
    this.root.removeEventListener('pointerout', this.onOut);
    this.root.removeEventListener('pointerdown', this.onPress, true);
    this.root.removeEventListener('focusin', this.onFocus);
    this.root.removeEventListener('focusout', this.onOut);
    this.root.removeEventListener('wheel', this.hide);
    this.el.remove();
  }

  private readonly onOver = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    const target = this.tipTarget(e.target);
    if (!target || target === this.target || target === this.pressed) return;
    this.schedule(target, Date.now() < this.warmUntil || this.isVisible());
  };

  private readonly onOut = (e: PointerEvent | FocusEvent): void => {
    const next = e.relatedTarget as Node | null;
    const current = this.target ?? this.pressed;
    if (current && next && current.contains(next)) return; // still on the same control
    this.pressed = null;
    this.hide();
  };

  private readonly onPress = (): void => {
    this.pressed = this.target;
    this.warmUntil = 0;
    this.clearTimer();
    this.el.classList.remove('tcw-tooltip--visible');
    this.target = null;
  };

  private readonly onFocus = (e: FocusEvent): void => {
    const target = this.tipTarget(e.target);
    // Keyboard focus only: a click focuses the control too, and that is no time for a tooltip.
    if (target && target.matches(':focus-visible')) this.schedule(target, true);
  };

  private readonly hide = (): void => {
    this.clearTimer();
    if (this.isVisible()) this.warmUntil = Date.now() + TOOLTIP_WARM_MS;
    this.el.classList.remove('tcw-tooltip--visible');
    this.target = null;
  };

  private tipTarget(node: EventTarget | null): HTMLElement | null {
    if (!(node instanceof Element)) return null;
    const el = node.closest<HTMLElement>('[title], [data-tip]');
    if (!el || !this.root.contains(el) || el === this.el) return null;
    adopt(el);
    return el.dataset.tip ? el : null;
  }

  private schedule(target: HTMLElement, now: boolean): void {
    this.clearTimer();
    this.target = target;
    if (now) {
      this.show(target);
      return;
    }
    this.el.classList.remove('tcw-tooltip--visible');
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      if (this.target === target && target.isConnected) this.show(target);
    }, TOOLTIP_DELAY_MS);
  }

  private show(target: HTMLElement): void {
    this.el.textContent = target.dataset.tip ?? '';
    this.place(target);
    this.el.classList.add('tcw-tooltip--visible');
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

/** Move `title` to `data-tip`; an icon-only control also gets it as its accessible name. */
function adopt(el: HTMLElement): void {
  const title = el.getAttribute('title');
  if (title === null) return;
  el.removeAttribute('title');
  el.dataset.tip = title;
  const ownsLabel = el.dataset.tipLabel === 'true';
  if (ownsLabel || (!el.hasAttribute('aria-label') && !el.textContent?.trim())) {
    el.setAttribute('aria-label', title);
    el.dataset.tipLabel = 'true';
  }
}

function preferredSide(el: HTMLElement): Side {
  const side = el.dataset.tipSide as Side | undefined;
  if (side) return side;
  if (el.closest('.tcw-sidebar')) return 'right';
  if (el.closest('.tcw-statusbar, .tcw-replay-bar')) return 'top';
  return 'bottom';
}
