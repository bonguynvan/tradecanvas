const dateFormats = new Map<string, Intl.DateTimeFormat>();

/**
 * A date as `locale` writes it, its month by name ("Nov 12", "12 thg 11"):
 * two numbers alone are read one way in the US and the other way round
 * everywhere else. With the year when `withYear`.
 */
export function writtenDate(locale: string, year: number, month: number, day: number, withYear: boolean): string {
  const key = `${locale}|${withYear}`;
  let format = dateFormats.get(key);
  if (!format) {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC', ...(withYear ? { year: 'numeric' } : {}) };
    try {
      format = new Intl.DateTimeFormat(locale, options);
    } catch {
      // A locale the browser does not know.
      format = new Intl.DateTimeFormat('en-US', options);
    }
    dateFormats.set(key, format);
  }
  return format.format(Date.UTC(year, month - 1, day));
}

/** The day a month is written from. */
const MID_MONTH = 15;
const monthFormats = new Map<string, Intl.DateTimeFormat>();

/** A month and its year as `locale` writes them ("Mar 2023", "thg 3, 2023", "2023年3月"). */
export function writtenMonth(locale: string, year: number, month: number): string {
  let format = monthFormats.get(locale);
  if (!format) {
    const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric', timeZone: 'UTC' };
    try {
      format = new Intl.DateTimeFormat(locale, options);
    } catch {
      // A locale the browser does not know.
      format = new Intl.DateTimeFormat('en-US', options);
    }
    monthFormats.set(locale, format);
  }
  // Any day of the month writes it; the middle one, as the axis's month names are made.
  return format.format(Date.UTC(year, month - 1, MID_MONTH));
}
