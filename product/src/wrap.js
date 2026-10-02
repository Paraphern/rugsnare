import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJsonFile } from './jsonfile.js';

/**
 * `rugsnare wrap <server>` — insert the RugSnare proxy into a specific
 * server's entry in the user's MCP config, so every tool call passes
 * through the integrity gate without manual editing. `unwrap` restores it.
 *
 * Pattern borrowed from mcpsnoop and Trail of Bits' mcp-context-protector:
 * the #1 adoption barrier is "edit your config by hand".
 *
 * The original entry is backed up on first wrap (`.bak`) and `unwrap`
 * restores it exactly. Only the specified server's entry changes —
 * formatting and all other servers are preserved (JSON re-serialized,
 * key order preserved for the wrapped entry only).
 */

const WRAP_MARKER = '__rugsnare_original_command';

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

export function wrapServer(serverName) {
  const found = findConfigFile(serverName);
  if (!found) return { error: `Server "${serverName}" not found in any MCP config. Run \`rugsnare init\` to see discovered configs.` };

  const json = readJsonFile(found.file);
  const entry = json.mcpServers[serverName];

  if (entry[WRAP_MARKER]) return { error: `Server "${serverName}" is already wrapped. Run \`rugsnare unwrap ${serverName}\` first.` };
  if (typeof entry.url === 'string') return { error: `Server "${serverName}" uses HTTP transport — proxy wrapping for HTTP is coming in v0.5.` };
  if (typeof entry.command !== 'string') return { error: `Server "${serverName}" has no command to wrap.` };

  // backup on first wrap
  const bak = found.file + '.rugsnare.bak';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(found.file, bak);
  }

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
  entry.command = original.command;
  entry.args = original.args;
  if (original.env) entry.env = original.env;

  fs.writeFileSync(found.file, JSON.stringify(json, null, 2) + '\n');

  // remove backup if no other servers are wrapped
  const anyWrapped = Object.values(json.mcpServers ?? {}).some((s) => s && s[WRAP_MARKER]);
  const bak = found.file + '.rugsnare.bak';
  if (!anyWrapped && fs.existsSync(bak)) {
    fs.unlinkSync(bak);
  }
  return { file: found.file, server: serverName };
}
