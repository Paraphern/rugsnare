# BRIEF

- **Где:** r/mcp (Showcase flair, rule 4), от аккаунта владельца, утро US (9-11 ET)
- **Карма-барьер:** r/mcp - нишевый саб, барьер низкий/отсутствует (в отличие от r/ClaudeAI)
- **Тон:** plain and human (rule 2), maintainer-статус раскрыт (rule 3)
- **Первый час:** сидеть в комментариях, отвечать на вопросы
- **Обновление:** под 1.4.0 (on-chain, byte-stable, hosted-feed, history с public archive)

---

**Title:** Show r/mcp: RugSnare - pin MCP tool contracts by hash, catch silent rug-pulls in CI, verify releases on-chain (zero-dep, 354 tests, public drift-feed)

**Flair:** Showcase

**Body:**

Maintainer here. Apache-2.0, zero npm dependencies, no SaaS, no telemetry. Everything local.

**The gap:** scanners check a server *before* you connect it. The ugly class of attacks happens *after approval* -- a maintainer update or a compromised registry silently changes a tool **description** or **schema**, and your agent starts following instructions nobody re-read. OWASP codified this as tool poisoning (MCP03:2025). An arXiv census of the entire MCP registry (Sep 2026, [21,643 servers](https://arxiv.org/abs/2609.14119)) found **51% of multi-version servers changed what they advertise**, and **41% did it silently**.

**What we built (six layers):**

1. **Hash pinning** of `{name, description, inputSchema}` + prompt templates + resource definitions. One command: `npx rugsnare scan`. Commit the pins. Any silent change on `npx rugsnare diff` = exit 1 in CI.

2. **Direction-graded drift**: not just "hash mismatch" but BREAKING (your callers break), LOOSENED (validation weakened), EXPANDED (new attack surface), NOTATION (cosmetic), plus guard-parameter warnings (removed `dry_run`, flipped `confirm` default) and paywall-introduction detection (`[PAYWALL]` when "now requires a paid plan" appears).

3. **Live proxy** (observe -> enforce): wraps a running server, quarantines drifted tools mid-session, blocks policy-violating calls.

4. **Whole-history scanning**: `rugsnare history <package>` downloads and actually **starts every published version** of any npm MCP server, diffs contracts pair by pair. On the web: [rugsnare.com](https://rugsnare.com) -- paste a package name, get the full drift record with public run logs.

5. **Skills Security**: `rugsnare skills scan/diff/report` across 16 AI platforms (Claude Code, Cursor, Windsurf, Zed, the `.agents/skills` standard, and more). SHA-256 pinning of SKILL.md files, severity classification, self-contained HTML report.

6. **Public drift-feed**: daily GitHub Actions scan of popular MCP servers -- npm packages AND hosted HTTP endpoints -- with a public append-only JSONL log of every contract change. [Already caught a live hosted drift within 40 minutes of a vendor release](https://github.com/Paraphern/rugsnare/blob/main/docs/servers/context7.md).

**Every release is verified on-chain.** Artifact hashes are pinned to an append-only smart contract on Base (Ethereum L2). Check your local install against a hash that has been on the ledger since release day: `npx rugsnare verify rugsnare-1.4.0.tgz --version 1.4.0`. The contract itself is [source-verified on Basescan](https://basescan.org/address/0x78406c32F2054C7DF91aD0A2C258Ad0936838B1e).

**Pins are byte-stable** (PIN-SPEC v1.1): sorted keys, unchanged entries never rewritten, identical saves skip the write entirely. A third-party verifier can JCS-hash your `.rugsnare/pins.json` as an opaque record and a re-scan of the same version does not change a byte. Spec: [docs/PIN-SPEC.md](https://github.com/Paraphern/rugsnare/blob/main/docs/PIN-SPEC.md).

**Proof, not promises:**

- **[Field audit](https://github.com/Paraphern/rugsnare#field-audit)**: 218 silent contract changes across the npm MCP top (Oct 2026) -- including azure-devops losing 75 tools inside minor releases (Microsoft confirmed their remote and npm are versioned separately), Netlify moving operations between tools, and a current patch release that quietly added `minLength: 1` to 32 parameters.
- **[Live demo PR](https://github.com/Paraphern/rugsnare/pull/2)** -- watch a bot post a human-readable diff of a rug pull, then block the merge.
- **[Runtime archive](https://rugsnare.com/scans)** -- every scan from the web tool, public run logs as evidence.
- **[Server records](https://github.com/Paraphern/rugsnare/tree/main/docs/servers)** -- one page per watched MCP server with verified findings, repro commands, and dates.

**Links:**

- GitHub: [github.com/Paraphern/rugsnare](https://github.com/Paraphern/rugsnare)
- npm: `npx rugsnare init` (latest: 1.4.0)
- Site + web scanner: [rugsnare.com](https://rugsnare.com)

Happy to answer questions about any of the cases, the grading logic, or the on-chain verification.
