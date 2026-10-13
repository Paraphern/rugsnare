// v1.1 identity fixture A: serves an identical tool set to identity-b.mjs -
// only the PATH differs. The pair exists to prove the IDENTITY drift class:
// every tool hash intact, but the surface is served by a different build.
'use strict';
import readline from 'node:readline';

const TOOLS = [
  // annotations carry multiple keys with "title" FIRST: the wire order
  // deliberately differs from the sorted order stableStringify writes to
  // pins.json - this fixture exists to keep the key-order byte-stability
  // trap (hubspot P0-2) covered at the CLI level
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
