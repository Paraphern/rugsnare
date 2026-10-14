// Fixture: a stdio MCP server with prompts and resources (unchanged across
// restarts) - exists to test §7 byte-stability of prompt/resource pin entries.
'use strict';
import readline from 'node:readline';

const TOOLS = [{ name: 'echo', description: 'Echo input.', inputSchema: { type: 'object', properties: { msg: { type: 'string' } } } }];
const PROMPTS = [{ name: 'review_code', description: 'Review the given code for bugs and security issues.', arguments: [{ name: 'code', description: 'The code to review', required: true }] }];
const RESOURCES = [{ uri: 'docs://readme', name: 'readme', mimeType: 'text/plain', text: '# Server\nDocs here.' }];

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
      result = { protocolVersion: '2025-06-18', capabilities: { tools: {}, prompts: {}, resources: {} }, serverInfo: { name: 'pr-fixture', version: '1.0.0' } };
      break;
    case 'tools/list': result = { tools: TOOLS }; break;
    case 'prompts/list': result = { prompts: PROMPTS }; break;
    case 'resources/list': result = { resources: RESOURCES }; break;
    case 'ping': result = {}; break;
    default: result = undefined;
  }
  if (result === undefined) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'nope' } }) + '\n');
    return;
  }
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
});
