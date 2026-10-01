# Extensions Applicability Audit — verdict

**Date:** 2026-10-01 · **Auditor:** dev agent, per Part 3 prompt of `rugsnare-extensions.md`
**Method:** code-first — every claim below is backed by a file path (and line where it matters). The brief was NOT trusted on faith. External claims checked via web search.

---

## Executive summary — the one finding that matters

**The live proxy does not record tool-call responses. Today. At all.**

- Client→server direction logs the *request*: `{kind:'call', server, tool, hasArgs, args?}` — and `args` only when `config.logCallArgs` is enabled, which is **off by default** (`product/src/alerts.js:12`, `product/src/proxy.js:64-72`). No request `id`, no server version.
- Server→client direction inspects **only `tools/list`** results for the integrity gate; every other message — including every `tools/call` response — is passed through untouched (`product/src/proxy.js:150-220`, pass-through at line 219). Nothing is written.

**Consequence:** candidate №2 (canary replay) cannot run on the current log. The corpus needs (a) request `id` correlation, (b) full arguments, (c) full responses/errors, (d) server version at record time. None exist yet. This is a gap of **one focused PR**, not a redesign — but it must be PR-1 of Phase A, exactly as the Part 3 prompt suspected it might have to be.

## Fact base (what the code actually does)

| Area | Reality | Where |
|---|---|---|
| Per-call audit log | Request side only: tool name, `hasArgs` bool, args only if opted in. No `id`, no response, no version | `proxy.js:64-72` |
| Response capture | Absent — `tools/list` gate only, rest is pass-through | `proxy.js:150-220` |
| Event log infra | Append-only JSONL, local, crash-safe (try/catch) — good base to extend | `events.js:8-17` |
| Pins | `{hash, schemaHash, proseHash, description, firstSeen, pinnedAt, approved}` + server `cmd` — the *contract* side is complete | `corpus/01-rugpull-flights/.rugsnare/pins.json` |
| Server version | `initialize` handshake already receives `serverInfo` — and **discards it** (`init.error` checked, `serverInfo` never read). Drift-feed gets versions via `npm view`, npm packages only | `rpc.js:86-88`, `driftfeed.mjs:34` |
| Drift-feed | Daily `tools/list` snapshots + changes.jsonl (FIRST_SCAN/VERSION/…). No call corpus — by design, it is a *contract* canary | `drift-feed/` |
| Repro base | `field-drift.sh` (pin two versions → diff) and `backtest-filesystem.sh` (18 version pairs, 25 drifts) — an excellent skeleton for `canary.sh` | `repro/` |
| Corpus | Two attack servers (description rug pull; schema-only rug pull) — reusable as replay targets in tests | `corpus/` |
| CI Action | Composite action + in-process `pr-comment.mjs` — the pattern a `canary-job` copies | `action/pr-diff/` |

## Candidate verdicts

| # | Candidate | Verdict | Effort | Main risk | First PR |
|---|---|---|---|---|---|
| №2 | **Canary (contract replay)** | **APPLICABLE WITH CONDITIONS** — after capture layer exists | 4-6 PRs | Log size/privacy of recorded args+responses; keep default OFF, local-only, size caps | Capture layer: id-correlated request+response + sniffed `serverInfo` → `.rugsnare/canary/calls.jsonl` |
| №5 | **Signed receipts** | **APPLICABLE WITH CONDITIONS** | 2-3 PRs | Format churn: align to IETF draft **-05** (see discrepancies), not invented fields; `node:crypto` has Ed25519 natively → zero-dep holds | Hash-chain writer over existing `events.jsonl` + `receipts verify` |
| №3 | **Loop/stuck signal** | **APPLICABLE — trivial** | 1 PR | Crying-wolf on legit retries; needs a debounce/threshold like advisory signals already have | One heuristic: N identical (tool + args-hash) calls with no interleaving progress → advisory A14 |
| №11 | **Client-compat matrix** | **NOT NOW — separate product** | infra project | GUI clients on CI (Claude Desktop on Windows headless) is the expensive 80%; separate decision needed | Proposal doc only (per Phase C of the brief) — no code |
| №1 | **Verified-tool (effect checks)** | **APPLICABLE — DEFERRED** | later | Shares the exact same capture gap as №2 — the capture PR unlocks both; sister product, not a module | None until №2 ships and proves the corpus value |

## Notes per candidate

**№2 canary.** The brief's ladder is right and the code is *closer* than the summary finding suggests: pins, hashes, diff, classification (BREAKING/COSMETIC via split hash — `hash.js`, `pins.js:compareTools`), repro scripts and the Action pattern all exist and are reusable as-is. What's missing is purely the *behavioral* capture listed above. The optional LLM classifier flag must remain opt-in and documented as the only external call in the product's history — default stays deterministic. Drift-feed integration (brief A.6) is a v2 of the canary, not MVP.

**№5 receipts.** Ed25519 + hash-chain over the existing JSONL is genuinely cheap: `node:crypto.generateSignKeyPair('ed25519')`, sign each entry hash chained to the previous. Tamper-evidence test writes itself (flip a byte mid-file → verify fails). The dossier export should copy field names from the AAT draft's mandatory set (agent identity, action classification, outcome) — the draft is still individual (not WG), so keep a mapping layer, not a hard dependency.

**№3 loop-signal.** With the capture layer present, detection is ~20 lines: same tool + same stable-hash(args) repeated ≥ N with zero other tool calls between → `loop-suspected` event, advisory severity, never a block. Without capture it can still be done from the request-side log alone (tool+args-hash are already computable if `logCallArgs` is on) — so this one does NOT block on PR-1.

**№11 matrix.** Nothing in the repo serves this; it is a new product with an infra bill. Correct per brief: proposal doc, explicit "do not code" until a separate decision.

**№1 verified-tool.** Same capture gap as №2; after №2 it is mostly a diffing-policy question over the same corpus. Keep as sister package.

## Discrepancies with the brief

| Brief says | Code/docs say |
|---|---|
| "прокси уже пишет per-call audit log (v0.2)" — implying corpus-ready | Writes **request-side only**, args off by default, **no responses**. The canary's primary input does not exist yet |
| IETF `draft-sharif-agent-audit-trail-06` updated 29.09 | Datatracker shows **-05** as latest (individual draft, active, two IPR disclosures Aug-Sep 2026). Either the brief was ahead of publication or mistaken — receipts must target **-05** and track updates |
| r/mcp schema-drift thread as evidence | **Confirmed alive** — exact quote found: "That silent schema drift is nightmare fuel…" ([r/mcp 1wbcr8q](https://www.reddit.com/r/mcp/comments/1wbcr8q/mcp_tools_can_change_their_descriptionschema)) |

## External fact-checks

- IETF draft: [datatracker — draft-sharif-agent-audit-trail](https://datatracker.ietf.org/doc/draft-sharif-agent-audit-trail) — rev **-05**, individual submission, actively iterating; companion `draft-sharif-apki-agent-pki` at -01.
- Reddit thread: [r/mcp — MCP tools can change their description/schema after…](https://www.reddit.com/r/mcp/comments/1wbcr8q/mcp_tools_can_change_their_descriptionschema) — live, ~20 days old at audit time, exact quote present.

## Recommended order (GO for Phase A, sequenced)

1. **PR-1 (now): capture layer.** `product/src/canary.js` + proxy hooks: id-correlated `{tool, args, ok, result|error, ms}` entries, `serverInfo` sniffed from the `initialize` response, written to `.rugsnare/canary/calls.jsonl`, **default off** (`canaryRecord: true` to enable), per-entry result cap (~64 KB) with truncation flag. Local file, never committed, never sent anywhere.
2. **PR-2..4: `rugsnare canary record|replay|report`** — replay against two versions, deterministic breaking/cosmetic classification reusing split hash + response diffs, exit code for CI. Acceptance: `repro/canary.sh` catches the version swap (exit 1) and is quiet on identical versions (exit 0).
3. **PR-5: loop-signal** (rides on capture; advisory-only).
4. **PR-6+: receipts** (independent track, team/compliance feature, AAT -05 field mapping).
5. **mcp-matrix: proposal doc only.** №1 deferred until №2 proves corpus value.

No product code was modified during this audit except this file being added. Phase A PR-1 is authorized to start by this verdict.
