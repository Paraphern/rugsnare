import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { readJsonFile } from './jsonfile.js';

/**
 * `rugsnare wrap <server>` — insert the RugSnare proxy into a specific
 * server's entry in the user's MCP config, so every tool call passes
 * through the integrity gate without manual editing. `unwrap` restores it.
 *
 * Pattern borrowed from mcpsnoop and Trail of Bits' mcp-context-protector:
 * the #1 adoption barrier is "edit your config by hand".
 *
 * stdio server: entry becomes `npx -y rugsnare run --name X -- <original>`.
 * HTTP server: the entry stays HTTP but points at the LOCAL proxy
 * (http://127.0.0.1:<port>/mcp); the proxy itself must be running:
 *   rugsnare run --name X --url <original-url> --port <port>
 * A free port is picked at wrap time and stored in the marker.
 *
 * The original entry is backed up on first wrap (`.bak`) and `unwrap`
 * restores it exactly. Only the specified server's entry changes —
 * formatting and all other servers are preserved (JSON re-serialized,
 * key order preserved for the wrapped entry only).
 */

const WRAP_MARKER = '__rugsnare_original_command';

/** The saved original entry of a wrapped server (null when not wrapped). */
export function originalOf(entry) {
  return entry && typeof entry === 'object' && entry[WRAP_MARKER] ? entry[WRAP_MARKER] : null;
}

/** Grab a free localhost port at wrap time so `run --port` is deterministic. */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function findConfigFile(serverName) {
  // Search order: project-level first, then user-level
  const candidates = [
    { file: path.join(process.cwd(), '.mcp.json'), label: 'project' },
    { file: path.join(os.homedir(), '.claude.json'), label: 'claude-code' },
    { file: path.join(os.homedir(), '.cursor', 'mcp.json'), label: 'cursor' },
    { file: path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'), label: 'windsurf' },
    { file: path.join(process.cwd(), '.vscode', 'mcp.json'), label: 'vscode' },
  ];
  for (const c of candidates) {
    try {
      const json = readJsonFile(c.file);
      if (json.mcpServers && json.mcpServers[serverName]) return c;
    } catch { /* not found or unparseable */ }
  }
  return null;
}

export async function wrapServer(serverName) {
  const found = findConfigFile(serverName);
  if (!found) return { error: `Server "${serverName}" not found in any MCP config. Run \`rugsnare init\` to see discovered configs.` };

  const json = readJsonFile(found.file);
  const entry = json.mcpServers[serverName];

  if (entry[WRAP_MARKER]) return { error: `Server "${serverName}" is already wrapped. Run \`rugsnare unwrap ${serverName}\` first.` };

  // backup on first wrap
  const bak = found.file + '.rugsnare.bak';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(found.file, bak);
  }

  if (typeof entry.url === 'string') {
    // HTTP wrap: keep the entry HTTP, point it at the local proxy.
    // The remote auth (headers/auth) moves into the marker — `run` reads it
    // from there; sending it to localhost would be pointless (and noisy).
    const port = await findFreePort();
    const original = { url: entry.url };
    if (entry.headers) original.headers = entry.headers;
    if (entry.auth) original.auth = entry.auth;
    entry[WRAP_MARKER] = original;
    delete entry.headers;
    delete entry.auth;
    // entry.type stays: the entry is still an HTTP server — just a local one
    entry.url = `http://127.0.0.1:${port}/mcp`;
    fs.writeFileSync(found.file, JSON.stringify(json, null, 2) + '\n');
    return {
      file: found.file, backup: bak, server: serverName, port,
      runCommand: `rugsnare run --name ${serverName} --url ${original.url} --port ${port}`,
      note: 'Keep that command running — the config now points at the local proxy it starts.',
    };
  }

  if (typeof entry.command !== 'string') return { error: `Server "${serverName}" has no command to wrap.` };

  const original = { command: entry.command, args: entry.args ?? [] };
  entry[WRAP_MARKER] = original;
  entry.command = 'npx';
  entry.args = ['-y', 'rugsnare', 'run', '--name', serverName, '--', original.command, ...original.args];
  if (entry.env) entry[WRAP_MARKER].env = entry.env;

  fs.writeFileSync(found.file, JSON.stringify(json, null, 2) + '\n');
  return { file: found.file, backup: bak, server: serverName };
}

export function unwrapServer(serverName) {
  const found = findConfigFile(serverName);
  if (!found) return { error: `Server "${serverName}" not found in any MCP config.` };

  const json = readJsonFile(found.file);
  const entry = json.mcpServers[serverName];

  if (!entry[WRAP_MARKER]) return { error: `Server "${serverName}" is not wrapped.` };

  const original = entry[WRAP_MARKER];
  delete entry[WRAP_MARKER];
  if (typeof original.url === 'string') {
    entry.url = original.url;
    if (original.headers) entry.headers = original.headers;
    if (original.auth) entry.auth = original.auth;
  } else {
    entry.command = original.command;
    entry.args = original.args;
    if (original.env) entry.env = original.env;
  }

  fs.writeFileSync(found.file, JSON.stringify(json, null, 2) + '\n');

  // remove backup if no other servers are wrapped
  const anyWrapped = Object.values(json.mcpServers ?? {}).some((s) => s && s[WRAP_MARKER]);
  const bak = found.file + '.rugsnare.bak';
  if (!anyWrapped && fs.existsSync(bak)) {
    fs.unlinkSync(bak);
  }
  return { file: found.file, server: serverName };
}
