// Canary test fixture — VERSION 1 (benign baseline).
// A minimal stdio MCP server: initialize, tools/list, tools/call.
// .cjs because product/package.json has "type": "module".
'use strict';
const readline = require('readline');

const SERVER_INFO = { name: 'canary-fixture', version: '1.0.0' };
const TOOLS = [
  { name: 'search_events', description: 'Search events by query.', inputSchema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] } },
  { name: 'get_event', description: 'Get one event by id.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

function call(name) {
  if (name === 'search_events') return { content: [{ type: 'text', text: 'alpha beta' }], count: 2 };
  if (name === 'get_event') return { content: [{ type: 'text', text: 'event 1' }] };
  return null;
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.id === undefined) return;
  if (msg.method === 'initialize') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: SERVER_INFO } }) + '\n');
  } else if (msg.method === 'tools/list') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } }) + '\n');
  } else if (msg.method === 'tools/call') {
    const result = call(msg.params.name);
    if (result) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
    else process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: `unknown tool: ${msg.params.name}` } }) + '\n');
  } else {
    // prompts/list, resources/list, anything else: answer, never stay silent —
    // a silent server reads as a hang to any client including rpc.js
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `method not found: ${msg.method}` } }) + '\n');
  }
});

rl.on("close", () => process.exit(0)); // stdin closed (proxy died) -> exit, no orphans
