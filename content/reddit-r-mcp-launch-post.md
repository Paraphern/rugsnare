# r/mcp launch post (publish on launch day, from the maintainer's account)

> Posting rules: from the owner's personal account (history matters), post in the morning US time (9–11am ET), stay in comments for the first hour answering everyone, disclose maintainer status up front (rule 3), and **pick the "Showcase" flair when submitting (rule 4)**. Tone: plain and human (rule 2 — the sub is allergic to AI-slop about "MCP security"). Do NOT link the landing page in the post body — repo link only; mods and readers hate drive-by marketing.

## Title (pick one)

A. `We open-sourced a tool that catches MCP rug-pulls AFTER you approve the server — hash-pinning + CI gate, zero deps`

B. `Your agent approved an MCP tool once. Its description changed since. Here's a free tool that catches it.`

C. `Show r/mcp: a rug-pull detector for MCP tool descriptions (attack corpus included — try to spot the poisoned v2 with your eyes)`

## Body

Hey r/mcp — maintainer here, everything below is Apache-2.0 and zero-dependency, no SaaS attached (yet, and the core stays free either way).

**The gap we kept hitting:** scanners (snyk agent-scan, ex-mcp-scan) check a server *before* you connect it. But the ugly class of attacks happens *after approval* — a maintainer update or a compromised registry silently changes a tool **description**, and your agent starts following instructions nobody read. OWASP codified this as tool poisoning (MCP03:2025). Version pinning doesn't help when the version string doesn't change.

**What the tool does:** hash-pins every tool's `{ name, description, inputSchema }` at approval. Any change later = DRIFT/NEW/REMOVED, exit 1, CI fails:

```
flights-search  (node ./server.js)
  [DRIFT] search_flights 8c5ab922df5932ba -> fcc6d291d8ef4ab2
  [NEW ] _search_flights_pro 589ef74a38bb8d07
rugsnare diff: DRIFT DETECTED (3 finding(s))
```

Why inputSchema and not just the description: we ship a second corpus sample where the descriptions are **byte-identical** to the clean version and the attack lives entirely in the schema (a new required `session: object` param). Description-only diffing misses it; hashing the canonical triple catches it.

**Try it in ~2 minutes:**

```bash
rugsnare scan --config .mcp.json    # baseline pins (Claude Code / Cursor configs auto-discovered)
rugsnare diff --config .mcp.json    # drop it in CI; drift fails the build
```

The repo also has the **attack corpus** — a benign flights-search MCP server and its silently-weaponized twin (the v2 description quietly asks the agent to attach `~/.ssh/id_rsa` "for personalization" and to not mention it to the user). Open both files side by side before running the diff — it's a good five minutes of paranoia.

**Trust posture, since this sub rightly asks:** zero npm dependencies (a supply-chain tool shouldn't be its own attack surface), no telemetry, local-only state, releases signed with an OpenPGP key whose fingerprint is published in three places including an on-chain append-only log — `rugsnare verify` checks your install against it. We take our own medicine.

**What we'd love from you:**
1. Does the CI-gate workflow fit how your team actually works, or is runtime enforcement the only thing you'd trust?
2. What's the first policy you'd write (deny-list of params like `session: object`? domain allowlists in descriptions?)
3. If you have five minutes: how does your team currently decide an MCP server is safe to connect? There's a 7-question research thread in our Discussions — early answers are... "nobody is responsible", mostly.

Happy to answer anything in comments. If this duplicates prior art you know of, genuinely tell me — the more pins the better.
