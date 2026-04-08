export function formatPrice(value: number, precision = 2): string {
  return value.toFixed(precision);
}

export function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(2) + 'K';
  return value.toFixed(0);
}

export function detectPrecision(values: number[]): number {
  let maxDecimals = 0;
  for (const v of values) {
    const str = v.toString();
    const dot = str.indexOf('.');
    if (dot >= 0) {
      maxDecimals = Math.max(maxDecimals, str.length - dot - 1);
    }
  }
  return Math.min(maxDecimals, 8);
}
