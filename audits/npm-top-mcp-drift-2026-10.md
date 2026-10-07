# npm MCP Top: Silent Drift Audit (October 2026)

**Date:** 2026-10-07 · **Tool:** rugsnare@1.0.1 · **Method:** pin the approved version, run the update, diff the contract. Exit 1 = the contract your agent sees no longer matches the one you approved.

**Total: 218 silent contract changes found across the most-installed MCP servers on npm.**

This report documents *what changed* and *whether the publisher announced it*. It does not allege intent: most findings are process failures (breaking changes shipped in minor versions, unannounced), not malice. Every number below is reproducible with the commands in each section.

## Scoreboard

| server | installs/week* | window | findings | announced? |
|---|---|---|---|---|
| [@azure-devops/mcp](https://www.npmjs.com/package/@azure-devops/mcp) (Microsoft) | 120,379 | 2.5.0 → 2.10.0 (6 months of minors) | **110**: 75 tools GONE, 29 NEW, 6 BREAKING drifts | warning shipped one version *after* the change |
| [chrome-devtools-mcp](https://www.npmjs.com/package/chrome-devtools-mcp) (Chrome DevTools team) | 1,731,154 | 1.8.0 → 1.10.1 (5 weeks) | **30**: 28 schema changes + 1 cosmetic + 1 new tool; **file-write security story inconsistent across changelog/blog/behavior since 1.9.0** | changelog + blog + docs mutually inconsistent |
| [@currents/mcp](https://www.npmjs.com/package/@currents/mcp) | 102,850 | 2.3.3 → 2.6.1 (minors) | **45**: 37 drifts (mostly BREAKING), 7 new, 1 gone | changelog never says "breaking" |
| [hostinger-api-mcp](https://www.npmjs.com/package/hostinger-api-mcp) | 264,539 | 2.4.0 → 2.9.0 (one week, 6 releases) | **6**: agent-skill (SKILL.md) resources injected | not mentioned in docs or changelog |
| [@hubspot/mcp-server](https://www.npmjs.com/package/@hubspot/mcp-server) | 37,206 | 0.1.0 → 0.4.0 (2025, pre-1.0) | 23: 15 drifts, 6 new, 2 gone | old window; package dormant since Jun 2025 |
| [@pandacss/mcp](https://www.npmjs.com/package/@pandacss/mcp) | 299,268 | 1.12.0 → 2.1.2 (**major**) | 4 BREAKING | legitimate - this is semver compliance, kept as control |
| [@notionhq/notion-mcp-server](https://www.npmjs.com/package/@notionhq/notion-mcp-server) (official Notion) | 195,447 | 2.4.1 → 2.5.2 (3 months) | **0** | - |
| [@heroku/mcp-server](https://www.npmjs.com/package/@heroku/mcp-server) | 10,678 | 1.2.5 → 1.2.11 (six patches) | **0** | - |
| [@upstash/context7-mcp](https://www.npmjs.com/package/@upstash/context7-mcp) | 485,755 | 4.0.4 → 4.1.3 | **0** | - |

\* npm registry downloads, week ending 2026-10-07.

Could not scan (scanner limitations, not findings): `@sentry/mcp-server` (startup exceeds the 15s scan timeout), `@supabase/mcp-server-supabase` (exits without live credentials).

Notion, Heroku and Context7 are the control group: fast-moving vendors with zero contract drift on their windows. Disciplined publishing exists. This audit separates it from the silent kind.

## Case 1: @azure-devops/mcp - the tool contract was rebuilt in minor releases

Between 2.5.0 (2026-03-18) and 2.10.0 (2026-09-09):

- **75 tools removed**: `work_list_team_iterations`, `work_create_iterations`, `work_assign_iterations`, `work_get_team_capacity`, `work_update_team_capacity`, `pipelines_get_build_definitions`, `pipelines_create_pipeline`, `pipelines_get_builds`, `pipelines_get_build_log`, `pipelines_get_build_changes`, `pipelines_run_pipeline`, most of the `repo_*` and `wiki_*` and `wit_*` families...
- **29 tools added** under a new naming scheme with a read/write split: `work`, `work_iteration_write`, `work_capacity_write`, `pipelines_build`, `pipelines_run`, `pipelines_write`, `repo_repository`, `repo_pull_request`, `repo_pull_request_write`...
- **6 tools rewritten (BREAKING)**. Hardest: `repo_search_commits` - 5 parameters added, **15 removed** (`fromCommit`, `toCommit`, `version`, `versionType`, `includeLinks`, `includeWorkItems`, `authorEmail`, `committer`, `committerEmail`, `fromDate`, `toDate`, `commitIds`, `historySimplificationMode`...), 3 type changes (`project`: string → untyped; `repository`: string → array; `author`: string → array).

Users broke: [issue #1448 - "Local MCP tools rename breaks allowed-tools for skills and tools for agents"](https://github.com/microsoft/azure-devops-mcp/issues/1448). Allowlists across the board started pointing at dead names.

Announcements: [2.9.0](https://github.com/microsoft/azure-devops-mcp/releases) shipped five "tool consolidation" PRs (#1423, #1428, #1431, #1435, #1443) with no breaking-change mention; the warning ("Update README warning for tool consolidation and breaking changes", #1476) landed in 2.10.0, after the fact. The [npm page](https://www.npmjs.com/package/@azure-devops/mcp) currently advises: *"If this is a breaking change for your agents or skills, you can temporarily pin the version to @azure-devops/mcp@2.8.1."*

Risk beyond inconvenience: (1) allowlists retain 75 dead names - a future (or tampered) release reusing an old name inherits stale trust; (2) the rename redrew the read/write boundary - a pre-rename `pipelines_*` allowlist pattern now matches write tools that didn't exist when it was written; (3) `string → untyped` is where validation quietly stops protecting.

**Repro** (note: 2.10.0 pulls `keytar`, a native OS-keychain module - with `--ignore-scripts` it needs a rebuild to start; that dependency arriving silently in a minor is its own finding):

```bash
npm i -g rugsnare
mkdir ado-check && cd ado-check
npm i --ignore-scripts @azure-devops/mcp@2.5.0

cat > mcp.json <<'EOF'
{ "mcpServers": { "azure-devops": {
    "command": "node",
    "args": ["node_modules/@azure-devops/mcp/dist/index.js", "dummy-org", "--authentication", "envvar"],
    "env": { "AZURE_DEVOPS_EXT_PAT": "dummy_for_scan" } } } }
EOF

rugsnare scan --config mcp.json
npm i --ignore-scripts @azure-devops/mcp@2.10.0
npm rebuild keytar
rugsnare diff --config mcp.json        # DRIFT DETECTED (110 findings), exit 1
```

## Case 2: chrome-devtools-mcp - #1 on npm, file-write sandbox off by default

1,731,154 installs/week. Maintainers include the Chrome DevTools team (`google-wombot` is an npm maintainer).

Findings 1.8.0 → 1.10.1, decomposed honestly:

1. **28 tools flagged BREAKING** - schema serialization changed across the board (declared dialect draft-07 → 2020-12, `additionalProperties` form, key order) from the MCP SDK v2 migration. A normalized diff shows 6 tools with edits beyond the dialect/ordering (fill_form, list_console_messages, list_network_requests, navigate_page, new_page, wait_for); spot-checked top-level parameters were unchanged. Mechanical - but every hash-level gate fires, and nothing was labeled breaking.
2. **1 new tool** (`get_css_styles`) - announced in the changelog.
3. **The file-write security story stopped matching (not mechanical):** 1.8.0 prints at startup:

   > File-writing tools will be restricted to the OS temp directory.

   From 1.9.0 on, that warning is gone. What actually happened to the restriction depends on which source you believe - and that inconsistency is the finding:

   - [CHANGELOG 1.9.0](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/CHANGELOG.md): "Add --allow-unrestricted-paths by default for CLI" (PR #2618)
   - [official Chrome blog](https://developer.chrome.com/blog/new-in-devtools-october-2026): "The CLI now includes --allow-unrestricted-paths by default"
   - [configuration docs](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/configuration.md): still document the flag default as `false` and describe the temp-dir restriction as the safety behavior ("Use this only when connecting a trusted local client")
   - observed behavior per the repo's own open issues: [#2917](https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/2917) reports writes outside temp still refused under default flags (the startup warning never prints - guard bug), while [#2909](https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/2909) reports `--allowUnrestrictedPaths=false` failing to restrict

   An operator reading the changelog, the blog and `--help` gets three different stories about the same security property, and the one signal that stated it at runtime - the startup warning - went silent in a minor update. Whatever the intended semantics, "which files can my agent write" became unauditable from the outside between 1.8.0 and 1.10.1. A drift gate is how an operator would even notice the story changed.

**Repro:**

```bash
mkdir cdt-check && cd cdt-check
npm i --ignore-scripts chrome-devtools-mcp@1.8.0

cat > mcp.json <<'EOF'
{ "mcpServers": { "chrome-devtools": {
    "command": "node",
    "args": ["node_modules/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp.js"] } } }
EOF

rugsnare scan --config mcp.json        # banner includes: "File-writing tools will be restricted to the OS temp directory."
npm i --ignore-scripts chrome-devtools-mcp@1.10.1
rugsnare diff --config mcp.json        # DRIFT DETECTED (30 findings), exit 1; startup banner restriction is gone
```

## Case 3: hostinger-api-mcp - instructions injected into the contract

Three generic tools (search / execute / multi-execute, up to 20 chained operations with result pass-through), per their [changelog](https://www.hostinger.com/changelog/hostinger-mcp-now-uses-a-three-tool-interface). Between 2.4.0 (2026-09-29) and 2.9.0 (2026-10-07) - six releases in ~9 days - the contract gained **six SKILL.md resources**: `audit-hosting`, `connect-domain`, `deploy-to-hosting`, `maintain-wordpress`, `migrate-to-hosting`, `troubleshoot-website`; full behavioral playbooks for the agent, trigger phrases included ("Triggers: deploy this project, push my app live...").

The tool schemas did not change at all - schema-only gates see nothing. The instruction layer changed, and the instruction layer is what the agent obeys. The API token [inherits the full permissions of the creating user](https://docs.hostinger.com/api-reference/overview) (DNS, billing, VPS).

**Repro:** same pattern with `hostinger-api-mcp@2.4.0` → `@2.9.0`, entry `node_modules/hostinger-api-mcp/src/servers/all.js`, env `HOSTINGER_API_KEY=dummy_for_scan`. Result: DRIFT DETECTED (6 findings), exit 1.

## Case 4: @currents/mcp - 45 findings, zero "breaking" in the changelog

CI tooling. Every action tool drifted across minors 2.3.3 → 2.6.1 (2026-06-15 → 2026-09-23): quarantine/skip/tag actions, webhooks, jira actions, run management - 37 drifts (mostly BREAKING schema changes), 7 new tools, 1 removed. The [changelog](https://currents.dev/changelog) is cheerful and never says "breaking". An agent driving CI quarantines against a stale schema is a 3 a.m. failure with no humans in the room.

**Repro:** `@currents/mcp@2.3.3` → `@2.6.1`, entry `node_modules/@currents/mcp/dist/index.mjs`, env `CURRENTS_API_KEY=dummy_for_scan`, `CURRENTS_PROJECT_ID=dummy`. Result: DRIFT DETECTED (45 findings), exit 1.

## Notes on the rest

- **@hubspot/mcp-server**: 23 findings on a 2025 pre-1.0 window; the package has no repository field and has been dormant since June 2025. Included for completeness, excluded from claims about current behavior.
- **@pandacss/mcp**: 4 BREAKING findings across a genuine major version bump (1.12 → 2.1). This is what compliance looks like; kept as the control.
- **Clean**: official Notion (3 months), Heroku (six patches), Context7. `@sentry/mcp-server` and `@supabase/mcp-server-supabase` could not be scanned with dummy credentials.

## Related

- Prior backtest of the four official `@modelcontextprotocol/server-*` reference servers: 66 version pairs, **140 silent changes** - [SILENT-CHANGES-REPORT.md](../repro/SILENT-CHANGES-REPORT.md) (if present in this checkout).
- Public attack corpus (benign server + silently poisoned twin): [`corpus/`](../corpus/)
- Weekly automated follow-up of this watch list: [WEEKLY.md](WEEKLY.md) (updated by CI every Monday).

## License / reuse

Findings are factual contract diffs produced by an open-source tool; cite freely with a link. Mistakes are ours: if a vendor shipped an announcement we missed, PRs to this file are welcome and will be merged with a correction note.
