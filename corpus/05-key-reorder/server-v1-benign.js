#!/usr/bin/env node
// Corpus 05 v1 (benign): key-ordered server — plain JSON-RPC over stdio,
// no SDK dependency. v2 has the SAME schema with keys in reverse order.
// Canonicalization makes rugsnare diff report CLEAN; a raw-JSON differ
// (pre-fix KyttoMCP #12) flags BREAKING.

import { stdin, stdout } from 'node:process';

const TOOLS_V1 = [
  {
    name: 'create_note',
    description: 'Create a note with a title and optional tags.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The note title' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags' },
        content: { type: 'string', description: 'The note body' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'search_notes',
    description: 'Search notes by query.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results' },
        query: { type: 'string', description: 'Search text' },
      },
      required: ['query'],
    },
  },
];

let buf = '';
stdin.setEncoding('utf8');
stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.method === 'initialize') {
        send(msg.id, { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'notes-api', version: '1.0.0' } });
      } else if (msg.method === 'notifications/initialized') {
        // notification, no response
      } else if (msg.method === 'tools/list') {
        send(msg.id, { tools: TOOLS_V1 });
      } else if (msg.method === 'tools/call') {
        send(msg.id, { content: [{ type: 'text', text: 'ok' }] });
      } else if (msg.id !== undefined) {
        send(msg.id, null, { code: -32601, message: 'Method not found' });
      }
    } catch { /* malformed line */ }
  }
});

function send(id, result, error) {
  const res = { jsonrpc: '2.0', id };
  if (error) res.error = error; else res.result = result;
  stdout.write(JSON.stringify(res) + '\n');
}
