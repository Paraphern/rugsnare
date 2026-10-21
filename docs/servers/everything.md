# @modelcontextprotocol/server-everything (Anthropic reference)

npm 156,226 installs/week. The official SDK test server: if its contract drifts, every client conformance suite built on it drifts too. Verified window 0.1.0 -> 2.0.0, the current latest (43 findings under rugsnare 1.5.0, verified 2026-10-20). The 2026.8.31 and 1.0.0 endpoints showed 40; the 2.0.0 release (2026-10-19) adds three more tools. Graded with rugsnare 1.4.3, 2026-10-18.

Tools 5 -> 16 (the 17 in early union snapshots was a measurement artifact - `rugsnare scan` merges tools into an existing store and never deletes dead ones; clean-stand pin confirms 13); plus prompts and resources churned wholesale.

**LOOSENED** - `echo`: input schema loosened between reference generations. The demo tool used to show clients how strict contracts look got less strict without any notice.

**4 GONE tools** - `add`, `longRunningOperation`, `sampleLLM`, `getTinyImage`: the original demo surface, retired. `add` (integer addition) was there from the first public MCP demo.

**15 new tools** through 2.0.0 (12 through 1.0.0 plus 3 added by the 2026-10-19 2.0.0 release) - including `get-annotated-message`, `get-resource-links`, `get-resource-reference`, `get-structured-content`, `gzip-file-as-resource`, `toggle-simulated-logging`, `toggle-subscriber-updates`, `trigger-long-running-operation`, `simulate-research-query`, `get-env` - plus 4 NEW prompts (`simple-prompt`, `args-prompt`, `completable-prompt`, `resource-prompt`) and 7 NEW resources (`architecture.md`, `features.md`, `instructions.md` and the rest of a docs pack).

**2 GONE prompts + 10 GONE resources** - `simple_prompt`, `complex_prompt`, Resource 1-10: the prompt/resource demo surfaces were replaced entirely.

Version note: `1.0.0` (2026-10-11) is the newest release and carries the `latest` tag; the untagged calver snapshots (2026.x) are semver-higher but published earlier, and the diff at both endpoints is identical.

**Repro**

```bash
mkdir ev && cd ev && npm init -y
# mcp.json: {"mcpServers":{"everything":{"command":"node","args":["node_modules/@modelcontextprotocol/server-everything/dist/index.js"]}}}
npm i @modelcontextprotocol/server-everything@0.1.0 && npx rugsnare scan --config mcp.json
rm -rf node_modules package-lock.json
npm i @modelcontextprotocol/server-everything@2.0.0 && npx rugsnare diff --config mcp.json   # 43 findings, exit 1
```

Last verified 2026-10-20 (rugsnare 1.5.0, window extended to 2.0.0).
