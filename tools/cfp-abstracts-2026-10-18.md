# CFP Abstracts (подготовлены 2026-10-18)
# Подавать когда откроются CFP. Каждый адаптируется под конкретную конференцию.

---

## FOSDEM 2027 (обычно дедлайн: ноябрь 2026)

**Track:** Security / DevOps

**Title:** MCP Contract Drift: The Supply Chain Nobody's Watching

**Abstract (300 words):**

When an npm package exposes tools to AI agents via the Model Context Protocol (MCP), it publishes a set of instructions the agent will follow. Each tool carries a name, a description (what the model reads to decide how to call it), and an input schema (the contract for valid arguments). These definitions are the AI-facing API surface, and they change silently between releases.

We pinned and diffed the tool contracts of 24 popular MCP servers over two months, covering a combined 3.6 million weekly npm installs. We found 336 silent contract changes: Shopify removed two validators and replaced them with a generic one, HubSpot removed a tool with no announcement channel (the GitHub repo is dead), MongoDB regenerated all 20 tool schemas at once with 5 real constraint tightenings hiding inside 15 notation-level changes, and Bybit runs a remote manifest gate that prevents users from staying on an approved version.

None of these are CVEs. They are the absence of a channel: vendors have no place to announce tool changes because changelogs cover API changes, not AI-facing surfaces.

This talk presents the drift data, the three recurring patterns (notation waves, consolidation breaks, silent loosenings), and a practical solution: pin tool contracts by canonicalized sha-256 at approval time, diff on upgrade, and gate CI on direction-graded changes (breaking, loosened, expanded, cosmetic). The pin format is an open spec, the drift corpus is public, and the OWASP MCP Security Cheat Sheet now recommends this approach.

**Takeaways:**
1. MCP tool contracts change silently, and nobody is watching
2. Direction-graded drift detection separates real breaking changes from serialization noise
3. An open pin format makes contract verification portable across clients

**Format:** 25 minutes + Q&A

---

## Security BSides (London/SF, varies)

**Title:** Your AI Agent Follows Instructions You Never Approved

**Abstract (200 words):**

AI agents using the Model Context Protocol receive tool instructions from MCP servers. These instructions (tool descriptions and schemas) change between releases without announcement. We scanned 24 popular MCP servers and found 336 silent changes that rewrite what AI agents are told to do.

This talk shows the attack surface through real data: silent tool removals that break agent workflows, schema tightenings that invalidate previously-valid calls, and description rewrites that change agent behavior. We present a pin-and-diff approach that catches these changes before the agent does.

**Audience takeaway:** A practical, deployable method for verifying AI agent tool surfaces, with a public corpus of 336 receipts.

**Format:** 30 minutes

---

## DevSecCon 2027 (обычно весна)

**Title:** Pinning AI Agent Tool Contracts: Supply Chain Security for the MCP Era

**Abstract (250 words):**

As AI agents become production workloads, their tool interfaces (exposed via the Model Context Protocol) become a new supply chain attack surface. Unlike traditional APIs, MCP tool contracts can change between npm releases without triggering any dependency alert, because the changes are in the tool definitions themselves, not in the package version.

This session presents a two-month empirical study of contract drift across 24 popular MCP servers (3.6M combined weekly installs). We document three classes of silent change: tool removals that break agent workflows, constraint tightenings that invalidate valid calls, and description rewrites that alter agent behavior. We also present a mitigation: contract pinning by canonicalized hash with direction-graded drift detection, deployed as an Apache-2.0 CLI with an open pin format spec.

The OWASP MCP Security Cheat Sheet now includes our pinning guidance. The approach is being adopted by independent implementations (KyttoMCP 1.0.8, DeepSeek Studio RFC delivery).

**Format:** 40 minutes including demo

---

## Короткий bio (для всех CFP)

Paraphern is the creator of RugSnare, an open-source MCP contract pinning CLI, and maintains a public drift corpus tracking 24 popular MCP servers. They contributed the pinning guidance to the OWASP MCP Security Cheat Sheet and the drift data used in the DeepSeek-Reasonix pin-at-approval RFC. Their work on MCP contract drift has been cited by GitHub, Microsoft, and independent security researchers.
