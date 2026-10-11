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

Watched weekly (baseline 2.5.0). Last verified 2026-10-11.
