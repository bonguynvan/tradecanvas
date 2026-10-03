import { createIcon } from './icons.js';
import { EN_TRANSLATOR, type Translator } from './i18n.js';

export interface ChartNavActions {
  zoomIn: () => void;
  zoomOut: () => void;
  /** Scroll a step toward later (1) or earlier (-1) bars. */
  scroll: (direction: 1 | -1) => void;
  /** Back to the whole chart, scaled to fit. */
  reset: () => void;
  /** The plot area in the host, where the buttons sit (centred on its bottom). */
  plotRect: () => { x: number; y: number; width: number; height: number };
}

/** A held scroll button repeats after this, every REPEAT_MS. */
const HOLD_MS = 300;
const REPEAT_MS = 80;

/**
 * Navigation over the chart: zoom out and in, scroll earlier and later
 * (held, it keeps going), reset. It shows while a mouse or pen is over the
 * chart; touch has its own gestures.
 */
export class WidgetChartNav {
  private el: HTMLDivElement;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private repeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (!this.el.classList.contains('tcw-nav-shown')) this.place();
    this.el.classList.add('tcw-nav-shown');
  };
  private readonly onLeave = () => {
    this.el.classList.remove('tcw-nav-shown');
    this.stopHold();
  };

  constructor(
    private readonly host: HTMLElement,
    private readonly actions: ChartNavActions,
    t: Translator = EN_TRANSLATOR,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-nav';
    this.el.setAttribute('role', 'toolbar');
    this.el.setAttribute('aria-label', t('nav.label'));

    const buttons: [string, string, string][] = [
      ['zoomOut', 'minus', t('nav.zoomOut')],
      ['zoomIn', 'plus', t('nav.zoomIn')],
      ['scrollLeft', 'chevronLeft', t('nav.scrollLeft')],
      ['scrollRight', 'chevronRight', t('nav.scrollRight')],
      ['reset', 'reset', t('nav.reset')],
    ];
    for (const [action, icon, label] of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-nav-btn';
      btn.dataset.nav = action;
      btn.title = label;
      btn.setAttribute('aria-label', label);
      btn.innerHTML = createIcon(icon, 16);
      if (action === 'scrollLeft' || action === 'scrollRight') {
        const direction = action === 'scrollRight' ? 1 : -1;
        btn.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          // A release elsewhere (or a lost window) still ends the hold.
          try { btn.setPointerCapture(e.pointerId); } catch { /* an unknown pointer */ }
          this.startHold(direction);
        });
        for (const end of ['pointerup', 'pointercancel', 'pointerleave'] as const) btn.addEventListener(end, () => this.stopHold());
        // A keyboard press scrolls one step.
        btn.addEventListener('click', (e) => {
          if (e.detail === 0) actions.scroll(direction);
        });
      } else {
        btn.addEventListener('click', () => {
          if (action === 'zoomIn') actions.zoomIn();
          else if (action === 'zoomOut') actions.zoomOut();
          else actions.reset();
        });
      }
      this.el.appendChild(btn);
    }

    // A double-click or a right-click on the buttons isn't the chart's (a drawing under them).
    for (const type of ['dblclick', 'contextmenu', 'pointerdown', 'mousedown'] as const) {
      this.el.addEventListener(type, (e) => e.stopPropagation());
    }

    // Shown with the keyboard too, while a button has focus.
    this.el.addEventListener('focusin', () => {
      this.place();
      this.el.classList.add('tcw-nav-shown');
    });
    this.el.addEventListener('focusout', (e) => {
      if (!this.el.contains(e.relatedTarget as Node | null)) this.el.classList.remove('tcw-nav-shown');
    });

    host.appendChild(this.el);
    host.addEventListener('pointermove', this.onMove);
    host.addEventListener('pointerleave', this.onLeave);
  }

  destroy(): void {
    this.stopHold();
    this.host.removeEventListener('pointermove', this.onMove);
    this.host.removeEventListener('pointerleave', this.onLeave);
    this.el.remove();
  }

  private place(): void {
    const r = this.actions.plotRect();
    this.el.style.left = `${Math.round(r.x + r.width / 2)}px`;
    this.el.style.top = `${Math.round(r.y + r.height)}px`;
  }

  private startHold(direction: 1 | -1): void {
    this.stopHold();
    this.actions.scroll(direction);
    this.holdTimer = setTimeout(() => {
      this.repeatTimer = setInterval(() => this.actions.scroll(direction), REPEAT_MS);
    }, HOLD_MS);
  }

  private stopHold(): void {
    if (this.holdTimer) clearTimeout(this.holdTimer);
    if (this.repeatTimer) clearInterval(this.repeatTimer);
    this.holdTimer = null;
    this.repeatTimer = null;
  }
}
