<script lang="ts">
  import type { DrawingToolType } from '@tradecanvas/chart';
  import {
    TrendingUp, Minus, PenLine, Hash, Square, GitBranch,
    Ruler, Type, MousePointer, Magnet, Undo2, Redo2, Trash2,
  } from 'lucide-svelte';
  import { DRAWING_TOOL_GROUPS } from '../lib/chartConfig';
  import type { Component } from 'svelte';

  interface Props {
    activeTool: DrawingToolType | null;
    magnetEnabled: boolean;
    onDrawingTool: (tool: DrawingToolType) => void;
    onCancelDrawing: () => void;
    onToggleMagnet: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onClearDrawings: () => void;
  }

  let {
    activeTool, magnetEnabled,
    onDrawingTool, onCancelDrawing, onToggleMagnet,
    onUndo, onRedo, onClearDrawings,
  }: Props = $props();

  // Map group index to icon component
  const GROUP_ICONS: Component[] = [
    TrendingUp, Minus, PenLine, Hash, Square, GitBranch, Ruler, Type,
  ];

  let hoveredGroup: number | null = $state(null);

  const activeGroupIdx = $derived(
    DRAWING_TOOL_GROUPS.findIndex(g =>
      g.tools.some(t => t.value === activeTool)
    )
  );
</script>

<div class="drawing-sidebar">
  <!-- Cursor (deselect tool) -->
  <button
    class="sidebar-btn"
    class:active={activeTool === null}
    onclick={onCancelDrawing}
    title="Cursor"
  >
    <MousePointer size={14} />
  </button>

  <div class="sidebar-divider"></div>

  <!-- Tool groups -->
  {#each DRAWING_TOOL_GROUPS as group, idx}
    {@const Icon = GROUP_ICONS[idx]}
    <div
      class="tool-group-wrap"
      onmouseenter={() => { hoveredGroup = idx; }}
      onmouseleave={() => { hoveredGroup = null; }}
    >
      <button
        class="sidebar-btn"
        class:active={activeGroupIdx === idx}
        onclick={() => onDrawingTool(group.tools[0].value)}
        title={group.label}
      >
        <Icon size={14} />
        {#if group.tools.length > 1}
          <span class="multi-dot"></span>
        {/if}
      </button>

      <!-- Flyout sub-menu -->
      {#if hoveredGroup === idx && group.tools.length > 1}
        <div class="flyout-menu">
          <div class="flyout-header">{group.label}</div>
          {#each group.tools as tool}
            <button
              class="flyout-item"
              class:active={activeTool === tool.value}
              onclick={() => { onDrawingTool(tool.value); hoveredGroup = null; }}
            >
              {tool.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/each}

  <div class="sidebar-spacer"></div>

  <div class="sidebar-divider"></div>

  <!-- Bottom tools -->
  <button
    class="sidebar-btn"
    class:active={magnetEnabled}
    onclick={onToggleMagnet}
    title={magnetEnabled ? 'Magnet ON' : 'Magnet OFF'}
  >
    <Magnet size={14} />
  </button>

  <button class="sidebar-btn" onclick={onUndo} title="Undo">
    <Undo2 size={14} />
  </button>

  <button class="sidebar-btn" onclick={onRedo} title="Redo">
    <Redo2 size={14} />
  </button>

  <button class="sidebar-btn danger" onclick={onClearDrawings} title="Clear all">
    <Trash2 size={14} />
  </button>
</div>

<style>
  .drawing-sidebar {
    width: 36px;
    flex-shrink: 0;
    background: var(--bg-elevated);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0;
    overflow: visible;
  }

  .tool-group-wrap {
    position: relative;
  }

  .sidebar-btn {
    width: 36px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-family: inherit;
    transition: all var(--transition);
    position: relative;
    flex-shrink: 0;
    line-height: 1;
  }

  .sidebar-btn:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.04);
  }

  .sidebar-btn.active {
    color: var(--accent);
    background: var(--accent-glow);
  }

  .sidebar-btn.danger:hover {
    color: var(--red);
    background: rgba(239, 68, 68, 0.1);
  }

  :global(body.light) .sidebar-btn:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .multi-dot {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--text-muted);
  }

  .sidebar-divider {
    width: 20px;
    height: 1px;
    background: var(--border);
    margin: 4px 0;
    flex-shrink: 0;
  }

  .sidebar-spacer {
    flex: 1;
  }

  /* Flyout */
  .flyout-menu {
    position: absolute;
    left: 100%;
    top: 0;
    margin-left: 2px;
    min-width: 160px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 30;
    padding: 4px 0;
  }

  .flyout-header {
    text-transform: uppercase;
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    padding: 6px 12px;
    font-weight: 600;
  }

  .flyout-item {
    padding: 6px 12px;
    font-size: 12px;
    color: var(--text-dim);
    cursor: pointer;
    width: 100%;
    display: block;
    border: none;
    background: none;
    text-align: left;
    font-family: inherit;
    transition: background var(--transition), color var(--transition);
  }

  .flyout-item:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
  }

  .flyout-item.active {
    color: var(--accent);
  }

  :global(body.light) .flyout-item:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  @media (max-width: 768px) {
    .drawing-sidebar {
      width: 32px;
    }
    .sidebar-btn {
      width: 32px;
      height: 28px;
    }
  }
</style>
