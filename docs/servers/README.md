# Server records - public MCP contract drift pages

One page per watched MCP server: what changed between versions, verified with pinned contracts (sha-256 over name + description + inputSchema, canonicalized), direction-graded (BREAKING / LOOSENED / EXPANDED / NOTATION / NEW / GONE). Link these pages from issues and PRs as receipts.

Method: `rugsnare scan` the old version -> `rugsnare diff` after upgrade; per-version decomposition for adjacent-pair boundaries. Repro commands on every page. Refreshed weekly by the [drift watch](../../.github/workflows/weekly-drift-audit.yml); latest summary in [WEEKLY.md](../../audits/WEEKLY.md). Full audit: [npm-top-mcp-drift-2026-1113541234.md](../../audits/npm-top-mcp-drift-2026-10.md).

| server | installs/week | window | findings | verified | graded with | page |
|---|---|---|---|---|---|---|
| @azure-devops/mcp (Microsoft) | 120k | 2.5.0 -> 2.10.0 | 110 | 2026-10-13 | 1.3.0 | [azure-devops.md](azure-devops.md) |
| chrome-devtools-mcp (Chrome team) | 1.73M | 1.8.0 -> 1.10.1 | 30: 24 NOTATION ($schema dialect) + 5 BREAKING by the letter (zod ±2^53 integer-bounds artifacts, annotated as SDK artifacts) + 1 NEW | 2026-10-18 | 1.4.3 | [chrome-devtools.md](chrome-devtools.md) |
| @netlify/mcp (Netlify) | 43k | 1.6.0 -> 1.19.0 | 13: 100% tool turnover (3 GONE + 10 NEW, 3->10 tools); earlier window 1.14.0->1.18.0 = 58 | 2026-10-18 | 1.4.3 | [netlify.md](netlify.md) |
| mongodb-mcp-server (MongoDB) | 98k | 2.1.2 -> 3.0.5 | 20 in 3.0.0 (5 BREAKING + 15 notation on 1.3.0) | 2026-10-13 | 1.3.0 | [mongodb.md](mongodb.md) |
| @sentry/mcp-server (Sentry) | 100k | 0.38.0 -> 0.42.0 | 3 | 2026-10-13 | 1.3.0 | [sentry.md](sentry.md) |
| @launchdarkly/mcp-server | 32k | 0.5.0 -> 0.7.0 | 1 NEW tool, unannounced | 2026-10-13 | 1.3.0 | [launchdarkly.md](launchdarkly.md) |
| @currents/mcp | 103k | 2.3.3 -> 2.6.1 | 45 (32 BREAKING) | 2026-10-13 | 1.3.0 | [currents.md](currents.md) |
| hostinger-api-mcp | 265k | 2.4.0 -> 2.11.0 | 6 injected resources | 2026-10-13 | 1.3.0 | [hostinger.md](hostinger.md) |
| @upstash/context7-mcp | 486k | 4.0.4 -> 4.4.1 | 1 (EXPANDED) + live hosted catch (prose-only) | 2026-10-13 | 1.3.0 | [context7.md](context7.md) |
| bybit trading-mcp | - | 2.1.20 -> 2.1.23 | 9 + remote kill-switch | 2026-10-09 | 1.2.0 | [bybit.md](bybit.md) |
| browserstack/mcp-server | - | v1.4.1 -> v2.2.1 | 24 (re-grade +2 from recursive decomposer) | 2026-10-13 | 1.3.0 | [browserstack.md](browserstack.md) |
| @apify/actors-mcp-server | - | 0.16.0 -> 0.17.4 | 1 BREAKING | 2026-10-13 | 1.3.0 | [apify.md](apify.md) |
| @sap-ux/fiori-mcp-server (SAP) | 103k | 1.13.0 -> 1.15.9 | 4: 2 BREAKING (new required param) + 2 cosmetic | 2026-10-12 | 1.3.0 | [sap-fiori.md](sap-fiori.md) |
| @ui5/mcp-server (SAP) | 96k | 0.2.12 -> 0.3.2 | 0 (control) | 2026-10-12 | 1.3.0 | [ui5.md](ui5.md) |
| figma-developer-mcp | 91k | 0.7.0 -> 0.13.2 | 2 NOTATION | 2026-10-12 | 1.3.0 | [figma.md](figma.md) |
| @supabase/mcp-server-supabase | 67k | 0.8.3 -> 0.13.0 | 3: 2 COSMETIC + 1 NEW (query_logs) + stdio entry moved (corrected 10-17: get_logs NOT removed) | 2026-10-12 | 1.3.0 | [supabase.md](supabase.md) |
| @hubspot/mcp-server | 31k | 0.2.0 -> 0.4.0 | 6: GONE + 3 NEW + 1 EXPANDED + 1 cosmetic (npm alive, GitHub repo dead) | 2026-10-13 | 1.4.0 | [hubspot.md](hubspot.md) |
| @shopify/dev-mcp | 31k | 1.14.4 -> 1.16.0 | 6: 2 GONE -> NEW validate (consolidation) + LOOSENED | 2026-10-12 | 1.3.0 | [shopify.md](shopify.md) |
| @transcend-io/mcp-server-assessment | 11k | 2.1.2 -> 2.1.13 | 2 BREAKING (83 releases / 3 months) | 2026-10-12 | 1.3.0 | [transcend.md](transcend.md) |
| firebase-mcp (Google) | 74 | 0.2.0 -> 0.4.4 | 0 (control) | 2026-10-12 | 1.3.0 | [firebase.md](firebase.md) |
| @notionhq/notion-mcp-server (Notion) | 195k | 1.0.0 -> 2.5.2 | 27 (1 BREAKING, 4 LOOSENED, 3 GONE); recent window 2.4.1->2.5.2 = 0 (real control) | 2026-10-18 | 1.4.3 | [notion.md](notion.md) |
| @heroku/mcp-server (Heroku/Salesforce) | 11k | 1.2.5 -> 1.2.11 | 0 (control) | 2026-10-13 | 1.3.0 | [heroku.md](heroku.md) |
| obra/superpowers (skills collection) | 298k★ | 6.4.2 -> 7.0.0 | 6 (1 DANGEROUS) | 2026-10-12 | 1.3.0 | [superpowers.md](superpowers.md) |
| vercel-labs/skills (skills collection) | - | baseline 13e4063 (2026-10-12) | 226 files pinned, watching | 2026-10-12 | 1.3.0 | [vercel-skills.md](vercel-skills.md) |
| @modelcontextprotocol/server-filesystem (Anthropic reference) | 456k | 0.2.0 -> 2.0.0 | 14: 8 BREAKING + 5 NEW + 1 NOTATION (most-installed server we scanned) | 2026-10-18 | 1.4.3 | [filesystem.md](filesystem.md) |
| @modelcontextprotocol/server-everything (Anthropic reference) | 156k | 0.1.0 -> 2.0.0 | 43 (3 added by the 2026-10-19 2.0.0 release; 40 through 1.0.0): 23 NEW + 4 GONE tools + echo LOOSENED + prompts/resources churn | 2026-10-18 | 1.4.3 | [everything.md](everything.md) |
| @transcend-io/mcp-server-dsr (Transcend) | 84 versions | 0.2.0 -> 2.0.13 | 15: 7 BREAKING + 4 GONE (privacy/DSR surface) | 2026-10-18 | 1.4.3 | [dsr.md](dsr.md) |
| @iterable/mcp (Iterable) | 1.1k | 1.0.0 -> 1.9.0 | 4 BREAKING inside 1.x (semver violation) + experiments suite NEW | 2026-10-18 | 1.4.3 | [iterable.md](iterable.md) |
| @browserbasehq/mcp-server-browserbase | 1.6k | 2.0.0 -> 2.4.3 | 19: multi_* surface GONE (10) + stagehand_agent NEW + LOOSENED | 2026-10-18 | 1.4.3 | [browserbase.md](browserbase.md) |
| @executeautomation/playwright-mcp-server | 8.5k | 1.0.3 -> 1.0.12 | 10: 5 EXPANDED on HTTP tools + 4 NEW + 1 LOOSENED, all in patches | 2026-10-18 | 1.4.3 | [exec-playwright.md](exec-playwright.md) |

Column notes: **verified** = date the current window was last diffed; **graded with** = rugsnare version that produced the grades on that date. Full-corpus re-grade on rugsnare 1.3.0 completed 2026-10-13 (only bybit stays 1.2.0-era: boot-gated, scan impossible); the one count that moved is browserstack 22 -> 24. Batch of 2026-10-18 (rugsnare 1.4.3): six new servers scanned clean-stand (filesystem, everything, dsr, iterable, browserbase, exec-playwright) plus full-history windows for notion and netlify; notion's earlier "0 control" row is now paired with a 27-finding 1.0.0 -> 2.5.2 window - both results are real, different windows. Machine-readable pins for every graded window end: [audits/drift-watch/pins/](../../audits/drift-watch/pins/README.md) (stable slugs, opaque records per [PIN-SPEC §7](../../docs/PIN-SPEC.md)). Baselines for the 9 corpus additions captured 2026-10-12: [drift-watch report](../../audits/drift-watch/2026-10-12.md). Install counts: npm registry, week ending the audit date.
Superpowers and vercel-skills rows are skills records (GitHub, not npm installs).
