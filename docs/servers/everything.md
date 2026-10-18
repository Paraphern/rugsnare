# @modelcontextprotocol/server-everything (Anthropic reference)

npm 156,226 installs/week. The official SDK test server: if its contract drifts, every client conformance suite built on it drifts too. Verified window 0.1.0 -> 2026.8.31 (40 findings). Graded with rugsnare 1.4.3, 2026-10-18.

Tools 5 -> 13 (the 17 in early union snapshots was a measurement artifact - `rugsnare scan` merges tools into an existing store and never deletes dead ones; clean-stand pin confirms 13); plus prompts and resources churned wholesale.

**LOOSENED** - `echo`: input schema loosened between reference generations. The demo tool used to show clients how strict contracts look got less strict without any notice.

**4 GONE tools** - `add`, `longRunningOperation`, `sampleLLM`, `getTinyImage`: the original demo surface, retired. `add` (integer addition) was there from the first public MCP demo.

**12 NEW tools** - including `get-annotated-message`, `get-resource-links`, `get-resource-reference`, `get-structured-content`, `gzip-file-as-resource`, `toggle-simulated-logging`, `toggle-subscriber-updates`, `trigger-long-running-operation`, `simulate-research-query`, `get-env` - plus 4 NEW prompts (`simple-prompt`, `args-prompt`, `completable-prompt`, `resource-prompt`) and 7 NEW resources (`architecture.md`, `features.md`, `instructions.md` and the rest of a docs pack).

**2 GONE prompts + 10 GONE resources** - `simple_prompt`, `complex_prompt`, Resource 1-10: the prompt/resource demo surfaces were replaced entirely.

Version note: npm `latest` tag stays `1.0.0`; the calver 2026.x line is published untagged.

**Repro**

```bash
mkdir ev && cd ev && npm init -y
# mcp.json: {"mcpServers":{"everything":{"command":"node","args":["node_modules/@modelcontextprotocol/server-everything/dist/index.js"]}}}
npm i @modelcontextprotocol/server-everything@0.1.0 && npx rugsnare scan --config mcp.json
rm -rf node_modules package-lock.json
npm i @modelcontextprotocol/server-everything@2026.8.31 && npx rugsnare diff --config mcp.json   # 40 findings, exit 1
```

Last verified 2026-10-18 (rugsnare 1.4.3).
