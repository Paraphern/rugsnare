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
  } else if (cmd && typeof cmd.url === 'string') {
    // HTTP transport: store the URL (never executed as a command)
    pins.servers[name].cmd = { url: cmd.url };
  }
  return pins.servers[name];
}

export function commandDisplay(server) {
  if (!server?.cmd) return '(unknown)';
  if (server.cmd.url) return server.cmd.url;
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
    annotations: tool.annotations ?? null,
    // Canonical inputSchema for human-readable diffs ("added required param mode"
    // instead of just "schema changed") — from the DescriptorPin learning
    inputSchema: tool.inputSchema ?? null,
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

/**
 * Human-readable schema diff: what exactly changed between two inputSchema objects.
 * Returns ["added required parameter 'mode'", "narrowed enum of 'sort' from [asc,desc] to [asc]"] etc.
 */
export function schemaDiff(oldSchema, newSchema) {
  if (!oldSchema || !newSchema) return [];
  const changes = [];
  const oldProps = oldSchema.properties ?? {};
  const newProps = newSchema.properties ?? {};
  const oldReq = new Set(oldSchema.required ?? []);
  const newReq = new Set(newSchema.required ?? []);

  // added params
  for (const name of Object.keys(newProps)) {
    if (!oldProps[name]) {
      changes.push(newReq.has(name)
        ? `added required parameter '${name}' (${newProps[name].type ?? 'unknown'})`
        : `added optional parameter '${name}' (${newProps[name].type ?? 'unknown'})`);
    }
  }
  // removed params
  for (const name of Object.keys(oldProps)) {
    if (!newProps[name]) changes.push(`removed parameter '${name}'`);
  }
  // changed params
  for (const name of Object.keys(oldProps)) {
    if (!newProps[name]) continue;
    const o = oldProps[name];
    const n = newProps[name];
    if (o.type !== n.type) changes.push(`changed type of '${name}' from ${o.type ?? 'untyped'} to ${n.type ?? 'untyped'}`);
    if (!oldReq.has(name) && newReq.has(name)) changes.push(`'${name}' became required`);
    if (oldReq.has(name) && !newReq.has(name)) changes.push(`'${name}' became optional`);
    const oEnum = Array.isArray(o.enum) ? o.enum : null;
    const nEnum = Array.isArray(n.enum) ? n.enum : null;
    if (oEnum && nEnum) {
      const narrowed = oEnum.filter((v) => !nEnum.includes(v));
      if (narrowed.length > 0) changes.push(`narrowed enum of '${name}': removed ${narrowed.map((v) => String(v)).join(', ')}`);
      const expanded = nEnum.filter((v) => !oEnum.includes(v));
      if (expanded.length > 0) changes.push(`expanded enum of '${name}': added ${expanded.map((v) => String(v)).join(', ')}`);
    }
    if (oEnum && !nEnum) changes.push(`removed enum constraint from '${name}'`);
    if (!oEnum && nEnum) changes.push(`added enum constraint to '${name}'`);
  }
  return changes;
}

/**
 * Notation-level schema differences: things that change the schema's bytes
 * (and its hash) but not what a caller can send — $schema dialect switches
 * (draft-07 → 2020-12, the MCP SDK v2 migration wave) and additionalProperties
 * form changes. Called out separately from parameter changes so drift can be
 * graded: parameters = BREAKING, notation-only = NOTATION (P3, idea by
 * Jakub Hecht / KyttoMCP, validated on chrome-devtools-mcp 1.8.0→1.10.1).
 *
 * Weakening notes (e.g. a dropped additionalProperties:false inside an items
 * schema) are marked with a [weakens validation] prefix — still NOTATION
 * (no parameter changed) but the reader sees the validation loosened.
 */
export function schemaNotationDiff(oldSchema, newSchema) {
  if (!oldSchema || !newSchema) return [];
  const notes = [];
  if (oldSchema.$schema !== newSchema.$schema) {
    notes.push(`$schema dialect ${oldSchema.$schema ?? 'undeclared'} → ${newSchema.$schema ?? 'undeclared'}`);
  }
  const fmt = (v) => (v === undefined ? 'undeclared' : JSON.stringify(v));
  if (fmt(oldSchema.additionalProperties) !== fmt(newSchema.additionalProperties)) {
    const tightened = oldSchema.additionalProperties === undefined && newSchema.additionalProperties !== undefined;
    notes.push(`${tightened ? '' : '[weakens validation] '}additionalProperties ${fmt(oldSchema.additionalProperties)} → ${fmt(newSchema.additionalProperties)}`);
  }
  return notes;
}

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
      const paramChanges = schemaChanged && pin.inputSchema ? schemaDiff(pin.inputSchema, tool.inputSchema) : [];
      // P3 gradation: schema bytes changed, but no parameter/type/required/
      // enum difference → notation-only (dialect switch, additionalProperties
      // form). Lower severity than parameter drift: what a caller can send
      // did not change.
      const notationOnly = schemaChanged && paramChanges.length === 0;
      const notationChanges = notationOnly && pin.inputSchema ? schemaNotationDiff(pin.inputSchema, tool.inputSchema) : [];
      result.push({
        tool: tool.name,
        status: 'DRIFT',
        driftType: schemaChanged ? (notationOnly ? 'NOTATION' : 'BREAKING') : 'COSMETIC',
        oldHash: pin.hash,
        hash,
        schemaChanged,
        proseChanged,
        schemaChanges: paramChanges,
        ...(notationOnly ? { notationChanges } : {}),
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
