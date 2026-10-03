**Title:** Every MCP server you connect to Claude can silently change its instructions after you approve it

**Body:**

Your Claude agent obeys tool descriptions. Those descriptions come from MCP servers. When a server updates, the descriptions change -- and nobody reviews the change because nobody knows it happened.

This isn't hypothetical. We pinned every stable release of the 4 official `@modelcontextprotocol/server-*` servers (filesystem, memory, everything, sequential-thinking) and diffed each version against the next:

- **66 version pairs, 140 silent contract changes, zero announced in a changelog**
- 43 broke schemas (required params appeared, enums narrowed)
- 28 flipped behavioral annotations (readOnlyHint, destructiveHint)
- 37 new tools/prompts/resources appeared post-approval
- 24 disappeared

The worst single step: filesystem `2025.8.21 -> 2025.11.25` changed all 14 tool contracts simultaneously. If you were running Claude Desktop on an older build, every filesystem tool broke -- this is the actual incident reported in modelcontextprotocol/servers#4545.

Three real attacks already happened through this gap:
1. **postmark-mcp** (npm): every agent email BCC-d to an attacker (npm confirms: Unpublished 2025-09-25)
2. **Fake Oura MCP**: StealC infostealer stole crypto wallets via 5 fake GitHub accounts
3. **WhatsApp rug pull**: tool description swapped AFTER approval to redirect messages and exfiltrate chat history

Scanners check once at install. `npx -y pkg@latest` re-rolls the dice on every launch.

I built a CLI that pins what you approved and fails CI on any change:

    npx rugsnare scan    # pin the contracts
    npx rugsnare diff    # exit 1 on drift

Zero npm dependencies, local-only, no telemetry, Apache-2.0.

Full report (every version number, was/became text, reproducible in 30 min):
https://github.com/Paraphern/rugsnare/blob/main/repro/SILENT-CHANGES-REPORT.md

Three real poisonings with receipts:
https://github.com/Paraphern/rugsnare/blob/main/FIELD-REPORT.md

---

*(Disclosure: I maintain RugSnare. Every number above is reproducible on your machine.)*
