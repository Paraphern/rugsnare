# rugsnare - Copilot plugin

Pin the MCP tool contracts your agent was approved on; block the build when a server silently changes them. This folder packages RugSnare for GitHub Copilot (and any client that loads skills + MCP servers from a plugin folder).

## What you get

- `SKILL.md` - instructions the agent follows to pin contracts and read drift reports
- `.mcp.json` - RugSnare's own read-only MCP server (`drift_feed_status`: public drift data for popular MCP servers; `pins_report`: your local pin store)

## Install

1. Copy this folder into your repository (e.g. `plugins/rugsnare/`), or reference it directly.
2. Ask your agent: "install rugsnare following llms-install.md in that folder's repo" (root of [Paraphern/rugsnare](https://github.com/Paraphern/rugsnare)).
3. The agent pins your MCP config, commits `.rugsnare/pins.json`, and adds a CI step that fails on contract drift.

## Manual install (no agent)

```bash
npm i -D rugsnare@1.4.1
npx rugsnare scan --config .mcp.json   # pin what you approved
git add .rugsnare/pins.json
```

CI: `npx rugsnare diff --config .mcp.json` exits 1 on drift.

License: Apache-2.0. No telemetry, zero runtime dependencies.
