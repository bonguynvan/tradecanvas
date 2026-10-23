// `npx @tradecanvas/mcp`: the server on stdio, one JSON-RPC message a line.
// stdout carries only the protocol; anything else goes to stderr.
import { createServer } from './server.js';
import { splitLines } from './lines.js';

declare const __TC_MCP_VERSION__: string;

const server = createServer({ version: __TC_MCP_VERSION__ });
let pending = '';

function answer(chunk: string, ended: boolean): void {
  const { lines, rest } = splitLines(pending, chunk, ended);
  pending = rest;
  for (const line of lines) {
    const reply = server.handleLine(line);
    if (reply) process.stdout.write(`${reply}\n`);
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => answer(chunk, false));
// The last message may come without a newline. Node exits on its own once
// stdout has drained: an explicit exit could cut a long answer short.
process.stdin.on('end', () => answer('', true));
