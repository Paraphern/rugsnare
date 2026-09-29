import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJsonFile } from './jsonfile.js';

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
  { app: 'windsurf', scope: 'user', file: () => path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json') },
  { app: 'vscode', scope: 'project', file: () => path.join(process.cwd(), '.vscode', 'mcp.json') },
  { app: 'continue', scope: 'user', file: () => path.join(os.homedir(), '.continue', 'config.yaml') },
  { app: 'zed', scope: 'user', file: () => path.join(os.homedir(), '.zed', 'settings.json') },
  { app: 'cline', scope: 'project', file: () => path.join(process.cwd(), '.cline', 'mcp.json') },
];

/**
 * ZCode stores MCP configs per-plugin, each plugin ships a .mcp.json
 * at ~/.zcode/cli/plugins/cache/<org>/<plugin>/<version>/.mcp.json
 */
export function discoverZCodePlugins() {
  const base = path.join(os.homedir(), '.zcode', 'cli', 'plugins', 'cache');
  const found = [];
  try {
    for (const org of fs.readdirSync(base)) {
      const orgDir = path.join(base, org);
      if (!fs.statSync(orgDir).isDirectory()) continue;
      for (const plugin of fs.readdirSync(orgDir)) {
        const pluginDir = path.join(orgDir, plugin);
        if (!fs.statSync(pluginDir).isDirectory()) continue;
        for (const version of fs.readdirSync(pluginDir)) {
          const mcpFile = path.join(pluginDir, version, '.mcp.json');
          if (fs.existsSync(mcpFile)) {
            const servers = readMcpServers(mcpFile);
            if (servers && typeof servers === 'object' && Object.keys(servers).length > 0) {
              found.push({
                app: 'zcode',
                scope: `plugin:${org}/${plugin}@${version}`,
                file: mcpFile,
                exists: true,
                servers,
              });
            }
          }
        }
      }
    }
  } catch {
    // directory not found or permission error — fine
  }
  return found;
}

function readMcpServers(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return err.code === 'ENOENT' ? null : 'unparseable';
  }
  try {
    const json = readJsonFile(filePath);
    // Standard mcpServers key (Claude Code, Cursor, Windsurf, Cline)
    if (json.mcpServers && typeof json.mcpServers === 'object') return json.mcpServers;
    // VS Code: mcp.servers inside settings
    if (json.mcp?.servers && typeof json.mcp.servers === 'object') return json.mcp.servers;
    // Zed: mcp_servers inside settings
    if (json.mcp_servers && typeof json.mcp_servers === 'object') return json.mcp_servers;
    return null;
  } catch {
    // YAML configs (Continue.dev)
    try {
      // minimal YAML check: does it contain "mcpServers:" or "mcp_servers:"?
      if (/mcpServers:|mcp_servers:/.test(raw)) {
        return 'yaml-config'; // found but needs YAML parser (not a JSON object)
      }
      return null;
    } catch {
      return 'unparseable';
    }
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
