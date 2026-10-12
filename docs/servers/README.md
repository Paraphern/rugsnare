# Server records - public MCP contract drift pages

One page per watched MCP server: what changed between versions, verified with pinned contracts (sha-256 over name + description + inputSchema, canonicalized), direction-graded (BREAKING / LOOSENED / EXPANDED / NOTATION / NEW / GONE). Link these pages from issues and PRs as receipts.

Method: `rugsnare scan` the old version -> `rugsnare diff` after upgrade; per-version decomposition for adjacent-pair boundaries. Repro commands on every page. Refreshed weekly by the [drift watch](../../.github/workflows/weekly-drift-audit.yml); latest summary in [WEEKLY.md](../../audits/WEEKLY.md). Full audit: [npm-top-mcp-drift-2026-10.md](../../audits/npm-top-mcp-drift-2026-10.md).

| server | installs/week | window | findings | verified | graded with | page |
|---|---|---|---|---|---|---|
| @azure-devops/mcp (Microsoft) | 120k | 2.5.0 -> 2.10.0 | 110 | 2026-10-11 | 1.2.0 | [azure-devops.md](azure-devops.md) |
| chrome-devtools-mcp (Chrome team) | 1.73M | 1.8.0 -> 1.10.1 | 30: 27 notation + 1 formal tightening (wait_for) + 1 NEW + 1 cosmetic | 2026-10-12 | 1.3.0 | [chrome-devtools.md](chrome-devtools.md) |
| @netlify/mcp (Netlify) | 43k | 1.14.0 -> 1.18.0 | 58 (24 versions) | 2026-10-12 | 1.3.0 | [netlify.md](netlify.md) |
| mongodb-mcp-server (MongoDB) | 98k | 2.1.2 -> 3.0.5 | 20 in 3.0.0 (13 notation + 7 real tightenings) | 2026-10-12 | 1.3.0 | [mongodb.md](mongodb.md) |
| @sentry/mcp-server (Sentry) | 100k | 0.38.0 -> 0.42.0 | 3 | 2026-10-11 | 1.2.0 | [sentry.md](sentry.md) |
| @launchdarkly/mcp-server | 32k | 0.5.0 -> 0.7.0 | 1 NEW tool, unannounced | 2026-10-12 | 1.3.0 | [launchdarkly.md](launchdarkly.md) |
| @currents/mcp | 103k | 2.3.3 -> 2.6.1 | 45 | 2026-10-12 | 1.2.0 | [currents.md](currents.md) |
| hostinger-api-mcp | 265k | 2.4.0 -> 2.11.0 | 6 injected resources | 2026-10-12 | 1.3.0 | [hostinger.md](hostinger.md) |
| @upstash/context7-mcp | 486k | 4.0.4 -> 4.3.0 | 1 (EXPANDED) | 2026-10-11 | 1.2.0 | [context7.md](context7.md) |
| bybit trading-mcp | - | 2.1.20 -> 2.1.23 | 9 + remote kill-switch | 2026-10-09 | 1.2.0 | [bybit.md](bybit.md) |
| browserstack/mcp-server | - | v1.4.1 -> v2.2.1 | 22 | 2026-10-10 | 1.2.0 | [browserstack.md](browserstack.md) |
| apify-mcp-server | - | 0.16.0 -> 0.17.4 | 1 BREAKING | 2026-10-10 | 1.2.0 | [apify.md](apify.md) |
| @sap-ux/fiori-mcp-server (SAP) | 103k | 1.13.0 -> 1.15.9 | 4: 2 BREAKING (new required param) + 2 cosmetic | 2026-10-12 | 1.3.0 | [sap-fiori.md](sap-fiori.md) |
| @ui5/mcp-server (SAP) | 96k | 0.2.12 -> 0.3.2 | 0 (control) | 2026-10-12 | 1.3.0 | [ui5.md](ui5.md) |
| figma-developer-mcp | 91k | 0.7.0 -> 0.13.2 | 2 NOTATION | 2026-10-12 | 1.3.0 | [figma.md](figma.md) |
| @supabase/mcp-server-supabase | 67k | 0.8.3 -> 0.13.0 | 4 + GONE get_logs -> NEW query_logs + stdio entry moved | 2026-10-12 | 1.3.0 | [supabase.md](supabase.md) |
| @hubspot/mcp-server | 31k | 0.2.0 -> 0.4.0 | 6: GONE + 3 NEW + 1 drift + 1 cosmetic (npm alive, GitHub repo dead) | 2026-10-12 | 1.3.0 | [hubspot.md](hubspot.md) |
| @shopify/dev-mcp | 31k | 1.14.4 -> 1.16.0 | 6: 2 GONE -> NEW validate (consolidation) + LOOSENED | 2026-10-12 | 1.3.0 | [shopify.md](shopify.md) |
| @transcend-io/mcp-server-assessment | 11k | 2.1.2 -> 2.1.13 | 2 BREAKING (83 releases / 3 months) | 2026-10-12 | 1.3.0 | [transcend.md](transcend.md) |
| firebase-mcp (Google) | 74 | 0.2.0 -> 0.4.4 | 0 (control) | 2026-10-12 | 1.3.0 | [firebase.md](firebase.md) |
| @notionhq/notion-mcp-server (Notion) | 195k | 2.4.1 -> 2.5.2 | 0 (control) | 2026-10-11 | 1.2.0 | [notion.md](notion.md) |
| @heroku/mcp-server (Heroku/Salesforce) | 11k | 1.2.5 -> 1.2.11 | 0 (control) | 2026-10-11 | 1.2.0 | [heroku.md](heroku.md) |
| obra/superpowers (skills collection) | 298k★ | 6.4.2 -> 7.0.0 | 6 (1 DANGEROUS) | 2026-10-12 | 1.3.0 | [superpowers.md](superpowers.md) |
| vercel-labs/skills (skills collection) | - | baseline 13e4063 (2026-10-12) | 226 files pinned, watching | 2026-10-12 | 1.3.0 | [vercel-skills.md](vercel-skills.md) |

Column notes: **verified** = date the current window was last diffed; **graded with** = rugsnare version that produced the grades on that date. Rows still graded with 1.2.0 are queued for a 1.3.0 re-grade sweep - the 1.3.0 recursive decomposer reclassifies nested constraint changes (it moved MongoDB from "4 BREAKING + 16 NOTATION" to "5 + 15"), so 1.2.0-era class splits are provisional. Baselines for the 9 corpus additions captured 2026-10-12: [drift-watch report](../../audits/drift-watch/2026-10-12.md). Install counts: npm registry, week ending the audit date.
Superpowers and vercel-skills rows are skills records (GitHub, not npm installs).
