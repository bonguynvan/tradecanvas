import assert from 'node:assert/strict';

let shots = 0;

export function args({ fixtures }) {
  return [fixtures.bars({ count: 100, seed: 37 }), () => { shots++; }];
}

/** The toolbar button named Screenshot. */
function button(host) {
  return [...host.querySelectorAll('button')].find((b) => /screenshot/i.test(`${b.getAttribute('aria-label') ?? ''} ${b.title} ${b.textContent}`));
}

export const checks = [
  ['a Screenshot button on the toolbar', ({ host }) => {
    const b = button(host);
    assert.ok(b, 'no button named Screenshot');
    assert.ok(b.closest('.tcw-toolbar'), 'the button is not on the toolbar');
  }],
  ['the button calls onShot', ({ host }) => {
    const before = shots;
    button(host).click();
    assert.equal(shots, before + 1);
  }],
  ['Alt+S calls onShot', async ({ host, wait }) => {
    const before = shots;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS', altKey: true, bubbles: true }));
    await wait(10);
    assert.equal(shots, before + 1, 'Alt+S did nothing');
  }],
  ['Alt+S is in the shortcut sheet', async ({ host, wait }) => {
    // Open the sheet as a user does: "?" on the chart.
    host.dispatchEvent(new KeyboardEvent('keydown', { key: '?', code: 'Slash', shiftKey: true, bubbles: true }));
    await wait(30);
    const sheet = document.querySelector('.tcw-hotkey-body');
    assert.ok(sheet, 'the shortcut sheet did not open');
    const row = [...sheet.querySelectorAll('*')].find((el) => el.children.length > 0 && /screenshot/i.test(el.textContent) && /alt/i.test(el.textContent) && el.textContent.length < 80);
    assert.ok(row, 'the sheet lists no Screenshot on Alt+S');
  }],
];
