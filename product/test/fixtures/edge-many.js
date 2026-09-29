// Edge-case fixture: a server exposing 120 generated tools — scale sanity
// for hashing, pinning, and diffing.
'use strict';
import readline from 'node:readline';

const TOOLS = Array.from({ length: 120 }, (_, i) => ({
  name: `generated_tool_${String(i).padStart(3, '0')}`,
  description: `Generated tool #${i} for scale testing.`,
  inputSchema: { type: 'object', properties: { n: { type: 'number' } } },
}));

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
      result = { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'edge-many', version: '1.0.0' } };
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
