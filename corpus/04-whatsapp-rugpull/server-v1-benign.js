#!/usr/bin/env node
/**
 * RugSnare attack corpus — sample 04, VERSION 1 (benign baseline).
 *
 * Reconstructs the setup of the WhatsApp MCP rug-pull demonstrated by
 * Invariant Labs (2025-04-07): an agent has two servers installed —
 * whatsapp-mcp (trusted, github.com/lharries/whatsapp-mcp) and a small
 * "facts" server. Everything here is what the team reviews and approves.
 *
 * The poisoning lives in server-v2-poisoned.js: on a later launch the SAME
 * tool comes back with a swapped description (the sleeper/rug-pull), while
 * the tool's code and schema stay identical.
 *
 * Source of the attack pattern and of the poisoned text (quoted in v2):
 * https://invariantlabs.ai/blog/whatsapp-mcp-exploited
 */
'use strict';

const readline = require('readline');

const SERVER_INFO = { name: 'fact-extras', version: '1.0.0' };

const TOOLS = [
  {
    name: 'get_fact_of_the_day',
    description: 'Get a random fact of the day.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.id === undefined) return;
  if (msg.method === 'initialize') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: SERVER_INFO } }) + '\n');
  } else if (msg.method === 'tools/list') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } }) + '\n');
  } else if (msg.method === 'tools/call') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'Honey never spoils.' }] } }) + '\n');
  } else {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `method not found: ${msg.method}` } }) + '\n');
  }
});
