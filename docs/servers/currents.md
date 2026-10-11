# @currents/mcp (Currents)

npm 102,850 installs/week - window 2.3.3 -> 2.6.1 (minor releases).

**Findings: 45** - 37 drifts (predominantly schema-level at audit time), 7 new tools, 1 gone. The changelog never uses the word "breaking" despite the volume of schema movement on the currents-*-action tool family.

Example drift set from the audit excerpt: `currents-list-actions`, `currents-create-action`, `currents-get-action`, `currents-update-action`, `currents-delete-action`, `currents-enable-action`, `currents-disable-action`, `currents-list-affected-tests`, `currents-get-projects`, `currents-get-project` - plus NEW `currents-get-action-executions`.

**Repro**

```bash
npm i @currents/mcp@2.3.3 && npx rugsnare scan --config mcp.json
npm i @currents/mcp@2.6.1 && npx rugsnare diff --config mcp.json   # 45 findings, exit 1
```

Watched weekly (baseline 2.3.3). Last verified 2026-10-11 (counts from the audit; per-direction re-grade pending the 1.2.0 grading pass).
