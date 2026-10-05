<!-- "One chart for the whole trade": four numbered chapters, each beside its live chart. -->
<script lang="ts">
  import StoryChart from './StoryChart.svelte';
  import { useI18n } from '$lib/i18n/context.svelte';

  const i18n = useI18n();
  const m = $derived(i18n.m);

  /** One chart per chapter of `m.home.story.chapters`, in order. */
  const CHAPTER_SCENES = ['read', 'trade', 'replay', 'scale'] as const;
</script>

<section class="story" aria-labelledby="story-title">
  <header class="section-head" data-reveal data-reveal-stagger>
    <span class="eyebrow">{m.home.story.eyebrow}</span>
    <h2 class="section-title" id="story-title">{m.home.story.title}</h2>
    <p class="section-subtitle">{m.home.story.subtitle}</p>
  </header>

  <ol class="chapters">
    {#each m.home.story.chapters as chapter, i}
      <li class="chapter" class:chapter--flip={i % 2 === 1}>
        <div class="chapter-copy" data-reveal data-reveal-stagger>
          <span class="chapter-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <h3 class="chapter-title">{chapter.title}</h3>
          <p class="chapter-text">{chapter.text}</p>
          <ul class="chapter-points">
            {#each chapter.points as point}<li>{point}</li>{/each}
          </ul>
        </div>
        <div class="chapter-stage">
          <StoryChart scene={CHAPTER_SCENES[i]} />
        </div>
      </li>
    {/each}
  </ol>
</section>

<style>
  /* --- Story: four chapters, each with its live chart --- */
  .story {
    max-width: var(--page-max);
    margin: 0 auto;
    padding: var(--section-pad) var(--gutter);
  }

  .chapters {
    list-style: none;
    display: grid;
    gap: clamp(56px, 8vw, 112px);
    margin-top: clamp(16px, 3vw, 40px);
  }

  .chapter {
    display: grid;
    grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
    grid-template-areas: 'copy stage';
    gap: clamp(28px, 4.5vw, 72px);
    align-items: center;
  }

  .chapter--flip {
    grid-template-columns: minmax(0, 1.28fr) minmax(0, 0.72fr);
    grid-template-areas: 'stage copy';
  }

  .chapter-copy {
    grid-area: copy;
    display: grid;
    gap: 14px;
    justify-items: start;
    min-width: 0;
  }

  .chapter-stage { grid-area: stage; min-width: 0; }

  /* The number reads as a step on a rule: 01 ── */
  .chapter-num {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .chapter-num::after {
    content: '';
    flex: 1;
    max-width: 120px;
    height: 1px;
    background: linear-gradient(to right, var(--accent-dim), transparent);
  }

  .chapter-title {
    font-size: clamp(1.6rem, 2.8vw, 2.3rem);
    line-height: 1.05;
    font-weight: 600;
    letter-spacing: -0.035em;
    text-wrap: balance;
  }

  .chapter-text {
    color: var(--text-dim);
    font-size: 15.5px;
    max-width: 46ch;
  }

  .chapter-points {
    list-style: none;
    display: grid;
    gap: 9px;
    margin-top: 6px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    width: 100%;
    font-size: 14px;
    color: var(--text);
  }

  .chapter-points li {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr);
    gap: 10px;
    align-items: baseline;
  }

  .chapter-points li::before {
    content: '';
    width: 6px;
    height: 6px;
    translate: 0 -2px;
    background: var(--accent);
  }

  @media (max-width: 980px) {
    .chapter,
    .chapter--flip {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'copy' 'stage';
    }
  }
</style>
