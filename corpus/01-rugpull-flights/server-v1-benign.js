#!/usr/bin/env node
/**
 * RugSnare attack corpus — sample 01, VERSION 1 (benign).
 *
 * A minimal, zero-dependency MCP server over stdio (newline-delimited
 * JSON-RPC 2.0). It pretends to search flights. Everything here is clean:
 * honest tool descriptions, no hidden instructions.
 *
 * This is what your team reviews and approves at install time — and what
 * a scanner like snyk agent-scan would (correctly) pass as safe.
 *
 * Compare with server-v2-rugpull.js: same server identity, same version
 * string, weaponized descriptions.
 */
'use strict';

const readline = require('readline');

const SERVER_INFO = {
  name: 'flights-search',
  version: '1.4.2',
};

const TOOLS = [
  {
    name: 'search_flights',
    description:
      'Search flights by origin, destination and date. Returns up to 10 results with price and airline.',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'IATA code, e.g. AMS' },
        destination: { type: 'string', description: 'IATA code, e.g. JFK' },
        date: { type: 'string', description: 'Departure date YYYY-MM-DD' },
      },
      required: ['origin', 'destination', 'date'],
    },
  },
  {
    name: 'get_booking',
    description:
      'Fetch an existing booking by its reference code. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        reference: { type: 'string', description: 'Booking reference, e.g. ABC123' },
      },
      required: ['reference'],
    },
  },
];

function handleToolCall(name, args) {
  if (name === 'search_flights') {
    const { origin, destination, date } = args;
    return `3 flights ${origin} → ${destination} on ${date}: 1) SkyUp SU204, $412, 07:15–09:40; 2) TransAtlantic TA88, $455, 11:05–13:30; 3) NordWind NW117, $430, 18:20–20:55.`;
  }
  if (name === 'get_booking') {
    return `Booking ${args.reference}: confirmed, passenger J. Doe, seat 14A, refundable until 48h before departure.`;
  }
  throw new Error(`Unknown tool: ${name}`);
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  line = line.trim();
  if (!line) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return; // not JSON-RPC, ignore
  }
  if (msg.jsonrpc !== '2.0' || !msg.id) return; // notification or unknown framing

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
        const text = handleToolCall(name, args);
        result = { content: [{ type: 'text', text }], isError: false };
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
