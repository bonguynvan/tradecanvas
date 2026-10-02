// Type-checks every ```ts block of the agent skill against the built packages,
// so its examples call the real API. Blocks fenced as ```tsx (framework
// components) are left out. Run after `pnpm build`.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = join(ROOT, 'skills/tradecanvas');
const OUT = join(SKILL, '.check');

const sources = [join(SKILL, 'SKILL.md'), ...readdirSync(join(SKILL, 'references')).filter((f) => f.endsWith('.md')).map((f) => join(SKILL, 'references', f))];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let count = 0;
for (const file of sources) {
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const blocks = [...text.matchAll(/^```ts\n([\s\S]*?)^```$/gm)].map((m) => m[1]);
  blocks.forEach((code, i) => {
    // Each block stands alone as a module (top-level await allowed).
    writeFileSync(join(OUT, `${basename(file, '.md')}-${i + 1}.ts`), `${code}\nexport {};\n`);
    count++;
  });
}

const tsc = join(ROOT, 'node_modules/typescript/bin/tsc');
try {
  execFileSync(process.execPath, [tsc, '-p', join(ROOT, 'scripts/skill-examples.tsconfig.json')], { stdio: 'inherit' });
  console.log(`skill examples type-check (${count} blocks)`);
} catch {
  console.error(`skill examples do not type-check (blocks are in ${OUT})`);
  process.exit(1);
}
