<script lang="ts">
  import { X } from 'lucide-svelte';
  import type { ChartSettingsState } from '../lib/chartSettings';

  type Tab = 'style' | 'display' | 'scale';

  interface Props {
    open: boolean;
    settings: ChartSettingsState;
    onClose: () => void;
    onChange: (patch: Partial<ChartSettingsState>) => void;
    onReset: () => void;
  }

  let { open, settings, onClose, onChange, onReset }: Props = $props();

  let tab: Tab = $state('style');

  const TABS: Tab[] = ['style', 'display', 'scale'];
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={onClose}></div>

  <!-- Dialog -->
  <div class="modal">
    <div class="modal-header">
      <h3>Chart Settings</h3>
      <button class="modal-close" onclick={onClose}>
        <X size={16} />
      </button>
    </div>

    <div class="modal-tabs">
      {#each TABS as t}
        <button
          class="modal-tab"
          class:active={tab === t}
          onclick={() => { tab = t; }}
        >
          {t}
        </button>
      {/each}
    </div>

    <div class="modal-body">
      {#if tab === 'style'}
        <div class="settings-section">
          <div class="settings-section-title">Candle Colors</div>
          <div class="settings-row">
            <span class="settings-label">Up Body</span>
            <div class="color-picker-wrap">
              <input type="color" value={settings.candleUpColor} oninput={(e) => onChange({ candleUpColor: e.currentTarget.value })} />
              <span class="color-hex">{settings.candleUpColor}</span>
            </div>
          </div>
          <div class="settings-row">
            <span class="settings-label">Down Body</span>
            <div class="color-picker-wrap">
              <input type="color" value={settings.candleDownColor} oninput={(e) => onChange({ candleDownColor: e.currentTarget.value })} />
              <span class="color-hex">{settings.candleDownColor}</span>
            </div>
          </div>
          <div class="settings-row">
            <span class="settings-label">Up Wick</span>
            <div class="color-picker-wrap">
              <input type="color" value={settings.candleUpWick} oninput={(e) => onChange({ candleUpWick: e.currentTarget.value })} />
              <span class="color-hex">{settings.candleUpWick}</span>
            </div>
          </div>
          <div class="settings-row">
            <span class="settings-label">Down Wick</span>
            <div class="color-picker-wrap">
              <input type="color" value={settings.candleDownWick} oninput={(e) => onChange({ candleDownWick: e.currentTarget.value })} />
              <span class="color-hex">{settings.candleDownWick}</span>
            </div>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Background</div>
          <div class="settings-row">
            <span class="settings-label">Background</span>
            <div class="color-picker-wrap">
              <input type="color" value={settings.backgroundColor} oninput={(e) => onChange({ backgroundColor: e.currentTarget.value })} />
              <span class="color-hex">{settings.backgroundColor}</span>
            </div>
          </div>
          <div class="settings-row">
            <span class="settings-label">Grid</span>
            <div class="color-picker-wrap">
              <input type="color" value={settings.gridColor} oninput={(e) => onChange({ gridColor: e.currentTarget.value })} />
              <span class="color-hex">{settings.gridColor}</span>
            </div>
          </div>
        </div>
      {/if}

      {#if tab === 'display'}
        <div class="settings-section">
          <div class="settings-row">
            <span class="settings-label">Grid Lines</span>
            <button
              class="toggle-switch"
              class:on={settings.gridVisible}
              onclick={() => onChange({ gridVisible: !settings.gridVisible })}
            ></button>
          </div>
          <div class="settings-row">
            <span class="settings-label">Volume</span>
            <button
              class="toggle-switch"
              class:on={settings.volumeVisible}
              onclick={() => onChange({ volumeVisible: !settings.volumeVisible })}
            ></button>
          </div>
          <div class="settings-row">
            <span class="settings-label">OHLC Legend</span>
            <button
              class="toggle-switch"
              class:on={settings.legendVisible}
              onclick={() => onChange({ legendVisible: !settings.legendVisible })}
            ></button>
          </div>
          <div class="settings-row">
            <span class="settings-label">Bar Countdown</span>
            <button
              class="toggle-switch"
              class:on={settings.barCountdown}
              onclick={() => onChange({ barCountdown: !settings.barCountdown })}
            ></button>
          </div>
          <div class="settings-row">
            <span class="settings-label">Crosshair Mode</span>
            <select
              class="settings-select"
              value={settings.crosshairMode}
              onchange={(e) => onChange({ crosshairMode: e.currentTarget.value as ChartSettingsState['crosshairMode'] })}
            >
              <option value="magnet">Magnet</option>
              <option value="normal">Normal</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <div class="settings-row">
            <span class="settings-label">Number Locale</span>
            <select
              class="settings-select"
              value={settings.numberLocale}
              onchange={(e) => onChange({ numberLocale: e.currentTarget.value })}
            >
              <option value="en-US">en-US (65,234.00)</option>
              <option value="de-DE">de-DE (65.234,00)</option>
              <option value="fr-FR">fr-FR (65 234,00)</option>
              <option value="vi-VN">vi-VN (65.234,00)</option>
              <option value="en-IN">en-IN (65,234.00)</option>
              <option value="ja-JP">ja-JP (65,234.00)</option>
            </select>
          </div>
        </div>
      {/if}

      {#if tab === 'scale'}
        <div class="settings-section">
          <div class="settings-row">
            <span class="settings-label">Auto Scale</span>
            <button
              class="toggle-switch"
              class:on={settings.autoScale}
              onclick={() => onChange({ autoScale: !settings.autoScale })}
            ></button>
          </div>
          <div class="settings-row">
            <span class="settings-label">Log Scale</span>
            <button
              class="toggle-switch"
              class:on={settings.logScale}
              onclick={() => onChange({ logScale: !settings.logScale })}
            ></button>
          </div>
        </div>
      {/if}
    </div>

    <div class="modal-footer">
      <button class="reset-link" onclick={onReset}>Reset to defaults</button>
      <button class="done-btn" onclick={onClose}>Done</button>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 100;
  }

  .modal {
    position: fixed;
    z-index: 101;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    width: 480px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h3 {
    font-size: 15px;
    font-weight: 600;
  }

  .modal-close {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 4px;
    transition: all var(--transition);
  }

  .modal-close:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text);
  }

  .modal-tabs {
    display: flex;
    gap: 0;
    padding: 0 20px;
    border-bottom: 1px solid var(--border);
  }

  .modal-tab {
    padding: 10px 16px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color var(--transition);
    font-family: inherit;
    text-transform: capitalize;
  }

  .modal-tab:hover {
    color: var(--text-dim);
  }

  .modal-tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .settings-section {
    margin-bottom: 20px;
  }

  .settings-section:last-child {
    margin-bottom: 0;
  }

  .settings-section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
  }

  .settings-row + .settings-row {
    border-top: 1px solid rgba(255, 255, 255, 0.03);
  }

  .settings-label {
    font-size: 13px;
    color: var(--text-dim);
  }

  .color-picker-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .color-picker-wrap input[type='color'] {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: none;
    cursor: pointer;
    padding: 2px;
  }

  .color-picker-wrap input[type='color']::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  .color-picker-wrap input[type='color']::-webkit-color-swatch {
    border: none;
    border-radius: 2px;
  }

  .color-hex {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    min-width: 60px;
  }

  .toggle-switch {
    width: 36px;
    height: 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    position: relative;
    cursor: pointer;
    transition: background var(--transition);
    border: none;
    padding: 0;
    flex-shrink: 0;
  }

  .toggle-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-muted);
    transition: all var(--transition);
  }

  .toggle-switch.on {
    background: var(--accent);
  }

  .toggle-switch.on::after {
    left: 18px;
    background: white;
  }

  :global(body.light) .toggle-switch {
    background: rgba(0, 0, 0, 0.1);
  }

  :global(body.light) .toggle-switch::after {
    background: #888;
  }

  :global(body.light) .toggle-switch.on {
    background: var(--accent);
  }

  :global(body.light) .toggle-switch.on::after {
    background: white;
  }

  .settings-select {
    padding: 4px 8px;
    font-size: 12px;
    font-family: inherit;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    cursor: pointer;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-top: 1px solid var(--border);
  }

  .reset-link {
    font-size: 12px;
    color: var(--text-muted);
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color var(--transition);
  }

  .reset-link:hover {
    color: var(--text-dim);
  }

  .done-btn {
    padding: 6px 16px;
    font-size: 12px;
    font-weight: 500;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    transition: background var(--transition);
  }

  .done-btn:hover {
    background: #2563eb;
  }
</style>
