# @transcend-io/mcp-server-assessment (Transcend) - contract drift record

Privacy/compliance assessment server. **83 npm releases in ~3 months** - the most active release cadence in the corpus. Package: [@transcend-io/mcp-server-assessment](https://www.npmjs.com/package/@transcend-io/mcp-server-assessment), ~11k installs/week.

**Window:** 2.1.2 -> 2.1.13 (11 releases). **Findings: 2 (both BREAKING).**

```
  [DRIFT] assessments_create (BREAKING) 2bd42eb112eb6b12 -> 5b4b21ea07dc784f
      removed parameter 'templateId' [loosen]
      'assessmentGroupId' became required [tighten]
  [DRIFT] assessments_prefill (BREAKING) 989a258d180eb688 -> ea79d83238e94313
      removed parameter 'templateId' [loosen]
      'assessmentGroupId' became required [tighten]
```

The caller impact is mixed but real: `templateId` disappears (calls passing it now fail validation unless additionalProperties is closed - verify your client), and every caller must now supply `assessmentGroupId` - a schema-valid 2.1.2 call is invalid on 2.1.13 with no release note announcing it.

**Repro** (boot requires `TRANSCEND_API_KEY`; dummy value is enough for contract capture):

```bash
mkdir tr && cd tr && npm init -y
# mcp.json: {"mcpServers":{"transcend":{"command":"node","args":["node_modules/@transcend-io/mcp-server-assessment/dist/cli.mjs"],"env":{"TRANSCEND_API_KEY":"dummy_for_scan"}}}}
npm i @transcend-io/mcp-server-assessment@2.1.2 && npx rugsnare@1.3.0 scan --config mcp.json --timeout 60000
npm i @transcend-io/mcp-server-assessment@2.1.13 && npx rugsnare@1.3.0 diff --config mcp.json --timeout 60000   # 2 BREAKING, exit 1
```

Baseline captured 2026-10-12 (rugsnare 1.3.0). Part of the [drift watch](../../audits/drift-watch/2026-10-12.md).
