// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { isChartKey, matchesHotkey, parseHotkey, typedIntoField } from '../hostHotkeys.js';

const press = (init: KeyboardEventInit) => ({ ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: '', code: '', ...init }) as KeyboardEvent;

describe('parseHotkey', () => {
  it('reads modifiers in any case and order, and a letter by its place on the keyboard', () => {
    const hk = parseHotkey('shift+Ctrl+n')!;
    expect(hk).toMatchObject({ ctrl: true, alt: false, shift: true, code: 'KeyN' });
    expect(matchesHotkey(press({ ctrlKey: true, shiftKey: true, code: 'KeyN', key: 'N' }), hk)).toBe(true);
    expect(matchesHotkey(press({ metaKey: true, shiftKey: true, code: 'KeyN', key: 'N' }), hk)).toBe(true); // Cmd on a Mac
    expect(matchesHotkey(press({ ctrlKey: true, code: 'KeyN', key: 'n' }), hk)).toBe(false);
  });

  it('matches Alt and a letter by key position, as macOS types another character', () => {
    const hk = parseHotkey('Alt+G')!;
    expect(matchesHotkey(press({ altKey: true, code: 'KeyG', key: '©' }), hk)).toBe(true);
  });

  it('reads digits, named keys and symbols', () => {
    expect(parseHotkey('Alt+1')).toMatchObject({ code: 'Digit1' });
    const f2 = parseHotkey('F2')!;
    expect(matchesHotkey(press({ key: 'F2', code: 'F2' }), f2)).toBe(true);
    const slash = parseHotkey('Ctrl+/')!;
    expect(matchesHotkey(press({ ctrlKey: true, key: '/', code: 'Slash' }), slash)).toBe(true);
    const question = parseHotkey('?')!;
    expect(matchesHotkey(press({ shiftKey: true, key: '?', code: 'Slash' }), question)).toBe(true);
  });

  it('shows the keys as the shortcut sheet does', () => {
    expect(parseHotkey('alt+shift+r')!.display).toEqual(['Alt', 'Shift', 'R']);
  });

  it('reads nothing it cannot use', () => {
    expect(parseHotkey('')).toBeNull();
    expect(parseHotkey('Ctrl+')).toBeNull();
    expect(parseHotkey('Hyper+K')).toBeNull();
    expect(parseHotkey('Ctrl+Alt')).toBeNull();
    expect(parseHotkey('Shift+/')).toBeNull(); // name the symbol: '?'
  });

  it('matches a letter with Ctrl as the layout types it', () => {
    const hk = parseHotkey('Ctrl+Y')!;
    // A German keyboard: the key labelled Y sits where Z is on QWERTY.
    expect(matchesHotkey(press({ ctrlKey: true, key: 'y', code: 'KeyZ' }), hk)).toBe(true);
    expect(matchesHotkey(press({ ctrlKey: true, key: 'z', code: 'KeyY' }), hk)).toBe(false);
    // A key that types no Latin letter (Russian): by its place.
    expect(matchesHotkey(press({ ctrlKey: true, key: 'н', code: 'KeyY' }), hk)).toBe(true);
  });

  it('knows other names for keys, and Shift with a digit', () => {
    expect(matchesHotkey(press({ key: 'Escape' }), parseHotkey('Esc')!)).toBe(true);
    expect(matchesHotkey(press({ key: ' ' }), parseHotkey('Space')!)).toBe(true);
    expect(matchesHotkey(press({ key: 'ArrowUp' }), parseHotkey('Up')!)).toBe(true);
    expect(matchesHotkey(press({ shiftKey: true, key: '!', code: 'Digit1' }), parseHotkey('Shift+1')!)).toBe(true);
    expect(parseHotkey('Space')!.display).toEqual(['Space']);
  });

  it('says which keys the chart answers itself', () => {
    expect(isChartKey(parseHotkey('Ctrl+Z')!)).toBe(true);
    expect(isChartKey(parseHotkey('Delete')!)).toBe(true);
    expect(isChartKey(parseHotkey('Alt+N')!)).toBe(false);
  });

  it('tells a key typed into a field, inside a shadow root too', () => {
    const host = document.createElement('div');
    const input = document.createElement('input');
    host.attachShadow({ mode: 'open' }).appendChild(input);
    document.body.appendChild(host);
    let typed = false;
    document.addEventListener('keydown', (e) => { typed = typedIntoField(e); }, { once: true });
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true, composed: true }));
    expect(typed).toBe(true);
    host.remove();
  });
});
