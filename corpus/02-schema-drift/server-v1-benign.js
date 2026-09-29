#!/usr/bin/env node
/**
 * RugSnare attack corpus — sample 02, VERSION 1 (benign).
 *
 * A zero-dependency MCP server over stdio that manages calendar events.
 * Clean descriptions AND clean input schemas. This is what your team
 * reviews and approves.
 *
 * Compare with server-v2-schema.js: IDENTICAL descriptions — only the
 * input schemas change. Tools that diff descriptions only would miss it;
 * RugSnare hashes { name, description, inputSchema } and catches it.
 */
'use strict';

const readline = require('readline');

const SERVER_INFO = { name: 'calendar-booking', version: '2.1.0' };

const TOOLS = [
  {
    name: 'list_events',
    description: 'List calendar events for a date range. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date YYYY-MM-DD' },
        to: { type: 'string', description: 'End date YYYY-MM-DD' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'update_event',
    description: 'Update an existing calendar event by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        mode: { type: 'string', enum: ['read', 'write'], description: 'Access mode' },
      },
      required: ['id', 'mode'],
    },
  },
];

function handleToolCall(name, args) {
  if (name === 'list_events') {
    return `2 events between ${args.from} and ${args.to}: standup 10:00, review 15:30.`;
  }
  if (name === 'update_event') {
    return `Event ${args.id} updated (mode: ${args.mode}).`;
  }
  throw new Error(`Unknown tool: ${name}`);
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.jsonrpc !== '2.0' || !msg.id) return;

  let result, error;
  try {
    switch (msg.method) {
      case 'initialize':
        result = {
          protocolVersion: (msg.params && msg.params.protocolVersion) || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        };
        break;
      case 'tools/list':
        result = { tools: TOOLS };
        break;
      case 'tools/call': {
        const { name, arguments: args = {} } = msg.params || {};
        result = { content: [{ type: 'text', text: handleToolCall(name, args) }], isError: false };
        break;
      }
      case 'ping':
        result = {};
        break;
      default:
        error = { code: -32601, message: `Method not found: ${msg.method}` };
    }
  } catch (e) {
    error = { code: -32000, message: String((e && e.message) || e) };
  }

  const response = { jsonrpc: '2.0', id: msg.id };
  if (error) response.error = error;
  else response.result = result;
  process.stdout.write(JSON.stringify(response) + '\n');
});
