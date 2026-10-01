// Canary test fixture — VERSION 2 (the "rug upgrade").
// Same server identity, but: search_events gains a required param (BREAKING
// schema change), get_event description is reworded (COSMETIC) and its call
// flips from ok to error (BREAKING behavior change). This is exactly what
// `rugsnare canary replay` must catch before anyone upgrades.
// .cjs because product/package.json has "type": "module".
'use strict';
const readline = require('readline');

const SERVER_INFO = { name: 'canary-fixture', version: '2.0.0' };
const TOOLS = [
  { name: 'search_events', description: 'Search events by query.', inputSchema: { type: 'object', properties: { q: { type: 'string' }, mode: { type: 'string', enum: ['fast', 'deep'] } }, required: ['q', 'mode'] } },
  { name: 'get_event', description: 'Get one event by id. Now with caching.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

function call(name) {
  if (name === 'search_events') return { content: [{ type: 'text', text: 'alpha beta' }], count: 2 };
  if (name === 'get_event') return null; // was ok in v1, errors now
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
    else process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'not found' } }) + '\n');
  } else {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `method not found: ${msg.method}` } }) + '\n');
  }
});

rl.on("close", () => process.exit(0)); // stdin closed (proxy died) -> exit, no orphans
