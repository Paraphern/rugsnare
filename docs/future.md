# Future improvement notes

Working notes on what the current implementations leave on the table, and the
next step for each. Written as we shipped the feature, so the rationale is
not lost. (Public on purpose - this is a roadmap, not a secret.)

## Hosted endpoints in the public drift-feed (R30 - SHIPPED in 1.4.0 draft, 2026-10-12)

Verified gap: `driftfeed.mjs` scans a curated list of 4-6 stdio npm packages
only (`DEFAULT_SERVERS` + `drift-feed/servers.json`); zero hosted HTTP
endpoints. The capability exists and is fully wired (`scan/diff --url` +
`--header` passthrough, `fetchToolsHttp` with session-id and SSE handling) -
we pin remote endpoints ad-hoc but never publish them to the feed. Meanwhile
heldfast's public sealed log covers 29,458 registry servers (19,746 hosted
per their data) and two independent feed vendors (AAtomless, heldfast) are
already answering the registration-pin demand (microsoft/scope#533,
teleport#61434, IBM forge#7082). Supersedes R18 (which assumed a private
watch-list with secrets - a public Actions feed cannot carry tokens).

- Second entry type in `servers.json`: `{ name, url, headers? }` ->
  `fetchToolsHttp` path in `driftfeed.mjs`; entries tagged `transport: 'http'`.
- Target list: top hosted servers whose `tools/list` answers WITHOUT auth
  (common MCP pattern: list open, call gated). Start at 25-50 endpoints,
  curated like the npm list. Auth-gated endpoints are excluded honestly -
  the feed README states the coverage rule, so nobody mistakes it for the
  whole hosted registry.
- Per-endpoint failure = logged event, never fatal (hosted flakiness is not
  drift); one polite request per endpoint per day from the existing cron.
- Site: `scans.html`/feed rendering gains a transport badge; no schema change
  to `changes.jsonl` beyond the transport field.

## History-mode contract provenance (R32 - SHIPPED in 1.4.0 draft, 2026-10-12)

Verified live on mongodb-mcp-server: 2.1.2 declares `zod: ^4.4.3` (floating).
The same 2.1.2 tarball, installed and run on different days, served materially
different inputSchema (`numCandidates` plain `number` vs `integer` +
`maximum: 9007199254740991`) because newer in-range zod minors serialize
`.int()` with bounds. Consequences: (a) a server's tool contract is a function
of (server version, resolved schema-dep versions), not server version alone -
an in-range zod minor can rewrite contracts with NO server release; (b) the
whole-history scanner re-resolves floating deps per version, so pair diffs can
under-report (2.1.2-with-today's-zod vs 3.0.5 nearly coincide -> all-notation,
while a like-for-like install shows real BREAKINGs).

- Record, per captured version in `contractOfVersion`, the resolved versions
  of schema-affecting deps (`zod`, `@modelcontextprotocol/*`) next to the
  contract; surface "deps resolved differently" on pairs where they changed.
- Try a strict dep install first; fall back to `--legacy-peer-deps` only on
  ERESOLVE, and mark the contract as legacy-resolved.
- Diff pages should state dep provenance - "captured against zod X.Y.Z".

## Paywall-introduction grade (R31 - SHIPPED in 1.4.0 draft, 2026-10-12)

Verified gap: zero monetization vocabulary anywhere in `pins.js`/`advisory.js`
(paid/pricing/paywall/subscription/billing/credits - no hits). A
"now requires a paid plan" rewrite is schema-silent, so today it grades
NOTATION ("harmless dialect switch") - operationally wrong: the tool the
user approved is no longer the tool they get. heldfast reports 58 of their
66 review-events are exactly this class; we have no signal for it at all.

- New prose-level warning, sibling of guard-parameter warnings in
  `compareTools` (which already exposes `oldDescription`/`newDescription`):
  `MONETIZATION_PATTERNS` fires on ADDED text - "requires a paid plan",
  "subscription required", "free tier removed", "upgrade to Pro/Premium",
  "credits" + purchase/deplete, "per-call pricing", 402 mentions.
- Anchored phrases only, never bare price words: finance tools describe
  prices as their SUBJECT ("flight prices"), so `price|pricing` alone must
  never trigger. Introduction = present in new prose, absent in old.
- Additive flag (`[PAYWALL]` line + `paywall: true` in JSON) like guard
  warnings; does not overwrite the schema-direction grade (schema BREAKING
  stays BREAKING, paywall rides alongside).
- Schema-side companion signal: a NEW required `api_key`/`token` param
  appearing together with monetization prose = stronger evidence.
- Not an ATR rule (economics, not attack) - PIN-SPEC territory instead.

## Release hygiene (from review 42)

- **Native binaries must be built from a clean tree** (ideally the tag): the
  1.1.0 exe was built from a dirty tree (`vcs.modified=true`). Add a build
  step that refuses `go build` when `git status` is dirty, or always build
  from the tag checkout.

## Router-union diff (R2, R5, R4 - from field scans, 2026-10-11)

These three are related: they all concern const-discriminated unions
(anyOf/oneOf with `operation.const` discriminators), which Netlify,
LaunchDarkly, and others use as their primary schema pattern.

- **R2 OPERATIONS-CHANGED**: detect const-discriminated unions in
  inputSchema and report "branch added: get-team-env-vars" / "branch moved:
  initialize-database (updater -> reader)" instead of raw BREAKING. This
  is the vendor's language and makes the flagship case one line of output.
- **R5 nested required**: schemaDiff currently only checks top-level
  `required`. When required changes INSIDE a union branch (e.g.
  `required:["operation","params"]` -> `required:["operation"]`), the
  semantics ("params became optional" = LOOSENED) are invisible.
- **R4 anyOf <-> oneOr with same branches**: MongoDB changed items.anyOf
  to items.oneOf with identical branches. Detect the key swap, compare
  branch content, and grade as NOTATION if branches are identical.
  Fixture: corpus/06 (planned).

## Resource/prompt content pinning (R13, from hostinger field scans)

- Currently `resources/read` and `prompts/get` CONTENT is not pinned (only
  the envelope from list calls). A vendor can silently change the TEXT of
  a SKILL.md resource while keeping the same URI - the pin doesn't move.
  Fix: sha-256 the content of text/* resources (with a size cap) and prompt
  templates, optionally opt-in. This is exactly our threat model.

## outputSchema pinning (R14, from github-mcp-server field scans)

- GitHub's 123/131 tool changes were ALL outputSchema additions (Go SDK
  artifact). We don't pin outputSchema at all - this is the static half of
  response-shape. Fix: pin outputSchema with a separate hash, grade
  additions as NOTATION (SDK waves) vs real output narrowings.

## History UX (R15, R16, R17 - lower priority)

- **R15 error taxonomy**: expo showed 9/10 unreachable for 3 different
  reasons (git-deps, crash, timeout). R12's classifyUnreachable partially
  addresses this; extend to the UI/report layer.
- **R16 SDK artifact pattern library**: codify bounds ±2^53-1, anyOf↔oneOf,
  key order as auto-NOTATION rules with corpus fixtures. Partly covered by
  P3-P6 gradation; bounds specifically need a rule.
- **R17 conditional tool advertising**: Azure documents showing azqr tool
  only when azqr CLI >= 3.0 is installed. Together with per-UA surfaces
  (Netlify), this is the second documented way to serve different contracts.
  Add an advisory signal for "only available if/when installed" in tool
  descriptions.

## Weekly for remote endpoints (R18)

- Azure's hosted server gets updates BEFORE npm. `scan --url` already pins
  remote endpoints ad-hoc; the weekly tracker only monitors npm channels.
  Add a "remote" type to watch-list (url + headers from secrets).

## Ideas taken from KyttoMCP review (07.10, config-manager neighbor)

- **`rugsnare pin-config`**: rewrite unpinned npx/uvx/@latest entries in MCP
  configs to exact versions (+ record in pins). We preach against floating
  versions (floating.js); close the loop by fixing them.
- **Client tool-limit footprint**: "server exposes N tools; VS Code caps at
  128" advisory line in scan output.
- **Digest-check before config writes**: wrap/unwrap should refuse to write
  if the config file changed externally since we read it (we keep backups;
  add the guard).
- **Comment/order-preserving config edits**: their span-level writes keep
  comments; our JSON.stringify likely flattens JSONC. Audit wrap on
  VS Code-style configs.
- Their open issues #12 (raw schema diff, key-reorder false positives) and
  #13 (no bidi detection) are solved here (canonical hashing, A13) -
  positioning talking points, not work items.

## History scanner gaps (found while verifying the survey post, 07.10)

The survey reproduction exposed three honest limits of `rugsnare history`:

- **Env-gated servers** (currents, hubspot): they refuse to boot without
  credentials, so tools/list is unreachable. Idea: `--stub-env` mode that
  injects obviously-fake values (CURRENTS_API_KEY=rugsnare-stub) - servers
  that only check presence will enumerate tools; servers that validate
  against an API still won't. Document which class each falls into.
- **Native modules** (azure-devops/mcp via keytar): the binary is built by
  install scripts, which --ignore-scripts forbids by design. The scan should
  report "requires native build - excluded" instead of a bare start failure,
  so users know why.
- **Resources/skills drift**: hostinger injected 6 SKILL.md resources - a
  real rug vector our history ignores (tools only today). Extend
  diffVersionContracts with resources/list and prompts/list counts.

## History scanning (`rugsnare history` + rugsnare.com/#history, added in 1.1.0)

What exists: CLI runs every version locally (runtime truth, was/became per
tool); the website form runs a static scan in a Worker (tarballs parsed,
name/description literals diffed, nothing executed, last 5 versions); the
"Runtime scan" button dispatches the same CLI into an ephemeral GitHub
Actions runner (repository_dispatch, serialized queue, result committed to
scans/history/, run log = public evidence).

- **Rate limiting is isolate-local today** (per-worker-instance Map). Move
  the bucket to KV or Durable Objects for a real global limit once traffic
  justifies it.

- **Cache per package@version.** The Worker re-downloads tarballs on every
  request. A KV namespace (contract extracts keyed by package@version) makes
  rescans instant and cuts npm traffic; invalidate by tarball shasum.
- **Runtime-exact scan as a hosted service.** The real gap vs the CLI. Needs
  sandboxed execution (containers/Durable Objects with strict limits) - a
  much bigger commitment than the static Worker; keep the CLI as the source
  of truth until there is a reason to host execution.
- **Static schema extraction.** The Worker diffs descriptions today; schemas
  are visible in the same literals (`inputSchema: {...}`) and could be
  hashed for BREAKING detection - medium-effort regex/JSON.parse work.
- **Per-version advisory score.** The advisory engine (A01-A18) could score
  each historical version's contracts, surfacing "this package's tool prose
  has always smelled of exfiltration" as a timeline.
- **Pre-adoption gate recipe.** `history` + `scan` in a pre-install check
  script (`npx rugsnare history <pkg> --last 5 && npx rugsnare scan --url
  ...`) documented as the "trust a new server" flow.

## Scheduled checks (`native install-schedule`, added in 1.1.0)

What exists: Startup-folder shortcut (logon) + schtasks DAILY task (12:00),
both running `<exe> check -quiet`. Silent when clean, report + browser when
drift. No admin rights, no resident process.

- **The console flash.** A scheduled console app shows a black window for
  1-2 seconds at logon and noon. Options when it starts bothering people:
  (a) a companion build with `-ldflags -H windowsgui` that shares the same
  source but has no console - used only by the scheduled command; (b) a
  VBS/wscript shim that launches the exe hidden (classic, ugly, works).
  Prefer (a): two build targets, one source.
- **The right hook is the platform, not the clock.** The moment of danger is
  "agent is about to read the skills", not "it is noon". Claude Code has
  SessionStart hooks; Cursor/others have their own lifecycle points. A
  `rugsnare-skills hook install claude-code` that registers our check into
  the platform's own hook system checks at exactly the right time, per
  platform, with zero scheduling. This supersedes the clock when available.
- **macOS / Linux.** launchd plist (~/Library/LaunchAgents/com.rugsnare.skills.plist)
  and a user crontab line respectively. Same `-quiet` command. ~40 lines each,
  untested on real macs - need a machine.
- **MCP half is not scheduled.** The scheduled check covers skills only. The
  npm CLI owns MCP; a scheduled `rugsnare diff` needs a config and possibly
  spawns servers - heavier. When the native launcher grows an MCP-lite mode
  (HTTP-only servers, no spawn), fold it into the same task.
- **Snooze/ack for findings.** A daily browser popup on a finding the user
  already saw and chose to accept will train them to close it blind. An
  `ack` command (writes an acceptance note next to the pin) that silences
  exactly that finding until it changes again.

## Cold-start audit (`auditCurrentSkills` + "Already on your machine", 1.1.0)

What exists: every discovered skill's content is scanned by the advisory
engine (A01-A18) at scan/report time; findings render as a separate amber
section that explicitly says "these predate the baseline, this is not drift".

- **Verify against origin.** The real fix for "poisoned long before install"
  is comparing a marketplace-installed skill against its upstream source
  (the marketplace metadata has the repo). Hash-diff local vs origin =
  either clean, drifted (tampered locally), or upstream-changed. This kills
  the residual TOFU risk the heuristics cannot see. Needs a curated
  mapping of skill origin metadata per platform.
- **Ack per signal.** Same snooze problem as above, per file: "I reviewed
  A06 on this file, stop flagging it" - stored locally, shown as a footnote
  in the report rather than a card.
- **Community signature pack.** The advisory patterns are ours alone. A
  signed, versioned extras file (downloaded on explicit request, never
  automatic - no telemetry) with patterns found in the wild
  (@jadchene-style "Requires confirmation" strips, known exfil domains)
  would sharpen the audit between releases. On-chain version pin of the
  pack would be very on-brand.
- **Shared phrasing with MCP advisories.** The npm CLI's `scan` advisories
  and this audit use the same signals but different presentation. Unify the
  plain-language phrase table (one module, both reports).

## Adjacent notes accumulated during 1.1.0

- **Native update delivery.** The exe knows a newer version exists (footer
  line) but the user must re-download manually. GitHub Releases + a
  `self-update` command (download, verify sha256 against an on-chain pin,
  swap atomically) is the natural end state; do NOT auto-update silently -
  a security tool updating itself without a human click is the exact class
  of event we exist to flag.
- **Version-info resource in the Windows exe.** goversioninfo's .syso is
  rejected by Go 1.27's linker (relocation type 7); icon-only rsrc works.
  If a future Go fixes it, add VERSIONINFO back (FileDescription shows in
  Task Manager; today the scheduled task shows the bare exe name).
- **History cleaning.** The Go toolchain (143 MB) is untracked since review
  32 but still lives in git HISTORY. A dedicated window: git filter-repo
  with a backup, then force-push + fresh tags + npm deprecate nothing
  (npm reads the current tree). Coordinate: Docker Hub auto-builds from
  tags - re-tag after the rewrite.
- **svc/undefined in enforce** (review 32 LOW): never reproduced, no `svc`
  identifier in the source. Keep asking AutoClav for a file:line before
  touching anything.
