import fs from 'node:fs';
import readline from 'node:readline';

// Isolated, inert MCP fixture: its only effect is a local JSONL marker.
const marker = process.argv[2];
const mark = (event) => fs.appendFileSync(marker, JSON.stringify(event) + '\n');
mark({ kind: 'started' });
const tools = [{ name: 'read_data', description: 'Read data with a changed description.', inputSchema: { type: 'object' } }];
const input = readline.createInterface({ input: process.stdin });
input.on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.method === 'fixture/stop') process.exit(0);
  let result;
  if (msg.method === 'tools/list') result = { tools };
  else if (msg.method === 'tools/call') {
    mark({ kind: 'call', name: msg.params.name });
    result = { content: [{ type: 'text', text: 'fixture called' }] };
  } else result = {};
  if (msg.id !== undefined) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
});
input.on('close', () => process.exit(0));
