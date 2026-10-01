/**
 * Declarative call policies — runtime enforcement of what MCP tools
 * are allowed to do, regardless of whether their contract is pinned.
 *
 * Policies are defined in .rugsnare/policies.json (or .yml — parsed as JSON
 * for zero-dep simplicity). Each rule can:
 *   - deny specific argument names/types (e.g. session:object)
 *   - deny patterns in descriptions (e.g. unknown domains)
 *   - require human approval for matching tools (destructive ops)
 *   - check arguments for PII/credentials before the call goes through
 *
 * The live proxy evaluates every tools/call against these rules.
 */

import crypto from 'node:crypto';

// ---- PII / credential detection in tool arguments ----

const PII_PATTERNS = [
  { id: 'PII01', weight: 3, test: /(?:sk|rk|pk)-[a-zA-Z0-9]{20,}/, desc: 'OpenAI/Anthropic API key format' },
  { id: 'PII02', weight: 3, test: /AKIA[0-9A-Z]{16}/, desc: 'AWS access key ID' },
  { id: 'PII03', weight: 3, test: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, desc: 'private key block' },
  { id: 'PII04', weight: 2, test: /ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}/, desc: 'GitHub personal/org token' },
  { id: 'PII05', weight: 2, test: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*\S+/i, desc: 'API key in key=value format' },
  { id: 'PII06', weight: 2, test: /(?:aws[_-]?secret|secret[_-]?key|client[_-]?secret)\s*[=:]\s*\S+/i, desc: 'secret credential in key=value format' },
  { id: 'PII07', weight: 2, test: /\.ssh\/id_(?:rsa|ed25519|ecdsa)/, desc: 'SSH private key path' },
  { id: 'PII08', weight: 1, test: /\.env\b|credentials\.json|secrets?\.(?:yml|json|txt)/i, desc: 'credentials file reference' },
  { id: 'PII09', weight: 1, test: /(?:password|passwd|pwd)\s*[=:]\s*\S+/i, desc: 'password in key=value format' },
  { id: 'PII10', weight: 1, test: /(?:Bearer|Basic)\s+[a-zA-Z0-9+/=]{20,}/, desc: 'bearer/basic auth token' },
];

const PII_THRESHOLD = 2;

// ---- Dangerous shell patterns in tool arguments ----
// A tool call whose arguments embed one of these is almost certainly a
// hijacked or destructive agent action, regardless of the tool's contract.
const DANGEROUS_PATTERNS = [
  { id: 'D01', test: /\brm\s+[^|;&]{0,20}(?:-[a-zA-Z]*[rf][a-zA-Z]*\s+)+(?:\/|~|\$HOME|\*)/i, desc: 'recursive delete targeting root/home' },
  { id: 'D02', test: /\b(?:curl|wget)\b[^|;&]{0,300}\|\s*(?:ba|z|da)?sh\b/i, desc: 'download piped straight into a shell' },
  { id: 'D03', test: /\bmkfs(?:\.\w+)?\s+\//i, desc: 'filesystem format' },
  { id: 'D04', test: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/, desc: 'fork bomb' },
  { id: 'D05', test: /\bremove-item\b[^|]{0,120}\b-recurse\b/i, desc: 'PowerShell recursive delete' },
  { id: 'D06', test: /\bdd\s+if=[^|]{0,200}of=\/dev\/(?:sd|nvme|disk)/i, desc: 'raw disk overwrite' },
];

export function scanArgumentsForDanger(args) {
  if (!args || typeof args !== 'object') return { hits: [], dangerous: false };
  const serialized = JSON.stringify(args);
  const hits = DANGEROUS_PATTERNS.filter((p) => p.test.test(serialized)).map((p) => ({ id: p.id, desc: p.desc }));
  return { hits, dangerous: hits.length > 0 };
}

export function scanArgumentsForPII(args) {
  if (!args || typeof args !== 'object') return { hits: [], pii: false };
  const hits = [];
  let score = 0;
  const serialized = JSON.stringify(args);
  for (const p of PII_PATTERNS) {
    if (p.test.test(serialized)) {
      hits.push({ id: p.id, desc: p.desc });
      score += p.weight;
    }
  }
  return { hits, pii: score >= PII_THRESHOLD, score };
}

// ---- Policy engine ----

const DEFAULT_POLICIES = {
  version: 1,
  rules: [
    {
      name: 'deny-session-object',
      action: 'deny',
      match: { argument: 'session', argumentType: 'object' },
      reason: 'hidden environment capture via session parameter',
    },
    {
      name: 'pii-egress',
      action: 'deny',
      match: { piiInArguments: true },
      reason: 'PII/credentials detected in tool call arguments',
    },
    {
      name: 'dangerous-shell',
      action: 'deny',
      match: { dangerousInArguments: true },
      reason: 'dangerous shell pattern in arguments (rm -rf class, download|sh, disk overwrite)',
    },
    {
      name: 'destructive-approval',
      action: 'require-approval',
      match: { toolName: '^(delete|drop|remove|rm|destroy|wipe|format|truncate|purge|nuke)' },
      reason: 'destructive operation requires human approval',
    },
  ],
};

export { DEFAULT_POLICIES };

export function loadPolicies(cwd = process.cwd()) {
  // Caller reads the file; we just parse and validate
  try {
    const raw = arguments[0];
    if (typeof raw === 'string') return validate(JSON.parse(raw));
    return validate(raw);
  } catch {
    return { ...DEFAULT_POLICIES };
  }
}

export function validate(policies) {
  if (!policies || !Array.isArray(policies.rules)) {
    return { version: 1, rules: [] };
  }
  return policies;
}

/**
 * Evaluate a tool call against all policies.
 * Returns { allowed, blocked: [{rule, reason}], requiresApproval: [{rule, reason}], pii }
 */
export function evaluateCall({ toolName, arguments: args, description }, policies) {
  const result = {
    allowed: true,
    blocked: [],
    requiresApproval: [],
    pii: null,
  };

  // PII check always runs (even without explicit rules)
  const piiResult = scanArgumentsForPII(args);
  if (piiResult.pii) {
    result.pii = piiResult;
  }
  const dangerResult = scanArgumentsForDanger(args);

  for (const rule of policies?.rules ?? []) {
    const m = rule.match ?? {};

    // Check tool name pattern
    if (m.toolName) {
      const re = new RegExp(m.toolName, 'i');
      if (!re.test(toolName)) continue;
    }

    // Check argument name and type
    if (m.argument) {
      const argValue = args?.[m.argument];
      if (argValue === undefined) continue;
      if (m.argumentType && typeof argValue !== m.argumentType) continue;
    }

    // Check description pattern
    if (m.description_matches) {
      const re = new RegExp(m.description_matches, 'i');
      if (!description || !re.test(description)) continue;
    }

    // Check PII in arguments
    if (m.piiInArguments && !piiResult.pii) continue;

    // Check dangerous shell patterns in arguments
    if (m.dangerousInArguments && !dangerResult.dangerous) continue;

    // Rule matched — apply action
    const entry = { rule: rule.name, reason: rule.reason ?? 'policy violation' };
    if (rule.action === 'deny') {
      result.allowed = false;
      result.blocked.push(entry);
    } else if (rule.action === 'require-approval') {
      result.requiresApproval.push(entry);
    }
  }

  return result;
}
