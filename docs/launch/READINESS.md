# Launch readiness — checked 2026-11-06

**Recommendation: HOLD the promotional launch. No launch date is justified yet.**
This is a preparation record for [Issue #19](https://github.com/Paraphern/rugsnare/issues/19), not a release or permission to publish. No remote MCP implementation was downloaded or executed. Security work in Draft PRs [#16](https://github.com/Paraphern/rugsnare/pull/16), [#17](https://github.com/Paraphern/rugsnare/pull/17), and [#20](https://github.com/Paraphern/rugsnare/pull/20) is not part of the verified npm artifact.

## Release matrix

| Gate | Status | Evidence and limit |
|---|---|---|
| npm latest | PASS | [Registry metadata](https://registry.npmjs.org/rugsnare): latest=1.5.0, published 2026-10-19T06:56:31.692Z; 1.5.1 absent at this check. |
| GitHub latest published release | PASS | [v1.5.0](https://github.com/Paraphern/rugsnare/releases/tag/v1.5.0), published 2026-10-19T06:52:26Z. Assets are native launchers/checksums, not an npm tarball. |
| Source/package/changelog publication story | FAIL | Source `product/package.json` says 1.5.1; README/website previously advertised npm 1.5.1. Source version and changelog do not establish publication. Local tag list contains v1.5.0, not v1.5.1. No npm gitHead is supplied in the observed manifest. |
| Artifact integrity and source | PASS | npm SRI SHA512 matched downloaded tarball. All 39 installed src files byte-match product/src at tag v1.5.0. This is source correspondence, not an independently authenticated publisher/provenance or on-chain verification. |
| Install and version | PASS | Local install with lifecycle scripts disabled; both `--version` and `version` return `rugsnare 1.5.0`, exit0. No runtime npm dependencies declared. |
| Local fixture scan/diff | PASS | Published1.5.0: scan0, unchanged diff0, description drift1 (COSMETIC), invalid config2, exited fixture3. See [demo](demo.py) and [commands](#reproduce). Tool effects are inert local files/stdin/stdout only. |
| Demo under60 seconds | PASS | 0.636 seconds observed for six checks, excluding download/install. One Linux/Node run is not a cross-platform timing guarantee. |
| Live site and badge responses | UNKNOWN | GET https://rugsnare.com returned HTTP403 in this environment. Source HTML reviewed; live deployment, badge contents and browser layout not independently confirmed. No deployment attempted. |
| On-chain current release verification | UNKNOWN | Not performed here. Links/claims alone are insufficient to label this artifact cryptographically verified on-chain. |
| Security Draft fixes shipped | FAIL | #16/#17/#20 are proposed changes, not part of the tested artifact. Draft-branch test totals must not be advertised as published-package validation. |
| New campaign clearance | UNKNOWN | Existing launch notes report two prior Show HN submissions. Owner must check eligibility and current community rules before another submission. Nothing posted or sent. |

## Reproduce

Checked on Linux, Node v24.22.1, npm11.9.0. Python3 orchestrates only the local demo; the npm CLI itself requires Node>=18. Windows and Node18/20/22 artifact demo runs remain unverified.

```bash
# From the repository root; choose an otherwise empty workspace.
npm install --prefix ./launch-install --ignore-scripts --no-audit --no-fund rugsnare@1.5.0
node ./launch-install/node_modules/rugsnare/src/cli.js --version
python3 docs/launch/demo.py --cli ./launch-install/node_modules/rugsnare/src/cli.js --evidence ./launch-evidence.json
```

Install used the same flags with absolute `/workspace/launch-verification/install` and an isolated npm cache. No lifecycle scripts ran. The demo creates a unique temporary directory and removes only that directory. It never discovers the operator's MCP configurations or requires live credentials.

Observed SRI:

```
sha512-0FB1yG36uJnGnCaUXtvSHWZZQano1HOnY32bW3lB9KAx2PDanCkL40/ktZIL3g0sAm8Ldpyq/2jYoz/8G30xIw==
```

Expected checkpoints: version0; scan0; unchanged0; changed description1 with `DRIFT ... (COSMETIC)` and WAS/NOW text; missing config2; unavailable local fixture3. The published CLI prints `clean (+1 infra error(s))` for the last case: **exit3 means the check failed, not that the server is safe**. Exact captured commands/output are in [demo-evidence.json](demo-evidence.json); absolute temporary paths in that historical run have been removed by cleanup.

## Claims and denominators

| Claim | Evidence / safe wording |
|---|---|
| 218 findings | [Historical report](../../audits/npm-top-mcp-drift-2026-10.md), dated 2026-10-07, rugsnare1.0.1, six reported windows:110+30+6+45+23+4=218. This is a reported historical total, not a fresh measurement, user count, attack count, or all-breaking result. Later corrections in per-server pages matter. |
| 294 findings | [Weekly report](../../audits/WEEKLY.md), dated2026-11-02: nine baseline-to-latest comparisons,32+119+51+41+1+33+1+0+16=294. Different windows/cohort from218; not additional unique incidents. |
| 140 findings /66 pairs | [Separate reference-server study](../../repro/SILENT-CHANGES-REPORT.md): four official servers,66 pairs,43 clean/23 with findings. Do not combine denominators with the npm-top or weekly study. Not independently rerun for this launch check. |
| HISTOR remote rate | [Author correction, 2026-11-02](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3431#issuecomment-6585777647):2,489/6,822 unique hosts≈36.5%. Original4,926/10,929≈45% counts registry entries, including2,341 near-identical entries from one publisher changing together. Window24Sep–20Oct2026. |
| HISTOR package rate | [Author's original analysis](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3431#issuecomment-6307856009):1,419/21,738≈6.5%; correction says package figures unaffected. These are cited source-author results, not our reanalysis of raw records. |
| Malicious versus breaking | Contract differences include notation/prose/annotation/new/removed/schema changes. A finding does not establish malicious intent; a contract pin does not detect arbitrary malicious semantics or unchanged behavior. |
| Telemetry | No usage telemetry is claimed by the project. Remote MCP calls, package/registry lookup and explicitly configured alert webhooks are network operations. Do not promise that nothing ever leaves the machine or infer unique CLI users from downloads. |

Vendor corrections: Chrome's28-schema wave was regraded as notation rather than28 breaking parameter changes; [Currents](../servers/currents.md), [Shopify](../servers/shopify.md), and [Netlify](../servers/netlify.md) pages document clean-stand corrections. Launch copy must link corrected records and avoid attributing intent.

## Inventory and owner gates

Reuse rather than repost: existing [launch anchors](../../tools/launch-anchor-drafts-2026-10-25.md), [community draft](../../content/reddit-r-mcp-launch-v2.md), [X thread](../../content/x-thread-launch.md), and [interaction log](../../tools/github-interactions-log.md). The anchor notes report earlier Show HN IDs49945978/50127659; the interaction log records prior1MCP contact. New assets below are revisions for review, not a new posting queue.

Before launch, the owner must choose the release version, reconcile npm/tag/source/site/changelog, decide which reviewed security changes belong in that release, obtain current CI/artifact verification, validate the live site/on-chain claims, and approve individual publication/outreach. This PR does not authorize any of those external actions. See [drafts](LAUNCH-DRAFTS.md) and [30-day checklist](30-DAY-CHECKLIST.md).
