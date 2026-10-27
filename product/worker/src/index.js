// Hosted rugsnare MCP server — Cloudflare Worker edition.
//
// Faithful port of product/src/mcp-server.js (rugsnare 1.5.0): the same two
// read-only tools, the same initialize handshake (protocolVersion 2025-06-18),
// the same tool contracts. Exists so the Dominion Observatory join pair has a
// public HTTPS endpoint to capture (issue #6): rugsnare pins what this surface
// should be; Dominion's signed capture records what it actually serves.
//
// Transport: MCP streamable HTTP, POST JSON responses (no SSE, no auth, no
// redirects — exactly what an anonymous prober supports). No state, no writes,
// no telemetry. The one outbound call is the public drift-feed on GitHub raw,
// made only when an agent explicitly calls drift_feed_status.

const VERSION = '1.5.0'; // keep in sync with product/package.json
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

function jsonRpc(id, result) {
  return { jsonrpc: '2.0', id, result };
}
function jsonRpcErr(id, message) {
  return { jsonrpc: '2.0', id, error: { code: -32000, message } };
}

async function driftFeedStatus(args) {
  let data = null;
  try {
    const res = await fetch(DRIFT_FEED_URL, { headers: { 'user-agent': 'rugsnare-mcp-worker/' + VERSION } });
    if (res.ok) data = await res.json();
  } catch { /* offline upstream - same wording as the local server */ }
  if (!data) {
    return { content: [{ type: 'text', text: 'drift-feed unavailable (offline or upstream moved). See https://github.com/Paraphern/rugsnare/tree/main/drift-feed' }] };
  }
  const names = Object.keys(data).filter((n) => !args?.server || n.includes(args.server));
  const lines = names.map((n) => {
    const s = data[n];
    const events = Array.isArray(s.recentEvents) ? s.recentEvents.slice(0, 5) : [];
    return `${n}: v${s.version}, ${Array.isArray(s.tools) ? s.tools.length : '?'} tools` + (events.length ? `; recent: ${events.join('; ')}` : '');
  });
  return { content: [{ type: 'text', text: lines.length ? lines.join('\n') : 'no matching server in the feed' }] };
}

function pinsReport() {
  // A hosted instance has no surrounding project, so this is the exact reply
  // the local server gives when run outside a pinned project.
  return { content: [{ type: 'text', text: 'No pin store in this project yet. Run `rugsnare scan` to baseline the MCP servers in use.' }] };
}

async function handleMessage(msg, env) {
  if (msg.id === undefined) return null; // notification - nothing to answer
  if (msg.method === 'initialize') {
    return jsonRpc(msg.id, {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'rugsnare', version: VERSION },
    });
  }
  if (msg.method === 'tools/list') {
    return jsonRpc(msg.id, { tools: TOOLS });
  }
  if (msg.method === 'tools/call') {
    const name = msg.params?.name;
    const args = msg.params?.arguments ?? {};
    if (name === 'drift_feed_status') {
      try { return jsonRpc(msg.id, await driftFeedStatus(args)); }
      catch (e) { return jsonRpcErr(msg.id, String(e).slice(0, 200)); }
    }
    if (name === 'pins_report') return jsonRpc(msg.id, pinsReport());
    return jsonRpcErr(msg.id, `unknown tool: ${name}`);
  }
  return jsonRpcErr(msg.id, `method not found: ${msg.method}`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && (url.pathname === '/' || url.pathname === '/mcp')) {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }), {
          status: 400, headers: { 'content-type': 'application/json' },
        });
      }
      const isBatch = Array.isArray(body);
      const replies = [];
      for (const msg of isBatch ? body : [body]) {
        const reply = await handleMessage(msg, env);
        if (reply) replies.push(reply);
      }
      if (!replies.length) return new Response(null, { status: 202 }); // notifications only
      const out = isBatch ? replies : replies[0];
      const headers = { 'content-type': 'application/json' };
      // session handshake: an anonymous prober may offer a session id; accept and echo it
      const sid = request.headers.get('mcp-session-id');
      if (sid) headers['mcp-session-id'] = sid;
      return new Response(JSON.stringify(out), { headers });
    }
    // GET: MCP streamable HTTP uses GET for server-initiated SSE, which this
    // endpoint does not produce. Answer with 405 like the local server would
    // refuse an unsupported transport.
    return new Response('rugsnare MCP endpoint: POST JSON-RPC to /mcp', {
      status: 405,
      headers: { 'content-type': 'text/plain', allow: 'POST' },
    });
  },
};
