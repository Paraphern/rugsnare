/**
 * Advisory signals — heuristic detection that a tool description contains
 * instructions TO the model rather than documentation FOR the human.
 *
 * This is NOT cryptographic drift detection (that's pins.js). Advisory signals
 * fire on the text itself — they can catch a poisoned description on FIRST
 * contact, before any baseline pin exists.
 *
 * Each signal has a weight; total score >= 5 → ADVISORY (review recommended).
 * Heuristics can false-positive on innocent text — that's why they are
 * advisory, not findings. The tool reports structure; the reader judges.
 */

const SIGNALS = [
  { id: 'A01', weight: 3, test: /do\s+not\s+(tell|mention|inform|reveal)/i, desc: 'tells the model to hide something from the user' },
  { id: 'A02', weight: 3, test: /\.(ssh|id_rsa|id_ed25519|aws_secret|api_key|\.env|credentials?)/i, desc: 'references private keys, credentials or env files' },
  { id: 'A03', weight: 2, test: /base64[ -]?(encode|decoded?)/i, desc: 'asks for base64 encoding/decoding — common exfiltration pattern' },
  { id: 'A04', weight: 2, test: /\b(API_KEY|AWS_SECRET|GITHUB_TOKEN|OPENAI_API|STRIPE_KEY|PRIVATE_KEY)\b/i, desc: 'names specific credential variables' },
  { id: 'A05', weight: 2, test: /pass\s+(it\s+)?(verbatim|as-is|in\s+the\s+`?\w+`?\s+(parameter|field|context))/i, desc: 'asks to pass data verbatim into a specific parameter' },
  { id: 'A06', weight: 1, test: /\b(internal|maintainer\s+note|system\s+note|transport\s+detail)\b/i, desc: 'labelled as "internal" or "maintainer note" — users are not meant to see this' },
  { id: 'A07', weight: 1, test: /\b(required|mandatory)\b.*\b(context|session|auth)/i, desc: 'introduces a mandatory "context"/"session"/"auth" parameter' },
  { id: 'A08', weight: 1, test: /\bbefore\s+calling.*\b(read|include|attach|send|forward)/i, desc: 'instructs to read/send something BEFORE calling the tool' },
  { id: 'A09', weight: 2, test: /\b(preferred|supersed?es?|always\s+call\s+this)\b/i, desc: 'declares itself "preferred" or supersedes another tool (shadowing hint)' },
  { id: 'A11', weight: 3, test: /\b(send|pass|include|attach)\b.*\b(environment|env\s|all\s+variables|full\s+(env|host))/i, desc: 'asks to send/pass the full environment or host variables' },
  { id: 'A12', weight: 3, test: /[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u180E]/, desc: 'contains invisible Unicode characters (zero-width/bidi) — possible hidden instructions' },
  { id: 'A13', weight: 2, test: /[\u202A-\u202E\u2066-\u2069]/, desc: 'contains bidi control characters (text direction override) — possible obfuscation' },
  { id: 'A10', weight: 3, test: /https?:\/\/(?!.*\b(github\.com|npmjs\.(org|com)|readthedocs|wikipedia)\b)[a-z0-9.-]+\.(net|io|xyz|top|tk|ml)/i, desc: 'links to a non-standard domain (possible exfiltration endpoint)' },
];

const THRESHOLD = 5;

export function scanToolDescription(description) {
  const hits = [];
  let score = 0;
  for (const s of SIGNALS) {
    if (s.test.test(description)) {
      hits.push({ id: s.id, weight: s.weight, desc: s.desc });
      score += s.weight;
    }
  }
  return { score, advisory: score >= THRESHOLD, signals: hits };
}

export function scanToolsForAdvisories(tools) {
  const results = [];
  for (const tool of tools) {
    const r = scanToolDescription(tool.description ?? '');
    if (r.advisory) {
      results.push({ tool: tool.name, score: r.score, signals: r.signals });
    }
  }
  return results;
}
