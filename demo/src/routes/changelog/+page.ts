import markdown from '../../../../CHANGELOG.md?raw';

export const prerender = true;

export function load() {
  return { markdown };
}
