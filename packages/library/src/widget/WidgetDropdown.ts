/** Room kept between a menu in a layer and its button, and the window's edges (px). */
const GAP_PX = 6;
const EDGE_PX = 8;

export class WidgetDropdown {
  private trigger: HTMLElement;
  private panel: HTMLDivElement;
  private _isOpen = false;
  private onOutsideClick: (e: PointerEvent) => void;
  private onEscapeKey: (e: KeyboardEvent) => void;
  private onTriggerClick: () => void;
  /** Where the menu opens, over the page: the widget's overlay layer. Without one it opens inside its button. */
  private readonly layer: (() => HTMLElement) | null;
  private readonly align: 'left' | 'right';
  private readonly onAway = () => this.close();
  private readonly onScroll = (e: Event) => {
    // Its own list scrolling is no reason to go.
    if (e.target instanceof Node && this.panel.contains(e.target)) return;
    this.close();
  };

  /**
   * `layer`: the menu opens there, fixed beside its button (below, or above
   * when there is more room), so no box around the widget clips it and no
   * panel of the widget covers it.
   */
  constructor(trigger: HTMLElement, config: { width?: string; align?: 'left' | 'right'; layer?: () => HTMLElement } = {}) {
    this.trigger = trigger;
    this.layer = config.layer ?? null;
    this.align = config.align ?? 'left';

    this.panel = document.createElement('div');
    this.panel.className = 'tcw-dropdown';
    // At least this wide; wider when a label in the look's font or a longer language needs it.
    this.panel.style.minWidth = config.width ?? '200px';
    this.panel.style.display = 'none';

    if (this.layer) {
      this.layer().appendChild(this.panel);
      // A click that reaches the menu itself is a pick: it closes (an item
      // that keeps it open stops its click), as a click bubbling to the
      // button did when the menu lived inside it.
      this.panel.addEventListener('click', () => this.close());
    } else {
      // From the trigger's start edge (its left, or its right in a right-to-left widget).
      if (this.align === 'right') {
        this.panel.style.insetInlineEnd = '0px';
      } else {
        this.panel.style.insetInlineStart = '0px';
      }
      // Position relative to trigger
      trigger.style.position = 'relative';
      trigger.appendChild(this.panel);
    }

    this.onTriggerClick = () => {
      if (this._isOpen) {
        this.close();
      } else {
        this.open();
      }
    };

    // A press elsewhere closes it: a pointer, so a tap on the chart (whose
    // touches make no mouse events) does too.
    this.onOutsideClick = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!this.trigger.contains(target) && !this.panel.contains(target)) {
        this.close();
      }
    };

    this.onEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };

    trigger.addEventListener('click', this.onTriggerClick);
  }

  setContent(html: string): void {
    this.panel.innerHTML = html;
  }

  open(): void {
    if (this._isOpen) return;
    this._isOpen = true;
    if (this.layer) {
      const layer = this.layer();
      if (this.panel.parentElement !== layer) layer.appendChild(this.panel);
    }
    this.panel.style.display = '';
    if (this.layer) {
      this.place();
      window.addEventListener('resize', this.onAway);
      document.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
    }
    document.addEventListener('pointerdown', this.onOutsideClick);
    document.addEventListener('keydown', this.onEscapeKey);
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.panel.style.display = 'none';
    document.removeEventListener('pointerdown', this.onOutsideClick);
    document.removeEventListener('keydown', this.onEscapeKey);
    window.removeEventListener('resize', this.onAway);
    document.removeEventListener('scroll', this.onScroll, { capture: true });
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  destroy(): void {
    this.close();
    this.trigger.removeEventListener('click', this.onTriggerClick);
    this.panel.remove();
  }

  /** Fixed beside the button: below it, or above when there is more room; inside the window. */
  private place(): void {
    const s = this.panel.style;
    const at = this.trigger.getBoundingClientRect();
    s.position = 'fixed';
    s.margin = '0';
    s.top = s.bottom = s.left = s.right = '';
    const below = window.innerHeight - at.bottom - GAP_PX - EDGE_PX;
    const above = at.top - GAP_PX - EDGE_PX;
    const natural = this.panel.scrollHeight;
    if (natural <= below || below >= above) {
      s.top = `${at.bottom + GAP_PX}px`;
      s.maxHeight = `${Math.max(120, below)}px`;
    } else {
      s.bottom = `${window.innerHeight - at.top + GAP_PX}px`;
      s.maxHeight = `${Math.max(120, above)}px`;
    }
    // From the button's start edge (its right in a right-to-left widget), kept in the window.
    const rtl = getComputedStyle(this.trigger).direction === 'rtl';
    const fromEnd = (this.align === 'right') !== rtl;
    const width = this.panel.offsetWidth;
    const start = fromEnd ? at.right - width : at.left;
    s.left = `${Math.max(EDGE_PX, Math.min(start, window.innerWidth - width - EDGE_PX))}px`;
  }
}
