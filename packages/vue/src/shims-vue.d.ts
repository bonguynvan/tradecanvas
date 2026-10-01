// Plain `tsc` (the repo's `pnpm typecheck`) can't read single-file
// components; vite, vitest and vite-plugin-dts compile them with the Vue
// language tools, which resolve the real `.vue` file ahead of this fallback.
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // Loose props: plain tsc only needs to accept the import, not check SFC props.
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
