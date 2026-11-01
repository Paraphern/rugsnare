# @heroku/mcp-server (Heroku / Salesforce) - control

npm 10,678 installs/week - window 1.2.5 -> 1.2.11 (six patch releases).

**Findings: 0.** Six patches, zero contract movement. Second member of the control group (with Notion): patch cadence with stable contracts is the norm the drift findings deviate from.

**Repro**

```bash
npm i @heroku/mcp-server@1.2.5 && npx rugsnare scan --config mcp.json
npm i @heroku/mcp-server@1.2.11 && npx rugsnare diff --config mcp.json   # clean
```

Watched weekly (baseline 1.2.5). Last verified 2026-10-11.


## 2026-10-30 window

1.2.5 -> 1.2.12: 1 finding (the first movement inside the control group; graded, rugsnare 1.4.3).

## 2026-10-31 window

1.2.5 -> 1.2.13: 33 findings - **the control group breaks**. Patch 1.2.13 drops `additionalProperties: false` from every one of the 33 tool input schemas in a single release (all LOOSENED; 1 -> 33 through one patch). Strictness flags disappearing wholesale is precisely the silent-constraint-removal class this corpus exists to catch. Pins: audits/drift-watch/pins/heroku@1.2.13.json. See audits/drift-watch/2026-10-31.md.
