# rugsnare pins x StillOS census - merged table (canonical)

The one merged table agreed in [snyk/agent-scan#482](https://github.com/snyk/agent-scan/issues/482):
our pin corpus joined against the StillOS census column, keyed **slug + version** on the package
axis (URL on the hosted axis). Census side: [stillmarcus24/mcp-census-server PR #3](https://github.com/stillmarcus24/mcp-census-server/pull/3)
(artifact `reconciliation/rugsnare-2026-10-22.json`, `stillos.reconciliation.v2`, plus the
`PARAMS_CHANGED` argument-level series offered 2026-10-28). Our side:
[registry-mapping.json](registry-mapping.json) (join keys) and [pins/](pins/) (per-version
snapshots). This file is the single owner of the merged view; the census doc links here.

Our columns: `pinned` = approved baseline, `findings@window` = graded drift-watch count at the
latest graded window (run 2026-10-25; corpus totals: 22-server registry set 352, full 28-server
manifest 514). Census columns as published (package axis = version-pair rows over their series;
hosted axis = anonymous-prober state).

## Mapped 11 (registry id present)

| slug | registry id | our pinned -> graded | our findings | census package axis | census hosted |
|---|---|---|---|---|---|
| chrome-devtools | io.github.ChromeDevTools/chrome-devtools-mcp | 1.8.0 -> 1.12.0 | 32 | 4 rows: 2 capability + 1 hash-only | NO_DECLARED_ENDPOINT |
| browserstack | io.github.browserstack/mcp-server | 1.4.1 -> 2.2.8 | 31 | 20 rows: 9 capability + 2 hash-only | NOT_UNDER_CLOCK |
| context7 | io.github.upstash/context7 | 4.0.4 -> 4.4.4 | 1 | 8 rows: 1 capability (4.1.3->4.2.0 auth env vars) | LIVE - 2 events, 0 silent |
| currents | io.github.pipeworx-io/currents | 2.3.3 -> 2.7.0 | 51 | not in series | TOOLS_DENIED |
| hostinger | io.github.hostinger/hostinger-api-mcp | 2.4.0 -> 3.10.3 | 40 | not in series | WAF |
| sentry | io.github.getsentry/sentry-mcp | 0.38.0 -> 0.42.0 | 3 | 3 rows: 1 capability (0.39->0.40) | WAF |
| sap-fiori | io.github.SAP/fiori-mcp-server | 1.13.0 -> 1.15.16 | 4 | 17 rows: 1 hash-only | NO_DECLARED_ENDPOINT |
| ui5 | io.github.UI5/mcp-server | 0.2.12 -> 0.3.2 | 0 | 4 rows: 2 capability + 1 bundle-noise | NO_DECLARED_ENDPOINT |
| mongodb | io.github.mongodb-js/mongodb-mcp-server | 2.1.2 -> 3.1.0 | 20 | 6 rows: 0 capability | NO_DECLARED_ENDPOINT |
| figma | io.github.GLips/Figma-Context-MCP | 0.7.0 -> 0.13.2 | 2 | 1 row: 0 changes | NO_DECLARED_ENDPOINT |
| firebase | io.github.firebase/firebase-mcp | 0.2.0 -> 0.4.4 | 0 | not in series | NO_DECLARED_ENDPOINT |

## Null 11 (no registry id - reason per row)

| slug | null reason | our pinned -> graded | our findings | census package axis |
|---|---|---|---|---|
| azure-devops | not found in registry search | 2.5.0 -> 2.11.0 | 119 (75 tools GONE, 29 NEW) | not in series - census has no series for it either; the strongest no-correlation row |
| supabase | no official entry | 0.8.3 -> 0.14.0 | 9 | 2 rows: 2 capability (0.12->0.13 +127.0.0.1, api.supabase.green, supabase.green) |
| hubspot | no official entry | 0.2.0 -> 0.4.0 | 6 | not in series |
| notion | no official @notionhq entry | 2.4.1 -> 2.5.2 | 1 | not in series |
| heroku | no official entry | 1.2.5 -> 1.2.12 | 1 | not in series |
| apify | different artifact (actors-mcp != apify-mcp) | 0.16.0 -> 0.19.3 | 4 | not in series |
| launchdarkly | uncertain provenance entry | 0.5.0 -> 0.7.1 | 1 | not in series |
| netlify | hosted namespace only | 1.14.0 -> 1.21.0 | 10 | not in series |
| bybit | not in registry | boot-gated (kill-switch; history-only) | - | not in series |
| shopify | no official entry | 1.14.4 -> 1.17.0 | 6 | not in series |
| transcend | not in registry | 2.1.2 -> 2.1.13 | 2 | not in series |

## Skills corpus (outside the census join)

superpowers 6.4.2 -> 7.0.1 (303 files pinned), vercel-labs/skills @ a80e4c9 (226 files pinned).

## The rows that carry the join

1. **context7** - census package series extends past our clean audit window (4.1.3->4.2.0 auth
   env vars); our drift-watch advanced to 4.4.4 with 1 finding. Columns agree, spans differ.
2. **supabase** - the window our scanner could not reach (entry-path break) is the window their
   series holds, three new hosts incl. a loopback. Ours-to-miss, theirs-to-see.
3. **sentry** - hosted both-miss (WAF x could-not-scan); package axes complement.
4. **azure-devops** - our largest row, no registry id, no census series: registry presence
   correlates with nothing, twice.

## Argument-level events (offered 2026-10-28, pending publication)

Census `PARAMS_CHANGED` series (3,185 events / 1,159 servers; 73.8% with server version
unmoved) will join this table by URL wherever a slug declares a hosted endpoint - small
intersection today (context7 LIVE; 6 of 11 mapped slugs declare no remote surface); the
reverse direction (our pins x their argument events on servers with both) is the active join.
