<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import { fill } from '$lib/i18n/messages';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { onSiteThemeChange } from '$lib/site';

  const i18n = useI18n();
  const m = $derived(i18n.m.backtest);

  type AnalyticsResult = {
    metrics: {
      totalReturnPct: number;
      cagr: number;
      sharpe: number;
      sortino: number;
      maxDrawdownPct: number;
      winRate: number;
      profitFactor: number;
      trades: number;
    };
    equityCurve: ReadonlyArray<{ time: number; equity: number }>;
    initialCash: number;
  };

  let canvas = $state<HTMLCanvasElement | undefined>();
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let errorMessage = $state('');
  let result = $state<AnalyticsResult | null>(null);
  let scrubIndex = $state(0);
  let curveLength = $state(0);

  // Deterministic synthetic bars. Geometric Brownian motion with a tiny
  // upward drift and a couple of trend regime switches so the SMA-cross
  // strategy has trades to make.
  function mulberry32(seed: number): () => number {
    let t = seed;
    return () => {
      t |= 0;
      t = (t + 0x6D2B79F5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4_294_967_296;
    };
  }

  function makeBars() {
    const rng = mulberry32(42);
    const bars = [];
    let price = 100;
    const dayMs = 86_400_000;
    const start = Date.now() - 365 * dayMs;
    for (let i = 0; i < 365; i++) {
      const drift = i < 90 ? 0.0006 : i < 180 ? -0.0004 : i < 270 ? 0.0008 : -0.0002;
      const vol = 0.018;
      const r = drift + vol * (rng() * 2 - 1);
      const open = price;
      const close = price * (1 + r);
      const high = Math.max(open, close) * (1 + Math.abs(rng() * 0.005));
      const low = Math.min(open, close) * (1 - Math.abs(rng() * 0.005));
      bars.push({
        time: start + i * dayMs,
        open,
        high,
        low,
        close,
        volume: 1000 + Math.round(rng() * 500),
      });
      price = close;
    }
    return bars;
  }

  function sma(values: number[], period: number, index: number): number | null {
    if (index < period - 1) return null;
    let sum = 0;
    for (let i = index - period + 1; i <= index; i++) sum += values[i];
    return sum / period;
  }

  function fmtPct(x: number): string {
    return `${(x * 100).toFixed(2)}%`;
  }

  function fmtNum(x: number, digits = 2): string {
    if (!isFinite(x)) return '∞';
    return x.toFixed(digits);
  }

  function renderCurve(
    canvasEl: HTMLCanvasElement,
    equityCurve: ReadonlyArray<{ time: number; equity: number }>,
    upTo: number,
  ) {
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const css = getComputedStyle(canvasEl);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const muted = token('--text-muted', '#758091');
    const down = token('--red', '#f0616d');
    const accent = token('--accent', '#f2a93b');
    const monoFont = token('--font-mono', 'monospace');

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvasEl.clientWidth;
    const cssHeight = canvasEl.clientHeight;
    if (canvasEl.width !== cssWidth * dpr) {
      canvasEl.width = cssWidth * dpr;
      canvasEl.height = cssHeight * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (equityCurve.length === 0) return;

    const slice = equityCurve.slice(0, Math.max(2, upTo));
    let min = Infinity;
    let max = -Infinity;
    for (const p of equityCurve) {
      if (p.equity < min) min = p.equity;
      if (p.equity > max) max = p.equity;
    }
    const pad = (max - min) * 0.05 || 1;
    min -= pad;
    max += pad;

    const left = 8;
    const right = cssWidth - 8;
    const top = 12;
    const bottom = cssHeight - 24;
    const w = right - left;
    const h = bottom - top;

    const x = (i: number, total: number) =>
      left + (w * i) / Math.max(1, total - 1);
    const y = (val: number) => bottom - ((val - min) / (max - min)) * h;

    // Baseline at initialCash
    if (result) {
      const baseY = y(result.initialCash);
      ctx.strokeStyle = muted;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(left, baseY);
      ctx.lineTo(right, baseY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Drawdown fill — current peak from running max
    const totalForX = equityCurve.length;
    let peak = slice[0].equity;
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = down;
    ctx.beginPath();
    ctx.moveTo(x(0, totalForX), y(slice[0].equity));
    for (let i = 0; i < slice.length; i++) {
      if (slice[i].equity > peak) peak = slice[i].equity;
      ctx.lineTo(x(i, totalForX), y(peak));
    }
    for (let i = slice.length - 1; i >= 0; i--) {
      ctx.lineTo(x(i, totalForX), y(slice[i].equity));
    }
    ctx.closePath();
    ctx.fill();

    // Equity line, in the page's accent colour
    ctx.globalAlpha = 1;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < slice.length; i++) {
      const px = x(i, totalForX);
      const py = y(slice[i].equity);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Final dot at scrub position
    const lastIdx = slice.length - 1;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x(lastIdx, totalForX), y(slice[lastIdx].equity), 3, 0, Math.PI * 2);
    ctx.fill();

    // Axis labels
    ctx.fillStyle = muted;
    ctx.font = `11px ${monoFont}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`$${max.toFixed(0)}`, left + 4, top + 6);
    ctx.fillText(`$${min.toFixed(0)}`, left + 4, bottom - 4);

    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText(
      new Date(equityCurve[0].time).toISOString().slice(0, 10),
      left + 4,
      cssHeight - 4,
    );
    ctx.textAlign = 'right';
    ctx.fillText(
      new Date(equityCurve[totalForX - 1].time).toISOString().slice(0, 10),
      right,
      cssHeight - 4,
    );
  }

  onMount(async () => {
    if (!browser) return;
    try {
      const { Backtester, PercentCommission, PercentSlippage } = await import(
        '@tradecanvas/analytics'
      );

      const bars = makeBars();
      const closes = bars.map((b) => b.close);

      const bt = new Backtester({
        initialCash: 10_000,
        commission: new PercentCommission(0.0005),
        slippage: new PercentSlippage(0.0003),
        allowShort: false,
      });

      const fastPeriod = 10;
      const slowPeriod = 30;

      const out = bt.run(bars, (ctx) => {
        const fast = sma(closes, fastPeriod, ctx.index);
        const slow = sma(closes, slowPeriod, ctx.index);
        const fastPrev = sma(closes, fastPeriod, ctx.index - 1);
        const slowPrev = sma(closes, slowPeriod, ctx.index - 1);
        if (fast === null || slow === null || fastPrev === null || slowPrev === null) {
          return;
        }
        const crossedUp = fastPrev <= slowPrev && fast > slow;
        const crossedDown = fastPrev >= slowPrev && fast < slow;
        if (crossedUp && !ctx.position) {
          const qty = Math.floor((ctx.cash * 0.95) / ctx.bar.close);
          if (qty > 0) ctx.placeOrder({ side: 'long', type: 'market', quantity: qty });
        } else if (crossedDown && ctx.position) {
          ctx.close();
        }
      });

      result = {
        metrics: out.metrics,
        equityCurve: out.equityCurve,
        initialCash: out.initialCash,
      };
      curveLength = out.equityCurve.length;
      scrubIndex = curveLength;
      status = 'ready';
    } catch (err) {
      console.error(err);
      errorMessage = String(err);
      status = 'error';
    }
  });

  // Bumped when the page flips light/dark so the canvas picks up new colours.
  let themeTick = $state(0);
  onMount(() => onSiteThemeChange(() => { themeTick++; }));

  $effect(() => {
    void themeTick;
    if (status !== 'ready' || !canvas || !result) return;
    renderCurve(canvas, result.equityCurve, scrubIndex);
  });

  let isPlaying = $state(false);
  let playTimer: ReturnType<typeof setInterval> | null = null;

  function togglePlay() {
    if (!result) return;
    if (isPlaying) {
      if (playTimer) clearInterval(playTimer);
      playTimer = null;
      isPlaying = false;
      return;
    }
    if (scrubIndex >= curveLength) scrubIndex = 1;
    isPlaying = true;
    playTimer = setInterval(() => {
      scrubIndex += 4;
      if (scrubIndex >= curveLength) {
        scrubIndex = curveLength;
        if (playTimer) clearInterval(playTimer);
        playTimer = null;
        isPlaying = false;
      }
    }, 30);
  }

  function reset() {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    isPlaying = false;
    scrubIndex = curveLength;
  }
</script>

<div class="backtest-panel">
  <div class="backtest-header">
    <div>
      <h3>{m.title}</h3>
      <p class="backtest-sub">{m.subtitle}</p>
    </div>
    {#if status === 'ready'}
      <div class="backtest-controls">
        <button type="button" class="bt-btn" onclick={togglePlay}>
          {isPlaying ? m.pause : scrubIndex >= curveLength ? m.replay : m.play}
        </button>
        <button type="button" class="bt-btn bt-btn-ghost" onclick={reset}>{m.end}</button>
      </div>
    {/if}
  </div>

  {#if status === 'loading'}
    <div class="backtest-state">{m.running}</div>
  {:else if status === 'error'}
    <div class="backtest-state backtest-error">{fill(m.failed, { error: errorMessage })}</div>
  {:else if result}
    <div class="backtest-body">
      <div class="backtest-canvas-wrap">
        <canvas bind:this={canvas}></canvas>
      </div>
      <div class="backtest-scrubber">
        <input
          type="range"
          min="2"
          max={curveLength}
          bind:value={scrubIndex}
          oninput={() => {
            if (isPlaying && playTimer) {
              clearInterval(playTimer);
              playTimer = null;
              isPlaying = false;
            }
          }}
        />
        <span class="backtest-scrubber-label">
          {fill(m.bar, { index: scrubIndex, total: curveLength })}
        </span>
      </div>

      <div class="backtest-metrics">
        <div><span>{m.totalReturn}</span><strong style:color={result.metrics.totalReturnPct >= 0 ? 'var(--green)' : 'var(--red)'}>{fmtPct(result.metrics.totalReturnPct)}</strong></div>
        <div><span>CAGR</span><strong>{fmtPct(result.metrics.cagr)}</strong></div>
        <div><span>Sharpe</span><strong>{fmtNum(result.metrics.sharpe)}</strong></div>
        <div><span>Sortino</span><strong>{fmtNum(result.metrics.sortino)}</strong></div>
        <div><span>{m.maxDrawdown}</span><strong style:color="var(--red)">{fmtPct(result.metrics.maxDrawdownPct)}</strong></div>
        <div><span>{m.winRate}</span><strong>{fmtPct(result.metrics.winRate)}</strong></div>
        <div><span>{m.profitFactor}</span><strong>{fmtNum(result.metrics.profitFactor)}</strong></div>
        <div><span>{m.trades}</span><strong>{result.metrics.trades}</strong></div>
      </div>
    </div>
  {/if}
</div>

<style>
  .backtest-panel {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin: 24px 0 32px;
  }

  .backtest-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .backtest-header h3 {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 4px;
    color: var(--text);
  }

  .backtest-sub {
    font-size: 12.5px;
    color: var(--text-muted);
    margin: 0;
  }

  .backtest-controls {
    display: inline-flex;
    gap: 8px;
  }

  .bt-btn {
    background: var(--accent-fill);
    color: var(--accent-ink);
    border: none;
    border-radius: var(--radius);
    padding: 6px 14px;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition);
  }

  .bt-btn:hover { background: color-mix(in srgb, var(--accent-fill) 85%, #fff); }

  .bt-btn-ghost {
    background: transparent;
    color: var(--text-dim);
    border: 1px solid var(--border);
  }

  .bt-btn-ghost:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .backtest-state {
    padding: 32px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }

  .backtest-error {
    color: var(--red);
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .backtest-canvas-wrap {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    height: 220px;
    overflow: hidden;
  }

  .backtest-canvas-wrap canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .backtest-scrubber {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 12px 0 16px;
  }

  .backtest-scrubber input[type="range"] {
    flex: 1;
    accent-color: var(--accent);
  }

  .backtest-scrubber-label {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--text-muted);
    min-width: 96px;
    text-align: right;
  }

  .backtest-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    padding: 12px 0 4px;
  }

  .backtest-metrics > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .backtest-metrics span {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .backtest-metrics strong {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
</style>
