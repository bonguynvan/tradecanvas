import type { TimeZoneSetting } from '@tradecanvas/commons';
import { isValidTimeZone, offsetAt, tzLabel } from '@tradecanvas/commons';

/** The zones the settings offer besides the browser's own, by city. */
export const WIDGET_TIMEZONES: readonly { zone: string; city: string }[] = [
  { zone: 'Pacific/Honolulu', city: 'Honolulu' },
  { zone: 'America/Los_Angeles', city: 'Los Angeles' },
  { zone: 'America/Denver', city: 'Denver' },
  { zone: 'America/Chicago', city: 'Chicago' },
  { zone: 'America/New_York', city: 'New York' },
  { zone: 'America/Toronto', city: 'Toronto' },
  { zone: 'America/Sao_Paulo', city: 'São Paulo' },
  { zone: 'UTC', city: 'UTC' },
  { zone: 'Europe/London', city: 'London' },
  { zone: 'Europe/Berlin', city: 'Frankfurt' },
  { zone: 'Europe/Paris', city: 'Paris' },
  { zone: 'Europe/Zurich', city: 'Zurich' },
  { zone: 'Africa/Johannesburg', city: 'Johannesburg' },
  { zone: 'Europe/Istanbul', city: 'Istanbul' },
  { zone: 'Europe/Moscow', city: 'Moscow' },
  { zone: 'Asia/Dubai', city: 'Dubai' },
  { zone: 'Asia/Kolkata', city: 'Mumbai' },
  { zone: 'Asia/Bangkok', city: 'Bangkok' },
  { zone: 'Asia/Ho_Chi_Minh', city: 'Ho Chi Minh City' },
  { zone: 'Asia/Jakarta', city: 'Jakarta' },
  { zone: 'Asia/Singapore', city: 'Singapore' },
  { zone: 'Asia/Hong_Kong', city: 'Hong Kong' },
  { zone: 'Asia/Shanghai', city: 'Shanghai' },
  { zone: 'Asia/Taipei', city: 'Taipei' },
  { zone: 'Asia/Seoul', city: 'Seoul' },
  { zone: 'Asia/Tokyo', city: 'Tokyo' },
  { zone: 'Australia/Sydney', city: 'Sydney' },
  { zone: 'Pacific/Auckland', city: 'Auckland' },
];

/**
 * The settings' timezone value as a display timezone: `'local'` is the
 * browser's, a number of minutes a fixed offset (older saved settings), and
 * anything else an IANA zone — the browser's own when it doesn't know it.
 */
export function settingToTimezone(value: string): TimeZoneSetting {
  if (!value || value === 'local') return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  return isValidTimeZone(value) ? value : null;
}

export interface TimezoneOption {
  value: string;
  label: string;
  /** Minutes east of UTC at the time the list was made. */
  offset: number;
}

/**
 * The timezone menu at `atMs`: the browser's zone first, then the zones by
 * the offset in force then ("(UTC-4) New York"). An older fixed-offset
 * setting that isn't one of them stays on the list.
 */
export function timezoneOptions(current: string, atMs: number, localLabel: string): TimezoneOption[] {
  const local = offsetAt(null, atMs);
  const zones = WIDGET_TIMEZONES
    .filter(({ zone }) => isValidTimeZone(zone))
    .map(({ zone, city }) => {
      const offset = offsetAt(zone, atMs);
      return { value: zone, label: zone === 'UTC' ? 'UTC' : `(${tzLabel(offset)}) ${city}`, offset };
    });
  const fixed = settingToTimezone(current);
  if (typeof fixed === 'number') zones.push({ value: current, label: tzLabel(fixed), offset: fixed });
  zones.sort((a, b) => a.offset - b.offset);
  return [{ value: 'local', label: `${localLabel} (${tzLabel(local)})`, offset: local }, ...zones];
}
