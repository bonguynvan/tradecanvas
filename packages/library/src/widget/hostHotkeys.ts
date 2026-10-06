/** A shortcut as typed in `addHotkey`, read for matching key presses. */
export interface ParsedHotkey {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  /** A letter or digit: its place on the keyboard (`KeyN`, `Digit1`)… */
  code?: string;
  /** …and the character itself, in lower case. */
  char?: string;
  /** Any other key, as it types (`f2`, `/`, `?`, `arrowup`), in lower case. */
  key?: string;
  /** The keys as the shortcut sheet shows them. */
  display: string[];
}

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

const MODIFIERS: Readonly<Record<string, 'ctrl' | 'alt' | 'shift'>> = {
  ctrl: 'ctrl', control: 'ctrl', cmd: 'ctrl', command: 'ctrl', meta: 'ctrl', mod: 'ctrl',
  alt: 'alt', option: 'alt', opt: 'alt',
  shift: 'shift',
};

/** Other names keys go by, to the name a key press gives (`KeyboardEvent.key`, lower case). */
const KEY_NAMES: Readonly<Record<string, string>> = {
  esc: 'escape', space: ' ', spacebar: ' ', up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright',
  del: 'delete', return: 'enter', plus: '+',
};

/**
 * Reads a shortcut: modifiers (`Ctrl`, which is Cmd on a Mac, `Alt`,
 * `Shift`) and a key, joined by `+`, in any case. `null` for one it can't
 * use: no key, an unknown modifier, or Shift with a symbol (name the symbol
 * it types: `?`, not `Shift+/`).
 */
export function parseHotkey(keys: string): ParsedHotkey | null {
  const parts = keys.split('+').map((p) => p.trim());
  const last = parts.pop();
  if (!last) return null;
  const hk: ParsedHotkey = { ctrl: false, alt: false, shift: false, display: [] };
  for (const part of parts) {
    const modifier = MODIFIERS[part.toLowerCase()];
    if (!modifier) return null;
    hk[modifier] = true;
  }
  const lower = last.toLowerCase();
  if (MODIFIERS[lower]) return null;
  if (/^[a-z]$/.test(lower)) {
    hk.code = `Key${lower.toUpperCase()}`;
    hk.char = lower;
  } else if (/^[0-9]$/.test(lower)) {
    hk.code = `Digit${lower}`;
    hk.char = lower;
  } else {
    hk.key = KEY_NAMES[lower] ?? lower;
    if (hk.shift && hk.key.length === 1) return null;
  }
  hk.display = [
    ...(hk.ctrl ? [isMac ? '⌘' : 'Ctrl'] : []),
    ...(hk.alt ? ['Alt'] : []),
    ...(hk.shift ? ['Shift'] : []),
    hk.key === ' ' ? 'Space' : last.length === 1 ? last.toUpperCase() : last,
  ];
  return hk;
}

/**
 * Whether a key press is the shortcut. Ctrl takes Cmd too. A letter or
 * digit is the one the layout types (Ctrl+Y is the Y key on a German
 * keyboard too), by its place only with Alt (macOS types another character
 * then) or where the key types no Latin letter; it needs Shift exactly as
 * given. Another key ignores an unasked Shift (a `?` is typed with it).
 */
export function matchesHotkey(e: KeyboardEvent, hk: ParsedHotkey): boolean {
  if ((e.ctrlKey || e.metaKey) !== hk.ctrl || e.altKey !== hk.alt) return false;
  if (hk.code !== undefined) {
    if (e.shiftKey !== hk.shift) return false;
    if (hk.alt) return e.code === hk.code;
    const typed = e.key.length === 1 && /^[a-z0-9]$/i.test(e.key) ? e.key.toLowerCase() : null;
    return typed !== null ? typed === hk.char : e.code === hk.code;
  }
  if (hk.shift && !e.shiftKey) return false;
  return e.key.toLowerCase() === hk.key;
}

/** The keys the chart itself answers (drawings, scrolling, zoom, the screen reader's bars), as `ctrl+shift+z`. */
const CHART_KEYS: ReadonlySet<string> = new Set([
  'escape', 'enter', 'delete', 'backspace', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'home', 'end',
  '+', '-', '=', ' ', ',', '.',
  'ctrl+z', 'ctrl+shift+z', 'ctrl+y', 'ctrl+c', 'ctrl+v', 'ctrl+d', 'ctrl+g', 'ctrl+shift+g', 'ctrl+[', 'ctrl+]',
]);

/** Whether the chart answers the shortcut's keys itself (a press there runs both). */
export function isChartKey(hk: ParsedHotkey): boolean {
  const name = `${hk.ctrl ? 'ctrl+' : ''}${hk.alt ? 'alt+' : ''}${hk.shift ? 'shift+' : ''}${hk.char ?? hk.key}`;
  return CHART_KEYS.has(name);
}

/** Whether the key went into a field (looked for through shadow roots, which hide it from `activeElement`). */
export function typedIntoField(e: KeyboardEvent): boolean {
  const target = typeof e.composedPath === 'function' ? e.composedPath()[0] : e.target;
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}
