/**
 * R35/R36: MIRRORED class + OpenAPI crosscheck.
 *
 * A schema diff cannot distinguish "new restriction" from "the schema now
 * documents what the backend already validated" (currents#232, twk3):
 * "not new tightenings - validation in an additional place; backend already
 * validated; OpenAPI spec contained it". Operationally these are different
 * universes: in the second, no previously-successful call starts failing.
 *
 * Refined operational definition of BREAKING (R35):
 * "a previously-successful call starts failing", not "the contract text
 * tightened".
 *
 * R36: where the vendor publishes an OpenAPI spec, constraint additions
 * can be cross-checked against it automatically: "already existed in the
 * published spec" marked MIRRORED with no vendor cooperation needed.
 *
 * Usage:
 *   const checker = new OpenAPICrosscheck(specUrl);
 *   await checker.load();  // fetch + parse once
 *   const mirrored = checker.isMirrored('toolName', 'paramName', 'minimum');
 */

import https from 'node:https';

export class OpenAPICrosscheck {
  constructor(specUrl) {
    this.url = specUrl;
    this.spec = null;
    this.loaded = false;
  }

  async load(timeoutMs = 15000) {
    if (this.loaded) return;
    const raw = await new Promise((resolve, reject) => {
      const req = https.get(this.url, { timeout: timeoutMs }, (res) => {
        if (res.statusCode !== 200) { reject(new Error(`OpenAPI spec fetch: HTTP ${res.statusCode}`)); return; }
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('OpenAPI spec fetch timeout')); });
    });
    // parse JSON (most common); YAML OpenAPI specs are rare in MCP context
    try { this.spec = JSON.parse(raw); } catch { this.spec = null; }
    this.loaded = true;
  }

  /**
   * Check if a constraint on a parameter was already present in the
   * published OpenAPI spec. Returns true if the constraint existed.
   *
   * @param {string} toolName - the MCP tool name
   * @param {string} paramName - the parameter path (e.g. "limit", "pipeline[][0].$vectorSearch.limit")
   * @param {string} constraintType - "minimum" | "maximum" | "pattern" | "enum" | "type" | "minItems" | ...
   */
  isMirrored(toolName, paramName, constraintType) {
    if (!this.spec || !this.loaded) return false;
    // extract the base param name (strip paths like [][0].)
    const baseParam = paramName.split(/[.\[]/)[0];
    // try to find the tool in the spec (paths or components)
    const schemas = this._findSchemasFor(toolName);
    for (const schema of schemas) {
      const prop = schema?.properties?.[baseParam];
      if (prop && prop[constraintType] !== undefined) return true;
      // check nested (simplified: one level of nesting via items or anyOf)
      const nested = prop?.items?.properties?.[baseParam] ?? prop?.properties?.[baseParam];
      if (nested && nested[constraintType] !== undefined) return true;
    }
    return false;
  }

  _findSchemasFor(toolName) {
    const results = [];
    // OpenAPI 3.x: paths -> /toolName -> post -> requestBody -> schema
    const paths = this.spec?.paths ?? {};
    for (const [path, methods] of Object.entries(paths)) {
      if (path.toLowerCase().includes(toolName.toLowerCase().replace(/[_-]/g, ''))) {
        for (const method of Object.values(methods ?? {})) {
          const schema = method?.requestBody?.content?.['application/json']?.schema;
          if (schema) results.push(schema);
        }
      }
    }
    // components/schemas (named schemas)
    const components = this.spec?.components?.schemas ?? {};
    for (const [name, schema] of Object.entries(components)) {
      if (name.toLowerCase().includes(toolName.toLowerCase().replace(/[_-]/g, ''))) {
        results.push(schema);
      }
    }
    return results;
  }
}

/**
 * R35: regrade a BREAKING finding to MIRRORED if evidence shows the
 * constraint already existed in backend validation.
 *
 * Evidence sources:
 *   1. OpenAPI crosscheck (R36): the constraint was in the published spec
 *   2. Vendor annotation: release notes or metadata says "mirrors backend"
 *
 * Returns the modified paramChanges array with MIRRORED entries.
 */
export function applyMirrored(paramChanges, crosscheck, toolName) {
  if (!crosscheck || !crosscheck.loaded) return paramChanges;
  const regraded = paramChanges.map((c) => {
    // only regrade tighten directions (BREAKING contributors)
    if (c.direction !== 'tighten') return c;
    // extract param name and constraint from the change text
    const paramMatch = c.text.match(/'([^']+)'/);
    const constraintMatch = c.text.match(/\b(added|changed|narrowed)\s+(\w+)/i);
    if (!paramMatch || !constraintMatch) return c;
    const paramName = paramMatch[1];
    const constraint = constraintMatch[2].toLowerCase();
    if (crosscheck.isMirrored(toolName, paramName, constraint)) {
      return { ...c, direction: 'mirrored', mirroredFrom: 'openapi', note: 'constraint existed in published OpenAPI spec (R36)' };
    }
    return c;
  });
  return regraded;
}
