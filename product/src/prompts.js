import crypto from 'node:crypto';
import { canonicalJson } from './hash.js';

/**
 * Pin prompts and resources in addition to tools.
 *
 * MCP servers expose three surfaces that carry agent-facing content:
 *  - tools/list       - instructions the agent obeys (already pinned in pins.js)
 *  - prompts/list     - prompt templates the agent injects into conversations
 *  - resources/list   - data/documents the agent reads
 *
 * A poisoned prompt template can steer the agent just as effectively as a
 * poisoned tool description. A poisoned resource can carry hidden instructions
 * (indirect prompt injection). All three surfaces deserve integrity pinning.
 */

// (local stable() removed: it materialized an intermediate object, which
// re-orders integer-like keys numerically - the kimjooyoon/#6 bug class.
// All digests go through hash.js canonicalJson, the direct JCS emitter.)

/** Hash a prompt template definition (name, description, arguments, template). */
export function promptHash(prompt) {
  return crypto.createHash('sha256').update(canonicalJson({
    name: prompt?.name ?? '',
    description: prompt?.description ?? '',
    arguments: prompt?.arguments ?? [],
  })).digest('hex');
}

/** Hash a resource definition (uri, name, description, mimeType). */
export function resourceHash(resource) {
  return crypto.createHash('sha256').update(canonicalJson({
    uri: resource?.uri ?? '',
    name: resource?.name ?? '',
    description: resource?.description ?? '',
    mimeType: resource?.mimeType ?? '',
  })).digest('hex');
}

/**
 * R13: hash the CONTENT of a resource (the text body). The envelope hash
 * above catches URI/description/mimeType changes, but the hostinger case
 * showed a vendor silently rewriting SKILL.md text while keeping the same
 * URI - the envelope pin doesn't move. This hash covers the body. Null
 * when no text is available (resources/list may not include content).
 */
export function resourceContentHash(resource) {
  if (typeof resource?.text === 'string' && resource.text.length > 0) {
    return crypto.createHash('sha256').update(resource.text, 'utf8').digest('hex');
  }
  return null;
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
    // R13: for resources, also compare contentHash (the body text)
    const liveContent = kind === 'resource' ? resourceContentHash(item) : undefined;
    const pinContent = kind === 'resource' ? (pin?.contentHash ?? null) : undefined;
    const contentChanged = kind === 'resource' && pin && pinContent !== (liveContent ?? null);
    if (!pin) result.push({ item: key, status: 'NEW', hash, kind });
    else if (pin.hash !== hash) result.push({ item: key, status: 'DRIFT', oldHash: pin.hash, hash, kind, oldDescription: pin.description ?? '', newDescription: (item.description ?? item.template ?? '') });
    else if (contentChanged) result.push({ item: key, status: 'DRIFT', oldHash: pin.hash, hash, kind, contentChanged: true, detail: 'resource body text changed while envelope is identical (hostinger class)' });
    else result.push({ item: key, status: 'UNCHANGED', hash, kind });
  }
  const liveKeys = new Set(liveItems.map((i) => i.name ?? i.uri ?? '(unnamed)'));
  for (const key of Object.keys(pinStore)) {
    if (!liveKeys.has(key)) result.push({ item: key, status: 'REMOVED', kind });
  }
  return result;
}
