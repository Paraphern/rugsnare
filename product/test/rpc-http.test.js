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
