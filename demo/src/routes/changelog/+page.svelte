<script lang="ts">
  let { data } = $props<{ data: { markdown: string } }>();

  function escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderInline(s: string): string {
    // Code spans first so other replacements skip them.
    return s
      .replace(/`([^`]+)`/g, (_m, c) => `<code>${escape(c)}</code>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  function renderMarkdown(md: string): string {
    const lines = md.split(/\r?\n/);
    const html: string[] = [];
    let inList = false;
    let inCode = false;
    let codeBuffer: string[] = [];

    const closeList = () => {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
    };

    for (const raw of lines) {
      if (raw.startsWith('```')) {
        if (inCode) {
          html.push(`<pre><code>${escape(codeBuffer.join('\n'))}</code></pre>`);
          codeBuffer = [];
          inCode = false;
        } else {
          closeList();
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        codeBuffer.push(raw);
        continue;
      }

      const line = raw.trimEnd();

      if (/^#\s+/.test(line)) {
        closeList();
        html.push(`<h1>${renderInline(escape(line.replace(/^#\s+/, '')))}</h1>`);
        continue;
      }
      if (/^##\s+/.test(line)) {
        closeList();
        html.push(`<h2>${renderInline(escape(line.replace(/^##\s+/, '')))}</h2>`);
        continue;
      }
      if (/^###\s+/.test(line)) {
        closeList();
        html.push(`<h3>${renderInline(escape(line.replace(/^###\s+/, '')))}</h3>`);
        continue;
      }
      if (/^[-*]\s+/.test(line)) {
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        html.push(`<li>${renderInline(escape(line.replace(/^[-*]\s+/, '')))}</li>`);
        continue;
      }
      if (line === '') {
        closeList();
        continue;
      }
      closeList();
      html.push(`<p>${renderInline(escape(line))}</p>`);
    }

    if (inList) html.push('</ul>');
    if (inCode) {
      html.push(`<pre><code>${escape(codeBuffer.join('\n'))}</code></pre>`);
    }
    return html.join('\n');
  }

  const html = $derived(renderMarkdown(data.markdown));
</script>

<svelte:head>
  <title>Changelog — TradeCanvas</title>
  <meta name="description" content="Release notes for every TradeCanvas version." />
</svelte:head>

<article class="changelog">
  {@html html}
</article>

<style>
  .changelog {
    max-width: 900px;
    margin: 0 auto;
    padding: 48px 24px 96px;
    color: var(--text);
  }

  .changelog :global(h1) {
    font-size: clamp(1.75rem, 3vw, 2.25rem);
    letter-spacing: -0.02em;
    margin-bottom: 24px;
  }

  .changelog :global(h2) {
    font-size: 1.4rem;
    margin: 48px 0 12px;
    padding-top: 16px;
    border-top: 1px solid var(--border-subtle);
  }

  .changelog :global(h3) {
    font-size: 1.05rem;
    margin: 24px 0 8px;
    color: var(--text);
  }

  .changelog :global(p),
  .changelog :global(li) {
    font-size: 14.5px;
    color: var(--text-dim);
  }

  .changelog :global(ul) {
    margin: 8px 0 16px 24px;
  }

  .changelog :global(code) {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: rgba(59, 130, 246, 0.08);
    color: var(--accent);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .changelog :global(pre) {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    overflow-x: auto;
    margin: 16px 0;
    font-size: 13px;
  }

  .changelog :global(pre code) {
    background: none;
    color: var(--text);
    padding: 0;
  }

  .changelog :global(a) {
    color: var(--accent);
  }
</style>
