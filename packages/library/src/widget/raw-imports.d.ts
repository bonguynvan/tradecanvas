// Allow Vite-style `?raw` imports for inlining text assets at build time.
declare module '*.css?raw' {
  const content: string;
  export default content;
}
