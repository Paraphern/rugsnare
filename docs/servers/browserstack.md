# browserstack/mcp-server (BrowserStack)

Window v1.4.1 -> v2.2.1. Release velocity: 73 versions, ~40 releases/month.

**Findings: 22** - 17 cosmetic (description-only), 1 BREAKING, 5 NEW tools. Reported with per-class breakdown and a grading proposal in [issue #476](https://github.com/browserstack/mcp-server/issues/476).

The cosmetic mass matters operationally: pinned CI gates fire on every one of them, which is why direction grading (separate NOTATION/COSMETIC from BREAKING) is the difference between a usable gate and alert fatigue at this release velocity.

**Repro**

```bash
npm i @browserstack/mcp-server@1.4.1 && npx rugsnare scan --config mcp.json
npm i @browserstack/mcp-server@2.2.1 && npx rugsnare diff --config mcp.json   # 22 findings, exit 1
```

Last verified 2026-10-10 (issue open, no vendor response).
