// The server's entry in the official MCP Registry (registry.modelcontextprotocol.io),
// made from package.json so its name and version can't drift from what npm has.
// Written to server.json (not committed) for `mcp-publisher publish`:
//
//   pnpm --filter @tradecanvas/mcp registry
//   cd packages/mcp && mcp-publisher login github && mcp-publisher publish
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json';
/** The registry takes at most 100 characters here. */
const DESCRIPTION = 'Look up TradeCanvas chart indicators, options and drawing tools, and check options before use.';

export function serverJson(pkg) {
  return {
    $schema: SCHEMA,
    name: pkg.mcpName,
    title: 'TradeCanvas',
    description: DESCRIPTION,
    websiteUrl: pkg.homepage,
    repository: { url: 'https://github.com/bonguynvan/tradecanvas', source: 'github', subfolder: 'packages/mcp' },
    version: pkg.version,
    packages: [
      { registryType: 'npm', identifier: pkg.name, version: pkg.version, transport: { type: 'stdio' } },
    ],
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  writeFileSync(join(dir, 'server.json'), `${JSON.stringify(serverJson(pkg), null, 2)}\n`);
  console.log(`server.json for ${pkg.mcpName} ${pkg.version}`);
}
