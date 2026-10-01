import readline from 'node:readline';
import https from 'node:https';
import fs from 'node:fs';
import { loadPins, detectShadows } from './pins.js';

/**
 * RugSnare as an MCP server (marketplace distribution, stage 2). Read-only,
 * two tools, zero npm deps:
 *
 *   drift_feed_status — what the public RugSnare drift-feed currently sees:
 *       versions and contract-change events of popular MCP servers. This is
 *       the ONLY outbound call this server ever makes, it fetches a fixed
 *       public URL (the rugsnare repo on GitHub raw), and it happens only
 *       when the agent explicitly calls the tool.
 *   pins_report — the local pin store of the project the agent is working in:
 *       servers, approved/unapproved tools, cross-server shadow risks.
 *       Reads .rugsnare/pins.json — never writes, never sends anything.
 *
 * We are an anti-poisoning tool: our own tool descriptions stay factual,
 * short, and free of instructions to the agent. No spawning, no writes,
 * no telemetry, no arguments beyond an optional server-name filter.
 */

const DRIFT_FEED_URL = 'https://raw.githubusercontent.com/Paraphern/rugsnare/main/drift-feed/latest-snapshot.json';

const TOOLS = [
  {
    name: 'drift_feed_status',
    description: 'Report the current versions and contract-change events of popular MCP servers, from the public RugSnare drift-feed (daily scans). Optional filter by server name.',
    inputSchema: {
      type: 'object',
      properties: { server: { type: 'string', description: 'Server name to filter by (e.g. server-filesystem). Omit for all.' } },
    },
  },
  {
    name: 'pins_report',
    description: 'Report the RugSnare pin store of this project: which MCP servers are pinned, how many tools are approved, unapproved, or shadowed across servers. Read-only.',
    inputSchema: { type: 'object', properties: {} },
  },
];

let driftCache = null; // fetched once per process, public data only

function fetchDriftFeed() {
  return new Promise((resolve) => {
    // constant relative path — Node resolves it against process.cwd(); no dynamic segments
    try {
      resolve(JSON.parse(fs.readFileSync('drift-feed/latest-snapshot.json', 'utf8')));
      return;
    } catch { /* not run from the repo — fetch the public copy */ }
    if (driftCache) return resolve(driftCache);
    const req = https.get(DRIFT_FEED_URL, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      let body = '';
      res.on('data', (c) => { body += c; if (body.length > 2 * 1024 * 1024) req.destroy(); });
      res.on('end', () => {
        try { driftCache = JSON.parse(body); resolve(driftCache); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function driftFeedStatus(args) {
  const data = await fetchDriftFeed();
  if (!data) return { content: [{ type: 'text', text: 'drift-feed unavailable (offline or upstream moved). See https://github.com/Paraphern/rugsnare/tree/main/drift-feed' }] };
  const names = Object.keys(data).filter((n) => !args?.server || n.includes(args.server));
  const lines = names.map((n) => {
    const s = data[n];
    const events = Array.isArray(s.recentEvents) ? s.recentEvents.slice(0, 5) : [];
    return `${n}: v${s.version}, ${Array.isArray(s.tools) ? s.tools.length : '?'} tools` + (events.length ? `; recent: ${events.join('; ')}` : '');
  });
  return { content: [{ type: 'text', text: lines.length ? lines.join('\n') : 'no matching server in the feed' }] };
}

function pinsReport() {
  let pins;
  try { pins = loadPins(process.cwd()); } catch { pins = null; }
  if (!pins || Object.keys(pins.servers ?? {}).length === 0) {
    return { content: [{ type: 'text', text: 'No pin store in this project yet. Run `rugsnare scan` to baseline the MCP servers in use.' }] };
  }
  const servers = Object.entries(pins.servers).map(([name, sp]) => {
    const tools = Object.values(sp.tools ?? {});
    const approved = tools.filter((t) => t.approved).length;
    return `${name}: ${tools.length} tool(s) pinned, ${approved} approved, ${tools.length - approved} awaiting review`;
  });
  const shadows = detectShadows(pins);
  const shadowLines = shadows.length ? shadows.map((s) => `shadow: ${s.tool} pinned on multiple servers (${(s.servers ?? []).join(', ')})`) : [];
  return { content: [{ type: 'text', text: [...servers, ...shadowLines].join('\n') }] };
}

/** Minimal stdio MCP server loop. Run via `rugsnare mcp` (cli.js) or node src/mcp-server.js. */
export function runMcpServer({ stdin = process.stdin, stdout = process.stdout } = {}) {
  const rl = readline.createInterface({ input: stdin });
  rl.on('line', (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.id === undefined) return; // notification — nothing to answer
    const reply = (result) => stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
    const replyErr = (message) => stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message } }) + '\n');

    if (msg.method === 'initialize') {
      reply({ protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'rugsnare', version: '0.4.0' } });
    } else if (msg.method === 'tools/list') {
      reply({ tools: TOOLS });
    } else if (msg.method === 'tools/call') {
      const name = msg.params?.name;
      const args = msg.params?.arguments ?? {};
      if (name === 'drift_feed_status') {
        driftFeedStatus(args).then(reply).catch((e) => replyErr(String(e).slice(0, 200)));
      } else if (name === 'pins_report') {
        reply(pinsReport());
      } else {
        replyErr(`unknown tool: ${name}`);
      }
    } else {
      replyErr(`method not found: ${msg.method}`);
    }
  });
}

// direct execution: node src/mcp-server.js
if (process.argv[1] && process.argv[1].endsWith('mcp-server.js')) runMcpServer();
