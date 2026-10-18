# Newsletter Pitches (v3, 2026-10-18)
# Каждое письмо = отдельное отправление с email пользователя.
# Subject в квадратных скобках указывает тип запроса.

---

## 1. Node Weekly

**To:** через форму на https://cooperpress.com/newsletters (или editors@cooperpress.com)

**Subject:** [News Submission] rugsnare - MCP contract pinning CLI with 336 drift findings

**Body:**

Hi,

I'd like to submit a news item for Node Weekly.

RugSnare is an Apache-2.0, zero-dependency CLI that pins MCP tool contracts (name, description, inputSchema) by canonicalized sha-256 and diffs them on upgrade. We ran it over 24 popular npm MCP servers for two months and found 336 silent contract changes nobody announced, including silent tool removals and schema tightenings hidden in patch releases.

The OWASP MCP Security Cheat Sheet now recommends this approach:
https://github.com/OWASP/CheatSheetSeries/pull/2764

The pin format is an open spec:
https://github.com/Paraphern/rugsnare/blob/main/docs/PIN-SPEC.md

npm: https://www.npmjs.com/package/rugsnare
GitHub: https://github.com/Paraphern/rugsnare

Thanks for considering it.

---

## 2. JavaScript Weekly

**To:** через форму на https://cooperpress.com/newsletters (или editors@cooperpress.com)

**Subject:** [News Submission] rugsnare - catch silent MCP tool contract changes in CI

**Body:**

Hi,

Submitting a news item for JavaScript Weekly.

RugSnare is a new open-source tool for the MCP (Model Context Protocol) ecosystem that catches when npm packages silently change their AI-facing tool contracts between releases.

We scanned 24 popular MCP servers (MongoDB, Shopify, HubSpot, Supabase, Netlify) and found 336 changes that were never mentioned in release notes. Examples: Shopify removed two validators, HubSpot removed a tool while its GitHub repo is dead, and MongoDB regenerated all 20 tool schemas in one release with 5 real constraint tightenings.

RugSnare pins tool contracts at install time and exits 1 on drift, making it a CI gate. Apache-2.0, zero npm dependencies, no telemetry.

GitHub: https://github.com/Paraphern/rugsnare
npm: https://www.npmjs.com/package/rugsnare
Drift corpus: https://github.com/Paraphern/rugsnare/tree/main/audits/drift-watch

---

## 3. Changelog

**To:** через форму на https://changelog.com/submit (или editors@changelog.com)

**Subject:** [Guest Post Pitch] The silent supply chain risk in MCP tool contracts

**Body:**

Hi Changelog team,

I'd like to pitch a guest post about a supply chain risk we've been researching in the MCP (Model Context Protocol) ecosystem.

We pinned the tool contracts of 24 popular MCP servers (npm packages that expose AI tools to agents like Claude and Cursor) and diffed every release. Found 336 silent changes nobody announced: tool removals, schema tightenings hidden in patches, and description rewrites that change agent behavior.

The interesting part is the pattern: it's not malice, it's the absence of a channel. Vendors have no place to announce tool changes because changelogs cover API changes, not the AI-facing surface. The OWASP MCP Security Cheat Sheet now recommends pinning:
https://github.com/OWASP/CheatSheetSeries/pull/2764

Full write-up with repro commands:
https://github.com/Paraphern/rugsnare/blob/main/docs/blog/2026-10-17-mcp-contract-drift.md

Would this work as a Changelog news item or full guest post?

---

## 4. TLDR DevOps

**To:** через форму на https://tldr.tech/submit

**Subject:** [Link Submission] rugsnare - MCP contract drift detection for CI

**Body:**

Submitting a link for TLDR DevOps.

RugSnare pins MCP tool contracts by sha-256 and fails CI when a server silently changes its AI-facing surface after approval. 336 findings across 24 popular servers in two months. Apache-2.0, zero deps, no telemetry.

OWASP recommendation (merged):
https://github.com/OWASP/CheatSheetSeries/pull/2764

Project: https://github.com/Paraphern/rugsnare

---

## 5. Bytes

**To:** через контакт на https://bytes.dev (или ответ на любую рассылку)

**Subject:** [Suggestion] rugsnare - your AI agent follows instructions you never approved

**Body:**

Hey,

Suggestion for a Bytes mention.

We built a CLI that pins the tool contracts MCP servers expose to AI agents and diffs them on every upgrade. Think "lock file for AI-facing APIs."

Two months of scanning 24 popular npm MCP servers: 336 silent changes. Shopify removed tools, MongoDB tightened schemas, HubSpot removed a tool with no announcement channel (their GitHub repo is dead).

OWASP now recommends this approach:
https://github.com/OWASP/CheatSheetSeries/pull/2764

Project: https://github.com/Paraphern/rugsnare (Apache-2.0, zero deps)

Drift corpus: https://github.com/Paraphern/rugsnare/tree/main/audits/drift-watch

---

## 6. PortSwigger Weekly

**To:** через контактную форму на https://portswigger.net

**Subject:** [Research Pitch] MCP contract drift as a supply chain vector

**Body:**

Hi,

Pitching a research piece for PortSwigger Weekly.

I've been researching a supply chain risk in the MCP (Model Context Protocol) ecosystem. When npm packages expose tools to AI agents, the tool definitions (name, description, inputSchema) form the instructions the agent follows. These definitions change silently between releases in 336 instances across 24 popular servers. No CVE, no advisory, just a silent rewrite of what the AI is told to do.

OWASP now recommends pinning tool contracts:
https://github.com/OWASP/CheatSheetSeries/pull/2764

We built a CLI (rugsnare, Apache-2.0) and a public drift corpus with receipts:
https://github.com/Paraphern/rugsnare/tree/main/audits/drift-watch

Full write-up:
https://github.com/Paraphern/rugsnare/blob/main/docs/blog/2026-10-17-mcp-contract-drift.md

Would this be of interest to your readers?
