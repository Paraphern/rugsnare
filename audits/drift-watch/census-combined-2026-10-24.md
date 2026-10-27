# Combined rugsnare × StillOS census table — 2026-10-24

> **Erratum 2026-10-26:** the shopify, currents and netlify columns of this table were computed
> against pin snapshots dirtied by the 2026-10-24 automation re-pin (stale tool entries carried
> from older installs), caught by the HISTOR field-level cross-check
> ([modelcontextprotocol#3431](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3431#issuecomment-6416860082)).
> All six snapshots re-pinned from clean stands the same day; corrected windows on the server
> pages: shopify 1.14.4->1.17.0 = 6 (composition corrected), currents 2.3.3->2.7.0 = 51
> (composition corrected), netlify 1.14.0->1.20.0 = 10. The StillOS columns are unaffected.

Combined view of the 22-slug drift-watch corpus: our columns (registry keys, published pin-corpus
findings) joined with the StillOS census column from
[stillmarcus24/mcp-census-server PR #3](https://github.com/stillmarcus24/mcp-census-server/pull/3)
(artifact `reconciliation/rugsnare-2026-10-22.json`, `schema: stillos.reconciliation.v2`,
measured 2026-10-22T19:40:08Z). Join key: MCP Registry id via our
[registry-mapping.json](registry-mapping.json); version axis (ours) × clock axis (theirs), as
agreed in [snyk/agent-scan#482](https://github.com/snyk/agent-scan/issues/482).

Our numbers: published drift-watch runs (2026-10-12 baseline, 2026-10-17, weekly 2026-10-19).
A 2026-10-24 re-run extends several windows (azure→119 @2.11.0, hostinger→40 @3.8.1,
browserstack→30 @2.2.7); the refreshed per-server table lands in [2026-10-24.md](2026-10-24.md).

## Mapped 11

| slug | registry id | our findings (window) | census package axis | census hosted state |
|---|---|---|---|---|
| chrome-devtools | io.github.ChromeDevTools/chrome-devtools-mcp | 32 (1.8.0→1.11.0) | 4 rows: 2 capability (incl. 1.11.0→1.12.0 +`internal.corp`, net_delta 44) + 1 hash-only | NO_DECLARED_ENDPOINT |
| browserstack | io.github.browserstack/mcp-server | 24 (1.4.1→2.2.3) | 20 rows: 9 capability (staging/preprod hosts in GA) + 2 hash-only | NOT_UNDER_CLOCK |
| context7 | io.github.upstash/context7 | 1 (4.0.4→4.4.4; audit window 4.0.4→4.1.3 was zero) | 8 rows: 1 capability (4.1.3→4.2.0, +MCP_AUTH_ENFORCEMENT, +MCP_OAUTH_TOKEN_VALIDATION) | LIVE · 2 events, 0 silent |
| currents | io.github.pipeworx-io/currents | 51 (2.3.3→2.7.0) | not in series | TOOLS_DENIED |
| hostinger | io.github.hostinger/hostinger-api-mcp | 39 (2.4.0→3.3.1) | not in series | WAF |
| sentry | io.github.getsentry/sentry-mcp | 0 (0.42.0 clean; audit: could-not-scan — startup timeout) | 3 rows: 1 capability (0.39.0→0.40.0, exec_delta 2) | WAF |
| sap-fiori | io.github.SAP/fiori-mcp-server | 4 (1.13.0→1.15.13) | 17 rows: 0 capability + 1 hash-only | NO_DECLARED_ENDPOINT |
| ui5 | io.github.UI5/mcp-server | 0 (control) | 4 rows: 2 capability + 1 bundle-noise (0.3.0→0.3.1, un-vendored dep) | NO_DECLARED_ENDPOINT |
| mongodb | io.github.mongodb-js/mongodb-mcp-server | 20 (2.1.2→3.1.0) | 6 rows: 0 capability | NO_DECLARED_ENDPOINT |
| figma | io.github.GLips/Figma-Context-MCP | 2 (0.7.0→0.13.2, notation-only across 17 releases) | 1 row: 0 changes | NO_DECLARED_ENDPOINT |
| firebase | io.github.firebase/firebase-mcp | 0 (control) | not in series | NO_DECLARED_ENDPOINT |

## Null 11 (no registry id — reason per row)

| slug | null reason | our findings (window) | census package axis |
|---|---|---|---|
| azure-devops | not found in registry search | 110 (2.5.0→2.10.0; 75 tools GONE, 29 NEW) | not in series |
| supabase | no official entry | could-not-scan (0.8.3 entry path ≠ 0.14.0) | 2 rows: 2 capability — 0.12.0→0.13.0 +127.0.0.1, api.supabase.green, supabase.green; 0.13.0→0.14.0 |
| hubspot | no official entry | 6 (0.2.0→0.4.0; npm ships releases while the GitHub repo is dead) | not in series |
| notion | no official @notionhq entry | 1 (2.4.1→2.5.2) | not in series |
| heroku | no official entry | 1 (1.2.5→1.2.12; the control lost its zero) | not in series |
| apify | different artifact (actors-mcp ≠ apify-mcp) | 1 (0.16.0→0.18.4) | not in series |
| launchdarkly | uncertain provenance entry | 0 (0.7.0 clean) | not in series |
| netlify | hosted namespace only | 9 (1.14.0→1.19.0) | not in series |
| bybit | not in registry | boot-gated (remote kill-switch at boot; never scanned, history-only) | not in series |
| shopify | no official entry | 6 (1.14.4→1.17.0) | not in series |
| transcend | not in registry | 2 (2.1.2→2.1.13; BREAKING on both assessment tools) | not in series |

## The four rows that carry the join

1. **context7 4.1.3→4.2.0** — the census package series extends past our clean audit window and catches two auth-enforcement env vars; our drift-watch has since advanced to 4.4.4 with 1 finding. The columns agree and cover different spans.
2. **supabase** — the exact window our scanner couldn't reach (entry-path break) is the window their series holds, with three new hosts including a loopback. Ours-to-miss, theirs-to-see.
3. **sentry** — hosted-axis both-miss stands (WAF × could-not-scan); package axes complement: our weekly 0.42.0 clean vs their historical 0.39.0→0.40.0 exec_delta 2.
4. **azure-devops** — our largest finding row has no registry id at all. Registry absence correlates with nothing.
