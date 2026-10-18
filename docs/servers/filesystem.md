# @modelcontextprotocol/server-filesystem (Anthropic reference)

npm 456,670 installs/week - the most-installed MCP server we have scanned. Verified window 0.2.0 -> 1.0.0, the latest-tagged release (14 findings; 8 BREAKING; identical at the interim 2026.8.31 calver snapshot). Graded with rugsnare 1.4.3, 2026-10-18.

Tools 9 -> 14. Every original file tool changed its contract; none of it was announced, because the reference servers have no changelog per tool.

**8 BREAKING schema tightenings** - `read_file`, `read_multiple_files`, `write_file`, `create_directory`, `list_directory`, `move_file`, `search_files`, `get_file_info`. Same tool names, same prose, tightened `inputSchema` (for example `read_file`/`write_file` gained structured constraints a caller built against 0.2.0 may now violate). A client pinned to the 0.2.0 contract fails on upgrade; a client that reads the diff sees the exact constraint that moved.

**5 NEW tools** - `read_text_file`, `read_media_file`, `edit_file`, `list_directory_with_sizes`, `directory_tree`.

**1 NOTATION** - `list_allowed_directories`.

Version note: npm `latest` tag has stayed `1.0.0`; the calver releases (2026.x) are published untagged. Users on `latest` still get the 0.x -> 1.0.0 boundary, which contains this wave.

**Repro** (0.2.0 tarball is missing a transitive dep, install the fixup alongside):

```bash
mkdir fs && cd fs && npm init -y
# mcp.json: {"mcpServers":{"filesystem":{"command":"node","args":["node_modules/@modelcontextprotocol/server-filesystem/dist/index.js","<an-allowed-dir>"]}}}
npm i @modelcontextprotocol/server-filesystem@0.2.0 zod-to-json-schema && npx rugsnare scan --config mcp.json
rm -rf node_modules package-lock.json
npm i @modelcontextprotocol/server-filesystem@1.0.0 && npx rugsnare diff --config mcp.json   # 14 findings, exit 1
```

Last verified 2026-10-18 (rugsnare 1.4.3).
