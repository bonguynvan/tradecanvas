/**
 * Keyboard-shortcut reference sheet. Bound to `?` (and `Shift+/`). Surfaces
 * shortcuts so users discover the widget's hidden interaction model — a
 * premium-feel detail TradingView, Linear, Figma, etc. all ship.
 */
export interface HotkeySheetCallbacks {
  onClose: () => void;
}

interface HotkeyEntry {
  keys: string[];
  label: string;
}

interface HotkeyGroup {
  title: string;
  entries: HotkeyEntry[];
}

const isMac =
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? '⌘' : 'Ctrl';

const GROUPS: HotkeyGroup[] = [
  {
    title: 'Search & navigation',
    entries: [
      { keys: [mod, 'K'], label: 'Command palette' },
      { keys: [mod, 'P'], label: 'Symbol search' },
      { keys: ['?'], label: 'Show this sheet' },
    ],
  },
  {
    title: 'Chart manipulation',
    entries: [
      { keys: ['Shift', 'Drag'], label: 'Measure tool (bars × price Δ)' },
      { keys: ['Drag', 'Price axis'], label: 'Compress / expand vertical scale' },
      { keys: ['Drag', 'Time axis'], label: 'Zoom time axis' },
      { keys: ['Double-click', 'Price axis'], label: 'Re-enable auto-scale' },
      { keys: ['Double-click', 'Time axis'], label: 'Fit content' },
      { keys: ['Scroll'], label: 'Zoom around cursor' },
    ],
  },
  {
    title: 'Touch (mobile / tablet)',
    entries: [
      { keys: ['1 finger', 'Drag'], label: 'Pan / move crosshair' },
      { keys: ['2 fingers', 'Pinch'], label: 'Zoom around midpoint' },
      { keys: ['Long-press'], label: 'Pin OHLC tooltip at bar' },
      { keys: ['Drag', 'Axis strip'], label: 'Scale price / time axis' },
    ],
  },
  {
    title: 'Keyboard',
    entries: [
      { keys: ['←', '→'], label: 'Pan one bar' },
      { keys: ['+', '−'], label: 'Zoom in / out' },
      { keys: ['Home'], label: 'Scroll to start' },
      { keys: ['End'], label: 'Scroll to end (live edge)' },
      { keys: ['F'], label: 'Fit content' },
    ],
  },
  {
    title: 'Drawing',
    entries: [
      { keys: [mod, 'Z'], label: 'Undo' },
      { keys: [mod, 'Shift', 'Z'], label: 'Redo' },
      { keys: ['Esc'], label: 'Cancel active drawing' },
    ],
  },
];

export class WidgetHotkeySheet {
  private backdrop: HTMLDivElement | null = null;
  private modal: HTMLDivElement | null = null;
  private callbacks: HotkeySheetCallbacks;
  private boundKeydown: (e: KeyboardEvent) => void;

  constructor(callbacks: HotkeySheetCallbacks) {
    this.callbacks = callbacks;
    this.boundKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    };
  }

  open(): void {
    if (this.backdrop) return;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.addEventListener('click', () => this.close());

    this.modal = document.createElement('div');
    this.modal.className = 'tcw-modal tcw-hotkey-sheet';
    this.modal.style.width = '640px';

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    header.innerHTML = '<h3>Keyboard shortcuts</h3>';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);
    this.modal.appendChild(header);

    const body = document.createElement('div');
    body.className = 'tcw-modal-body';

    const grid = document.createElement('div');
    grid.className = 'tcw-hotkey-grid';

    for (const group of GROUPS) {
      const section = document.createElement('section');
      section.className = 'tcw-hotkey-section';
      const title = document.createElement('div');
      title.className = 'tcw-settings-section-title';
      title.textContent = group.title;
      section.appendChild(title);

      for (const entry of group.entries) {
        const row = document.createElement('div');
        row.className = 'tcw-hotkey-row';

        const keys = document.createElement('div');
        keys.className = 'tcw-hotkey-keys';
        for (let i = 0; i < entry.keys.length; i++) {
          if (i > 0) {
            const plus = document.createElement('span');
            plus.className = 'tcw-hotkey-sep';
            plus.textContent = '+';
            keys.appendChild(plus);
          }
          const kbd = document.createElement('kbd');
          kbd.className = 'tcw-cmd-kbd';
          kbd.textContent = entry.keys[i];
          keys.appendChild(kbd);
        }
        row.appendChild(keys);

        const label = document.createElement('span');
        label.className = 'tcw-hotkey-label';
        label.textContent = entry.label;
        row.appendChild(label);

        section.appendChild(row);
      }

      grid.appendChild(section);
    }

    body.appendChild(grid);
    this.modal.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    footer.innerHTML = '<span style="font-size:11px;color:var(--tcw-text-muted)">Press ? anytime to show this sheet</span>';
    const ok = document.createElement('button');
    ok.className = 'tcw-done-btn';
    ok.textContent = 'Got it';
    ok.addEventListener('click', () => this.close());
    footer.appendChild(ok);
    this.modal.appendChild(footer);

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.modal);

    document.addEventListener('keydown', this.boundKeydown);
  }

  close(): void {
    document.removeEventListener('keydown', this.boundKeydown);
    this.backdrop?.remove();
    this.modal?.remove();
    this.backdrop = null;
    this.modal = null;
    this.callbacks.onClose();
  }

  isOpen(): boolean {
    return this.backdrop !== null;
  }

  destroy(): void {
    this.close();
  }
}
