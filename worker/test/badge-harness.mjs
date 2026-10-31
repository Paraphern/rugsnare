// Local harness for worker/badge.js - same WebCrypto API surface as workerd.
// Tests: our repo (signed), a no-pins repo (gray), tamper simulation (red).
import { handleBadge } from '../badge.js';

async function render(path) {
  const res = await handleBadge(new Request(`https://rugsnare.com${path}`));
  const svg = await res.text();
  const label = svg.match(/aria-label="rugsnare: ([^"]*)"/)?.[1] ?? svg.match(/>([a-z][^<]*)<\/text>/g)?.pop() ?? '?';
  return { status: res.status, ct: res.headers.get('content-type'), label, svg: svg.slice(0, 80) };
}

console.log('1. our repo (expect: signed · N tools …):', JSON.stringify(await render('/badge/Paraphern/rugsnare.svg')));
console.log('2. repo without pins (expect: not pinned):', JSON.stringify(await render('/badge/Paraphern/rugsnare-internal.svg')));
console.log('3. nonexistent repo (expect: not pinned):', JSON.stringify(await render('/badge/nosuchorg99/nosuchrepo42.svg')));
console.log('4. invalid path chars (expect: invalid):', JSON.stringify(await render('/badge/a%2Fb/c.svg')));

// 5-7: fixture cases with a stubbed fetch (no network)
const realFetch = globalThis.fetch;
const PINS = JSON.stringify({ version: 1, servers: { s: { tools: { a: { hash: 'x' }, b: { hash: 'y' } }, prompts: { p1: {} }, resources: { r1: {} } } }, skills: { 'SKILL.md': {} } });
const { generateKeyPairSync, sign, createHash } = await import('node:crypto');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const digest = createHash('sha256').update(PINS).digest();
const SIG = JSON.stringify({ algo: 'sha256+ed25519', hash: digest.toString('hex'), sig: sign(null, digest, privateKey).toString('hex'), keyFingerprint: createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex'), signedAt: '2026-10-19T00:00:00Z' });
const PUB = publicKey.export({ type: 'spki', format: 'pem' }).toString();

function stub(pinsBody) {
  globalThis.fetch = (u) => {
    const url = String(u);
    const file = url.endsWith('pins.json') ? pinsBody : url.endsWith('pins.sig') ? SIG : url.endsWith('pins.pub.pem') ? PUB : null;
    return Promise.resolve(new Response(file ?? 'nf', { status: file ? 200 : 404 }));
  };
}
try {
  stub(PINS);
  console.log('5. fixture signed + prompts/resources/skills (expect: signed · 2 tools · 1 skill · 1 prompt · 1 resource):', JSON.stringify(await render('/badge/x/y.svg')));
  stub(PINS + ' '); // one byte appended after signing
  console.log('6. fixture tampered pins.json (expect: SIG BROKEN · …):', JSON.stringify(await render('/badge/x/y.svg')));
  stub(PINS.replace('version', 'VERSION')); // content edit, same length class
  console.log('7. fixture edited pins.json (expect: SIG BROKEN · …):', JSON.stringify(await render('/badge/x/y.svg')));

  // 8-13: status-branch fixtures (stubbed fetch, no network)
  const STATUS_VERIFIED = JSON.stringify({
    verdict: 'clean', findings: 0, config: '.mcp.json',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    runId: '123', repo: 'x/y', branch: 'main', summary: 'Contracts clean'
  });
  const STATUS_DRIFT = JSON.stringify({
    verdict: 'drift', findings: 3, config: '.mcp.json',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    runId: '124', repo: 'x/y', branch: 'main', summary: 'DRIFT DETECTED'
  });
  const STATUS_ERROR = JSON.stringify({
    verdict: 'error', findings: 0, config: '.mcp.json',
    timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    runId: '125', repo: 'x/y', branch: 'main', summary: 'Check failed'
  });
  const STATUS_BAD_JSON = '{"verdict": broken';
  const STATUS_NO_VERDICT = JSON.stringify({ findings: 0 });

  function stubWithStatus(pinsBody, statusBody) {
    globalThis.fetch = (u) => {
      const url = String(u);
      if (url.includes('/rugsnare/status/status.json')) {
        if (statusBody === null) return Promise.resolve(new Response('nf', { status: 404 }));
        return Promise.resolve(new Response(statusBody, { status: 200 }));
      }
      const file = url.endsWith('pins.json') ? pinsBody : url.endsWith('pins.sig') ? SIG : url.endsWith('pins.pub.pem') ? PUB : null;
      return Promise.resolve(new Response(file ?? 'nf', { status: file ? 200 : 404 }));
    };
  }

  stubWithStatus(PINS, STATUS_VERIFIED);
  console.log('8. status=clean 2h ago (expect: verified · 2 tools · 1 skill · 1 prompt · 1 resource · 2h):', JSON.stringify(await render('/badge/x/y.svg')));
  stubWithStatus(PINS, STATUS_DRIFT);
  console.log('9. status=drift 3 findings 45m ago (expect: DRIFT · 3 finding(s) · 45m):', JSON.stringify(await render('/badge/x/y.svg')));
  stubWithStatus(PINS, STATUS_ERROR);
  console.log('10. status=error 5d ago (expect: check error · 5d):', JSON.stringify(await render('/badge/x/y.svg')));
  stubWithStatus(PINS, STATUS_BAD_JSON);
  console.log('11. status broken JSON (expect: fallthrough to signed · …):', JSON.stringify(await render('/badge/x/y.svg')));
  stubWithStatus(PINS, STATUS_NO_VERDICT);
  console.log('12. status no verdict field (expect: fallthrough to signed · …):', JSON.stringify(await render('/badge/x/y.svg')));
  stubWithStatus(PINS, null);
  console.log('13. no status branch (expect: fallthrough to signed · …):', JSON.stringify(await render('/badge/x/y.svg')));

  // 14-16: humanizeAge edge cases
  const { humanizeAge } = await import('../badge.js');
  console.log('14. humanizeAge(now):', humanizeAge(new Date().toISOString()), '(expect: now)');
  console.log('15. humanizeAge(3d ago):', humanizeAge(new Date(Date.now() - 3 * 86400000).toISOString()), '(expect: 3d)');
  console.log('16. humanizeAge(45d ago):', humanizeAge(new Date(Date.now() - 45 * 86400000).toISOString()), '(expect: >1mo)');
} finally {
  globalThis.fetch = realFetch;
}

