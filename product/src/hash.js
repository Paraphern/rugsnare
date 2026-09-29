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

export const short = (h) => String(h).slice(0, 16);
