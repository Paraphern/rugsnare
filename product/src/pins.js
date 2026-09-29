import fs from 'node:fs';
import path from 'node:path';
import { readJsonFile } from './jsonfile.js';

/**
 * Pin store: `.rugsnare/pins.json`
 *
 * servers -> name -> tools -> toolName -> { hash, description, firstSeen, approved }
 * A pin is written by `rugsnare scan` (intentional, approved) or by the
 * proxy on first sight (approved:false — needs `rugsnare approve`).
 * Drift = live hash differs from a stored pin. New tool = no pin at all.
 */

export const RUGSNARE_DIR = '.rugsnare';

export function rugsnareDir(cwd = process.cwd()) {
  return path.join(cwd, RUGSNARE_DIR);
}

export function pinsPath(cwd = process.cwd()) {
  return path.join(rugsnareDir(cwd), 'pins.json');
}

export function loadPins(cwd = process.cwd()) {
  try {
    return readJsonFile(pinsPath(cwd));
  } catch {
    return { version: 1, servers: {} };
  }
}

export function savePins(pins, cwd = process.cwd()) {
  fs.mkdirSync(rugsnareDir(cwd), { recursive: true });
  fs.writeFileSync(pinsPath(cwd), JSON.stringify(pins, null, 2) + '\n');
}

export function ensureServer(pins, name, cmd) {
  if (!pins.servers[name]) {
    pins.servers[name] = { cmd: null, pinnedAt: new Date().toISOString(), tools: {} };
  }
  if (cmd && typeof cmd.command === 'string' && Array.isArray(cmd.args)) {
    // Structured command only — never a joined shell string. Execution
    // always goes through spawn(command, args, { shell: false }).
    pins.servers[name].cmd = { command: cmd.command, args: cmd.args };
  }
  return pins.servers[name];
}

export function commandDisplay(server) {
  if (!server?.cmd) return '(unknown)';
  return [server.cmd.command, ...server.cmd.args].join(' ');
}

/**
 * Cross-server tool shadowing: the same tool name exposed by more than one
 * pinned server. The client's (often undocumented) resolution order decides
 * which implementation the agent actually calls — that collision is the
 * finding, we do not pick a winner.
 */
export function detectShadows(pins) {
  const byTool = new Map();
  for (const [serverName, sp] of Object.entries(pins.servers ?? {})) {
    for (const toolName of Object.keys(sp.tools ?? {})) {
      const list = byTool.get(toolName) ?? [];
      list.push(serverName);
      byTool.set(toolName, list);
    }
  }
  return [...byTool.entries()]
    .filter(([, servers]) => servers.length > 1)
    .map(([tool, servers]) => ({ tool, servers }));
}

export function pinTool(serverPin, tool, hash, { approved = true } = {}) {
  const now = new Date().toISOString();
  const existing = serverPin.tools[tool.name];
  serverPin.tools[tool.name] = {
    hash,
    description: tool.description ?? '',
    firstSeen: existing?.firstSeen ?? now,
    pinnedAt: now,
    approved,
  };
  return serverPin.tools[tool.name];
}

export function compareTools(serverPin, liveTools, toolHashFn) {
  const result = [];
  for (const tool of liveTools) {
    const pin = serverPin.tools[tool.name];
    const hash = toolHashFn(tool);
    if (!pin) result.push({ tool: tool.name, status: 'NEW', hash });
    else if (pin.hash !== hash) {
      result.push({
        tool: tool.name,
        status: 'DRIFT',
        oldHash: pin.hash,
        hash,
        // human-readable contract diff (for PR comments / reports)
        oldDescription: pin.description ?? '',
        newDescription: tool.description ?? '',
      });
    }
    else result.push({ tool: tool.name, status: 'UNCHANGED', hash });
  }
  const liveNames = new Set(liveTools.map((t) => t.name));
  for (const name of Object.keys(serverPin.tools)) {
    if (!liveNames.has(name)) result.push({ tool: name, status: 'REMOVED' });
  }
  return result;
}
