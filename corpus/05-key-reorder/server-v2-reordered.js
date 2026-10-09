#!/usr/bin/env node
// Corpus 05 v2 (key-reorder mutant): semantically IDENTICAL schemas, but every
// object's keys are in reverse order. rugsnare's canonicalized hashing sorts
// keys → diff reports CLEAN. A raw-JSON differ (KyttoMCP before fix for #12)
// sees different bytes and flags BREAKING.

import { stdin, stdout } from 'node:process';

const TOOLS_V2 = [
  {
    // keys in REVERSE order vs v1 — same content, same types, same required
    inputSchema: {
      required: ['title', 'content'],
      properties: {
        content: { description: 'The note body', type: 'string' },
        tags: { description: 'Optional tags', items: { type: 'string' }, type: 'array' },
        title: { description: 'The note title', type: 'string' },
      },
      type: 'object',
    },
    description: 'Create a note with a title and optional tags.',
    name: 'create_note',
  },
  {
    inputSchema: {
      required: ['query'],
      properties: {
        query: { description: 'Search text', type: 'string' },
        limit: { description: 'Max results', type: 'number' },
      },
      type: 'object',
    },
    description: 'Search notes by query.',
    name: 'search_notes',
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
        send(msg.id, { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'notes-api', version: '2.0.0' } });
      } else if (msg.method === 'notifications/initialized') {
        // notification, no response
      } else if (msg.method === 'tools/list') {
        send(msg.id, { tools: TOOLS_V2 });
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
