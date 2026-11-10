<script lang="ts" module>
  export interface DiagramNode {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    /** The name, in code where there is one. */
    title: string;
    /** A short second line. */
    note?: string;
    /** `key` is the piece the diagram is about; `edge` is outside the library (your app, an exchange). */
    kind?: 'key' | 'edge';
  }

  export interface DiagramEdge {
    from: string;
    to: string;
    label?: string;
    /** Something that happens later or only sometimes. */
    dashed?: boolean;
    /** Where the label sits, as a fraction of the way along. */
    at?: number;
  }

  /** A box's words in the page's language; names from the code are left as they are. */
  export type DiagramWords = Record<string, { title?: string; note?: string }>;

  export interface DiagramStep {
    /** The boxes this step is about; the first gets the step's number. */
    nodes: string[];
    title: string;
    text: string;
  }
</script>

<script lang="ts">
  // A boxes-and-arrows diagram for the docs, with numbered steps under it.
  // Pointing at a step (or tabbing to it) lights up the boxes and arrows it
  // is about. The docs are also rendered to static HTML with no script, so
  // that is done in CSS alone (`:has()`), and the styles are written into
  // the markup: a component stylesheet would not reach the static page.

  let { id, label, width, height, nodes: shape, edges, steps, words = {} }: {
    id: string;
    label: string;
    width: number;
    height: number;
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    steps: DiagramStep[];
    words?: DiagramWords;
  } = $props();

  const nodes = $derived(shape.map((n) => ({ ...n, ...words[n.id] })));

  const LINE = 'var(--border, var(--line, #8888))';
  const BADGE = 9;

  const byId = $derived(new Map(nodes.map((n) => [n.id, n])));

  /** An arrow between two boxes: straight when they line up, else one bend each way. */
  function route(edge: DiagramEdge): { d: string; lx: number; ly: number; across: boolean } {
    const a = byId.get(edge.from)!;
    const b = byId.get(edge.to)!;
    const t = edge.at ?? 0.5;
    if (b.y >= a.y + a.h || a.y >= b.y + b.h) {
      const down = b.y >= a.y + a.h;
      const x1 = a.x + a.w / 2, y1 = down ? a.y + a.h : a.y;
      const x2 = b.x + b.w / 2, y2 = down ? b.y : b.y + b.h;
      const ym = y1 + (y2 - y1) / 2;
      const d = x1 === x2 ? `M${x1} ${y1}V${y2}` : `M${x1} ${y1}V${ym}H${x2}V${y2}`;
      return { d, lx: x1 === x2 ? x1 : x1 + (x2 - x1) * t, ly: x1 === x2 ? y1 + (y2 - y1) * t : ym, across: x1 !== x2 };
    }
    const right = b.x >= a.x + a.w;
    const x1 = right ? a.x + a.w : a.x, y1 = a.y + a.h / 2;
    const x2 = right ? b.x : b.x + b.w, y2 = b.y + b.h / 2;
    const xm = x1 + (x2 - x1) / 2;
    const d = y1 === y2 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}H${xm}V${y2}H${x2}`;
    return { d, lx: y1 === y2 ? x1 + (x2 - x1) * t : xm, ly: y1 === y2 ? y1 : y1 + (y2 - y1) * t, across: y1 === y2 };
  }

  /** Each box's number: the first step that names it first. */
  const badges = $derived.by(() => {
    const out = new Map<string, number>();
    steps.forEach((step, i) => {
      const first = step.nodes[0];
      if (first && !out.has(first)) out.set(first, i + 1);
    });
    return out;
  });

  // For each step, the rules that light up its boxes and the arrows between them.
  const css = $derived.by(() => {
    const root = `[data-dg="${id}"]`;
    const rules = steps.map((step, i) => {
      const on = `${root}:has(li[data-step="${i + 1}"]:is(:hover,:focus))`;
      const set = new Set(step.nodes);
      const boxes = step.nodes.map((n) => `${on} g[data-node="${n}"]`).join(',');
      const rects = step.nodes.map((n) => `${on} g[data-node="${n}"] rect`).join(',');
      const arrows = edges
        .map((e, j) => (set.has(e.from) && set.has(e.to) ? `${on} g[data-edge="${j}"]` : ''))
        .filter(Boolean);
      return [
        `${boxes}{opacity:1}`,
        `${rects}{stroke:var(--dg-accent);fill:var(--dg-wash)}`,
        arrows.length ? `${arrows.join(',')}{opacity:1;color:var(--dg-accent)}` : '',
      ].join('');
    });
    return `<style>
${root}{--dg-accent:var(--accent,var(--brand,#e8961e));--dg-wash:color-mix(in srgb,var(--dg-accent) 14%,transparent);--dg-mono:var(--font-mono,var(--mono,ui-monospace,monospace));margin:24px 0 28px}
${root} .dg-scroll{overflow-x:auto;border:1px solid ${LINE};border-radius:8px;background:var(--bg-elevated,var(--card,transparent));padding:12px}
${root} svg{display:block;width:100%;min-width:600px;height:auto;max-width:100%}
${root} g[data-node],${root} g[data-edge]{transition:opacity .15s}
${root} .dg-label{font:11.5px var(--dg-mono);paint-order:stroke;stroke:var(--bg-elevated,var(--card,#fff));stroke-width:4px;stroke-linejoin:round}
${root}:has(li[data-step]:is(:hover,:focus)) g[data-node],${root}:has(li[data-step]:is(:hover,:focus)) g[data-edge]{opacity:.35}
${root} ol{list-style:none;margin:16px 0 0!important;padding:0!important;display:grid;gap:4px}
${root} li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:10px;margin:0!important;padding:8px 10px;border-radius:6px;cursor:default;outline:none}
${root} li:is(:hover,:focus){background:var(--dg-wash)}
${root} li:focus-visible{box-shadow:inset 0 0 0 2px var(--dg-accent)}
${root} li .dg-n{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;border:1px solid ${LINE};font:600 12px/1 var(--dg-mono);color:var(--text)}
${root} li:is(:hover,:focus) .dg-n{border-color:var(--dg-accent);background:var(--dg-accent);color:var(--accent-ink,var(--on-brand,#141412))}
${root} li strong{color:var(--text)}
${root} figcaption{font-size:13px;color:var(--text-muted,var(--text-3));margin-top:8px}
${rules.join('\n')}
</style>`;
  });
</script>

<figure data-dg={id}>
  {@html css}
  <div class="dg-scroll">
    <svg viewBox="0 0 {width} {height}" role="img" aria-label={label}>
      <defs>
        <marker id="{id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 1L9 5L0 9z" fill="currentColor" />
        </marker>
      </defs>
      {#each edges as edge, j}
        {@const r = route(edge)}
        <g data-edge={j} style="color:var(--text-muted, var(--text-3, #888))">
          <path d={r.d} fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray={edge.dashed ? '5 4' : undefined} marker-end="url(#{id}-arrow)" />
          {#if edge.label}
            <text x={r.across ? r.lx : r.lx + 7} y={r.across ? r.ly - 6 : r.ly + 4} text-anchor={r.across ? 'middle' : 'start'} fill="currentColor" class="dg-label">{edge.label}</text>
          {/if}
        </g>
      {/each}
      {#each nodes as node}
        {@const n = badges.get(node.id)}
        <g data-node={node.id}>
          <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="6"
            fill={node.kind === 'key' ? 'var(--dg-wash)' : 'var(--bg, var(--page, transparent))'}
            stroke={node.kind === 'key' ? 'var(--dg-accent)' : LINE}
            stroke-width={node.kind === 'key' ? 1.75 : 1.25}
            stroke-dasharray={node.kind === 'edge' ? '4 3' : undefined} />
          <text x={node.x + node.w / 2} y={node.y + (node.note ? node.h / 2 - 3 : node.h / 2 + 4.5)} text-anchor="middle" fill="var(--text)" style="font: 600 13.5px var(--dg-mono)">{node.title}</text>
          {#if node.note}
            <text x={node.x + node.w / 2} y={node.y + node.h / 2 + 14} text-anchor="middle" fill="var(--text-dim, var(--text-2))" style="font-size: 12px">{node.note}</text>
          {/if}
          {#if n}
            <circle cx={node.x} cy={node.y} r={BADGE} fill="var(--text)" />
            <text x={node.x} y={node.y + 4} text-anchor="middle" fill="var(--bg, var(--page, #fff))" style="font: 600 11px var(--dg-mono)">{n}</text>
          {/if}
        </g>
      {/each}
    </svg>
  </div>
  <ol>
    {#each steps as step, i}
      <!-- A step takes focus so that a keyboard lights up its boxes, as a pointer does. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <li data-step={i + 1} tabindex="0">
        <span class="dg-n" aria-hidden="true">{i + 1}</span>
        <span><strong>{step.title}.</strong> {step.text}</span>
      </li>
    {/each}
  </ol>
  <figcaption>{label}</figcaption>
</figure>
