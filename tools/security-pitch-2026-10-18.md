# Security Research Pitch (обновлён 2026-10-18)

## Статус: Security Lab НЕ подходит

GitHub Security Lab (github.com/github/securitylab) — исследовательская лаборатория для CodeQL queries и CVE PoC. Не принимает guest posts. GitHub Blog тоже не принимает внешние статьи (нет формы).

## Реальные цели для security-контента:

### 1. PortSwigger Weekly (лучший вариант)

**To:** hello@portswigger.net
**Subject:** [Research Pitch] MCP contract drift as a supply chain vector

**Body:**

Hi,

I've been researching a supply chain risk in the MCP (Model Context Protocol) ecosystem. When npm packages expose tools to AI agents, the tool definitions (name, description, inputSchema) form the instructions the agent follows. These definitions change silently between releases in 336 instances across 24 popular servers. No CVE, no advisory, just a silent rewrite of what the AI is told to do.

The OWASP MCP Security Cheat Sheet now recommends pinning tool contracts:
https://github.com/OWASP/CheatSheetSeries/pull/2764

We built a CLI (rugsnare, Apache-2.0) and a public drift corpus with receipts:
https://github.com/Paraphern/rugsnare/tree/main/audits/drift-watch

Full write-up:
https://github.com/Paraphern/rugsnare/blob/main/docs/blog/2026-10-17-mcp-contract-drift.md

Would this be of interest to your readers?


**To:** lwn@lwn.net
**Subject:** Article proposal: MCP contract drift - the silent supply chain risk

**Body:**

Hi LWN team,

I'd like to propose an article about a supply chain risk in the Model Context Protocol (MCP) ecosystem that affects npm packages and AI agents.

When MCP servers (npm packages that expose tools to AI agents like Claude and Cursor) release updates, their tool definitions change silently. We pinned and diffed 24 popular servers over two months and found 336 changes that were never announced. This includes tool removals, schema tightenings, and description rewrites that alter agent behavior.

The OWASP MCP Security Cheat Sheet now recommends pinning tool contracts. We built an open-source CLI and maintain a public drift corpus.

Would this be suitable for an LWN article?

Details:
https://github.com/Paraphern/rugsnare/blob/main/docs/blog/2026-10-17-mcp-contract-drift.md
