# @shopify/dev-mcp (Shopify) - contract drift record

Shopify dev-docs and validation server. Package: [@shopify/dev-mcp](https://www.npmjs.com/package/@shopify/dev-mcp), ~31k installs/week.

**Window:** 1.14.4 -> 1.16.0. **Findings: 6 (2 GONE + 2 NEW + 1 LOOSENED + 1 NOTATION).**

```
  [GONE] validate_component_codeblocks
  [GONE] validate_graphql_codeblocks
  [NEW ] validate bd3ee310f5b84f6f
  [NEW ] feedback 58701d4099254072
  [DRIFT] learn_shopify_api (LOOSENED) 58625cd71d750b41 -> 68a8b4f280aae54b
      expanded enum of 'api': added app-pricing [loosen]
  [DRIFT] search_docs_chunks (NOTATION) ...
```

Pattern: **tool consolidation** - two specific validators (`validate_component_codeblocks`, `validate_graphql_codeblocks`) were removed and replaced by one generic `validate`. Agents calling the removed tool names by string now hit a protocol error; nothing in the package surfaces the rename unless you diff contracts.

**Repro:**

```bash
mkdir sh && cd sh && npm init -y
# mcp.json: {"mcpServers":{"shopify":{"command":"node","args":["node_modules/@shopify/dev-mcp/dist/index.js"]}}}
npm i @shopify/dev-mcp@1.14.4 && npx rugsnare@1.3.0 scan --config mcp.json --timeout 60000
npm i @shopify/dev-mcp@1.16.0 && npx rugsnare@1.3.0 diff --config mcp.json --timeout 60000   # 6 findings, exit 1
```

Baseline captured 2026-10-12 (rugsnare 1.3.0). Part of the [drift watch](../../audits/drift-watch/2026-10-12.md).
