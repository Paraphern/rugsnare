# @transcend-io/mcp-server-dsr (Transcend)

84 stable versions on npm - the highest release count we have scanned. Verified window 0.2.0 -> 2.0.13 (15 findings; 7 BREAKING). Graded with rugsnare 1.4.3, 2026-10-18. Tools 12 -> 10.

Privacy/data-subject-request surface: these tools move customer PII (submit, export, erase). Silent contract changes here are compliance-relevant, not just breaking.

**7 BREAKING** - `dsr_submit`, `dsr_poll_status`, `dsr_list`, `dsr_get_details`, `dsr_list_identifiers`, `dsr_enrich_identifiers`, `dsr_cancel`: schema-level changes across the core request lifecycle.

**4 GONE** - `dsr_download_keys`, `dsr_employee_submit`, `dsr_respond_access`, `dsr_respond_erasure`: the employee-submission and manual-respond workflows disappeared from the tool surface entirely. An agent workflow calling them after upgrade dies with method-not-found.

**3 NEW** - `dsr_list_request_data_silos`, `dsr_list_pending_requests` and one more; **1 NOTATION** on `dsr_analyze`.

Sibling servers from the same vendor show the same pattern: [@transcend-io/mcp-server-assessment](transcend.md) (2 BREAKING over 83 releases) - and 0.1.0 of this package is uninstallable on npm (pnpm `catalog:` protocol leaked into the published manifest), so the true earliest verifiable pin is 0.2.0.

**Repro**

```bash
mkdir dsr && cd dsr && npm init -y
# mcp.json: {"mcpServers":{"dsr":{"command":"node","args":["node_modules/@transcend-io/mcp-server-dsr/dist/cli.mjs"],"env":{"TRANSCEND_API_KEY":"dummy_for_scan"}}}}
npm i @transcend-io/mcp-server-dsr@0.2.0 && npx rugsnare scan --config mcp.json
rm -rf node_modules package-lock.json
npm i @transcend-io/mcp-server-dsr@2.0.13 && npx rugsnare diff --config mcp.json   # 15 findings, exit 1
```

Last verified 2026-10-18 (rugsnare 1.4.3).
