// CI badge: `https://rugsnare.com/badge/:owner/:repo.svg`
//
// Fetches the repo's committed .rugsnare/pins.json (+ pins.sig and
// pins.pub.pem when present) and renders a shields.io-style SVG.
// No server-side state - all information comes from the user's public
// repository. This is the viral loop: every repo with our badge is
// free advertising.
//
// States (trust, not just coverage):
//   green   signed · N tools · M skills ... - the worker VERIFIED the
//           Ed25519 signature over the exact pins.json bytes (fallback:
//           key-fingerprint match when the runtime lacks Ed25519)
//   yellow  unsigned · N tools ...          - pinned, but no pins.sig:
//           the CI-attacker defense is absent
//   gray    not pinned                      - no pins.json on main
//   red     error                           - fetch/parse failed

const BADGE_STYLES = {
  signed: { right: '#4c1' },
  unsigned: { right: '#dfb317' },
  empty: { right: '#dfb317', label: '0 pinned' },
  none: { right: '#9f9f9f', label: 'not pinned' },
  invalid: { right: '#e05d44', label: 'invalid' },
  error: { right: '#e05d44', label: 'error' },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function svg(left, right, rightColor) {
  const leftW = Math.max(60, left.length * 7 + 12);
  const rightW = Math.max(40, right.length * 7 + 12);
  const totalW = leftW + rightW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${esc(left)}: ${esc(right)}"><title>${esc(left)}: ${esc(right)}</title>
<defs><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#000"/></clipPath></defs>
<g clip-path="url(#r)"><rect width="${leftW}" height="20" fill="#555"/><rect x="${leftW}" width="${rightW}" height="20" fill="${rightColor}"/><rect width="${totalW}" height="20" fill="url(#s)"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${leftW / 2}" y="15">${esc(left)}</text>
<text x="${leftW + rightW / 2}" y="15">${esc(right)}</text>
</g>
</svg>`;
}

function badgeResponse(body) {
  return new Response(body, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300', // 5 min: pins change rarely
    },
  });
}

function hexToBytes(hex) {
  const clean = hex.replace(/^0x/, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function pemToDer(pem) {
  const b64 = pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der;
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Full verification when possible, honest fallback otherwise.
 * The signed message is the sha256 digest of the exact pins.json bytes
 * (same construction as receipts.signPinsFile in the CLI).
 * Returns one of: 'verified' | 'fingerprint-matched' | 'signature-invalid' | 'unsigned'.
 */
async function signatureState(pinsBytes, sigRes, pubRes) {
  if (!sigRes || !sigRes.ok || !pubRes || !pubRes.ok) return 'unsigned';
  try {
    const [sigText, pubPem] = await Promise.all([sigRes.text(), pubRes.text()]);
    const sig = JSON.parse(sigText);
    if (sig?.algo !== 'sha256+ed25519' || typeof sig.sig !== 'string') return 'signature-invalid';
    const der = pemToDer(pubPem);
    // receipts.keyFingerprint = sha256 over the SPKI DER - checkable everywhere
    const fingerprint = await sha256Hex(der);
    if (sig.keyFingerprint && sig.keyFingerprint !== fingerprint) return 'signature-invalid';
    try {
      // Ed25519 raw public key = last 32 bytes of the SPKI
      const key = await crypto.subtle.importKey('raw', der.slice(-32), { name: 'Ed25519' }, false, ['verify']);
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', pinsBytes));
      const ok = await crypto.subtle.verify('Ed25519', key, hexToBytes(sig.sig), digest);
      return ok ? 'verified' : 'signature-invalid';
    } catch {
      // runtime without Ed25519 in WebCrypto: the fingerprint already tied
      // pins.sig to this committed pins.pub.pem - report the weaker claim
      return 'fingerprint-matched';
    }
  } catch {
    return 'signature-invalid';
  }
}

export async function handleBadge(request) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/badge\/([^/]+)\/([^/]+)\.svg$/);
  if (!match) return badgeResponse(svg('rugsnare', BADGE_STYLES.invalid.label, BADGE_STYLES.invalid.right));

  const [, owner, repo] = match;

  // validate: alphanum + hyphens only (prevent SSRF via crafted paths)
  if (!/^[a-zA-Z0-9-_.]+$/.test(owner) || !/^[a-zA-Z0-9-_.]+$/.test(repo)) {
    return badgeResponse(svg('rugsnare', BADGE_STYLES.invalid.label, BADGE_STYLES.invalid.right));
  }

  const base = `https://raw.githubusercontent.com/${owner}/${repo}/main/.rugsnare`;
  try {
    // one round trip: pins + signature material; 404 on sig/pub is the
    // common "unsigned" case, not an error
    const [pinsRes, sigRes, pubRes] = await Promise.all([
      fetch(`${base}/pins.json`, { headers: { 'User-Agent': 'rugsnare-badge' } }),
      fetch(`${base}/pins.sig`, { headers: { 'User-Agent': 'rugsnare-badge' } }).catch(() => null),
      fetch(`${base}/pins.pub.pem`, { headers: { 'User-Agent': 'rugsnare-badge' } }).catch(() => null),
    ]);
    if (!pinsRes.ok) {
      return badgeResponse(svg('rugsnare', BADGE_STYLES.none.label, BADGE_STYLES.none.right));
    }
    // byte-exact: verify against the exact bytes the repo serves, not a
    // UTF-8 round-trip of them
    const pinsBuf = new Uint8Array(await pinsRes.arrayBuffer());
    const pins = JSON.parse(new TextDecoder().decode(pinsBuf));

    let toolCount = 0;
    let skillCount = 0;
    let promptCount = 0;
    let resourceCount = 0;
    if (pins.servers) {
      for (const sp of Object.values(pins.servers)) {
        toolCount += Object.keys(sp.tools ?? {}).length;
        promptCount += Object.keys(sp.prompts ?? {}).length;
        resourceCount += Object.keys(sp.resources ?? {}).length;
      }
    }
    if (pins.skills) skillCount = Object.keys(pins.skills).length;

    const total = toolCount + skillCount + promptCount + resourceCount;
    if (total === 0) {
      return badgeResponse(svg('rugsnare', BADGE_STYLES.empty.label, BADGE_STYLES.empty.right));
    }

    // build label: "38 tools · 12 skills · 4 prompts · 2 resources"
    const parts = [];
    if (toolCount > 0) parts.push(`${toolCount} tool${toolCount === 1 ? '' : 's'}`);
    if (skillCount > 0) parts.push(`${skillCount} skill${skillCount === 1 ? '' : 's'}`);
    if (promptCount > 0) parts.push(`${promptCount} prompt${promptCount === 1 ? '' : 's'}`);
    if (resourceCount > 0) parts.push(`${resourceCount} resource${resourceCount === 1 ? '' : 's'}`);

    const sigState = await signatureState(pinsBuf, sigRes, pubRes);
    if (sigState === 'signature-invalid') {
      // pins.json does not match its own committed signature - the exact
      // attack the signatures exist for. Red, with the count as evidence.
      return badgeResponse(svg('rugsnare', `SIG BROKEN · ${parts.join(' · ')}`, BADGE_STYLES.error.right));
    }
    const signed = sigState === 'verified';
    const prefix = signed ? 'signed · ' : sigState === 'fingerprint-matched' ? 'signed(fp) · ' : 'unsigned · ';
    return badgeResponse(svg('rugsnare', prefix + parts.join(' · '), signed ? BADGE_STYLES.signed.right : BADGE_STYLES.unsigned.right));
  } catch (e) {
    return badgeResponse(svg('rugsnare', BADGE_STYLES.error.label, BADGE_STYLES.error.right));
  }
}
