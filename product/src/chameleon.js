import { toolHash } from './hash.js';

/**
 * Chameleon detection: some rogue MCP servers serve a CLEAN contract to
 * inspection tools and a POISONED one to real clients (or differ between
 * clients) — the per-client bait-and-switch popularized by MCP-Shield's
 * --identify-as. `rugsnare scan --chameleon` re-lists tools identifying as
 * several real client names and compares every tool hash against the
 * baseline listing: any difference is a finding.
 *
 * Deterministic hash comparison, same discipline as pins — no heuristics.
 */

// Client names a rogue server might special-case. Same set of clients we
// DISCOVER configs for (discovery.js): a remote server distinguishing
// "inspection tool" from "real client" is the attack; more vantage names =
// more coverage per scan.
export const CHAMELEON_CLIENTS = ['claude-desktop', 'cursor', 'windsurf', 'zed', 'continue'];

/**
 * @param {Array} baselineTools tools listed under the default client
 * @param {Object<string, Array>} perClientTools { clientName: tools[] }
 * @returns {Array<{tool, client, kind}>} kind: 'different' | 'missing' | 'extra'
 */
export function compareAcrossClients(baselineTools, perClientTools, toolHashFn = toolHash) {
  const findings = [];
  const base = new Map(baselineTools.map((t) => [t.name, toolHashFn(t)]));
  for (const [client, tools] of Object.entries(perClientTools)) {
    const live = new Map((tools ?? []).map((t) => [t.name, toolHashFn(t)]));
    for (const [name, hash] of base) {
      if (!live.has(name)) findings.push({ tool: name, client, kind: 'missing' });
      else if (live.get(name) !== hash) findings.push({ tool: name, client, kind: 'different' });
    }
    for (const name of live.keys()) {
      if (!base.has(name)) findings.push({ tool: name, client, kind: 'extra' });
    }
  }
  return findings;
}
