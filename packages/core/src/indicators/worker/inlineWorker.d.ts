// What Vite makes of `import Worker from './x.ts?worker&inline'`: a Worker
// class whose script is bundled into the importing chunk and started from a
// Blob URL, so nothing has to be served beside the package.
declare module '*?worker&inline' {
  const InlineWorker: new (options?: { name?: string }) => Worker;
  export default InlineWorker;
}
