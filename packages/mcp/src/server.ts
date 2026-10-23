import { CATALOG, type Catalog } from './catalog.js';
import { TOOLS, runTool } from './tools.js';

/** The protocol versions this server speaks, newest first. */
export const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const;
export const LATEST_PROTOCOL = PROTOCOLS[0];

/** JSON-RPC error codes the server answers with. */
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

type Id = string | number | null;

export type Response =
  | { jsonrpc: '2.0'; id: Id; result: unknown }
  | { jsonrpc: '2.0'; id: Id; error: { code: number; message: string } };

const INSTRUCTIONS = [
  'TradeCanvas (@tradecanvas/chart) draws trading charts: ChartWidget is the full trading UI, Chart the headless chart, ChartWidgetGrid several charts.',
  'Look names up instead of guessing them: list_indicators and get_indicator for indicator ids, params and line keys; list_drawing_tools for drawing types and their anchors;',
  'list_options for the options of each entry point; list_widget_features and list_style_keys for feature switches and style keys.',
  'Before handing an options object to new ChartWidget, new Chart or new ChartWidgetGrid, run it through validate_options.',
].join(' ');

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const reply = (id: Id, result: unknown): Response => ({ jsonrpc: '2.0', id, result });
const error = (id: Id, code: number, message: string): Response => ({ jsonrpc: '2.0', id, error: { code, message } });

export interface Server {
  /**
   * Answers one JSON-RPC message, or a batch of them with an array; null when
   * nothing needs an answer (notifications, and responses: the server asks nothing).
   */
  handle(message: unknown): Response | Response[] | null;
  /** Answers one line of the stdio transport, as a line to write back (null: nothing to write). */
  handleLine(line: string): string | null;
}

/** The TradeCanvas MCP server: tools only, every one of them read-only. */
export function createServer(info: { version: string }, catalog: Catalog = CATALOG): Server {
  const tools = TOOLS.map(({ name, title, description, inputSchema }) => ({
    name,
    title,
    description,
    inputSchema,
    annotations: { title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }));

  function call(id: Id, params: Record<string, unknown>): Response {
    const name = params.name;
    if (typeof name !== 'string' || !TOOLS.some((t) => t.name === name)) {
      // JSON.stringify, not String(): an object can make String() throw.
      return error(id, INVALID_PARAMS, `Unknown tool: ${typeof name === 'string' ? name : JSON.stringify(name)}`);
    }
    const args = isObject(params.arguments) ? params.arguments : {};
    const result = runTool(name, args, catalog);
    return reply(id, {
      content: [{ type: 'text', text: result.text }],
      structuredContent: isObject(result.data) ? result.data : { result: result.data },
      ...(result.isError ? { isError: true } : {}),
    });
  }

  function handleOne(message: unknown): Response | null {
    const id = isObject(message) && (typeof message.id === 'string' || typeof message.id === 'number') ? message.id : null;
    if (!isObject(message) || message.jsonrpc !== '2.0') return error(id, INVALID_REQUEST, 'Not a JSON-RPC 2.0 message.');
    // A response to a request: the server sends none, so there is nothing to match it to.
    if (typeof message.method !== 'string') return 'result' in message || 'error' in message ? null : error(id, INVALID_REQUEST, 'No method.');
    // A notification (no id) is never answered, whatever it is.
    if (!('id' in message)) return null;
    if (id === null) return error(null, INVALID_REQUEST, 'A request id is a string or a number, never null.');
    const params = isObject(message.params) ? message.params : {};
    try {
      return answer(id, message.method, params);
    } catch (thrown) {
      // Whatever went wrong stays with this request: the server keeps running for the next.
      return error(id, INTERNAL_ERROR, `Internal error: ${thrown instanceof Error ? thrown.message : 'unknown'}`);
    }
  }

  function handle(message: unknown): Response | Response[] | null {
    if (!Array.isArray(message)) return handleOne(message);
    if (message.length === 0) return error(null, INVALID_REQUEST, 'An empty batch.');
    const replies = message.map(handleOne).filter((r): r is Response => r !== null);
    return replies.length ? replies : null;
  }

  function answer(id: Id, method: string, params: Record<string, unknown>): Response {
    switch (method) {
      case 'initialize': {
        const asked = params.protocolVersion;
        const protocolVersion = PROTOCOLS.includes(asked as (typeof PROTOCOLS)[number]) ? asked : LATEST_PROTOCOL;
        return reply(id, {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'tradecanvas', title: 'TradeCanvas', version: info.version },
          instructions: INSTRUCTIONS,
        });
      }
      case 'ping': return reply(id, {});
      case 'tools/list': return reply(id, { tools });
      case 'tools/call': return call(id, params);
      default: return error(id, METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  }

  function handleLine(line: string): string | null {
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      return JSON.stringify(error(null, PARSE_ERROR, 'Parse error'));
    }
    const response = handle(message);
    return response ? JSON.stringify(response) : null;
  }

  return { handle, handleLine };
}
