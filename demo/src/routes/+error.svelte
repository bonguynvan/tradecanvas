<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/state';
</script>

<!-- Only for errors above the site layout; pages under a language show [[lang=lang]]/+error.svelte. -->
<svelte:head><title>{page.status} · TradeCanvas</title></svelte:head>

<main style="max-width: 640px; margin: 0 auto; padding: 96px 24px; display: grid; gap: 14px;">
  <h1>{page.status}</h1>
  <p><a href="{base}/">TradeCanvas</a></p>
</main>
