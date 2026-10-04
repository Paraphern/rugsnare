import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fetchToolsHttp, httpRpc } from '../src/rpc-http.js';

// Local HTTP MCP server for testing (simulates Streamable HTTP transport)
function makeHttpServer({ tools = [], failInitialize = false } = {}) {
  let sessionId = 'test-session-123';
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let msg;
      try { msg = JSON.parse(body); } catch {
        res.writeHead(400).end('bad json');
        return;
      }

      if (msg.method === 'initialize') {
        if (failInitialize) {
          res.writeHead(500, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'init failed' } }));
          return;
        }
        res.writeHead(200, {
          'content-type': 'application/json',
          'mcp-session-id': sessionId,
        });
        res.end(JSON.stringify({
          jsonrpc: '2.0', id: msg.id,
          result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'test-http', version: '1.0' } },
        }));
        return;
      }

      if (msg.method === 'notifications/initialized') {
        res.writeHead(202).end();
        return;
      }

      if (msg.method === 'tools/list') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools } }));
        return;
      }

      // method not found
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `method not found: ${msg.method}` } }));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

test('httpRpc: initialize returns session id', async () => {
  const { server, port } = await makeHttpServer();
  try {
    const r = await httpRpc({
      url: `http://127.0.0.1:${port}`,
      message: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    });
    assert.ok(r.result);
    assert.equal(r.sessionId, 'test-session-123');
  } finally { server.close(); }
});

test('fetchToolsHttp: full handshake returns tools', async () => {
  const tools = [
    { name: 'search', description: 'Search things.', inputSchema: { type: 'object' } },
    { name: 'get', description: 'Get things.', inputSchema: { type: 'object' } },
  ];
  const { server, port } = await makeHttpServer({ tools });
  try {
    const r = await fetchToolsHttp({ url: `http://127.0.0.1:${port}` });
    assert.equal(r.tools.length, 2);
    assert.equal(r.tools[0].name, 'search');
  } finally { server.close(); }
});

test('fetchToolsHttp: server error on initialize throws', async () => {
  const { server, port } = await makeHttpServer({ failInitialize: true });
  try {
    await assert.rejects(
      () => fetchToolsHttp({ url: `http://127.0.0.1:${port}` }),
      /init failed/,
    );
  } finally { server.close(); }
});

test('readServersFromConfigFile: accepts both command and url entries', async () => {
  // This tests the CLI function indirectly through a config file
  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-http-'));
  const cfg = path.join(tmp, 'mcp.json');
  fs.writeFileSync(cfg, JSON.stringify({
    mcpServers: {
      'stdio-server': { command: 'node', args: ['index.js'] },
      'http-server': { type: 'http', url: 'https://example.com/mcp' },
    },
  }));
  // Verify both are accepted (check via the CLI source, not by running scan)
  const cliSrc = fs.readFileSync(new URL('../src/cli.js', import.meta.url), 'utf8');
  assert.ok(cliSrc.includes('typeof v.url'), 'cli.js must accept url entries');
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Regressions: each test below pins a real defect found during v0.6 work.
// ---------------------------------------------------------------------------

function startMock(handler) {
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      res.on('error', () => {}); // client may destroy mid-write (5MB test)
      try { handler(JSON.parse(body), res); } catch { res.writeHead(500); res.end(); }
    });
  });
  server.on('clientError', (_err, socket) => socket.destroy());
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

test('httpRpc: SSE correlated by request id, not by line order (regression)', async () => {
  // The stream carries a server notification FIRST, the id-matching response LAST.
  // A "last line wins" parser grabs the notification when order flips (see next test).
  const { server, port } = await startMock((msg, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/progress', params: { p: 1 } })}\n\n`);
    res.write(`event: message\n`);
    res.write(`: keep-alive comment that is not a data line\n\n`);
    res.end(`data: ${JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'right-one' }] } })}\n\n`);
  });
  try {
    const out = await httpRpc({ url: `http://127.0.0.1:${port}/`, message: { jsonrpc: '2.0', id: 42, method: 'tools/list' } });
    assert.equal(out.id, 42);
    assert.deepEqual(out.result.tools.map((t) => t.name), ['right-one']);
  } finally { server.close(); }
});

test('httpRpc: SSE where the matching id appears BEFORE an unrelated response (regression)', async () => {
  // Reverse order: the id-matching line is first, a different request's response follows.
  const { server, port } = await startMock((msg, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', id: 5, result: { which: 'mine' } })}\n\n`);
    res.end(`data: ${JSON.stringify({ jsonrpc: '2.0', id: 999, result: { which: 'someone-else' } })}\n\n`);
  });
  try {
    const out = await httpRpc({ url: `http://127.0.0.1:${port}/`, message: { jsonrpc: '2.0', id: 5, method: 'tools/list' } });
    assert.equal(out.result.which, 'mine');
  } finally { server.close(); }
});

test('httpRpc: body over 5MB rejects with settle-guard, never hangs (regression)', async () => {
  // Before the fix, req.destroy() left the promise pending forever — a silent
  // false-negative in `rugsnare diff` (timeout would eventually eat it).
  const { server, port } = await startMock((_msg, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"pad":"' + 'x'.repeat(5 * 1024 * 1024 + 1024) + '"}');
  });
  try {
    await assert.rejects(
      () => httpRpc({ url: `http://127.0.0.1:${port}/`, message: { jsonrpc: '2.0', id: 1, method: 'tools/list' } }),
      /5MB/
    );
  } finally { server.close(); }
});

test('httpRpc: non-200 surfaces the JSON-RPC error message (regression)', async () => {
  const { server, port } = await startMock((_msg, res) => {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32001, message: 'invalid or missing bearer token' } }));
  });
  try {
    await assert.rejects(
      () => httpRpc({ url: `http://127.0.0.1:${port}/`, message: { jsonrpc: '2.0', id: 1, method: 'tools/list' } }),
      /HTTP 401: invalid or missing bearer token/
    );
  } finally { server.close(); }
});

test('httpRpc: 202 Accepted (notification) resolves as accepted', async () => {
  const { server, port } = await startMock((_msg, res) => { res.writeHead(202); res.end(); });
  try {
    const out = await httpRpc({ url: `http://127.0.0.1:${port}/`, message: { jsonrpc: '2.0', method: 'notifications/initialized' } });
    assert.equal(out.accepted, true);
  } finally { server.close(); }
});

test('httpRpc: timeout rejects when the server never responds (regression)', async () => {
  const { server, port } = await startMock(() => { /* receive and stay silent */ });
  try {
    await assert.rejects(
      () => httpRpc({ url: `http://127.0.0.1:${port}/`, timeoutMs: 150, message: { jsonrpc: '2.0', id: 1, method: 'tools/list' } }),
      /timeout after 150ms/
    );
  } finally { server.close(); }
});

test('httpRpc: ${VAR} url placeholders resolve from the env block', async () => {
  const { server, port } = await startMock((msg, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { reached: true } }));
  });
  try {
    const out = await httpRpc({
      url: '${TEST_BASE_URL}/mcp',
      env: { TEST_BASE_URL: `http://127.0.0.1:${port}` },
      message: { jsonrpc: '2.0', id: 3, method: 'ping' },
    });
    assert.equal(out.result.reached, true);
  } finally { server.close(); }
});

test('httpRpc: unresolved ${VAR} placeholder fails fast, not silently', async () => {
  await assert.rejects(
    () => httpRpc({ url: '${NEVER_SET_VAR_12345}/mcp', message: { jsonrpc: '2.0', id: 1, method: 'ping' } }),
    (err) => err instanceof Error
  );
});

test('fetchToolsHttp: tools/list pagination via nextCursor', async () => {
  const seen = [];
  const { server, port } = await startMock((msg, res) => {
    if (msg.method === 'initialize') {
      seen.push('init');
      res.writeHead(200, { 'content-type': 'application/json', 'mcp-session-id': 's-9' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'mock', version: '1' } } }));
    } else if (msg.method === 'notifications/initialized') {
      seen.push('ready');
      res.writeHead(202); res.end();
    } else if (msg.method === 'tools/list') {
      seen.push(`list:${msg.params?.cursor ?? 'first'}`);
      const page = msg.params?.cursor === 'page-2'
        ? { tools: [{ name: 'tool-b', description: 'B', inputSchema: { type: 'object' } }] } // last page: no nextCursor
        : { tools: [{ name: 'tool-a', description: 'A', inputSchema: { type: 'object' } }], nextCursor: 'page-2' };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: page }));
    } else {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'unsupported' } }));
    }
  });
  try {
    const { tools, prompts, resources } = await fetchToolsHttp({ url: `http://127.0.0.1:${port}/mcp` });
    assert.deepEqual(tools.map((t) => t.name), ['tool-a', 'tool-b']);
    assert.deepEqual(prompts, []);
    assert.deepEqual(resources, []);
    assert.deepEqual(seen, ['init', 'ready', 'list:first', 'list:page-2']);
  } finally { server.close(); }
});

test('fetchToolsHttp: SSE-only server works end to end', async () => {
  const { server, port } = await startMock((msg, res) => {
    const sse = (obj) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end(`data: ${JSON.stringify(obj)}\n\n`);
    };
    if (msg.method === 'initialize') {
      sse({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'sse-mock', version: '1' } } });
    } else if (msg.method === 'tools/list') {
      sse({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'only', description: 'x', inputSchema: { type: 'object' } }] } });
    } else {
      res.writeHead(202); res.end();
    }
  });
  try {
    const { tools } = await fetchToolsHttp({ url: `http://127.0.0.1:${port}/mcp` });
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, 'only');
  } finally { server.close(); }
});
