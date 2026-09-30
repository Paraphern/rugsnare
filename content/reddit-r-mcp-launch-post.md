# r/mcp LAUNCH post (publish on day 8-10, from the maintainer's account)

> Posting rules: from the owner's account, morning US time (9-11am ET), **"Showcase" flair** (rule 4), stay in comments for the first hour, disclose maintainer status up front (rule 3). Tone: plain and human (rule 2).

## Title (pick one)

A. `Show r/mcp: RugSnare — pin MCP tool contracts, catch rug-pulls, quarantine mid-session (zero-dep, 6 detection mechanisms, drift-feed)`

B. `Show r/mcp: we built the "after approval" layer for MCP security — hash pinning, live proxy quarantine, advisory signals, public drift-feed`

## Body

Maintainer here — everything is Apache-2.0, zero dependencies, no SaaS attached (core stays free).

**The gap we kept hitting:** scanners (snyk agent-scan, mcp-scan, and ~110 repos in the tool-poisoning topic) check a server *before* you connect it. The ugly class of attacks happens *after approval* — a maintainer update or compromised registry silently changes a tool **description**, and your agent starts following instructions nobody read. OWASP codified this as tool poisoning (MCP03:2025).

**What we built — six detection mechanisms:**

1. **Hash pinning** of `{name, description, inputSchema}` + prompt templates + resource definitions — the full MCP surface
2. **Live proxy** (observe → enforce): quarantines drifted tools mid-session, the client gets a single `rugsnare_alert` instead of poisoned ones
3. **Cross-server shadow detection**: same tool name on two servers — the client's undocumented resolution order is the risk
4. **Advisory signals**: 11 heuristics catch suspicious descriptions *without a baseline pin* — "do not tell the user", "read ~/.ssh/id_rsa", works on first contact
5. **SARIF output**: findings appear in GitHub code scanning
6. **Drift-feed**: daily automated scan of the most popular MCP servers on npm, with a public append-only log of every contract change — the ecosystem's first continuous integrity monitor

**Proof, not promises:**

- **[Live demo PR](https://github.com/Paraphern/rugsnare/pull/2)** — watch a bot post a human-readable diff of a rug pull, then block the merge
- **[Field test](https://github.com/Paraphern/rugsnare#field-tested)** — we caught a real description change between two releases of the official `@modelcontextprotocol/server-filesystem`, with 13 unchanged tools untouched. `bash repro/field-drift.sh` reproduces it in ~1 minute.
- **[Drift-feed](https://github.com/Paraphern/rugsnare/tree/main/drift-feed)** — already running, already logging
- **On-chain release verification** — our release hashes are pinned on Base, `rugsnare verify` checks your install against the ledger

**Nine AI clients supported:** Claude Code, Cursor, Windsurf, VS Code, Continue, Zed, Cline, ZCode, any MCP-compatible client.

**Install** (after Oct 2):
```bash
npx rugsnare init
rugsnare scan --config .mcp.json
rugsnare diff --config .mcp.json   # put this in CI — drift fails the build
```

**Trust posture, since this sub rightly asks:** zero npm dependencies, no telemetry, local-only state, Apache-2.0, releases signed with fingerprint in three independent places including an on-chain append-only log. Fork us if we go rogue — that's the license working as intended.

**What we'd love from you:**
1. Does the CI-gate workflow fit how your team works?
2. Try the [attack corpus](https://github.com/Paraphern/rugsnare/tree/main/corpus) — can you spot the poisoned v2 with your eyes before running the diff?
3. How does your team decide an MCP server is safe? There's a [7-question research thread](https://github.com/Paraphern/rugsnare/discussions/1) — early answers are mostly "nobody is responsible".

**Shaped by community feedback:** the split-hash design (schema changes block the build, description changes alert-only) came directly from [a Reddit discussion](https://www.reddit.com/r/mcp/comments/1wtdm5a/comment/pd2cjsf/) — *"nobody wants a deploy failing because someone bumped v2.1.0 to v2.1.1 in a docstring."*

Happy to answer anything in comments.
