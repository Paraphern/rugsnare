# Future improvement notes

Working notes on what the current implementations leave on the table, and the
next step for each. Written as we shipped the feature, so the rationale is
not lost. (Public on purpose — this is a roadmap, not a secret.)

## Release hygiene (from review 42)

- **Native binaries must be built from a clean tree** (ideally the tag): the
  1.1.0 exe was built from a dirty tree (`vcs.modified=true`). Add a build
  step that refuses `go build` when `git status` is dirty, or always build
  from the tag checkout.

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
  #13 (no bidi detection) are solved here (canonical hashing, A13) —
  positioning talking points, not work items.

## History scanner gaps (found while verifying the survey post, 07.10)

The survey reproduction exposed three honest limits of `rugsnare history`:

- **Env-gated servers** (currents, hubspot): they refuse to boot without
  credentials, so tools/list is unreachable. Idea: `--stub-env` mode that
  injects obviously-fake values (CURRENTS_API_KEY=rugsnare-stub) — servers
  that only check presence will enumerate tools; servers that validate
  against an API still won't. Document which class each falls into.
- **Native modules** (azure-devops/mcp via keytar): the binary is built by
  install scripts, which --ignore-scripts forbids by design. The scan should
  report "requires native build — excluded" instead of a bare start failure,
  so users know why.
- **Resources/skills drift**: hostinger injected 6 SKILL.md resources — a
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
  sandboxed execution (containers/Durable Objects with strict limits) — a
  much bigger commitment than the static Worker; keep the CLI as the source
  of truth until there is a reason to host execution.
- **Static schema extraction.** The Worker diffs descriptions today; schemas
  are visible in the same literals (`inputSchema: {...}`) and could be
  hashed for BREAKING detection — medium-effort regex/JSON.parse work.
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
  source but has no console — used only by the scheduled command; (b) a
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
  untested on real macs — need a machine.
- **MCP half is not scheduled.** The scheduled check covers skills only. The
  npm CLI owns MCP; a scheduled `rugsnare diff` needs a config and possibly
  spawns servers — heavier. When the native launcher grows an MCP-lite mode
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
  A06 on this file, stop flagging it" — stored locally, shown as a footnote
  in the report rather than a card.
- **Community signature pack.** The advisory patterns are ours alone. A
  signed, versioned extras file (downloaded on explicit request, never
  automatic — no telemetry) with patterns found in the wild
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
  swap atomically) is the natural end state; do NOT auto-update silently —
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
  tags — re-tag after the rewrite.
- **svc/undefined in enforce** (review 32 LOW): never reproduced, no `svc`
  identifier in the source. Keep asking AutoClav for a file:line before
  touching anything.
