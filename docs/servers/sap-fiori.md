# @sap-ux/fiori-mcp-server (SAP) - contract drift record

SAP Fiori tools server. Package: [@sap-ux/fiori-mcp-server](https://www.npmjs.com/package/@sap-ux/fiori-mcp-server), ~103k installs/week - one of the highest-traffic servers in the corpus.

**Window:** 1.13.0 -> 1.15.9. **Findings: 4 (2 BREAKING + 2 COSMETIC).**

```
  [DRIFT] generate_fiori_app_odata (BREAKING) be67b0ed4ec45ef9 -> 57122eee084b07f4
      added required parameter 'project.enableTypeScript' (boolean) [tighten]
      added optional parameter 'project.namespace' (string) [expand]
      added optional parameter 'project.viewName' (string) [expand]
      default of 'project.ui5Version' changed from "1.136.7" to "1.148.12" [loosen]
  [DRIFT] generate_fiori_app_cap (BREAKING) 556584a37882ed59 -> 09636dd37803aee1
      (same four changes)
  [DRIFT] list_sap_systems (COSMETIC) ...
  [DRIFT] download_odata_service_metadata (COSMETIC) ...
```

The BREAKING part is a new **required** parameter `project.enableTypeScript` on both app generators: every existing caller's request is now schema-invalid until they add the field. The `ui5Version` default silently moved two minor versions of UI5.

**Repro:**

```bash
mkdir sf && cd sf && npm init -y
# mcp.json: {"mcpServers":{"sap-fiori":{"command":"node","args":["node_modules/@sap-ux/fiori-mcp-server/dist/index.js"]}}}
npm i @sap-ux/fiori-mcp-server@1.13.0 && npx rugsnare@1.3.0 scan --config mcp.json --timeout 60000
npm i @sap-ux/fiori-mcp-server@1.15.9 && npx rugsnare@1.3.0 diff --config mcp.json --timeout 60000   # 4 findings, exit 1
```

Baseline captured 2026-10-12 (rugsnare 1.3.0). Part of the [drift watch](../../audits/drift-watch/2026-10-12.md).
