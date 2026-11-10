import { describe, expect, it } from 'vitest';
import { DATA_FLOW, REPLAY, WIDGET_PARTS, type DiagramShape } from './diagrams';

const SHAPES: DiagramShape[] = [DATA_FLOW, WIDGET_PARTS, REPLAY];
// Each language's page as text, by language.
const PAGES: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('./*/how-it-works.svelte', { query: '?raw', import: 'default', eager: true }))
    .map(([file, text]) => [file.split('/')[1], text]),
);
const LANGS = Object.keys(PAGES);

describe('the How it works diagrams', () => {
  it.each(SHAPES.map((s) => [s.id, s] as const))('%s keeps every box inside the picture and apart', (_, shape) => {
    const ids = shape.nodes.map((n) => n.id);
    for (const id of [shape.id, ...ids]) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of shape.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(10);
      expect(n.y).toBeGreaterThanOrEqual(10);
      expect(n.x + n.w).toBeLessThanOrEqual(shape.width - 10);
      expect(n.y + n.h).toBeLessThanOrEqual(shape.height - 10);
    }
    for (const a of shape.nodes) {
      for (const b of shape.nodes) {
        if (a === b) continue;
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.id} overlaps ${b.id}`).toBe(true);
      }
    }
  });

  it.each(SHAPES.map((s) => [s.id, s] as const))('%s draws arrows only between its boxes', (_, shape) => {
    const ids = new Set(shape.nodes.map((n) => n.id));
    for (const e of shape.edges) {
      expect(ids.has(e.from), e.from).toBe(true);
      expect(ids.has(e.to), e.to).toBe(true);
    }
  });

  it('has a page in all six languages', () => {
    expect([...LANGS].sort()).toEqual(['en', 'es', 'ja', 'ko', 'vi', 'zh']);
  });

  it.each(LANGS)('the %s page names only boxes the diagrams have', (lang: string) => {
    const page = PAGES[lang];
    const named = [...page.matchAll(/nodes: \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((q) => q[1]));
    expect(named.length).toBeGreaterThan(0);
    const known = new Set(SHAPES.flatMap((s) => s.nodes.map((n) => n.id)));
    expect(named.filter((id) => !known.has(id))).toEqual([]);
  });

  it.each(LANGS)('the %s page has as many steps as the English one', (lang: string) => {
    const count = (l: string) => PAGES[l].match(/nodes: \[/g)?.length;
    expect(count(lang)).toBe(count('en'));
  });
});
