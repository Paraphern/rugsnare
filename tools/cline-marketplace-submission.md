## Server Information

- **Server Name:** rugsnare
- **Description:** Pin MCP tool contracts, catch silent drift, replay calls before upgrades. Zero npm dependencies, no telemetry, Apache-2.0.
- **npm Package:** rugsnare
- **Version:** 0.4.0
- **Repository:** https://github.com/Paraphern/rugsnare
- **License:** Apache-2.0

## Installation

```json
{
  "mcpServers": {
    "rugsnare": {
      "command": "npx",
      "args": ["-y", "rugsnare", "mcp"]
    }
  }
}
```

## Tools

1. **drift_feed_status** — Report the current versions and contract-change events of popular MCP servers, from the public RugSnare drift-feed (daily scans). Optional filter by server name.
2. **pins_report** — Report the RugSnare pin store of this project: which MCP servers are pinned, how many tools are approved, unapproved, or shadowed across servers. Read-only.

## Verification

The server has been tested locally via stdio:
- Handshake: OK (protocol 2025-06-18)
- tools/list: returns exactly 2 tools
- drift_feed_status: returns live data from public drift-feed
- pins_report: reads local pin store
- No telemetry, no network calls except the public drift-feed (fixed URL, user-initiated only)

## Official Registry

Published to the official MCP Registry: `io.github.Paraphern/rugsnare`
