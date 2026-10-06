import type { MessageKey, Translator } from './i18n.js';
import type { WidgetFeature } from './widgetFeatures.js';

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
  'More': 'hotkeys.group.more',
};

interface HotkeyEntry {
  keys: string[];
  label: string;
  /** The switch it goes with: left out of the sheet while that is off. */
  feature?: WidgetFeature;
}

/** A shortcut of the host's, shown as it was given. */
export interface HostHotkeyEntry {
  keys: string[];
  text: string;
}

/** What else the sheet shows: the switches that are on, and the host's shortcuts. */
export interface HotkeySheetOptions {
  isOn?: (feature: WidgetFeature) => boolean;
  extra?: readonly HostHotkeyEntry[];
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
      { keys: [mod, 'K'], label: 'hotkeys.commandPalette', feature: 'hotkeys.commandPalette' },
      { keys: [mod, 'P'], label: 'hotkeys.symbolSearch', feature: 'hotkeys.symbolSearch' },
      { keys: ['Alt', 'G'], label: 'hotkeys.goToDate', feature: 'hotkeys.goToDate' },
      { keys: ['Alt', 'I'], label: 'hotkeys.invertScale', feature: 'hotkeys.invertScale' },
      { keys: [mod, 'S'], label: 'hotkeys.saveLayout', feature: 'hotkeys.save' },
      { keys: ['0–9'], label: 'hotkeys.typeInterval', feature: 'intervalTyping' },
      { keys: ['?'], label: 'hotkeys.showSheet', feature: 'hotkeys.help' },
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
      { keys: ['key.rightClick'], label: 'hotkeys.drawingMenu' },
      { keys: ['key.doubleClick'], label: 'hotkeys.drawingSettings' },
      { keys: [mod, 'G'], label: 'hotkeys.group' },
      { keys: [mod, 'Shift', 'G'], label: 'hotkeys.ungroup' },
      { keys: [mod, ']', '['], label: 'hotkeys.orderStep' },
      { keys: [mod, 'Shift', ']', '['], label: 'hotkeys.orderEnd' },
      { keys: ['Enter'], label: 'hotkeys.finishPath' },
      { keys: ['Alt', 'T'], label: 'tool.trendLine', feature: 'hotkeys.tools' },
      { keys: ['Alt', 'H'], label: 'tool.horizontalLine', feature: 'hotkeys.tools' },
      { keys: ['Alt', 'J'], label: 'tool.horizontalRay', feature: 'hotkeys.tools' },
      { keys: ['Alt', 'V'], label: 'tool.verticalLine', feature: 'hotkeys.tools' },
      { keys: ['Alt', 'C'], label: 'tool.crossLine', feature: 'hotkeys.tools' },
      { keys: ['Alt', 'F'], label: 'tool.fibRetracement', feature: 'hotkeys.tools' },
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

  open(options: HotkeySheetOptions = {}): void {
    if (this.backdrop) return;
    const isOn = options.isOn ?? (() => true);
    // The widget's own, less those switched off (a whole group goes when all its keys do).
    // A host's shortcut on the same keys replaces the built-in one.
    const replaced = new Set((options.extra ?? []).map((e) => e.keys.join('+').toLowerCase()));
    const groups: { title: string; entries: (HotkeyEntry | HostHotkeyEntry)[] }[] = GROUPS
      .map((group) => ({
        title: group.title,
        entries: group.entries.filter((e) => (!e.feature || isOn(e.feature)) && !replaced.has(e.keys.join('+').toLowerCase())) as (HotkeyEntry | HostHotkeyEntry)[],
      }))
      .filter((group) => group.entries.length > 0);
    if (options.extra && options.extra.length > 0) groups.push({ title: 'More', entries: [...options.extra] });

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.addEventListener('click', () => this.close());

    this.modal = document.createElement('div');
    this.modal.className = 'tcw-modal tcw-hotkey-sheet';
    this.modal.style.width = '640px';

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const title = document.createElement('h3');
    title.textContent = this.t('hotkeys.title');
    header.appendChild(title);
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

    for (const group of groups) {
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
        label.textContent = 'text' in entry ? entry.text : this.t(entry.label as MessageKey);
        row.appendChild(label);

        section.appendChild(row);
      }

      grid.appendChild(section);
    }

    body.appendChild(grid);
    this.modal.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:11px;color:var(--tcw-text-muted)';
    hint.textContent = this.t('hotkeys.footer');
    footer.appendChild(hint);
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
