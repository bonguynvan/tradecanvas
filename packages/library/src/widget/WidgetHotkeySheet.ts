import type { MessageKey, Translator } from './i18n.js';
import type { WidgetFeature } from './widgetFeatures.js';
import { createIcon } from './icons.js';
import { keepTabInside } from './focusTrap.js';

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
      { keys: ['Alt', 'R'], label: 'chartMenu.resetView', feature: 'hotkeys.resetView' },
      { keys: [mod, 'S'], label: 'hotkeys.saveLayout', feature: 'hotkeys.save' },
      { keys: ['0–9'], label: 'hotkeys.typeInterval', feature: 'intervalTyping' },
      { keys: ['A–Z'], label: 'hotkeys.typeSymbol', feature: 'symbolTyping' },
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

/** The key Ctrl stands for here: ⌘ on a Mac. */
export const MOD_KEY = mod;

let sheetSeq = 0;

/**
 * The shortcut sheet: what each key does, by group, searchable by the words
 * or by the keys ("alt+g"). A gesture (drag, double-click) is written as
 * words, a key as a key. The keys switched off are left out; the host's
 * shortcuts come last, in place of a built-in one on the same keys.
 */
export class WidgetHotkeySheet {
  private backdrop: HTMLDivElement | null = null;
  private bodyEl: HTMLDivElement | null = null;
  private searchEl: HTMLInputElement | null = null;
  private groups: { title: string; entries: (HotkeyEntry | HostHotkeyEntry)[] }[] = [];
  private returnFocus: HTMLElement | null = null;
  private readonly uid = ++sheetSeq;

  /** Where the overlay mounts (the widget's portal: themed, and inside it when fullscreen). */
  constructor(
    private readonly callbacks: HotkeySheetCallbacks,
    private readonly t: Translator,
    private readonly host: () => HTMLElement = () => document.body,
  ) {}

  open(options: HotkeySheetOptions = {}): void {
    if (this.backdrop) return;
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const isOn = options.isOn ?? (() => true);
    // The widget's own, less those switched off (a whole group goes when all its keys do).
    // A host's shortcut on the same keys replaces the built-in one.
    const replaced = new Set((options.extra ?? []).map((e) => e.keys.join('+').toLowerCase()));
    this.groups = GROUPS
      .map((group) => ({
        title: group.title,
        entries: group.entries.filter((e) => (!e.feature || isOn(e.feature)) && !replaced.has(e.keys.join('+').toLowerCase())) as (HotkeyEntry | HostHotkeyEntry)[],
      }))
      .filter((group) => group.entries.length > 0);
    if (options.extra && options.extra.length > 0) this.groups.push({ title: 'More', entries: [...options.extra] });
    this.build();
    this.render();
    this.searchEl?.focus();
  }

  close(): void {
    if (!this.backdrop) return;
    this.backdrop.remove();
    this.backdrop = this.bodyEl = this.searchEl = null;
    this.callbacks.onClose();
    const back = this.returnFocus;
    this.returnFocus = null;
    if (back?.isConnected) back.focus();
  }

  isOpen(): boolean {
    return this.backdrop !== null;
  }

  destroy(): void {
    this.close();
  }

  private build(): void {
    const backdrop = document.createElement('div');
    backdrop.className = 'tcw-modal-backdrop';
    // A press that starts in the sheet and ends on the backdrop doesn't close it.
    let pressedBackdrop = false;
    backdrop.addEventListener('pointerdown', (e) => {
      pressedBackdrop = e.target === backdrop;
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && pressedBackdrop) this.close();
      pressedBackdrop = false;
    });

    const modal = document.createElement('div');
    modal.className = 'tcw-modal tcw-hotkey-sheet';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `tcw-hotkey-title-${this.uid}`);
    modal.tabIndex = -1;
    modal.addEventListener('keydown', (e) => {
      e.stopPropagation(); // keys here must not drive chart shortcuts
      if (e.key === 'Escape' && !e.isComposing) {
        e.preventDefault();
        this.close();
        return;
      }
      keepTabInside(e, modal);
    });

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const title = document.createElement('h3');
    title.id = `tcw-hotkey-title-${this.uid}`;
    title.textContent = this.t('hotkeys.title');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('hotkeys.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(title, closeBtn);

    const search = document.createElement('label');
    search.className = 'tcw-ss-search tcw-hotkey-search';
    search.innerHTML = createIcon('search', 16);
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = this.t('hotkeys.search');
    input.setAttribute('aria-label', this.t('hotkeys.search'));
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.addEventListener('input', () => this.render());
    search.appendChild(input);

    const body = document.createElement('div');
    body.className = 'tcw-hotkey-body';

    const foot = document.createElement('div');
    foot.className = 'tcw-hotkey-foot';
    foot.textContent = this.t('hotkeys.footer');

    modal.append(header, search, body, foot);
    backdrop.appendChild(modal);
    this.host().appendChild(backdrop);
    this.backdrop = backdrop;
    this.bodyEl = body;
    this.searchEl = input;
  }

  /** The groups and their shortcuts that match what is typed. */
  private render(): void {
    const body = this.bodyEl;
    if (!body) return;
    const query = (this.searchEl?.value ?? '').trim().toLowerCase().replace(/\s+/g, '');
    const sections: HTMLElement[] = [];
    for (const group of this.groups) {
      const entries = query ? group.entries.filter((e) => this.matches(e, query)) : group.entries;
      if (entries.length === 0) continue;
      const section = document.createElement('section');
      section.className = 'tcw-hotkey-group';
      const heading = document.createElement('div');
      heading.className = 'tcw-hotkey-heading';
      const titleKey = GROUP_TITLE_KEYS[group.title];
      heading.textContent = titleKey ? this.t(titleKey) : group.title;
      section.append(heading, ...entries.map((entry) => this.row(entry)));
      sections.push(section);
    }
    if (sections.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tcw-hotkey-empty';
      empty.setAttribute('role', 'status');
      empty.textContent = this.t('hotkeys.noMatch');
      body.replaceChildren(empty);
      return;
    }
    body.replaceChildren(...sections);
  }

  private label(entry: HotkeyEntry | HostHotkeyEntry): string {
    return 'text' in entry ? entry.text : this.t(entry.label as MessageKey);
  }

  /** A key's words: its own, or a gesture's in the widget's language. */
  private keyText(key: string): string {
    return key.startsWith('key.') ? this.t(key as MessageKey) : key;
  }

  /** What it does, or its keys written as "alt+g", holds the query. */
  private matches(entry: HotkeyEntry | HostHotkeyEntry, query: string): boolean {
    if (this.label(entry).toLowerCase().replace(/\s+/g, '').includes(query)) return true;
    return entry.keys.map((k) => this.keyText(k)).join('+').toLowerCase().replace(/\s+/g, '').includes(query);
  }

  /** What it does, then its keys: a key as a key, a gesture as words. */
  private row(entry: HotkeyEntry | HostHotkeyEntry): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-hotkey-row';
    const label = document.createElement('span');
    label.className = 'tcw-hotkey-label';
    label.textContent = this.label(entry);
    const keys = document.createElement('span');
    keys.className = 'tcw-hotkey-keys';
    // A combination reads left to right in any widget: Ctrl + K, never K + Ctrl.
    keys.dir = 'ltr';
    entry.keys.forEach((key, i) => {
      if (i > 0) {
        const plus = document.createElement('span');
        plus.className = 'tcw-hotkey-sep';
        plus.textContent = '+';
        keys.appendChild(plus);
      }
      const gesture = key.startsWith('key.');
      const el = document.createElement(gesture ? 'span' : 'kbd');
      el.className = gesture ? 'tcw-hotkey-gesture' : 'tcw-hotkey-key';
      el.textContent = this.keyText(key);
      keys.appendChild(el);
    });
    row.append(label, keys);
    return row;
  }
}
