// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { setHostButtonText } from '../hostButtons.js';

describe('setHostButtonText', () => {
  it('shows the text and names the button after it', () => {
    const button = document.createElement('button');
    expect(setHostButtonText(button, 'News', '3')).toBe(true);
    expect(button.querySelector('.tcw-host-btn-text')?.textContent).toBe('3');
    expect(button.getAttribute('aria-label')).toBe('News: 3');
  });

  it('says nothing changed when a number from plain script is what it shows', () => {
    const button = document.createElement('button');
    // A host without types passes a live count as it is.
    const count = 3 as unknown as string;
    expect(setHostButtonText(button, 'News', count)).toBe(true);
    expect(setHostButtonText(button, 'News', count)).toBe(false);
    expect(setHostButtonText(button, 'News', '3')).toBe(false);
  });

  it('shows nothing for a missing text from plain script, as the page does', () => {
    const button = document.createElement('button');
    setHostButtonText(button, 'News', '3');
    // A host without types drops a badge by passing null or undefined.
    expect(setHostButtonText(button, 'News', null as unknown as string)).toBe(true);
    expect(button.querySelector('.tcw-host-btn-text')?.textContent).toBe('');
    expect(button.getAttribute('aria-label')).toBe('News');
    expect(setHostButtonText(button, 'News', null as unknown as string)).toBe(false);
    expect(setHostButtonText(button, 'News', undefined as unknown as string)).toBe(false);
  });
});
