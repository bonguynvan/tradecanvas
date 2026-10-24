import { Chart, PollingAdapter, type OHLCBar, type TimeFrame } from '@tradecanvas/chart';

type Row = [number, string, string, string, string, string];

const feed = new PollingAdapter({
  name: 'example-api',
  intervalMs: 3_000,
  fetchBars: async (symbol: string, timeframe: TimeFrame, limit: number): Promise<OHLCBar[]> => {
    const url = `https://api.example.com/klines?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`klines: HTTP ${res.status}`);
    const rows: Row[] = await res.json();
    return rows.map(([time, open, high, low, close, volume]) => ({
      time, open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume),
    }));
  },
});

export async function mount(host: HTMLElement): Promise<Chart> {
  const chart = new Chart(host, { chartType: 'candlestick' });
  await chart.connect({ adapter: feed, symbol: 'ACME', timeframe: '1h' });
  return chart;
}
