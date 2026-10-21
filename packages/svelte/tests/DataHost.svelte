<script lang="ts">
  import TradeCanvas from '../src/TradeCanvas.svelte';
  type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };
  type Host = { push: (bar: Bar) => void; setClose: (close: number) => void };

  let { onHost }: { onHost: (host: Host) => void } = $props();
  // Bars kept in $state, as an app with a live feed would.
  const bars = $state<Bar[]>([{ time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }]);
  onHost({
    push: (bar) => { bars.push(bar); },
    setClose: (close) => { bars[bars.length - 1].close = close; },
  });
</script>

<TradeCanvas data={bars} stream={false} />
