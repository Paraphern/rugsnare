# Server records - public MCP contract drift pages

One page per watched MCP server: what changed between versions, verified with pinned contracts (sha-256 over name + description + inputSchema, canonicalized), direction-graded (BREAKING / LOOSENED / EXPANDED / NOTATION / NEW / GONE). Link these pages from issues and PRs as receipts.

Method: `rugsnare scan` the old version -> `rugsnare diff` after upgrade; per-version decomposition for adjacent-pair boundaries. Repro commands on every page. Refreshed weekly by the [drift watch](../../.github/workflows/weekly-drift-audit.yml); latest summary in [WEEKLY.md](../../audits/WEEKLY.md). Full audit: [npm-top-mcp-drift-2026-10.md](../../audits/npm-top-mcp-drift-2026-10.md).

| server | installs/week | window | findings | page |
|---|---|---|---|---|
| @azure-devops/mcp (Microsoft) | 120k | 2.5.0 -> 2.10.0 | 110 | [azure-devops.md](azure-devops.md) |
| chrome-devtools-mcp (Chrome team) | 1.73M | 1.8.0 -> 1.10.1 | 30: 27 notation + 1 formal tightening (wait_for) + 1 NEW + 1 cosmetic | [chrome-devtools.md](chrome-devtools.md) |
| @netlify/mcp (Netlify) | 43k | 1.14.0 -> 1.18.0 | 58 (24 versions) | [netlify.md](netlify.md) |
| mongodb-mcp-server (MongoDB) | 98k | 2.1.2 -> 3.0.5 | 20 in 3.0.0 (13 notation + 7 real tightenings) | [mongodb.md](mongodb.md) |
| @sentry/mcp-server (Sentry) | 100k | 0.38.0 -> 0.42.0 | 3 | [sentry.md](sentry.md) |
| @launchdarkly/mcp-server | 32k | 0.5.0 -> 0.7.0 | 1 NEW tool, unannounced | [launchdarkly.md](launchdarkly.md) |
| @currents/mcp | 103k | 2.3.3 -> 2.6.1 | 45 | [currents.md](currents.md) |
| hostinger-api-mcp | 265k | 2.4.0 -> 2.11.0 | 6 injected resources | [hostinger.md](hostinger.md) |
| @upstash/context7-mcp | 486k | 4.0.4 -> 4.3.0 | 1 (EXPANDED) | [context7.md](context7.md) |
| bybit trading-mcp | - | 2.1.20 -> 2.1.23 | 9 + remote kill-switch | [bybit.md](bybit.md) |
| browserstack/mcp-server | - | v1.4.1 -> v2.2.1 | 22 | [browserstack.md](browserstack.md) |
| apify-mcp-server | - | 0.16.0 -> 0.17.4 | 1 BREAKING | [apify.md](apify.md) |
| @notionhq/notion-mcp-server (Notion) | 195k | 2.4.1 -> 2.5.2 | 0 (control) | [notion.md](notion.md) |
| @heroku/mcp-server (Heroku/Salesforce) | 11k | 1.2.5 -> 1.2.11 | 0 (control) | [heroku.md](heroku.md) |
| obra/superpowers (skills collection) | 298k★ | 6.4.2 -> 7.0.0 | 6 (1 DANGEROUS) | [superpowers.md](superpowers.md) |

Last full verification: 2026-10-11; key pages re-graded with rugsnare 1.3.0 on 2026-10-12 (recursive traversal + additionalProperties equivalence). Install counts: npm registry, week ending the audit date.
Superpowers row is a skills record (GitHub stars, not npm installs); verified 2026-10-12.
