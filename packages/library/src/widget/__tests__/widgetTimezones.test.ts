import { describe, it, expect } from 'vitest';
import { settingToTimezone, timezoneOptions } from '../widgetTimezones.js';

describe('settingToTimezone', () => {
  it('reads local, a fixed offset and an IANA zone', () => {
    expect(settingToTimezone('local')).toBeNull();
    expect(settingToTimezone('-300')).toBe(-300);
    expect(settingToTimezone('330')).toBe(330);
    expect(settingToTimezone('America/New_York')).toBe('America/New_York');
  });

  it('falls back to local for a zone the browser does not know', () => {
    expect(settingToTimezone('Mars/Olympus')).toBeNull();
    expect(settingToTimezone('')).toBeNull();
  });
});

describe('timezoneOptions', () => {
  const july = Date.UTC(2026, 6, 15);
  const january = Date.UTC(2026, 0, 15);

  it('starts with the browser’s zone, then the zones by offset with the one in force', () => {
    const options = timezoneOptions('local', july, 'Local');
    expect(options[0].value).toBe('local');
    expect(options[0].label).toMatch(/^Local \(UTC[+-]\d/);
    expect(options.find((o) => o.value === 'America/New_York')?.label).toBe('(UTC-4) New York');
    const offsets = options.slice(1).map((o) => o.offset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });

  it('follows daylight saving time', () => {
    expect(timezoneOptions('local', january, 'Local').find((o) => o.value === 'America/New_York')?.label)
      .toBe('(UTC-5) New York');
  });

  it('keeps an older fixed-offset setting selectable', () => {
    const options = timezoneOptions('-300', july, 'Local');
    expect(options.find((o) => o.value === '-300')?.label).toBe('UTC-5');
  });
});
