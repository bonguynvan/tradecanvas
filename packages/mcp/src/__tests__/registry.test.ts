import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error a plain script, without types
import { serverJson } from '../../scripts/server-json.mjs';

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));

describe('the MCP Registry entry', () => {
  it('names the server as the package does, under the GitHub owner', () => {
    expect(pkg.mcpName).toMatch(/^io\.github\.bonguynvan\//);
    expect(serverJson(pkg).name).toBe(pkg.mcpName);
  });

  it('points at this version of the npm package, run over stdio', () => {
    const entry = serverJson(pkg);
    expect(entry.version).toBe(pkg.version);
    expect(entry.packages).toEqual([
      { registryType: 'npm', identifier: '@tradecanvas/mcp', version: pkg.version, transport: { type: 'stdio' } },
    ]);
  });

  it('keeps the description within the registry limit of 100 characters', () => {
    expect(serverJson(pkg).description.length).toBeLessThanOrEqual(100);
  });
});
