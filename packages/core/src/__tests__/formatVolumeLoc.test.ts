import { describe, it, expect } from 'vitest';
import { formatVolumeLoc } from '@tradecanvas/commons';

describe('formatVolumeLoc', () => {
  it('writes K, M and B with the locale’s decimal mark, for a locale with no table of its own', () => {
    expect(formatVolumeLoc(66_100, 'de-DE')).toBe('66,10K');
    expect(formatVolumeLoc(1_234_567, 'fr-FR')).toBe('1,23M');
    expect(formatVolumeLoc(2_500_000_000, 'de-DE')).toBe('2,50B');
  });

  it('writes a locale Intl does not know as English rather than throwing', () => {
    expect(formatVolumeLoc(66_100, 'en_US')).toBe('66.10K');
    expect(formatVolumeLoc(2_500_000_000, 'en-US')).toBe('2.50B');
  });

  it('keeps a registered table’s marks', () => {
    expect(formatVolumeLoc(66_100, 'en')).toBe('66.10K');
    expect(formatVolumeLoc(66_100, 'vi')).toBe('66,10K');
    expect(formatVolumeLoc(999, 'en-US')).toBe('999');
  });
});
