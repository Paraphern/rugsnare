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


## 2026-10-24 window

1.4.1 -> 2.2.7: 30 findings (graded, rugsnare 1.4.3; pins at audits/drift-watch/pins/browserstack@2.2.7.json). Cumulative corpus total: 351 across the 22 servers. See audits/drift-watch/2026-10-24.md.


## 2026-10-30 window

1.4.1 -> 2.4.1: 33 findings (accessibility suite keeps moving; vendor thread #476 now further behind the corpus).


## 2026-10-31 window

1.4.1 -> 2.4.5: 42 findings (was 33; 5 BREAKING - fetchAccessibilityIssues, setupBrowserStackAutomateTests among them - + 17 COSMETIC + 13 NOTATION + 1 EXPANDED + 6 NEW; tool count 46 -> 52). The accessibility surface is now the fastest-moving target in the corpus; #476 still open. Pins: audits/drift-watch/pins/browserstack@2.4.5.json. See audits/drift-watch/2026-10-31.md.


## 2026-11-07 window

1.4.1 -> 2.6.5: 45 findings (was 42; 7 BREAKING + 15 COSMETIC + 15 NOTATION + 1 EXPANDED + 1 LOOSENED + 6 NEW; 46 -> 52 tools). The accessibility suite keeps compounding; #476 still open. Pins: audits/drift-watch/pins/browserstack@2.6.5.json. See audits/drift-watch/2026-11-07.md.
