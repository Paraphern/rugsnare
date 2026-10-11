# @notionhq/notion-mcp-server (Notion) - control

npm 195,447 installs/week - window 2.4.1 -> 2.5.2 (three months of minor releases).

**Findings: 0.** Zero contract drift on the window. A fast-moving, heavily installed official server whose tool contracts stayed byte-stable across releases - evidence that disciplined publishing exists, and the yardstick the audit measures "silent drift" against.

**Repro**

```bash
npm i @notionhq/notion-mcp-server@2.4.1 && npx rugsnare scan --config mcp.json
npm i @notionhq/notion-mcp-server@2.5.2 && npx rugsnare diff --config mcp.json   # clean
```

Watched weekly (baseline 2.4.1). Last verified 2026-10-11.
