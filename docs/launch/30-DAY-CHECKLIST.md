# 30-day checklist — proposed goals, not measurements

Day1 begins only after owner approval and release-readiness gates are cleared. No dates are committed while readiness is HOLD. All publication, outreach, deployment and release actions require separate authorization.

| Window | Work / gate | Proposed measurable target | Actual at preparation |
|---|---|---|---|
| Before day1 | Reconcile npm/tag/source/site/changelog, decide reviewed security fixes, verify artifact/CI, check live site and HN history | All release blockers cleared with evidence links | Not cleared; see READINESS.md |
| Days1–7 | Owner reviews one technical article and one community submission; use the local demo | One approved channel; five substantive technical feedback items | No posts sent; feedback not measured |
| Days8–14 | Triage feedback; prepare optional fixture-only CI integrations with consent | Two reproducible external CI examples | Zero examples verified by this launch check |
| Days15–21 | Review false positives and version-labelled reproduction reports; request only voluntary install reports | Five opt-in reports naming version, OS and outcome | Not measured; no telemetry inferred |
| Days22–30 | Publish an owner-approved retrospective only if evidence warrants it | Summarize accepted corrections, CI examples, unresolved limits | Not started |

Optional awareness goal:30 additional GitHub stars in30 days. Record an explicit starting snapshot when the owner authorizes launch; current stars and growth were not measured here. Stars are not installations, security assurance, or unique users.

For opt-in reports, request only version, OS/Node, reproducible command/outcome and an optional public CI URL. Do not request tokens, production prompts, private tool schemas or personal identifiers. Link public reports rather than building a user-tracking database; obtain consent before quoting anyone. npm download totals are download events, not unique active users. Separate targets, observed counts, dates and denominators in every retrospective.

Stop/hold criteria: release-version mismatch; absent artifact verification; unresolved disclosure/approval gate; broken install/demo; unexplained CI failure; live site unavailable to intended visitors; channel rules prohibit the proposed post. Prefer correcting evidence over adding channels. Do not revive stale outreach or repost to compensate for missing results.
