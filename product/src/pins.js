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
/**
 * Schema diff with direction tagging. Each change carries a direction:
 * 'tighten' (new/restrictive — more demanded from the agent or less accepted)
 * or 'loosen' (permissive — constraints removed, channels opened).
 * Returns [{ text, direction }] for grading BREAKING vs LOOSENED.
 */
export function schemaDiff(oldSchema, newSchema) {
  if (!oldSchema || !newSchema) return [];
  const changes = [];
  const oldProps = oldSchema.properties ?? {};
  const newProps = newSchema.properties ?? {};
  const oldReq = new Set(oldSchema.required ?? []);
  const newReq = new Set(newSchema.required ?? []);

  // added params: new data channel — always tighten (exfil vector risk)
  for (const name of Object.keys(newProps)) {
    if (!oldProps[name]) {
      changes.push(newReq.has(name)
        ? { text: `added required parameter '${name}' (${newProps[name].type ?? 'unknown'})`, direction: 'tighten' }
        : { text: `added optional parameter '${name}' (${newProps[name].type ?? 'unknown'})`, direction: 'tighten' });
    }
  }
  // removed params: data channel closed — loosen
  for (const name of Object.keys(oldProps)) {
    if (!newProps[name]) changes.push({ text: `removed parameter '${name}'`, direction: 'loosen' });
  }
  // changed params
  for (const name of Object.keys(oldProps)) {
    if (!newProps[name]) continue;
    const o = oldProps[name];
    const n = newProps[name];
    if (o.type !== n.type) {
      // widen = loosen (more accepted), narrow = tighten (less accepted)
      const widen = o.type !== undefined && (n.type === undefined || (Array.isArray(n.type) && !Array.isArray(o.type)));
      changes.push({ text: `changed type of '${name}' from ${o.type ?? 'untyped'} to ${n.type ?? 'untyped'}`, direction: widen ? 'loosen' : 'tighten' });
    }
    if (!oldReq.has(name) && newReq.has(name)) changes.push({ text: `'${name}' became required`, direction: 'tighten' });
    if (oldReq.has(name) && !newReq.has(name)) changes.push({ text: `'${name}' became optional`, direction: 'loosen' });
    const oEnum = Array.isArray(o.enum) ? o.enum : null;
    const nEnum = Array.isArray(n.enum) ? n.enum : null;
    if (oEnum && nEnum) {
      const narrowed = oEnum.filter((v) => !nEnum.includes(v));
      if (narrowed.length > 0) changes.push({ text: `narrowed enum of '${name}': removed ${narrowed.map((v) => String(v)).join(', ')}`, direction: 'tighten' });
      const expanded = nEnum.filter((v) => !oEnum.includes(v));
      if (expanded.length > 0) changes.push({ text: `expanded enum of '${name}': added ${expanded.map((v) => String(v)).join(', ')}`, direction: 'loosen' });
    }
    if (oEnum && !nEnum) changes.push({ text: `removed enum constraint from '${name}'`, direction: 'loosen' });
    if (!oEnum && nEnum) changes.push({ text: `added enum constraint to '${name}'`, direction: 'tighten' });
  }
  return changes;
}

/**
 * Notation-level schema differences: things that change the schema's bytes
 * (and its hash) but not what a caller can send — $schema dialect switches
 * (draft-07 → 2020-12, the MCP SDK v2 migration wave). additionalProperties
 * changes are NOT here — they moved to LOOSENED (P4 gradation, second round
 * from Jakub Hecht: direction matters, not just presence).
 */
export function schemaNotationDiff(oldSchema, newSchema) {
  if (!oldSchema || !newSchema) return [];
  const notes = [];
  if (oldSchema.$schema !== newSchema.$schema) {
    notes.push(`$schema dialect ${oldSchema.$schema ?? 'undeclared'} → ${newSchema.$schema ?? 'undeclared'}`);
  }
  return notes;
}

/**
 * Direction-aware schema grading (P4, second Jakub proposal):
 * - tighten (new/restrictive) changes → BREAKING (agent must send more,
 *   new data channels = exfil risk)
 * - loosen (permissive) changes → LOOSENED (constraints dropped, validation
 *   weakened — still drift, still exit 1, but a different failure mode)
 * - mixed (both directions) → BREAKING (conservative: the most severe wins)
 * - notation-only (dialect switch, no parameter change) → NOTATION
 */
export function gradeSchemaDrift(paramChanges, notationChanges) {
  const hasTighten = paramChanges.some((c) => c.direction === 'tighten');
  const hasLoosen = paramChanges.some((c) => c.direction === 'loosen');
  if (hasTighten) return 'BREAKING';
  if (hasLoosen) return 'LOOSENED';
  return 'NOTATION';
}

/**
 * Detect additionalProperties direction change and return it as a graded
 * paramChange (moved from notation in P4): dropping additionalProperties:false
 * = loosen (validation weakened, LOOSENED class); adding it = tighten
 * (BREAKING class).
 */
export function detectAdditionalPropertiesDirection(oldSchema, newSchema) {
  if (!oldSchema || !newSchema) return null;
  const fmt = (v) => (v === undefined ? 'undeclared' : JSON.stringify(v));
  if (fmt(oldSchema.additionalProperties) === fmt(newSchema.additionalProperties)) return null;
  const dropped = oldSchema.additionalProperties !== undefined && newSchema.additionalProperties === undefined;
  return {
    text: `additionalProperties ${fmt(oldSchema.additionalProperties)} → ${fmt(newSchema.additionalProperties)}`,
    direction: dropped ? 'loosen' : 'tighten',
  };
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

      // additionalProperties direction check (moved from notation to grading)
      const apChange = detectAdditionalPropertiesDirection(pin.inputSchema, tool.inputSchema);
      if (apChange) paramChanges.push(apChange);

      const notationChanges = schemaChanged && pin.inputSchema && paramChanges.length === 0
        ? schemaNotationDiff(pin.inputSchema, tool.inputSchema) : [];
      const driftType = schemaChanged
        ? gradeSchemaDrift(paramChanges, notationChanges)
        : 'COSMETIC';
      result.push({
        tool: tool.name,
        status: 'DRIFT',
        driftType,
        oldHash: pin.hash,
        hash,
        schemaChanged,
        proseChanged,
        schemaChanges: paramChanges,
        ...(notationChanges.length ? { notationChanges } : {}),
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
