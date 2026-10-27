<script lang="ts">
  import TradeCanvas from '../src/TradeCanvas.svelte';
  type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };
  /** `setClose(close, back)`: the close (and the high) of the bar `back` bars before the last, in place. */
  type Host = { push: (bar: Bar) => void; setClose: (close: number, back?: number) => void };

  let { onHost }: { onHost: (host: Host) => void } = $props();
  // Bars kept in $state, as an app with a live feed would.
  const bars = $state<Bar[]>([{ time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }]);
  onHost({
    push: (bar) => { bars.push(bar); },
    setClose: (close, back = 0) => {
      const bar = bars[bars.length - 1 - back];
      bar.close = close;
      if (back > 0) bar.high = Math.max(bar.high, close);
    },
  });
</script>

<TradeCanvas data={bars} stream={false} />
