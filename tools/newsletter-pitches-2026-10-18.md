# Newsletter Pitches (подготовлены 2026-10-18)
# Отправлять с email пользователя. Каждая рассылка = отдельное письмо.

---

## 1. Node Weekly (cooperpress.com)

**Subject:** rugsnare - MCP contract pinning with 336 drift findings

**Body:**

Hi,

I'd like to suggest a mention for Node Weekly.

RugSnare (github.com/Paraphern/rugsnare) is an Apache-2.0, zero-dependency CLI that pins MCP tool contracts (name, description, inputSchema) by canonicalized sha-256 and diffs them on upgrade. We ran it over 24 popular npm MCP servers for two months and found 336 silent contract changes nobody announced, including silent tool removals and schema tightenings hidden in "patch" releases.

The OWASP MCP Security Cheat Sheet now recommends this approach (our PR #2764 was merged). The pin format is an open spec (PIN-SPEC).

npm: npmjs.com/package/rugsnare
GitHub: github.com/Paraphern/rugsnare

Thanks for considering it.

---

## 2. JavaScript Weekly (cooperpress.com)

**Subject:** rugsnare - catch silent MCP tool contract changes in CI

**Body:**

Hi,

RugSnare is a new open-source tool for the MCP (Model Context Protocol) ecosystem that catches when npm packages silently change their AI-facing tool contracts between releases.

We scanned 24 popular MCP servers (MongoDB, Shopify, HubSpot, Supabase, Netlify) and found 336 changes that were never mentioned in release notes. Examples: Shopify removed two validators, HubSpot removed a tool (its GitHub repo is dead), MongoDB tightened 5 schemas while regenerating all 20 tool definitions.

RugSnare pins tool contracts at install time and exits 1 on drift, making it a CI gate. Apache-2.0, zero npm dependencies, no telemetry.

GitHub: github.com/Paraphern/rugsnare

---

## 3. Changelog (changelog.com)

**Subject:** Guest post pitch: The silent supply chain risk in MCP tool contracts

**Body:**

Hi Changelog team,

I've been running a two-month drift watch over the MCP (Model Context Protocol) ecosystem and have data that I think your audience would find valuable.

We pinned the tool contracts of 24 popular MCP servers (npm packages that expose AI tools to agents like Claude and Cursor) and diffed every release. Found 336 silent changes nobody announced: tool removals, schema tightenings hidden in patches, descriptions rewritten to change agent behavior.

The interesting part is the pattern: it's not malice, it's the absence of a channel. Vendors don't have a place to announce tool changes because changelogs are for API changes, not for the AI-facing surface.

I wrote up the findings with repro commands for every case: github.com/Paraphern/rugsnare/blob/main/docs/blog/2026-10-17-mcp-contract-drift.md

Would this work as a Changelog news item or guest post?

---

## 4. TLDR DevOps (tldr.tech)

**Subject:** rugsnare - MCP contract drift detection for CI

**Body:**

RugSnare pins MCP tool contracts by sha-256 and fails CI when a server silently changes its AI-facing surface after approval. 336 findings across 24 popular servers in two months. Apache-2.0, zero deps, no telemetry.

Link: github.com/Paraphern/rugsnare

---

## 5. Bytes (bytes.dev)

**Subject:** rugsnare - your AI agent follows instructions you never approved

**Body:**

Hey,

Quick suggestion for Bytes. We built a CLI that pins the tool contracts MCP servers expose to AI agents and diffs them on every upgrade. Think "lock file for AI-facing APIs."

Two months of scanning 24 popular npm MCP servers: 336 silent changes. Shopify removed tools, MongoDB tightened schemas, HubSpot removed a tool with no announcement channel (their GitHub repo is dead). The OWASP MCP Security Cheat Sheet now recommends this.

It's called rugsnare: github.com/Paraphern/rugsnare (Apache-2.0, zero deps).

---

## 6. Security Weekly / PortSwigger (если подходит)

**Subject:** MCP contract drift as a supply chain vector

**Body:**

Hi,

I've been researching a supply chain risk in the MCP (Model Context Protocol) ecosystem that I think is underexplored.

When an npm package exposes tools to AI agents via MCP, the tool definitions (name, description, inputSchema) form the instructions the agent follows. We found these definitions change silently between releases in 336 instances across 24 popular servers. No CVE, no advisory, just a silent rewrite of what the AI is told to do.

The OWASP MCP Security Cheat Sheet now recommends pinning tool contracts. We built a CLI (rugsnare, Apache-2.0) and a public drift corpus with receipts.

Full write-up: github.com/Paraphern/rugsnare/blob/main/docs/blog/2026-10-17-mcp-contract-drift.md

Would this be of interest to your readers?
