import fs from 'node:fs';
import path from 'node:path';
import { readJsonFile } from './jsonfile.js';
import { schemaHash as computeSchemaHash, proseHash as computeProseHash } from './hash.js';

/**
 * Pin store: `.rugsnare/pins.json`
 *
 * servers -> name -> tools -> toolName -> { hash, description, firstSeen, approved }
 * A pin is written by `rugsnare scan` (intentional, approved) or by the
 * proxy on first sight (approved:false - needs `rugsnare approve`).
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
    // Structured command only - never a joined shell string. Execution
    // always goes through spawn(command, args, { shell: false }).
    pins.servers[name].cmd = { command: cmd.command, args: cmd.args };
    // R1: record the package version at scan time (for diff-time mismatch
    // detection). Resolved from the first node_modules/ reference in args.
    const pkgVersion = resolvePackageVersion(cmd.args);
    if (pkgVersion) {
      pins.servers[name].scannedAgainst = pkgVersion;
    }
  } else if (cmd && typeof cmd.url === 'string') {
    // HTTP transport: store the URL (never executed as a command)
    pins.servers[name].cmd = { url: cmd.url };
  }
  return pins.servers[name];
}

/**
 * R1: when args reference node_modules/<pkg>/..., try to read that package's
 * package.json for its version. Returns "name@version" or null.
 */
export function resolvePackageVersion(args) {
  if (!Array.isArray(args)) return null;
  for (const arg of args) {
    const m = String(arg).match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
    if (m) {
      try {
        const pp = path.join(process.cwd(), 'node_modules', m[1], 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pp, 'utf8'));
        return `${m[1]}@${pkg.version}`;
      } catch { /* not installed or unreadable */ }
    }
  }
  return null;
}

export function commandDisplay(server) {
  if (!server?.cmd) return '(unknown)';
  if (server.cmd.url) return server.cmd.url;
  return [server.cmd.command, ...server.cmd.args].join(' ');
}

/**
 * Cross-server tool shadowing: the same tool name exposed by more than one
 * pinned server. The client's (often undocumented) resolution order decides
 * which implementation the agent actually calls - that collision is the
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
    // instead of just "schema changed") - from the DescriptorPin learning
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
 *   destructiveHint absent = TRUE  - tools are assumed destructive unless they
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
 * Guard parameter patterns (P5, security gap found by Jakub Hecht):
 * parameter names that, when REMOVED from a schema, create a silent-failure
 * vector: agents trained on the old contract still pass them; servers that
 * don't reject unknown keys silently ignore them, and the call executes
 * for real when the agent asked for a dry-run / confirmation / safe mode.
 */
const GUARD_PARAM_PATTERNS = [
  /^dry[_-]?run$/i,
  /^confirm$/i,
  /^force$/i,
  /^skip[_-]?validation$/i,
  /^no[_-]?op$/i,
  /^noop$/i,
  /^test[_-]?mode$/i,
  /^safe[_-]?mode$/i,
  /^preview$/i,
  /^verify$/i,
  /^require[_-]?approval$/i,
  /^ask[_-]?user$/i,
];
const GUARD_PARAM_RE = new RegExp(`(?:${GUARD_PARAM_PATTERNS.map((p) => p.source).join('|')})`);

/**
 * True when the schema REJECTS unknown keys (additionalProperties:false or
 * a value that evaluates to false). False when it accepts them (true or
 * absent - the JSON Schema default). Used to decide whether a removed
 * guard parameter creates a SILENT failure (warning needed) or a LOUD
 * one (the call errors out, no silent-ignore warning).
 */
function rejectsUnknownKeys(schema) {
  if (!schema) return false;
  return schema.additionalProperties === false;
}

/**
 * Schema diff with direction tagging. Each change carries a direction:
 * 'tighten' (new/restrictive - more demanded from the agent or less accepted)
 * or 'loosen' (permissive - constraints removed, channels opened).
 * Returns [{ text, direction }] for grading BREAKING vs LOOSENED.
 *
 * R21: recursively traverses properties, items, anyOf/oneOf at ANY depth,
 * with the path in the message. Previously only top-level properties were
 * compared; changes at depth 2+ (Netlify selectSchema.required, MongoDB
 * $vectorSearch.numCandidates at depth 5) were invisible to direction
 * grading - schemaHash caught them but classified as NOTATION.
 */
export function schemaDiff(oldSchema, newSchema) {
  if (!oldSchema || !newSchema) return [];
  const changes = [];
  diffLevel(oldSchema, newSchema, '', changes);
  return changes;
}

/**
 * Compare one level of a schema (properties + required) and recurse into
 * nested structures (items, anyOf/oneOf, sub-properties).
 */
function diffLevel(oldSchema, newSchema, path, changes) {
  const prefix = path ? path + '.' : '';
  const oldProps = oldSchema?.properties ?? {};
  const newProps = newSchema?.properties ?? {};
  const oldReq = new Set(oldSchema?.required ?? []);
  const newReq = new Set(newSchema?.required ?? []);

  // added params
  for (const name of Object.keys(newProps)) {
    if (!oldProps[name]) {
      changes.push(newReq.has(name)
        ? { text: `added required parameter '${prefix}${name}' (${newProps[name].type ?? 'unknown'})`, direction: 'tighten' }
        : { text: `added optional parameter '${prefix}${name}' (${newProps[name].type ?? 'unknown'})`, direction: 'expand' });
    }
  }
  // removed params
  for (const name of Object.keys(oldProps)) {
    if (!newProps[name]) {
      const change = { text: `removed parameter '${prefix}${name}'`, direction: 'loosen' };
      if (GUARD_PARAM_RE.test(name) && !rejectsUnknownKeys(newSchema)) {
        change.guardWarning = `guard-style parameter removed - agents may still pass '${prefix}${name}'; server will silently ignore it (unknown keys not rejected)`;
      }
      changes.push(change);
    }
  }
  // changed params
  for (const name of Object.keys(oldProps)) {
    if (!newProps[name]) continue;
    const o = oldProps[name];
    const n = newProps[name];
    const p = prefix + name;
    diffProperty(o, n, p, oldReq.has(name), newReq.has(name), changes);
  }
}

/**
 * Compare a single property (type, required, enum, default, constraints,
 * guard patterns) and recurse into nested schemas.
 */
function diffProperty(o, n, p, wasRequired, isRequired, changes) {
  if (o.type !== n.type) {
    const widen = o.type !== undefined && (n.type === undefined || (Array.isArray(n.type) && !Array.isArray(o.type)));
    changes.push({ text: `changed type of '${p}' from ${o.type ?? 'untyped'} to ${n.type ?? 'untyped'}`, direction: widen ? 'loosen' : 'tighten' });
  }
  if (!wasRequired && isRequired) changes.push({ text: `'${p}' became required`, direction: 'tighten' });
  if (wasRequired && !isRequired) {
    const change = { text: `'${p}' became optional`, direction: 'loosen' };
    if (GUARD_PARAM_RE.test(p)) {
      change.guardWarning = `guard-style parameter defanged: '${p}' is no longer required - agent may omit the confirmation, action executes without it`;
    }
    changes.push(change);
  }

  // default value changes
  if (o.default !== undefined && n.default !== undefined && o.default !== n.default) {
    const isGuard = GUARD_PARAM_RE.test(p);
    const weakened = isGuard && o.default === true && n.default === false;
    const change = {
      text: `default of '${p}' changed from ${JSON.stringify(o.default)} to ${JSON.stringify(n.default)}`,
      direction: 'loosen',
    };
    if (weakened) {
      change.guardWarning = `guard-style parameter defanged: '${p}' default changed ${JSON.stringify(o.default)} -> ${JSON.stringify(n.default)} - agent relying on the old default will execute the real action`;
    }
    changes.push(change);
  }

  // enum changes
  const oEnum = Array.isArray(o.enum) ? o.enum : null;
  const nEnum = Array.isArray(n.enum) ? n.enum : null;
  if (oEnum && nEnum) {
    const narrowed = oEnum.filter((v) => !nEnum.includes(v));
    if (narrowed.length > 0) changes.push({ text: `narrowed enum of '${p}': removed ${narrowed.map((v) => String(v)).join(', ')}`, direction: 'tighten' });
    const expanded = nEnum.filter((v) => !oEnum.includes(v));
    if (expanded.length > 0) changes.push({ text: `expanded enum of '${p}': added ${expanded.map((v) => String(v)).join(', ')}`, direction: 'loosen' });
  }
  if (oEnum && !nEnum) changes.push({ text: `removed enum constraint from '${p}'`, direction: 'loosen' });
  if (!oEnum && nEnum) changes.push({ text: `added enum constraint to '${p}'`, direction: 'tighten' });

  // constraint keys (R3)
  for (const ck of CONSTRAINT_KEYS) {
    const ov = o[ck];
    const nv = n[ck];
    if (ov === nv) continue;
    if (ov === undefined && nv !== undefined) {
      changes.push({ text: `added ${ck}=${JSON.stringify(nv)} to '${p}'`, direction: 'tighten' });
    } else if (ov !== undefined && nv === undefined) {
      changes.push({ text: `removed ${ck}=${JSON.stringify(ov)} from '${p}'`, direction: 'loosen' });
    } else {
      changes.push({ text: `${ck} of '${p}' changed from ${JSON.stringify(ov)} to ${JSON.stringify(nv)}`, direction: 'tighten' });
    }
  }

  // number -> integer
  if (o.type === 'number' && n.type === 'integer') {
    changes.push({ text: `'${p}' narrowed from number to integer`, direction: 'tighten' });
  }
  if (o.type === 'integer' && n.type === 'number') {
    changes.push({ text: `'${p}' widened from integer to number`, direction: 'loosen' });
  }

  // R21: recurse into nested structures
  // nested properties (object within object)
  if ((o.properties && Object.keys(o.properties).length > 0) || (n.properties && Object.keys(n.properties).length > 0)) {
    diffLevel(o, n, p, changes);
  }
  // array items (may contain anyOf/oneOf/properties at the item level)
  if (o.items || n.items) {
    diffLevel({ properties: o.items?.properties, required: o.items?.required }, { properties: n.items?.properties, required: n.items?.required }, p + '[]', changes);
    diffUnionCross(o.items?.anyOf, n.items?.anyOf, o.items?.oneOf, n.items?.oneOf, p + '[]', changes);
  }
  // union branches directly on this property
  diffUnionCross(o.anyOf, n.anyOf, o.oneOf, n.oneOf, p, changes);
}

/**
 * R4+R2: Cross-key union comparison. Handles anyOf↔oneOf swaps:
 * if old has anyOf branches and new has oneOf branches with the same const
 * discriminators, this is a NOTATION-level key swap (same branches, different
 * union keyword) - not removed+added. Also handles normal same-key unions.
 */
function diffUnionCross(oldAnyOf, newAnyOf, oldOneOf, newOneOf, parentPath, changes) {
  const hasOldAny = Array.isArray(oldAnyOf) && oldAnyOf.length > 0;
  const hasNewAny = Array.isArray(newAnyOf) && newAnyOf.length > 0;
  const hasOldOne = Array.isArray(oldOneOf) && oldOneOf.length > 0;
  const hasNewOne = Array.isArray(newOneOf) && newOneOf.length > 0;

  // R4: anyOf→oneOf swap with same const discriminators = NOTATION
  if (hasOldAny && hasNewOne && !hasNewAny && !hasOldOne) {
    const oldConsts = new Set(oldAnyOf.map(findConst).filter(Boolean));
    const newConsts = new Set(newOneOf.map(findConst).filter(Boolean));
    if (oldConsts.size > 0 && newConsts.size > 0 && oldConsts.size === newConsts.size) {
      let allMatch = true;
      for (const c of oldConsts) { if (!newConsts.has(c)) { allMatch = false; break; } }
      if (allMatch) {
        changes.push({ text: `union keyword anyOf -> oneOf on '${parentPath}' (branches identical)`, direction: 'loosen', notationOnly: true });
        return; // same branches, just keyword swap
      }
    }
    // NOT a pure swap (branches differ): compare as merged union
    diffUnion(oldAnyOf, newOneOf, parentPath, 'branch', changes);
    return;
  }
  // R4: oneOf→anyOf swap (same check in reverse)
  if (hasOldOne && hasNewAny && !hasNewOne && !hasOldAny) {
    const oldConsts = new Set(oldOneOf.map(findConst).filter(Boolean));
    const newConsts = new Set(newAnyOf.map(findConst).filter(Boolean));
    if (oldConsts.size > 0 && newConsts.size > 0 && oldConsts.size === newConsts.size) {
      let allMatch = true;
      for (const c of oldConsts) { if (!newConsts.has(c)) { allMatch = false; break; } }
      if (allMatch) {
        changes.push({ text: `union keyword oneOf -> anyOf on '${parentPath}' (branches identical)`, direction: 'loosen', notationOnly: true });
        return;
      }
    }
    // NOT a pure swap: compare as merged union
    diffUnion(oldOneOf, newAnyOf, parentPath, 'branch', changes);
    return;
  }

  // normal same-key comparison
  diffUnion(oldAnyOf, newAnyOf, parentPath, 'anyOf', changes);
  diffUnion(oldOneOf, newOneOf, parentPath, 'oneOf', changes);
}

/**
 * Compare union branches (anyOf/oneOf). Each branch is a subschema that
 * may have its own properties, required, and nested structures. Matched
 * by const discriminator when available, otherwise compared pairwise.
 */
function diffUnion(oldBranches, newBranches, parentPath, unionKind, changes) {
  if (!Array.isArray(oldBranches) || !Array.isArray(newBranches)) return;
  if (oldBranches.length === 0 && newBranches.length === 0) return;

  // build a map by const discriminator (operation name) for efficient matching
  const oldByConst = new Map();
  const newByConst = new Map();
  const oldNoConst = [];
  const newNoConst = [];
  for (const b of oldBranches) {
    const c = findConst(b);
    if (c) oldByConst.set(c, b); else oldNoConst.push(b);
  }
  for (const b of newBranches) {
    const c = findConst(b);
    if (c) newByConst.set(c, b); else newNoConst.push(b);
  }

  // compare branches matched by const
  for (const [constVal, oldB] of oldByConst) {
    const newB = newByConst.get(constVal);
    if (!newB) {
      changes.push({ text: `removed ${unionKind} branch '${constVal}' from '${parentPath}'`, direction: 'loosen' });
      continue;
    }
    diffLevel(oldB, newB, `${parentPath}[${constVal}]`, changes);
  }
  for (const constVal of newByConst.keys()) {
    if (!oldByConst.has(constVal)) {
      changes.push({ text: `added ${unionKind} branch '${constVal}' to '${parentPath}'`, direction: 'expand' });
    }
  }

  // R21 fallback: branches without const discriminators, compared by index.
  // MongoDB's anyOf is a wrapper around one subschema (not a discriminated
  // union) - just recurse into its properties at any depth.
  for (let i = 0; i < Math.min(oldNoConst.length, newNoConst.length); i++) {
    diffLevel(oldNoConst[i], newNoConst[i], `${parentPath}[${i}]`, changes);
  }
}

/**
 * Find the const discriminator value in a union branch (e.g. the value of
 * properties.operation.const = "get-teams"). Checks properties.*.const.
 */
function findConst(branch) {
  if (!branch?.properties) return null;
  for (const prop of Object.values(branch.properties)) {
    if (prop?.const !== undefined) return String(prop.const);
  }
  return null;
}

/**
 * JSON Schema constraint keys that restrict what values are accepted.
 * Changes to these are structural (BREAKING/LOOSENED), not notational.
 */
const CONSTRAINT_KEYS = ['minItems', 'maxItems', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'multipleOf', 'uniqueItems', 'exclusiveMinimum', 'exclusiveMaximum'];

/**
 * Notation-level schema differences: things that change the schema's bytes
 * (and its hash) but not what a caller can send - $schema dialect switches
 * (draft-07 → 2020-12, the MCP SDK v2 migration wave). additionalProperties
 * changes are NOT here - they moved to LOOSENED (P4 gradation, second round
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
 * Direction-aware schema grading (P4+P5, from the KyttoMCP dialogue):
 * - tighten (required/restrictive) → BREAKING (agent must send more)
 * - expand (added optional param) → EXPANDED (new data channel = exfil
 *   risk; backwards-compatible for callers but attack surface widened;
 *   same exit 1, same severity slot as BREAKING, more honest label)
 * - loosen (permissive) → LOOSENED (constraints dropped, still exit 1)
 * - mixed (any tighten or expand) → BREAKING (conservative: expand rides
 *   at BREAKING severity when mixed with other changes)
 * - notation-only (dialect switch) → NOTATION
 */
export function gradeSchemaDrift(paramChanges, notationChanges) {
  const hasTighten = paramChanges.some((c) => c.direction === 'tighten');
  const hasExpand = paramChanges.some((c) => c.direction === 'expand');
  const hasLoosen = paramChanges.some((c) => c.direction === 'loosen');
  if (hasTighten || hasExpand) return 'BREAKING';
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
      // Byte-identical text+schema, but the behavioral hints flipped -
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
