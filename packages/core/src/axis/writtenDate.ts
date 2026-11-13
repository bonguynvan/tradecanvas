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
