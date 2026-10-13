# browserstack/mcp-server (BrowserStack)

Window v1.4.1 -> v2.2.1. Release velocity: 73 versions, ~40 releases/month.

**Findings: 24** on rugsnare 1.3.0 (was 22 on 1.2.0: the recursive decomposer reaches two more nested constraint changes). Class split on the 1.3.0 run: cosmetic-heavy plus BREAKING and NEW tools - originally reported with per-class breakdown and a grading proposal in [issue #476](https://github.com/browserstack/mcp-server/issues/476).

The cosmetic mass matters operationally: pinned CI gates fire on every one of them, which is why direction grading (separate NOTATION/COSMETIC from BREAKING) is the difference between a usable gate and alert fatigue at this release velocity.

**Repro** (boot needs credentials present; dummy values suffice for contract capture)

```bash
mkdir bs && cd bs && npm init -y
# mcp.json: {"mcpServers":{"browserstack":{"command":"node","args":["node_modules/@browserstack/mcp-server/dist/index.js"],"env":{"BROWSERSTACK_USERNAME":"dummy_for_scan","BROWSERSTACK_ACCESS_KEY":"dummy_for_scan"}}}}
npm i @browserstack/mcp-server@1.4.1 && npx rugsnare@1.3.0 scan --config mcp.json --timeout 60000
npm i @browserstack/mcp-server@2.2.1 && npx rugsnare@1.3.0 diff --config mcp.json --timeout 60000   # 24 findings, exit 1
```

Last verified 2026-10-13 (re-graded on rugsnare 1.3.0; issue #476 open, no vendor response; npm already shows 2.2.2 - next drift-watch window).
