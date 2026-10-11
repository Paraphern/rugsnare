# @sentry/mcp-server (Sentry)

npm 99,513 installs/week. Verified window 0.38.0 -> 0.42.0 (npm latest; no 0.43+ exists).

**Findings (3, all benign, self-documented inside the contracts):**

- 0.39.0: `get_sentry_resource` - "AI conversation" renamed to "agent conversation" (description + param description)
- 0.40.0: `update_issue.assignedTo` widened `string` -> `string|null` (unassign added); `search_events` description rewritten (two -> three query modes; schema byte-identical)

**Documentation gap**: every GitHub release body in the npm line is empty, and the repository moved into [getsentry/toolkit](https://github.com/getsentry/toolkit), so npm consumers have no release-notes channel. A third-party drift report on the hosted surface ([toolkit #1454](https://github.com/getsentry/toolkit/issues/1454)) was closed not-planned.

**Coming**: toolkit PR [#1374](https://github.com/getsentry/toolkit/pull/1374) (merged 2026-10-02) splits `search_events` into six dataset-specific tools (`search_errors`, `search_logs`, `search_traces`, `search_metrics`, `search_profiles`, `search_replays`), growing the direct surface 9 -> 14. When the next npm version ships it, `search_events` callers break with no npm-level channel announcing it.

**Repro**

```bash
npm i @sentry/mcp-server@0.39.0 && npx rugsnare scan --config mcp.json
npm i @sentry/mcp-server@0.40.0 && npx rugsnare diff --config mcp.json   # 2 findings, exit 1
# config args: node node_modules/@sentry/mcp-server/dist/index.js --access-token=dummy
```

Watched weekly (baseline 0.42.0). Last verified 2026-10-11.
