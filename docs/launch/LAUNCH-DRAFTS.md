# Launch assets — DRAFT, DO NOT POST OR SEND

Use only after the owner clears [readiness gates](READINESS.md). Version verified on2026-11-06: npm1.5.0. Recheck before publication. Nothing here represents a posted campaign, an endorsement, or permission to contact anyone.

## Inventory and reuse

This consolidates existing `content/reddit-r-mcp-launch-v2.md`, `content/x-thread-launch.md`, and `tools/launch-anchor-drafts-2026-10-25.md`. Those notes report two previous Show HN submissions; check their actual history and HN rules before proposing a third. `tools/github-interactions-log.md` records earlier1MCP contact: inspect it and the current thread before any follow-up. Do not duplicate the old outreach queue. No new campaign is scheduled.

## Landing hero proposal

**Detect MCP tool changes after approval.**
Record approved tool contracts, compare later observations, and review the differences in your terminal or CI. Contract drift can be benign; it still deserves an explanation.

CTA: Try the [local-fixture demo](READINESS.md#reproduce). Verified package: `rugsnare@1.5.0`. Proposed security improvements in #16/#17/#20 are not in that package. A contract comparison is not a guarantee against malicious behavior with an unchanged contract.

## Show HN submission draft

Title: **Show HN: RugSnare – detect MCP tool changes after approval**

URL: https://github.com/Paraphern/rugsnare

Owner gate: prior Show HN history may make a fresh submission inappropriate. A technical update to an existing thread may be preferable; obtain eligibility guidance before acting.

First technical comment:

> I maintain RugSnare, an Apache-2.0 CLI for recording MCP tool contracts and comparing later observations against an approved baseline. It provides readable description/schema changes and a nonzero CI verdict. Changes can come from SDK serialization, routine API evolution, or poisoned definitions; a finding does not tell us which.
>
> For the artifact checked today, the pinned install is `npm install --prefix ./launch-install --ignore-scripts --no-audit --no-fund rugsnare@1.5.0`. From a repository checkout, `python3 docs/launch/demo.py --cli ./launch-install/node_modules/rugsnare/src/cli.js` runs an inert local server, records a baseline, changes one description, and observes exit1. An unchanged response exits0; configuration errors2 and unavailable fixtures3 must be handled separately. Install time is outside the measured demo.
>
> The historical October npm-top report recorded218 findings; the November weekly report has a different cohort/window and reports294. Neither is an attack count. The Chrome schema wave was regraded as notation, and several per-server snapshots were corrected after dirty-stand artifacts were found. Those corrections and their provenance matter more than a large headline.
>
> Limits: contract pins do not establish behavior or intent, trust depends on the baseline and verification keys, and replay executes tool calls. The release matrix explicitly separates npm1.5.0 from newer source/Draft changes. I'd welcome reproducible false positives and feedback about integrating readable contract review into CI. No usage telemetry is required.

## DEV article draft

### MCP contract drift deserves a readable review, not an attack counter

An MCP client reads more than a tool name. Descriptions influence how an agent uses a tool, while input schemas define what arguments it can send. Those definitions can change between observations even when a launch command or the remote endpoint stays the same. Recording the approved contract gives the operator something concrete to compare.

RugSnare's workflow is intentionally simple: scan a local fixture to record its contract, observe it again with diff, and inspect the change. The published artifact checked for this draft is1.5.0. The repository also contains newer source and security Draft PRs, so this article must not imply that every fix visible on GitHub has reached npm.

The accompanying local demo uses a server generated in a temporary directory. It returns one tool, then changes only that tool's description. The verified package reports a COSMETIC drift and exit1. No SSH keys, network services, or production tools are needed to show the workflow. A clean comparison exits0; an invalid config exits2; an unavailable fixture exits3. Treating every nonzero outcome as a discovered attack would erase useful distinctions.

The same distinction matters for research totals. The repository's2026-10-07 npm-top report records218 findings across its selected windows. The2026-11-02 weekly follow-up reports294 over nine baseline-to-latest comparisons. A separate reference-server study reports140 findings across66 version pairs. Different windows and denominators cannot be added together or treated as a longitudinal count of unique attacks. These are historical reports with reproducible methods, not fresh measurements performed for this article.

Corrections are part of the method. Chrome's28-schema wave was regraded as notation rather than28 breaking parameter changes. Currents, Shopify and Netlify pages document corrected snapshots after stale tools from dirty stands were identified. Likewise, HISTOR's author corrected the remote-server statistic:2,489 of6,822 unique hosts, approximately36.5%, changed their tool list during24September–20October. The original45% described registry entries, including many near-identical entries of one publisher. Package statistics were unaffected. Link these corrections rather than repeating the most dramatic earlier wording.

A contract pin is one integrity control. It does not prove the publisher's intentions or detect arbitrary semantic changes behind an unchanged definition. An operator still needs a trustworthy baseline, controlled credentials and a decision about what should happen when verification fails. Replay is execution and belongs in a sandbox when there may be side effects. Public launch material should state these limits alongside the successful demo.

The next useful evidence is modest: reproducible CI integrations, concrete false-positive reports, and voluntary installation reports that name the tested version and environment. npm downloads and GitHub stars are useful context, not a measurement of unique active CLI users. No promotional post should imply such a measurement without an explicit, privacy-respecting method.

Sources: [release matrix and demo](READINESS.md), [historical report](../../audits/npm-top-mcp-drift-2026-10.md), [weekly report](../../audits/WEEKLY.md), [reference-server study](../../repro/SILENT-CHANGES-REPORT.md), [vendor corrections](../servers/README.md), [HISTOR correction](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3431#issuecomment-6585777647).

## Short community variant

Maintainer disclosure: I work on RugSnare, an open-source MCP contract comparison CLI. I prepared an inert local demo showing scan0, unchanged diff0, and a description-only drift1 with the verified npm1.5.0 artifact. It compares definitions; it cannot infer malicious intent or prove behavior is unchanged. I'm looking for reproducible contract-review/false-positive feedback. If this community permits project links, the demo and release-readiness record are in the repository. Check current self-promotion rules and prior posts before submitting; don't cross-post this verbatim.

## Outreach drafts — never sent

**1MCP maintainer follow-up, only if a new relevant thread warrants it**

Subject: Optional reproducible contract-review fixture for aggregated MCP servers

I maintain RugSnare and have a small local fixture for recording and diffing an upstream tool contract. Would a version-labelled contract snapshot/diff example be useful alongside1MCP's upstream integration tests? I can propose an optional example that keeps routing and approval ownership with your project; it would not require telemetry or a product dependency. The checked CLI artifact is1.5.0, and newer security work remains in Draft. Before sending, I will check our earlier1MCP interaction so this is not a duplicate request. No reply is expected unless this fits your roadmap.

**CI integration partner, only after a successful local pilot**

Would a minimal, opt-in CI example for readable MCP definition changes help your maintainers? I can prepare a fixture-only PR with explicit version and exit-code handling, plus known limits. We would link your accepted example only with permission. No claim of partnership or endorsement is made here.
