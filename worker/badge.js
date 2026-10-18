// CI badge: `https://rugsnare.com/badge/:owner/:repo.svg`
//
// Fetches the repo's committed .rugsnare/pins.json and renders a
// shields.io-style SVG showing how many tools and skills are pinned.
// No server-side state — all information comes from the user's public
// repository. This is the viral loop: every repo with our badge is
// free advertising.

const BADGE_STYLES = {
  ok: { right: '#4c1', label: '' },       // green
  empty: { right: '#dfb317', label: '0 pinned' }, // yellow
  none: { right: '#9f9f9f', label: 'not pinned' }, // gray
  error: { right: '#e05d44', label: 'error' },     // red
};

function svg(left, right, rightColor) {
  const leftW = Math.max(60, left.length * 7 + 12);
  const rightW = Math.max(40, right.length * 7 + 12);
  const totalW = leftW + rightW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${left}: ${right}">
<defs><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#000"/></clipPath></defs>
<g clip-path="url(#r)"><rect width="${leftW}" height="20" fill="#555"/><rect x="${leftW}" width="${rightW}" height="20" fill="${rightColor}"/><rect width="${totalW}" height="20" fill="url(#s)"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${leftW / 2}" y="15">${left}</text>
<text x="${leftW + rightW / 2}" y="15">${right}</text>
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

export async function handleBadge(request) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/badge\/([^/]+)\/([^/]+)\.svg$/);
  if (!match) return badgeResponse(svg('rugsnare', 'invalid', '#e05d44'));

  const [, owner, repo] = match;

  // validate: alphanum + hyphens only (prevent SSRF via crafted paths)
  if (!/^[a-zA-Z0-9-_.]+$/.test(owner) || !/^[a-zA-Z0-9-_.]+$/.test(repo)) {
    return badgeResponse(svg('rugsnare', 'invalid', '#e05d44'));
  }

  try {
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/.rugsnare/pins.json`, {
      headers: { 'User-Agent': 'rugsnare-badge' },
    });
    if (!res.ok) {
      return badgeResponse(svg('rugsnare', BADGE_STYLES.none.label, BADGE_STYLES.none.right));
    }
    const pins = await res.json();

    let toolCount = 0;
    let skillCount = 0;
    if (pins.servers) {
      for (const sp of Object.values(pins.servers)) {
        toolCount += Object.keys(sp.tools ?? {}).length;
      }
    }
    if (pins.skills) skillCount = Object.keys(pins.skills).length;

    const total = toolCount + skillCount;
    if (total === 0) {
      return badgeResponse(svg('rugsnare', BADGE_STYLES.empty.label, BADGE_STYLES.empty.right));
    }

    // build label: "38 tools" / "12 skills" / "38 tools · 12 skills"
    const parts = [];
    if (toolCount > 0) parts.push(`${toolCount} tool${toolCount === 1 ? '' : 's'}`);
    if (skillCount > 0) parts.push(`${skillCount} skill${skillCount === 1 ? '' : 's'}`);
    return badgeResponse(svg('rugsnare', parts.join(' · '), BADGE_STYLES.ok.right));
  } catch (e) {
    return badgeResponse(svg('rugsnare', BADGE_STYLES.error.label, BADGE_STYLES.error.right));
  }
}
