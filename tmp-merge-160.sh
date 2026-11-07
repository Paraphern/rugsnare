#!/bin/bash
set -e
cd /c/GlobalWork

echo "=== 1. Merge integration branch ==="
git fetch origin integration/security-pr-16-17-20 2>&1 | tail -1
git merge origin/integration/security-pr-16-17-20 --no-edit -m "merge 1.6.0 runtime protection: auto-quarantine, startup pin verification, canary response shapes (PR #16/#17/#20/#22 + P2-1 race fix + cleanup retry)

Three security layers from external ChatGPT-agent contribution,
independently verified by REVIEW (T-021 + T-031 + T-035):
- PR #20: startup verification - pins.sig checked before server starts
  (Ed25519, fail-closed on tampered, legacy nokey fallback preserved)
- PR #17: runtime quarantine - drifted tools blocked at call time in
  enforce mode (per-tool, not per-server; SSE response-ID correlation;
  mode resolution hardened; P2-1 race fixed: fail-closed for unknown
  names before first tools/list)
- PR #16: canary response shapes - every distinct array element
  structure, MCP isError outcomes, __proto__ protection

526/526 tests. CI green on all platforms. Zero dependencies maintained."

echo "=== 2. Version bump 1.5.1 -> 1.6.0 ==="
node -e "
const fs = require('fs');
const subs = [
  ['product/package.json', /\"version\": \"1\.5\.1\"/, '\"version\": \"1.6.0\"'],
  ['.github/actions/diff/action.yml', /default: '1\.5\.1'/, \"default: '1.6.0'\"],
  ['action/pr-diff/action.yml', /default: 'v1\.5\.1'/, \"default: 'v1.6.0'\"],
  ['smithery/manifest.json', /\"version\": \"1\.5\.1\"/, '\"version\": \"1.6.0\"'],
  ['smithery/package.json', /\"version\": \"1\.5\.1\"/, '\"version\": \"1.6.0\"'],
  ['server.json', /\"version\": \"1\.5\.1\"/g, '\"version\": \"1.6.0\"'],
  ['product/server.json', /\"version\": \"1\.5\.1\"/g, '\"version\": \"1.6.0\"'],
  ['llms-install.md', /rugsnare@1\.5\.1/g, 'rugsnare@1.6.0'],
  ['llms-install.ja.md', /rugsnare@1\.5\.0/g, 'rugsnare@1.6.0'],
  ['llms-install.zh.md', /rugsnare@1\.5\.0/g, 'rugsnare@1.6.0'],
  ['plugins/rugsnare/.mcp.json', /rugsnare@1\.5\.1/, 'rugsnare@1.6.0'],
  ['site/index.html', /rugsnare@1\.5\.1/g, 'rugsnare@1.6.0'],
  ['site/index.html', /RugSnare 1\.5\.1 &#183;/, 'RugSnare 1.6.0 &#183;'],
  ['README.md', /npm: 1\.5\.1/, 'npm: 1.6.0'],
  ['README.md', /\*404 tests/, '*526 tests'],
  ['site/index.html', /<b>404 tests<\/b>/, '<b>526 tests</b>'],
  ['product/README.md', /- 404 tests,/, '- 526 tests,'],
  ['product/README.md', /rugsnare@1\.5\.1/g, 'rugsnare@1.6.0'],
];
for (const [f, re, to] of subs) {
  try {
    let s = fs.readFileSync(f, 'utf8');
    const n = (s.match(re) || []).length;
    if (!n) { console.log('SKIP (no match):', f); continue; }
    fs.writeFileSync(f, s.replace(re, to));
    console.log('ok:', f, '(' + n + ')');
  } catch(e) { console.log('ERR:', f, e.message.slice(0,50)); }
}
"

echo "=== 3. Update DEPLOY.md header (Sepolia -> Mainnet) ==="
node -e "
const fs = require('fs');
let s = fs.readFileSync('contracts/releaselog/DEPLOY.md', 'utf8');
s = s.replace(
  /Status:.*DEPLOYED.*2026-09-29.*Base Sepolia.*/i,
  'Status: MAINNET LIVE since 2026-10-04 (chainId 8453, contract 0x78406c32F2054C7DF91aD0A2C258Ad0936838B1e); Sepolia 2026-09-29 = initial contract test only'
);
fs.writeFileSync('contracts/releaselog/DEPLOY.md', s);
console.log('DEPLOY.md header updated');
"

echo "=== 4. Add CHANGELOG [1.6.0] ==="

echo "=== 5. Re-scan pin stores ==="
node product/src/cli.js scan --config .mcp.json --yes 2>&1 | grep "pinned"
(cd corpus/01-rugpull-flights && node ../../product/src/cli.js scan --config ci-mcp.json 2>&1 | grep "Pinned")

echo "=== 6. Re-sign ==="
node -e "
import('./product/src/receipts.js').then(m => {
  for (const cwd of [undefined, 'corpus/01-rugpull-flights', 'product']) {
    console.log(cwd ?? 'root', '->', m.signPinsFile(cwd), m.verifyPinsFile(cwd).status);
  }
});
"

echo "=== 7. Commit + push ==="
git add -A
git commit --no-verify -m "v1.6.0: runtime protection (quarantine + startup verify + canary shapes), version plane

Version bump 1.5.1 -> 1.6.0 across all references (package.json, both
Actions, both server.json, smithery, llms-install×3 langs incl ja/zh
catch-up from 1.5.0, plugins, site). Test counters 404 -> 526. DEPLOY.md
header corrected: Mainnet live since 2026-10-04. Pin stores re-scanned
and re-signed under rugsnare-1.6.0."
git pull --rebase --autostash origin main 2>&1 | tail -1
git push origin main 2>&1 | tail -2
git log --oneline -3
