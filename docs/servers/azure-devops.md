# @azure-devops/mcp (Microsoft)

npm 120,379 installs/week - window 2.5.0 -> 2.10.0 (six months of minor releases).

**Findings: 110** - 75 tools GONE, 29 NEW, 6 BREAKING drifts. Most of the GONE/NEW mass is renames (same contract, new name); the tool contract was effectively rebuilt inside minor releases.

**Receipts**: full map in the [audit](../../audits/npm-top-mcp-drift-2026-10.md), case 1.

- Renames mean every automation calling the old tool name breaks with no deprecation window.
- The deprecation warning for one renamed tool shipped one version *after* the change.
- Verified with Microsoft (DavidS-msft, issue [#1682](https://github.com/microsoft/azure-devops-mcp/issues/1682)): the hosted remote server and the local npm package are versioned separately - remote receives updates first. A pin of the npm channel says nothing about the remote contract.
- Community contract test contributed in PR [#1684](https://github.com/microsoft/azure-devops-mcp/pull/1684).

**Repro**

```bash
npm i @azure-devops/mcp@2.5.0 && npx rugsnare scan --config mcp.json
npm i @azure-devops/mcp@2.10.0 && npx rugsnare diff --config mcp.json   # 110 findings, exit 1
```

**1.3.0 re-run note (2026-10-12).** A credential-free whole-history re-scan of the window (174 versions incl. nightlies, `--stub-env`, 45s timeout) is not possible: every version exits with code 1 at startup - the server validates the Azure PAT before serving `tools/list`, so a presence-only dummy is rejected (correctly reported by the scanner as unreachable, not as clean). The 110-finding record above therefore stands as verified on 2026-10-11 with real credentials; the weekly watch keeps the 2.5.0 baseline alive. R11 rename inference and the R21 recursive grader apply to the recorded findings, but an end-to-end mechanical re-verification of this server requires a PAT and stays outside the public feed by design.

Watched weekly (baseline 2.5.0). Last verified 2026-10-11; re-run attempt 2026-10-12 (credential-gated, no data).


## 2026-10-24 window

2.5.0 -> 2.11.0: 119 findings (graded, rugsnare 1.4.3; pins at audits/drift-watch/pins/azure-devops@2.11.0.json). Cumulative corpus total: 351 across the 22 servers. See audits/drift-watch/2026-10-24.md.
