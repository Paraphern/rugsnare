import { scanToolDescription } from './advisory.js';

/**
 * Result inspection: scan MCP tool RESPONSES for injection indicators.
 * The agent reads tool results just like tool descriptions — a poisoned
 * response can inject instructions that the model obeys (GhostSplice class:
 * split the payload across a description and a result so no single message
 * looks malicious).
 *
 * This runs inside the live proxy on every server->client response.
 * Advisory-only: we LOG and ALERT, we don't block (the result already
 * arrived — blocking would hide legitimate data).
 */

const RESULT_SIGNALS = [
  { id: 'R01', weight: 3, test: /\b(ignore|disregard|override)\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier|system|initial)\s+(instructions?|prompt|rules?)/i, desc: 'response tries to override prior instructions' },
  { id: 'R02', weight: 3, test: /\b(you must|you should|always|never)\s+(now\s+)?(do|execute|run|send|transfer|delete|share|reveal|forward)/i, desc: 'response issues imperative commands to the agent' },
  { id: 'R03', weight: 3, test: /\.(ssh\/id_rsa|\.env|aws_secret|api_key|credentials?\.(json|yml|txt))/i, desc: 'response references credentials or private keys' },
  { id: 'R04', weight: 2, test: /\b(send|post|upload|exfiltrate|forward|transmit)\b.*\b(to|at|via)\s+(https?:\/\/|ftp|irc|telegram|discord)/i, desc: 'response instructs to send data to an external endpoint' },
  { id: 'R05', weight: 2, test: /\b(do not|don't|never)\s+(tell|show|reveal|inform|notify|mention|alert)\s+(the\s+)?(user|human|owner|admin)/i, desc: 'response tells the agent to hide from the user' },
  { id: 'R06', weight: 2, test: /\b(you are|act as|pretend to be|roleplay)\s+(now\s+)?(a|an|the)\s+(different|new|other)/i, desc: 'response tries to change the agent identity' },
  { id: 'R07', weight: 1, test: /\b(system\s+prompt|hidden\s+instruction|secret\s+directive|confidential\s+command)\b/i, desc: 'response claims to contain privileged instructions' },
  { id: 'R08', weight: 1, test: /[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u180E]/, desc: 'response contains invisible Unicode (possible hidden payload)' },
];

const RESULT_THRESHOLD = 3;

/**
 * Scan a tool response for injection indicators.
 * @param {string|object} result - the JSON-RPC result object
 * @param {{threshold?: number}} [opts] - score threshold (default 3; config `resultThreshold`)
 * @returns {{score, advisory, signals}} - advisory if score >= threshold or forced
 */
export function scanResult(result, { threshold = RESULT_THRESHOLD } = {}) {
  // extract text from common MCP result shapes
  let text = '';
  if (typeof result === 'string') {
    text = result;
  } else if (result && typeof result === 'object') {
    if (Array.isArray(result.content)) {
      text = result.content.map((c) => c.text ?? '').join(' ');
    } else if (typeof result.text === 'string') {
      text = result.text;
    } else {
      try { text = JSON.stringify(result); } catch { text = ''; }
    }
  }

  if (!text) return { score: 0, advisory: false, signals: [] };

  const hits = [];
  let score = 0;
  let forced = false;
  for (const s of RESULT_SIGNALS) {
    if (s.test.test(text)) {
      hits.push({ id: s.id, weight: s.weight, desc: s.desc });
      score += s.weight;
      if (s.id === 'R08') forced = true; // invisible unicode always forces
    }
  }
  return { score, advisory: score >= threshold || forced, signals: hits };
}

/**
 * Get a human-readable summary of result signals.
 */
export function resultSummary(signals) {
  return signals.map((s) => `${s.id}: ${s.desc}`).join('; ');
}
