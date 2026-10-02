import type { MessageKey, Translator } from './i18n.js';

/**
 * Keyboard-shortcut reference sheet. Bound to `?` (and `Shift+/`). Surfaces
 * shortcuts so users discover the widget's hidden interaction model — a
 * premium-feel detail polished desktop tools all ship.
 */
export interface HotkeySheetCallbacks {
  onClose: () => void;
}

// Group titles translate via this lookup; individual shortcut labels (and
// the `keys` badges) stay English for now — see README "Widget i18n".
const GROUP_TITLE_KEYS: Record<string, MessageKey> = {
  'Search & navigation': 'hotkeys.group.searchNavigation',
  'Chart manipulation': 'hotkeys.group.chartManipulation',
  'Touch (mobile / tablet)': 'hotkeys.group.touch',
  'Keyboard': 'hotkeys.group.keyboard',
  'Drawing': 'hotkeys.group.drawing',
};

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
      { keys: [mod, 'K'], label: 'hotkeys.commandPalette' },
      { keys: [mod, 'P'], label: 'hotkeys.symbolSearch' },
      { keys: ['Alt', 'G'], label: 'hotkeys.goToDate' },
      { keys: ['Alt', 'I'], label: 'hotkeys.invertScale' },
      { keys: ['?'], label: 'hotkeys.showSheet' },
    ],
  },
  {
    title: 'Chart manipulation',
    entries: [
      { keys: ['key.drag'], label: 'hotkeys.pan' },
      { keys: [mod, 'key.drag'], label: 'hotkeys.boxSelect' },
      { keys: [mod, 'key.click'], label: 'hotkeys.toggleSelect' },
      { keys: ['Shift', 'key.drag'], label: 'hotkeys.measure' },
      { keys: ['key.drag', 'key.priceAxis'], label: 'hotkeys.scalePrice' },
      { keys: ['key.drag', 'key.timeAxis'], label: 'hotkeys.zoomTime' },
      { keys: ['key.doubleClick', 'key.priceAxis'], label: 'hotkeys.autoScale' },
      { keys: ['key.doubleClick', 'key.timeAxis'], label: 'hotkeys.fit' },
      { keys: ['key.scroll'], label: 'hotkeys.zoomCursor' },
    ],
  },
  {
    title: 'Touch (mobile / tablet)',
    entries: [
      { keys: ['key.oneFinger', 'key.drag'], label: 'hotkeys.touchPan' },
      { keys: ['key.twoFingers', 'key.pinch'], label: 'hotkeys.pinch' },
      { keys: ['key.longPress'], label: 'hotkeys.longPress' },
      { keys: ['key.drag', 'key.axisStrip'], label: 'hotkeys.touchAxis' },
    ],
  },
  {
    title: 'Keyboard',
    entries: [
      { keys: ['←', '→'], label: 'hotkeys.panBar' },
      { keys: ['+', '−'], label: 'hotkeys.zoomInOut' },
      { keys: ['Home'], label: 'hotkeys.toStart' },
      { keys: ['End'], label: 'hotkeys.toEnd' },
      { keys: ['F'], label: 'hotkeys.fit' },
    ],
  },
  {
    title: 'Drawing',
    entries: [
      { keys: [mod, 'Z'], label: 'hotkeys.undo' },
      { keys: [mod, 'Shift', 'Z'], label: 'hotkeys.redo' },
      { keys: ['Esc'], label: 'hotkeys.cancelDrawing' },
      { keys: [mod, 'C'], label: 'hotkeys.copy' },
      { keys: [mod, 'V'], label: 'hotkeys.paste' },
    ],
  },
];

export class WidgetHotkeySheet {
  private backdrop: HTMLDivElement | null = null;
  private modal: HTMLDivElement | null = null;
  private callbacks: HotkeySheetCallbacks;
  private t: Translator;
  private boundKeydown: (e: KeyboardEvent) => void;

  /** Where the overlay mounts (the widget's portal: themed, and inside it when fullscreen). */
  constructor(
    callbacks: HotkeySheetCallbacks,
    t: Translator,
    private readonly host: () => HTMLElement = () => document.body,
  ) {
    this.callbacks = callbacks;
    this.t = t;
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
    header.innerHTML = `<h3>${this.t('hotkeys.title')}</h3>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('hotkeys.close'));
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
      const titleKey = GROUP_TITLE_KEYS[group.title];
      title.textContent = titleKey ? this.t(titleKey) : group.title;
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
          const key = entry.keys[i];
          kbd.textContent = key.startsWith('key.') ? this.t(key as MessageKey) : key;
          keys.appendChild(kbd);
        }
        row.appendChild(keys);

        const label = document.createElement('span');
        label.className = 'tcw-hotkey-label';
        label.textContent = this.t(entry.label as MessageKey);
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
    ok.textContent = this.t('hotkeys.gotIt');
    ok.addEventListener('click', () => this.close());
    footer.appendChild(ok);
    this.modal.appendChild(footer);

    this.host().append(this.backdrop, this.modal);

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
