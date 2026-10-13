// v1.1 identity fixture B: byte-identical tool contracts to identity-a.mjs,
// served from a different path (the supabase shape: entry moved, contracts
// unchanged).
'use strict';
import readline from 'node:readline';

const TOOLS = [
  // identical contracts to identity-a.mjs, INCLUDING the multi-key
  // annotations (title first) - only the serving PATH differs
  { name: 'search_objects', description: 'Search objects by query.', annotations: { title: 'Search Objects', readOnlyHint: true, destructiveHint: false }, inputSchema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] } },
  { name: 'get_object', description: 'Get one object by id.', annotations: { title: 'Get Object', readOnlyHint: true, openWorldHint: true }, inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.jsonrpc !== '2.0' || !msg.id) return;
  let result;
  switch (msg.method) {
    case 'initialize':
      result = { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'identity-fixture', version: '1.0.0' } };
      break;
    case 'tools/list':
      result = { tools: TOOLS };
      break;
    case 'ping':
      result = {};
      break;
    default:
      result = undefined;
  }
  if (result === undefined) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'nope' } }) + '\n');
    return;
  }
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
});
