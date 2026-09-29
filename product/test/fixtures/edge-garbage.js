// Edge-case fixture: a server that writes non-JSON noise to stdout
// (boot banners, progress lines) around valid JSON-RPC responses, and
// uses unicode/emoji in tool descriptions. RugSnare must skip the noise
// and hash the unicode descriptions deterministically.
'use strict';
import readline from 'node:readline';

const TOOLS = [
  {
    name: 'héllo_wörld',
    description: 'Поиск рейсов ✈️ — поиск с юникодом и эмодзи 🚀',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'plain',
    description: 'boring ascii tool',
    inputSchema: { type: 'object' },
  },
];

process.stdout.write('booting edge-garbage v1.2.3...\n');
process.stdout.write('[debug] loading modules: 3/3 OK\n');

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.jsonrpc !== '2.0' || !msg.id) return;
  process.stdout.write('[debug] handling ' + msg.method + '\n');
  let result;
  switch (msg.method) {
    case 'initialize':
      result = { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'edge-garbage', version: '1.2.3' } };
      break;
    case 'tools/list':
      result = { tools: TOOLS };
      break;
    case 'ping':
      result = {};
      break;
    default:
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'nope' } }) + '\n');
      return;
  }
  process.stdout.write('progress: 100%\n');
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
});
