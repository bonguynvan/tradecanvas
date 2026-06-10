/**
 * Lightweight fuzzy symbol picker. Reuses the command-palette CSS for visual
 * consistency. Scoring is a cheap subsequence match — good enough for symbol
 * lists in the low thousands without pulling in a fuzzy-search dependency.
 */
export interface SymbolSearchCallbacks {
  onPick: (symbol: string) => void;
  onClose: () => void;
}

interface ScoredSymbol {
  symbol: string;
  score: number;
}

export class WidgetSymbolSearch {
  private backdrop: HTMLDivElement | null = null;
  private modal: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLDivElement | null = null;
  private symbols: string[] = [];
  private current: string = '';
  private filtered: ScoredSymbol[] = [];
  private selectedIndex = 0;
  private callbacks: SymbolSearchCallbacks;
  private boundKeydown: (e: KeyboardEvent) => void;
  /** One-shot pick override — when set, this open() routes picks here instead. */
  private pickOverride: ((symbol: string) => void) | null = null;

  constructor(callbacks: SymbolSearchCallbacks) {
    this.callbacks = callbacks;
    this.boundKeydown = this.handleKeydown.bind(this);
  }

  open(symbols: string[], current: string, onPick?: (symbol: string) => void): void {
    if (this.backdrop) return;
    this.pickOverride = onPick ?? null;
    this.symbols = symbols;
    this.current = current;
    this.filtered = symbols.map(s => ({ symbol: s, score: 0 }));
    this.selectedIndex = Math.max(0, symbols.indexOf(current));

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.addEventListener('click', () => this.close());

    this.modal = document.createElement('div');
    this.modal.className = 'tcw-cmd-palette';

    const header = document.createElement('div');
    header.className = 'tcw-cmd-header';

    const icon = document.createElement('span');
    icon.className = 'tcw-cmd-icon';
    icon.innerHTML = svgSearch();
    header.appendChild(icon);

    this.input = document.createElement('input');
    this.input.className = 'tcw-cmd-input';
    this.input.type = 'text';
    this.input.placeholder = 'Search symbol… (e.g. BTC, ETH, AAPL)';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.addEventListener('input', () => this.filter());
    header.appendChild(this.input);

    const hint = document.createElement('span');
    hint.className = 'tcw-cmd-hint';
    hint.textContent = 'ESC';
    header.appendChild(hint);

    this.modal.appendChild(header);

    this.list = document.createElement('div');
    this.list.className = 'tcw-cmd-list';
    this.modal.appendChild(this.list);

    const footer = document.createElement('div');
    footer.className = 'tcw-cmd-footer';
    footer.innerHTML = '<span>↑↓ Navigate</span><span>⏎ Open</span><span>Esc Close</span>';
    this.modal.appendChild(footer);

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.modal);

    this.renderList();
    this.input.focus();
    document.addEventListener('keydown', this.boundKeydown);
  }

  close(): void {
    document.removeEventListener('keydown', this.boundKeydown);
    this.backdrop?.remove();
    this.modal?.remove();
    this.backdrop = null;
    this.modal = null;
    this.input = null;
    this.list = null;
    this.pickOverride = null;
    this.callbacks.onClose();
  }

  isOpen(): boolean {
    return this.backdrop !== null;
  }

  destroy(): void {
    this.close();
  }

  private filter(): void {
    const q = (this.input?.value ?? '').toUpperCase().trim();
    if (!q) {
      this.filtered = this.symbols.map(s => ({ symbol: s, score: 0 }));
    } else {
      this.filtered = this.symbols
        .map(s => ({ symbol: s, score: scoreMatch(s.toUpperCase(), q) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);
    }
    this.selectedIndex = 0;
    this.renderList();
  }

  private renderList(): void {
    if (!this.list) return;
    this.list.innerHTML = '';

    if (this.filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tcw-cmd-empty';
      empty.textContent = 'No symbols match';
      this.list.appendChild(empty);
      return;
    }

    const query = (this.input?.value ?? '').toUpperCase().trim();
    for (let i = 0; i < this.filtered.length; i++) {
      const { symbol } = this.filtered[i];
      const row = document.createElement('button');
      row.className = 'tcw-cmd-item';
      if (i === this.selectedIndex) row.classList.add('tcw-selected');
      if (symbol === this.current) row.classList.add('tcw-active');

      const label = document.createElement('span');
      label.className = 'tcw-cmd-item-label';
      label.innerHTML = highlight(symbol, query);
      row.appendChild(label);

      if (symbol === this.current) {
        const check = document.createElement('span');
        check.className = 'tcw-cmd-check';
        check.textContent = '✓';
        row.appendChild(check);
      }

      row.addEventListener('click', () => this.pick(i));
      row.addEventListener('mouseenter', () => {
        this.selectedIndex = i;
        this.updateSelection();
      });

      this.list.appendChild(row);
    }
  }

  private updateSelection(): void {
    if (!this.list) return;
    const items = this.list.querySelectorAll('.tcw-cmd-item');
    items.forEach((el, i) => el.classList.toggle('tcw-selected', i === this.selectedIndex));
    items[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }

  private pick(index: number): void {
    const entry = this.filtered[index];
    if (!entry) return;
    const override = this.pickOverride;
    if (override) override(entry.symbol);
    else this.callbacks.onPick(entry.symbol);
    this.close();
  }

  private handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (this.filtered.length > 0) {
          this.selectedIndex = (this.selectedIndex + 1) % this.filtered.length;
          this.updateSelection();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (this.filtered.length > 0) {
          this.selectedIndex = (this.selectedIndex - 1 + this.filtered.length) % this.filtered.length;
          this.updateSelection();
        }
        break;
      case 'Enter':
        e.preventDefault();
        this.pick(this.selectedIndex);
        break;
    }
  }
}

/**
 * Cheap fuzzy score:
 *   exact match              → 1000
 *   starts-with              → 500 + tighter-prefix bonus
 *   subsequence match        → 100 − gap penalty
 *   no match                 → 0
 */
function scoreMatch(symbol: string, query: string): number {
  if (symbol === query) return 1000;
  if (symbol.startsWith(query)) return 500 + (50 - Math.min(50, symbol.length - query.length));
  if (symbol.includes(query)) return 200 + (50 - Math.min(50, symbol.length - query.length));

  let qi = 0;
  let lastIdx = -1;
  let gapPenalty = 0;
  for (let i = 0; i < symbol.length && qi < query.length; i++) {
    if (symbol[i] === query[qi]) {
      if (lastIdx >= 0) gapPenalty += i - lastIdx - 1;
      lastIdx = i;
      qi++;
    }
  }
  if (qi < query.length) return 0;
  return 100 - Math.min(99, gapPenalty);
}

function highlight(symbol: string, query: string): string {
  if (!query) return escapeHtml(symbol);
  const upper = symbol.toUpperCase();
  let out = '';
  let qi = 0;
  for (let i = 0; i < symbol.length; i++) {
    if (qi < query.length && upper[i] === query[qi]) {
      out += `<mark style="background:transparent;color:var(--tcw-accent);font-weight:700">${escapeHtml(symbol[i])}</mark>`;
      qi++;
    } else {
      out += escapeHtml(symbol[i]);
    }
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[ch]);
}

function svgSearch(): string {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
}
