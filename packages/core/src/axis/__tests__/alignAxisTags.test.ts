import { describe, it, expect } from 'vitest';
import { alignAxisTags, type AxisTagBox } from '../alignAxisTags.js';

const tag = (y: number, half = 8): AxisTagBox => ({ y, above: half, below: half });

/** Each tag's top and bottom where it was placed. */
const spans = (tags: readonly AxisTagBox[], at: readonly number[]) =>
  tags.map((t, i) => ({ top: at[i] - t.above, bottom: at[i] + t.below }));

function overlaps(tags: readonly AxisTagBox[], at: readonly number[]): boolean {
  const s = spans(tags, at).sort((a, b) => a.top - b.top);
  return s.some((x, i) => i > 0 && x.top < s[i - 1].bottom - 1e-9);
}

describe('alignAxisTags', () => {
  it('leaves tags that do not touch where they are', () => {
    const tags = [tag(100), tag(200), tag(300)];
    expect(alignAxisTags(tags, 1)).toEqual([100, 200, 300]);
  });

  it('keeps the anchor (the last price) still and moves the others away from it', () => {
    const tags = [tag(100), tag(104), tag(96)];
    const at = alignAxisTags(tags, 0);
    expect(at[0]).toBe(100);
    expect(at[1]).toBe(116); // under the anchor's foot
    expect(at[2]).toBe(84); // over its head
    expect(overlaps(tags, at)).toBe(false);
  });

  it('pushes a tag on the anchor\'s own price above it', () => {
    const at = alignAxisTags([tag(100), tag(100)], 0);
    expect(at).toEqual([100, 84]);
  });

  it('stacks a run of tags, each as near its line as the one before allows', () => {
    const tags = [tag(100), tag(102), tag(103), tag(150)];
    const at = alignAxisTags(tags, 0);
    expect(at).toEqual([100, 116, 132, 150]);
    expect(overlaps(tags, at)).toBe(false);
  });

  it('takes each tag\'s own extent, such as the last price\'s countdown under it', () => {
    const last: AxisTagBox = { y: 100, above: 10, below: 26 };
    const at = alignAxisTags([last, tag(110)], 0);
    expect(at[1]).toBe(134);
  });

  it('with no anchor, spreads around the middle of the tags given, the tag nearest it on each side staying', () => {
    const tags = [tag(100), tag(105), tag(300), tag(302)];
    const at = alignAxisTags(tags, null);
    expect(overlaps(tags, at)).toBe(false);
    expect(at[1]).toBe(105);
    expect(at[2]).toBe(300);
  });

  it('with no anchor, moves apart two tags on either side of the middle', () => {
    const tags = [tag(100), tag(102)];
    expect(overlaps(tags, alignAxisTags(tags, null))).toBe(false);
  });

  it('leaves out (NaN) a tag pushed past the bounds, and keeps one on its own line inside them', () => {
    const tags = [tag(185, 10), tag(190), tag(195)];
    const at = alignAxisTags(tags, 0, { top: 0, bottom: 200 });
    expect(at[0]).toBe(185);
    expect(at[1]).toBeNaN(); // pushed to 203, its foot at 211
    expect(at[2]).toBeNaN();
    expect(alignAxisTags([tag(195)], null, { top: 0, bottom: 200 })).toEqual([195]);
  });

  it('never leaves two tags overlapping, whatever their order', () => {
    const tags = [tag(50), tag(52, 10), tag(49), tag(51, 6), tag(48), tag(60)];
    expect(overlaps(tags, alignAxisTags(tags, 3))).toBe(false);
  });
});
