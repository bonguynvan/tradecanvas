import { describe, it, expect } from 'vitest';
import { writtenDate } from '../writtenDate.js';

describe('a date written for a reader', () => {
  it('names the month, so the 12th of November is not read as the 11th of December', () => {
    expect(writtenDate('en-US', 2026, 11, 12, false)).toBe('Nov 12');
    expect(writtenDate('en-GB', 2026, 11, 12, false)).toBe('12 Nov');
    expect(writtenDate('en-US', 2026, 11, 12, true)).toBe('Nov 12, 2026');
  });

  it('is written the way the language writes it', () => {
    expect(writtenDate('vi', 2026, 11, 12, false)).toMatch(/12.*11/);
    expect(writtenDate('ja', 2026, 11, 12, false)).toContain('11');
    expect(writtenDate('de', 2026, 3, 5, true)).toMatch(/5\..*2026/);
  });

  it('keeps the day it is given, whatever zone the machine is in, the 29th of February too', () => {
    expect(writtenDate('en-US', 2028, 2, 29, true)).toBe('Feb 29, 2028');
    expect(writtenDate('en-US', 2026, 1, 1, true)).toBe('Jan 1, 2026');
    expect(writtenDate('en-US', 2026, 12, 31, true)).toBe('Dec 31, 2026');
  });

  it('falls back to English for a language the browser does not know', () => {
    expect(writtenDate('not a locale', 2026, 11, 12, false)).toBe('Nov 12');
  });
});
