// Edge-case fixture: a server that paginates tools/list via nextCursor —
// two pages of tools. fetchTools must follow the cursor and return all 4.
import readline from 'node:readline';

const PAGE_1 = [
  { name: 'page_one_a', description: 'first page tool A', inputSchema: { type: 'object' } },
  { name: 'page_one_b', description: 'first page tool B', inputSchema: { type: 'object' } },
];
const PAGE_2 = [
  { name: 'page_two_a', description: 'second page tool A', inputSchema: { type: 'object' } },
  { name: 'page_two_b', description: 'second page tool B', inputSchema: { type: 'object' } },
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
      result = { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'edge-paged', version: '1.0.0' } };
      break;
    case 'tools/list': {
      const cursor = msg.params?.cursor;
      if (cursor === undefined) {
        result = { tools: PAGE_1, nextCursor: 'page-2' };
      } else if (cursor === 'page-2') {
        result = { tools: PAGE_2 };
      } else {
        result = { tools: [] };
      }
      break;
    }
    case 'ping':
      result = {};
      break;
    default:
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'nope' } }) + '\n');
      return;
  }
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
});
