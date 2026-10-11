# @heroku/mcp-server (Heroku / Salesforce) - control

npm 10,678 installs/week - window 1.2.5 -> 1.2.11 (six patch releases).

**Findings: 0.** Six patches, zero contract movement. Second member of the control group (with Notion): patch cadence with stable contracts is the norm the drift findings deviate from.

**Repro**

```bash
npm i @heroku/mcp-server@1.2.5 && npx rugsnare scan --config mcp.json
npm i @heroku/mcp-server@1.2.11 && npx rugsnare diff --config mcp.json   # clean
```

Watched weekly (baseline 1.2.5). Last verified 2026-10-11.
