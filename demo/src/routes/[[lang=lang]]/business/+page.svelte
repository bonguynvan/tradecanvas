<script lang="ts">
  import { useI18n } from '$lib/i18n/context.svelte';
  import { copyText } from '$lib/clipboard';
  import { BUSINESS_EMAIL, LINKS } from '$lib/site';

  const i18n = useI18n();
  const m = $derived(i18n.m.business);

  const REPO_FILE = `${LINKS.github}/blob/main`;
  /** Where each line of `m.business.reviewHtml` can be checked, in its order. */
  const REVIEW_SOURCES: readonly (string | null)[] = [
    `${REPO_FILE}/packages/library/package.json`,
    null,
    `${REPO_FILE}/packages/library/src/widget/WidgetStyles.ts`,
    `${REPO_FILE}/SECURITY.md`,
    `${REPO_FILE}/.github/workflows/test.yml`,
    `${REPO_FILE}/.github/workflows/publish.yml`,
    `${LINKS.github}#browser-support`,
    `${REPO_FILE}/LICENSE`,
  ];

  let copied = $state(false);
  let emailEl: HTMLElement | undefined = $state();
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  async function copyEmail() {
    clearTimeout(resetTimer);
    copied = await copyText(BUSINESS_EMAIL, emailEl);
    if (copied) resetTimer = setTimeout(() => { copied = false; }, 1500);
  }

  $effect(() => () => clearTimeout(resetTimer));
</script>

<svelte:head>
  <title>{m.metaTitle}</title>
  <meta name="description" content={m.description} />
</svelte:head>

<section class="hero">
  <span class="eyebrow">{m.eyebrow}</span>
  <h1 class="hero-title">{m.title}</h1>
  <p class="hero-subtitle">{m.lede}</p>
  <div class="cta-row">
    <a href="#contact" class="cta-btn cta-btn--primary">{m.ctaContact}</a>
    <a href={i18n.href('/audit')} class="cta-btn cta-btn--ghost">{m.ctaAudit}</a>
  </div>
</section>

<div class="business">
<section class="block" aria-labelledby="business-free">
  <h2 id="business-free">{m.freeTitle}</h2>
  <ul class="free">
    {#each m.free as item, i (i)}
      <li>
        <h3>{item.title}</h3>
        <p>{item.body}</p>
      </li>
    {/each}
  </ul>
</section>

<section class="block" aria-labelledby="business-review">
  <h2 id="business-review">{m.reviewTitle}</h2>
  <p class="lede">{m.reviewLede}</p>
  <ul class="checks">
    {#each m.reviewHtml as line, i (i)}
      <li>
        <span>{@html line}</span>
        {#if REVIEW_SOURCES[i]}
          <a href={REVIEW_SOURCES[i]} target="_blank" rel="noopener">{m.source}</a>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<section class="block" aria-labelledby="business-data">
  <h2 id="business-data">{m.dataTitle}</h2>
  <p class="lede">{@html m.dataHtml}</p>
  <p class="links">
    <a href={i18n.href('/docs/realtime')}>{m.dataDocs} →</a>
    <a href={i18n.href('/docs/trading')}>{m.tradingDocs} →</a>
  </p>
</section>

<section class="block" aria-labelledby="business-partners">
  <h2 id="business-partners">{m.partnerTitle}</h2>
  <p class="lede">{m.partnerLede}</p>
  <div class="terms">
    <div>
      <h3>{m.partnerGetTitle}</h3>
      <ul>
        {#each m.partnerGet as line, i (i)}<li>{line}</li>{/each}
      </ul>
    </div>
    <div>
      <h3>{m.partnerGiveTitle}</h3>
      <ul>
        {#each m.partnerGive as line, i (i)}<li>{line}</li>{/each}
      </ul>
    </div>
  </div>
  <p class="note">{m.partnerNote}</p>
</section>

<section class="block contact" id="contact" aria-labelledby="business-contact">
  <h2 id="business-contact">{m.contactTitle}</h2>
  <p class="lede">{m.contactLede}</p>
  <div class="email-row">
    <a class="email" href="mailto:{BUSINESS_EMAIL}" bind:this={emailEl}>{BUSINESS_EMAIL}</a>
    <button type="button" class="copy" class:copied onclick={copyEmail}>{copied ? i18n.m.copy.copied : i18n.m.copy.copy}</button>
    <span class="sr-only" aria-live="polite">{copied ? i18n.m.copy.copiedAnnouncement : ''}</span>
  </div>
  <p class="note"><a href={LINKS.issues} target="_blank" rel="noopener">{m.contactPublic}</a></p>
</section>

<section class="block" aria-labelledby="business-faq">
  <h2 id="business-faq">{m.faqTitle}</h2>
  <dl class="faq">
    {#each m.faq as item, i (i)}
      <div>
        <dt>{item.q}</dt>
        <dd>{item.a}</dd>
      </div>
    {/each}
  </dl>
</section>
</div>

<style>
  .hero { display: grid; gap: 14px; justify-items: start; }
  .hero .cta-row { margin-top: 6px; }

  .business { max-width: var(--page-max); margin-inline: auto; padding: 8px var(--gutter) var(--section-pad); }
  .block { display: grid; gap: 12px; min-width: 0; }
  .block + .block { margin-top: 56px; }
  .block h2 { font-size: 20px; font-weight: 600; letter-spacing: -0.015em; margin: 0; }
  .block h3 { font-size: 15px; font-weight: 600; margin: 0; color: var(--text); }
  .lede, .note { color: var(--text-dim); margin: 0; max-width: 72ch; }
  .note { font-size: 13px; color: var(--text-muted); }
  .lede :global(code), .checks :global(code) { font-family: var(--font-mono); font-size: 0.9em; }

  .free {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .free li {
    display: grid;
    gap: 6px;
    align-content: start;
    padding: 18px;
    background: var(--bg-card);
    border-left: 1px solid var(--border);
    border-top: 1px solid var(--border);
    margin: -1px 0 0 -1px;
  }
  .free p { margin: 0; font-size: 14px; color: var(--text-dim); }

  .checks { margin: 0; padding: 0; list-style: none; display: grid; border-top: 1px solid var(--border); }
  .checks li {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 10px 0 10px 26px;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-dim);
  }
  .checks li::before { content: '✓'; position: absolute; left: 4px; color: var(--green); }
  .checks span { min-width: 0; max-width: 90ch; }
  .checks a { flex: none; font: 12px var(--font-mono); color: var(--text-muted); }
  .checks a:hover { color: var(--accent); }

  .links { display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 0; }
  .links a { color: var(--accent); font-weight: 500; }

  .terms { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px 32px; }
  .terms > div { display: grid; gap: 8px; align-content: start; min-width: 0; }
  .terms ul { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--border); }
  .terms li { padding: 9px 0 9px 22px; position: relative; color: var(--text-dim); border-bottom: 1px solid var(--border-subtle); }
  .terms li::before { content: '—'; position: absolute; left: 2px; color: var(--accent); }

  .contact {
    padding: 24px;
    border: 1px solid var(--accent-dim);
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, var(--accent-glow), transparent 70%), var(--bg-card);
  }
  .email-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
  .email {
    font: 500 clamp(17px, 2.6vw, 22px) var(--font-mono);
    color: var(--text);
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }
  .email:hover { color: var(--accent); }
  .copy {
    font: 500 12px var(--font-mono);
    padding: 5px 10px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: color var(--transition), border-color var(--transition);
  }
  .copy:hover { color: var(--text); border-color: var(--text-muted); }
  .copy.copied { color: var(--green); border-color: var(--green); }
  .copy:focus-visible, .email:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .contact .note a { color: inherit; text-decoration: underline; text-decoration-color: var(--border); text-underline-offset: 3px; }
  .contact .note a:hover { color: var(--text); }

  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  .faq { margin: 0; border-top: 1px solid var(--border); }
  .faq div { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 8px 32px; padding: 14px 0; border-bottom: 1px solid var(--border-subtle); }
  .faq dt { font-weight: 500; color: var(--text); }
  .faq dd { margin: 0; color: var(--text-dim); }

  @media (max-width: 900px) {
    .free { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 720px) {
    .block + .block { margin-top: 40px; }
    .faq div { grid-template-columns: minmax(0, 1fr); }
    .contact { padding: 18px; }
  }
  @media (max-width: 480px) {
    .free { grid-template-columns: minmax(0, 1fr); }
    .checks li { flex-direction: column; gap: 4px; }
  }
</style>
