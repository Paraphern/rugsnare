import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Find MCP client configs known today. Read-only: we never rewrite your
 * client config silently — `rugsnare init` prints the exact lines to change.
 *
 * Claude Code: ~/.claude.json (global mcpServers) and ./.mcp.json (project)
 * Cursor:      ~/.cursor/mcp.json (global) and ./.cursor/mcp.json (project)
 */

const CANDIDATES = [
  { app: 'claude-code', scope: 'user', file: () => path.join(os.homedir(), '.claude.json') },
  { app: 'claude-code', scope: 'project', file: () => path.join(process.cwd(), '.mcp.json') },
  { app: 'cursor', scope: 'user', file: () => path.join(os.homedir(), '.cursor', 'mcp.json') },
  { app: 'cursor', scope: 'project', file: () => path.join(process.cwd(), '.cursor', 'mcp.json') },
];

function readMcpServers(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null; // no file
  }
  try {
    const json = JSON.parse(raw);
    const servers = json.mcpServers ?? null;
    if (!servers || typeof servers !== 'object') return null;
    return servers;
  } catch {
    return 'unparseable';
  }
}

export function discoverConfigs() {
  const found = [];
  for (const candidate of CANDIDATES) {
    const file = candidate.file();
    const servers = readMcpServers(file);
    if (servers === null || servers === 'unparseable') {
      found.push({ ...candidate, file, exists: servers !== null, error: servers === 'unparseable' });
    } else {
      found.push({
        ...candidate,
        file,
        exists: true,
        servers: Object.fromEntries(
          Object.entries(servers).filter(([, v]) => v && typeof v.command === 'string')
        ),
      });
    }
  }
  return found;
}

export function serverCommand(server) {
  return { command: server.command, args: server.args ?? [], env: server.env ?? {} };
}
