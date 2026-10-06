# Future improvement notes

Working notes on what the current implementations leave on the table, and the
next step for each. Written as we shipped the feature, so the rationale is
not lost. (Public on purpose — this is a roadmap, not a secret.)

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
