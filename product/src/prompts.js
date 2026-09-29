import crypto from 'node:crypto';

/**
 * Pin prompts and resources in addition to tools.
 *
 * MCP servers expose three surfaces that carry agent-facing content:
 *  - tools/list       — instructions the agent obeys (already pinned in pins.js)
 *  - prompts/list     — prompt templates the agent injects into conversations
 *  - resources/list   — data/documents the agent reads
 *
 * A poisoned prompt template can steer the agent just as effectively as a
 * poisoned tool description. A poisoned resource can carry hidden instructions
 * (indirect prompt injection). All three surfaces deserve integrity pinning.
 */

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
    return out;
  }
  return value;
}

/** Hash a prompt template definition (name, description, arguments, template). */
export function promptHash(prompt) {
  const canonical = stable({
    name: prompt?.name ?? '',
    description: prompt?.description ?? '',
    arguments: prompt?.arguments ?? [],
  });
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/** Hash a resource definition (uri, name, description, mimeType). */
export function resourceHash(resource) {
  const canonical = stable({
    uri: resource?.uri ?? '',
    name: resource?.name ?? '',
    description: resource?.description ?? '',
    mimeType: resource?.mimeType ?? '',
  });
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/**
 * Compare live prompts/resources against pinned versions.
 * Same semantics as compareTools: DRIFT / NEW / REMOVED / UNCHANGED.
 */
export function comparePinned(kind, pinStore, liveItems, hashFn) {
  const result = [];
  for (const item of liveItems) {
    const key = item.name ?? item.uri ?? '(unnamed)';
    const pin = pinStore[key];
    const hash = hashFn(item);
    if (!pin) result.push({ item: key, status: 'NEW', hash, kind });
    else if (pin.hash !== hash) result.push({ item: key, status: 'DRIFT', oldHash: pin.hash, hash, kind, oldDescription: pin.description ?? '', newDescription: (item.description ?? item.template ?? '') });
    else result.push({ item: key, status: 'UNCHANGED', hash, kind });
  }
  const liveKeys = new Set(liveItems.map((i) => i.name ?? i.uri ?? '(unnamed)'));
  for (const key of Object.keys(pinStore)) {
    if (!liveKeys.has(key)) result.push({ item: key, status: 'REMOVED', kind });
  }
  return result;
}
