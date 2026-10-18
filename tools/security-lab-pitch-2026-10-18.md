# GitHub Security Lab Pitch (переписан 2026-10-18, все URL проверены)

## Куда

GitHub Security Lab: https://github.com/github/securitylab
Форма контакта или issue в их репо.

## Subject

[Guest Post Pitch] MCP Contract Drift: A New Supply Chain Vector for AI Agents

## Pitch email

Hi GitHub Security Lab team,

I'd like to propose a guest post about a supply chain risk we've been researching in the Model Context Protocol (MCP) ecosystem.

**The finding:** When npm packages expose tools to AI agents via MCP, the tool definitions (name, description, inputSchema) form the instructions the agent follows. These definitions change silently between releases. We pinned and diffed 24 popular MCP servers (3.6M combined weekly npm installs) over two months and found 336 silent contract changes. None trigger dependency alerts because the package version changes but the tool surface changes invisibly.

**Why it matters for GitHub's ecosystem:** MCP servers are npm packages. Dependabot alerts on version changes, not on contract changes within the same major version. A "safe" upgrade from 1.15.0 to 1.16.0 can rewrite every tool description an agent reads, remove tools the agent calls, or tighten schemas that invalidate previously-valid calls.

**Concrete examples:**
- Shopify removed two validator tools and replaced them with a generic one (agents calling the old names get protocol errors)
- MongoDB regenerated all 20 tool schemas in one release, with 5 real constraint tightenings hidden inside 15 notation-level changes (empty release notes)
- Bybit runs a remote manifest gate that prevents users from staying on approved versions (confirmed by their ops team: https://github.com/bybit-exchange/trading-mcp/issues/38)
- HubSpot removes tools while their GitHub repo is dead (no channel exists to announce)

**The mitigation:** We built an open-source CLI (rugsnare, Apache-2.0) that pins tool contracts by canonicalized sha-256 and diffs on upgrade. The pin format is an open spec. The OWASP MCP Security Cheat Sheet now includes our pinning guidance (merged PR: https://github.com/OWASP/CheatSheetSeries/pull/2764).

**Full write-up:**
https://github.com/Paraphern/rugsnare/blob/main/docs/blog/2026-10-17-mcp-contract-drift.md

**Project:**
https://github.com/Paraphern/rugsnare

**Drift corpus (public, per-version pins):**
https://github.com/Paraphern/rugsnare/tree/main/audits/drift-watch

**The ask:** A guest post on the GitHub Security Lab blog covering the attack surface, the data, and the mitigation.

Best,
Paraphern
