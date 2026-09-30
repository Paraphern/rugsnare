import crypto from 'node:crypto';

// Deterministic JSON: sorted keys, stable arrays — so the same logical
// tool definition always hashes identically across machines and runs.
function stable(value) {
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
  });
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/**
 * Hash what actually matters for agent behavior:
 * - toolHash: combined hash over name + description + inputSchema
 * - schemaHash: structural hash over name + inputSchema (breaking changes)
 * - proseHash: description-only hash (cosmetic changes, version strings)
 *
 * Split hash design from community feedback:
 * "a structural hash on name plus inputSchema is the one I'd actually enforce on.
 *  prose drift can stay alert-only forever." — u/QuanTradin
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

export const short = (h) => String(h).slice(0, 16);
