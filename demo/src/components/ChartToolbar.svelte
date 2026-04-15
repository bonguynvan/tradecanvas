<script lang="ts">
  import type { ChartType, TimeFrame } from '@tradecanvas/chart';
  import { BarChart3, ChevronDown, TrendingUp, Camera, Settings, Moon, Sun, X } from 'lucide-svelte';
  import { TIMEFRAMES, CHART_TYPES, INDICATORS, POPULAR_INDICATORS } from '../lib/chartConfig';
  import Dropdown from './Dropdown.svelte';

  interface ActiveIndicator {
    instanceId: string;
    id: string;
    label: string;
  }

  interface Props {
    symbol: string;
    activeTimeframe: TimeFrame;
    activeChartType: ChartType;
    activeIndicators: ActiveIndicator[];
    isDark: boolean;
    onSymbolClick: () => void;
    onTimeframe: (tf: TimeFrame) => void;
    onChartType: (type: ChartType) => void;
    onAddIndicator: (id: string) => void;
    onRemoveIndicator: (instanceId: string) => void;
    onScreenshot: () => void;
    onSettings: () => void;
    onToggleTheme: () => void;
  }

  let {
    symbol, activeTimeframe, activeChartType,
    activeIndicators, isDark,
    onSymbolClick, onTimeframe, onChartType,
    onAddIndicator, onRemoveIndicator,
    onScreenshot, onSettings, onToggleTheme,
  }: Props = $props();

  const popularIndicators = $derived(
    INDICATORS.filter(d => POPULAR_INDICATORS.includes(d.id))
  );

  const otherIndicators = $derived(
    INDICATORS.filter(d => !POPULAR_INDICATORS.includes(d.id))
  );

  const chartTypeLabel = $derived(
    CHART_TYPES.find(t => t.value === activeChartType)?.label ?? 'Candles'
  );
</script>

<div class="chart-toolbar">
  <!-- Symbol -->
  <button class="toolbar-symbol" onclick={onSymbolClick}>{symbol}</button>
  <span class="toolbar-sep"></span>

  <!-- Timeframes -->
  <div class="toolbar-group">
    {#each TIMEFRAMES as { label, value }}
      <button
        class="tb"
        class:active={activeTimeframe === value}
        onclick={() => onTimeframe(value)}
      >
        {label}
      </button>
    {/each}
  </div>
  <span class="toolbar-sep"></span>

  <!-- Chart Type -->
  <Dropdown width="160px">
    {#snippet trigger()}
      <BarChart3 size={14} />
      {chartTypeLabel}
      <ChevronDown size={12} />
    {/snippet}
    {#each CHART_TYPES as ct}
      <button
        class="dropdown-item"
        class:active={activeChartType === ct.value}
        onclick={() => onChartType(ct.value)}
      >
        {ct.label}
      </button>
    {/each}
  </Dropdown>
  <span class="toolbar-sep"></span>

  <!-- Indicators -->
  <Dropdown width="280px">
    {#snippet trigger()}
      <TrendingUp size={14} />
      Indicators
      {#if activeIndicators.length > 0}
        <span class="badge-count">{activeIndicators.length}</span>
      {/if}
    {/snippet}
    <div class="dropdown-label">Popular</div>
    {#each popularIndicators as ind}
      <button class="dropdown-item" onclick={() => onAddIndicator(ind.id)}>
        <span>{ind.name}</span>
        <span class="tag">{ind.type}</span>
      </button>
    {/each}
    <div class="dropdown-divider"></div>
    <div class="dropdown-label">All</div>
    {#each otherIndicators as ind}
      <button class="dropdown-item" onclick={() => onAddIndicator(ind.id)}>
        <span>{ind.name}</span>
        <span class="tag">{ind.type}</span>
      </button>
    {/each}
  </Dropdown>

  <!-- Indicator chips -->
  <div class="indicator-chips">
    {#each activeIndicators as ind}
      <div class="indicator-chip">
        <span>{ind.label}</span>
        <button class="chip-remove" onclick={() => onRemoveIndicator(ind.instanceId)}>
          <X size={10} />
        </button>
      </div>
    {/each}
  </div>

  <span class="toolbar-spacer"></span>

  <!-- Right side buttons -->
  <button class="tb-icon" title="Screenshot" onclick={onScreenshot}>
    <Camera size={14} />
  </button>
  <button class="tb-icon" title="Chart Settings" onclick={onSettings}>
    <Settings size={14} />
  </button>
  <button class="tb-icon" title="Toggle theme" onclick={onToggleTheme}>
    {#if isDark}
      <Moon size={14} />
    {:else}
      <Sun size={14} />
    {/if}
  </button>
</div>

<style>
  .chart-toolbar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 12px;
    height: 40px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
    flex-shrink: 0;
    position: relative;
    z-index: 20;
  }

  .toolbar-symbol {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    padding: 0 10px;
    white-space: nowrap;
    letter-spacing: -0.01em;
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
  }

  .toolbar-sep {
    width: 1px;
    height: 20px;
    background: var(--border);
    flex-shrink: 0;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 8px;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .tb {
    padding: 4px 8px;
    font-size: 12px;
    font-family: inherit;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
    line-height: 1;
  }

  .tb:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
  }

  .tb.active {
    background: var(--accent);
    color: white;
  }

  :global(body.light) .tb:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .tb-icon {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition);
    line-height: 1;
  }

  .tb-icon:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
  }

  :global(body.light) .tb-icon:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .badge-count {
    font-size: 10px;
    color: var(--accent);
    background: var(--accent-dim);
    padding: 0 4px;
    border-radius: 8px;
    font-weight: 600;
  }

  .indicator-chips {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px;
    flex-wrap: nowrap;
    overflow: hidden;
  }

  .indicator-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 2px 8px;
    font-size: 11px;
    font-weight: 500;
    background: var(--accent-dim);
    color: var(--accent);
    border-radius: 4px;
    white-space: nowrap;
    line-height: 1.4;
  }

  .chip-remove {
    cursor: pointer;
    opacity: 0.6;
    padding: 0 2px;
    transition: opacity var(--transition);
    border: none;
    background: none;
    color: inherit;
    display: inline-flex;
    align-items: center;
  }

  .chip-remove:hover {
    opacity: 1;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    font-size: 12px;
    color: var(--text-dim);
    cursor: pointer;
    transition: background var(--transition), color var(--transition);
    width: 100%;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
  }

  .dropdown-item:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
  }

  .dropdown-item.active {
    color: var(--accent);
  }

  :global(body.light) .dropdown-item:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .tag {
    font-size: 10px;
    color: var(--text-muted);
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.04);
  }

  .dropdown-label {
    text-transform: uppercase;
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    padding: 6px 12px;
    font-weight: 600;
  }

  .dropdown-divider {
    border-top: 1px solid var(--border);
    margin: 4px 0;
  }

  @media (max-width: 768px) {
    .chart-toolbar {
      padding: 0 8px;
      height: 36px;
    }
    .toolbar-sep {
      display: none;
    }
    .indicator-chips {
      display: none;
    }
  }
</style>
