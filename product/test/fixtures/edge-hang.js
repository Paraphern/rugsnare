// Edge-case fixture: a server that answers initialize but never answers
// tools/list — RugSnare's RPC timeout must reject cleanly.
'use strict';
import readline from 'node:readline';
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.jsonrpc !== '2.0' || !msg.id) return;
  if (msg.method === 'initialize') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'edge-hang', version: '0.0.1' } } }) + '\n');
  }
  // everything else: deliberate silence
});
