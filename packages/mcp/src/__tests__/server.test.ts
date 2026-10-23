import { describe, it, expect } from 'vitest';
import { createServer, LATEST_PROTOCOL } from '../server.js';
import { splitLines } from '../lines.js';

const server = () => createServer({ version: '9.9.9' });

describe('the MCP server', () => {
  it('answers initialize with its tools capability and the protocol version asked for', () => {
    const reply = server().handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
    expect(reply).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'tradecanvas', version: '9.9.9' } },
    });
    expect((reply as { result: { instructions: string } }).result.instructions).toMatch(/validate_options/);
  });

  it('offers its latest protocol version for one it does not know', () => {
    const reply = server().handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
    expect((reply as { result: { protocolVersion: string } }).result.protocolVersion).toBe(LATEST_PROTOCOL);
  });

  it('does not answer notifications', () => {
    expect(server().handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
    expect(server().handle({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 3 } })).toBeNull();
  });

  it('answers ping', () => {
    expect(server().handle({ jsonrpc: '2.0', id: 'p', method: 'ping' })).toEqual({ jsonrpc: '2.0', id: 'p', result: {} });
  });

  it('lists its tools, read-only', () => {
    const reply = server().handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) as { result: { tools: { name: string; inputSchema: object; annotations: { readOnlyHint: boolean } }[] } };
    const names = reply.result.tools.map((t) => t.name);
    expect(names).toContain('validate_options');
    expect(reply.result.tools.every((t) => t.annotations.readOnlyHint)).toBe(true);
  });

  it('calls a tool: text for every client, structured content for those that read it', () => {
    const reply = server().handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_indicator', arguments: { id: 'macd' } } }) as {
      result: { content: { type: string; text: string }[]; structuredContent: { id: string }; isError?: boolean };
    };
    expect(reply.result.content[0].type).toBe('text');
    expect(reply.result.content[0].text).toContain('macd');
    expect(reply.result.structuredContent.id).toBe('macd');
    expect(reply.result.isError).toBeFalsy();
  });

  it('turns an unknown tool into an invalid-params error', () => {
    const reply = server().handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope', arguments: {} } }) as { error: { code: number } };
    expect(reply.error.code).toBe(-32602);
  });

  it('turns an unknown method into method-not-found, and junk into an invalid request', () => {
    expect((server().handle({ jsonrpc: '2.0', id: 5, method: 'resources/list' }) as { error: { code: number } }).error.code).toBe(-32601);
    expect((server().handle({ hello: 'world' }) as { error: { code: number }; id: null }).error.code).toBe(-32600);
  });

  it('answers a line: parses it, and reports what does not parse', () => {
    const s = server();
    expect(JSON.parse(s.handleLine('{"jsonrpc":"2.0","id":7,"method":"ping"}') ?? '')).toEqual({ jsonrpc: '2.0', id: 7, result: {} });
    expect(JSON.parse(s.handleLine('{not json') ?? '').error.code).toBe(-32700);
    expect(s.handleLine('{"jsonrpc":"2.0","method":"notifications/initialized"}')).toBeNull();
  });
});

describe('what a client might send', () => {
  it('answers a batch with an array, and a batch of notifications with nothing', () => {
    const replies = server().handle([
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'ping' },
    ]);
    expect(replies).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }, { jsonrpc: '2.0', id: 2, result: {} }]);
    expect(server().handle([{ jsonrpc: '2.0', method: 'notifications/initialized' }])).toBeNull();
    expect((server().handle([]) as { error: { code: number } }).error.code).toBe(-32600);
  });

  it('ignores a response: the server asks the client nothing', () => {
    expect(server().handle({ jsonrpc: '2.0', id: 9, result: {} })).toBeNull();
  });

  it('turns away a request whose id is null, which MCP does not allow', () => {
    expect((server().handle({ jsonrpc: '2.0', id: null, method: 'ping' }) as { error: { code: number } }).error.code).toBe(-32600);
  });

  it('never throws, whatever arrives: a tool name that is not a string, a broken catalog', () => {
    const s = server();
    expect(() => s.handleLine('{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":{"toString":1}}}')).not.toThrow();
    const broken = createServer({ version: '0' }, { indicators: null } as never);
    const reply = broken.handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_indicators', arguments: {} } }) as { error: { code: number } };
    expect(reply.error.code).toBe(-32603);
  });
});

describe('splitLines', () => {
  it('splits complete lines and keeps the rest for the next chunk', () => {
    expect(splitLines('', '{"a":1}\n{"b":')).toEqual({ lines: ['{"a":1}'], rest: '{"b":' });
    expect(splitLines('{"b":', '2}\r\n\n')).toEqual({ lines: ['{"b":2}'], rest: '' });
  });

  it('hands over the last message at the end of input, even without a newline', () => {
    expect(splitLines('{"c":3}', '', true)).toEqual({ lines: ['{"c":3}'], rest: '' });
    expect(splitLines('  ', '', true)).toEqual({ lines: [], rest: '' });
  });
});
