// The datafeed our app wrote for TradingView's charting library. Keep it as it is.

const API = 'https://api.example.com';

interface Row {
  /** Seconds. */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

const SYMBOLS: Record<string, { name: string; description: string; exchange: string; pricescale: number }> = {
  ACME: { name: 'ACME', description: 'Acme Corp', exchange: 'NASDAQ', pricescale: 100 },
};

const toBar = (r: Row) => ({ time: r.t * 1000, open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v });

const timers = new Map<string, ReturnType<typeof setInterval>>();

export const datafeed = {
  onReady(callback: (config: { supported_resolutions: string[] }) => void): void {
    setTimeout(() => callback({ supported_resolutions: ['60', '1D'] }), 0);
  },

  resolveSymbol(
    symbolName: string,
    onResolve: (info: { name: string; ticker: string; description: string; exchange: string; pricescale: number; minmov: number; session: string; timezone: string }) => void,
    onError: (reason: string) => void,
  ): void {
    const known = SYMBOLS[symbolName];
    setTimeout(() => {
      if (!known) onError('unknown_symbol');
      else onResolve({ ...known, ticker: symbolName, minmov: 1, session: '24x7', timezone: 'Etc/UTC' });
    }, 0);
  },

  getBars(
    symbolInfo: { ticker?: string; name: string },
    resolution: string,
    periodParams: { from: number; to: number; countBack: number; firstDataRequest: boolean },
    onResult: (bars: ReturnType<typeof toBar>[], meta: { noData: boolean }) => void,
    onError: (reason: string) => void,
  ): void {
    const query = new URLSearchParams({
      symbol: symbolInfo.ticker ?? symbolInfo.name,
      resolution,
      to: String(periodParams.to),
      countback: String(periodParams.countBack),
    });
    fetch(`${API}/bars?${query}`)
      .then((response) => response.json() as Promise<{ status: string; rows?: Row[] }>)
      .then((answer) => {
        if (answer.status !== 'ok') return onError(answer.status);
        const rows = answer.rows ?? [];
        onResult(rows.map(toBar), { noData: rows.length === 0 });
      })
      .catch((err: unknown) => onError(String(err)));
  },

  subscribeBars(
    symbolInfo: { ticker?: string; name: string },
    resolution: string,
    onTick: (bar: ReturnType<typeof toBar>) => void,
    listenerGuid: string,
  ): void {
    const poll = () => {
      const query = new URLSearchParams({ symbol: symbolInfo.ticker ?? symbolInfo.name, resolution, to: String(Math.floor(Date.now() / 1000) + 1), countback: '1' });
      fetch(`${API}/bars?${query}`)
        .then((response) => response.json() as Promise<{ status: string; rows?: Row[] }>)
        .then((answer) => answer.rows?.forEach((row) => onTick(toBar(row))))
        .catch(() => {});
    };
    timers.set(listenerGuid, setInterval(poll, 5000));
  },

  unsubscribeBars(listenerGuid: string): void {
    clearInterval(timers.get(listenerGuid));
    timers.delete(listenerGuid);
  },
};
