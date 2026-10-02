import fs from 'node:fs';
import path from 'node:path';
import { readJsonFile } from './jsonfile.js';
import { schemaHash as computeSchemaHash, proseHash as computeProseHash } from './hash.js';

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
    schemaHash: computeSchemaHash(tool),
    proseHash: computeProseHash(tool),
    description: tool.description ?? '',
    // Behavioral hints (readOnlyHint / destructiveHint / openWorldHint): a flip
    // changes what the tool is allowed to do even when text+schema are identical.
    // Stored separately from the hash so existing pins keep validating unchanged.
    annotations: tool.annotations ?? null,
    firstSeen: existing?.firstSeen ?? now,
    pinnedAt: now,
    approved,
  };
  return serverPin.tools[tool.name];
}

/**
 * Compare behavioral annotations through their SPEC DEFAULTS, not raw values
 * (official schema, modelcontextprotocol/schema 2025-06-18, ~lines 890-925):
 *   readOnlyHint    absent = false
 *   destructiveHint absent = TRUE  — tools are assumed destructive unless they
 *                     explicitly opt out with destructiveHint:false
 *   idempotentHint  absent = false
 *   openWorldHint   absent = true
 * A server spelling out a hint it was already relying on changes nothing
 * behaviorally and must NOT be flagged; a silent downgrade (e.g. dropping an
 * explicit `destructiveHint:false` after approval) IS a change and must be.
 */
function effectiveAnnotations(a) {
  return {
    readOnly: a?.readOnlyHint ?? false,
    destructive: a?.destructiveHint ?? true,
    idempotent: a?.idempotentHint ?? false,
    openWorld: a?.openWorldHint ?? true,
  };
}

function annotationsEqual(pinned, live) {
  return JSON.stringify(effectiveAnnotations(pinned)) === JSON.stringify(effectiveAnnotations(live));
}
export { annotationsEqual };

export function compareTools(serverPin, liveTools, toolHashFn) {
  const result = [];
  for (const tool of liveTools) {
    const pin = serverPin.tools[tool.name];
    const hash = toolHashFn(tool);
    if (!pin) result.push({ tool: tool.name, status: 'NEW', hash });
    else if (pin.hash !== hash) {
      const liveSchemaHash = computeSchemaHash(tool);
      const liveProseHash = computeProseHash(tool);
      const schemaChanged = pin.schemaHash !== liveSchemaHash;
      const proseChanged = pin.proseHash !== liveProseHash;
      result.push({
        tool: tool.name,
        status: 'DRIFT',
        driftType: schemaChanged ? 'BREAKING' : 'COSMETIC',
        oldHash: pin.hash,
        hash,
        schemaChanged,
        proseChanged,
        oldDescription: pin.description ?? '',
        newDescription: tool.description ?? '',
      });
    } else if (pin.annotations !== undefined && !annotationsEqual(pin.annotations, tool.annotations)) {
      // Byte-identical text+schema, but the behavioral hints flipped —
      // e.g. approved as readOnlyHint:true, now declares itself destructive.
      result.push({
        tool: tool.name,
        status: 'DRIFT',
        driftType: 'ANNOTATION',
        oldHash: pin.hash,
        hash,
        annotationsChanged: true,
        oldAnnotations: pin.annotations ?? null,
        newAnnotations: tool.annotations ?? null,
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
