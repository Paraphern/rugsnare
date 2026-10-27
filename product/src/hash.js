import crypto from 'node:crypto';

// Deterministic JSON: sorted keys, stable arrays - so the same logical
// tool definition always hashes identically across machines and runs.
// Exported for callers that need a canonical form of arbitrary payloads
// (e.g. the proxy's loop detector fingerprints call arguments).
export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
    return out;
  }
  return value;
}

/**
 * Hash what actually matters for agent behavior: the tool name, its
 * description (where poisoned instructions live), and its input schema
 * (where shadow tools hide extra "session" parameters).
 */
export function toolHash(tool) {
  const canonical = stable({
    name: tool?.name ?? '',
    description: tool?.description ?? '',
    inputSchema: tool?.inputSchema ?? {},
    // icons: SVG can contain scripts (spec warning). null when absent.
    // Changes every tool's hash, ships with 1.5.0 where policyVersion
    // bump triggers POLICY stop for legacy pins.
    icons: tool?.icons ?? null,
  });
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/**
 * PIN-SPEC §3.2 surfaceHash: the interop hash over the WHOLE tool surface.
 * sha-256 of the compact JSON array of per-tool canonical objects
 * {name, description, inputSchema}, sorted ascending by the UTF-8 bytes
 * of `name`.
 *
 * The three-field set is the Dominion Observatory capture set (issue #6):
 * icons, annotations and outputSchema are deliberately OUT, so a RugSnare
 * pin and a foreign signed baseline of one endpoint agree byte-for-byte.
 * Not a derivative of our per-tool hashes (toolHash has four fields):
 * a separate computation over the interop field set.
 */
export function surfaceHash(tools) {
  const arr = (tools ?? [])
    .map((t) => stable({ name: t?.name ?? '', description: t?.description ?? '', inputSchema: t?.inputSchema ?? {} }))
    .sort((a, b) =>
      Buffer.compare(Buffer.from(a.name, 'utf8'), Buffer.from(b.name, 'utf8')) ||
      (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0));
  return crypto.createHash('sha256').update(JSON.stringify(arr)).digest('hex');
}

/**
 * Hash what actually matters for agent behavior:
 * - toolHash: combined hash over name + description + inputSchema
 * - schemaHash: structural hash over name + inputSchema (breaking changes)
 * - proseHash: description-only hash (cosmetic changes, version strings)
 *
 * Split hash design from community feedback:
 * "a structural hash on name plus inputSchema is the one I'd actually enforce on.
 *  prose drift can stay alert-only forever." - u/QuanTradin
 */

export function schemaHash(tool) {
  const canonical = stable({
    name: tool?.name ?? '',
    inputSchema: tool?.inputSchema ?? {},
  });
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function proseHash(tool) {
  return crypto.createHash('sha256').update(stable(tool?.description ?? '')).digest('hex');
}

/**
 * R14: outputSchema hash - the response half of the contract. GitHub's
 * 123/131 tool changes were ALL outputSchema additions (Go SDK artifact);
 * without this, we are blind on the output side. Graded separately:
 * additions = NOTATION (SDK waves), narrowings = BREAKING (output shape
 * changed for consumers who parse it).
 */
export function outputHash(tool) {
  if (!tool?.outputSchema) return null;
  return crypto.createHash('sha256').update(JSON.stringify(stable(tool.outputSchema))).digest('hex');
}

export const short = (h) => String(h).slice(0, 16);
