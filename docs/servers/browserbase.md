# @browserbasehq/mcp-server-browserbase (Browserbase)

npm 1,598 installs/week. Verified window 2.0.0 -> 2.4.3 (19 findings). Graded with rugsnare 1.4.3, 2026-10-18. Tools 14 -> 16.

The clean demonstration that "minor-looking" releases still rewire the agent surface: the multi-session Stagehand surface was removed wholesale and a new agent tool appeared, at 2.x with no major bump.

**10 GONE** - the entire `multi_*` surface (`multi_browserbase_stagehand_act_session`, `_extract_session`, `_navigate_session`, `_observe_session`, `_session_create`, `_session_list`, `_session_close`) plus `stagehand_usage`, `multi_session_guidance`, `browserbase_system` prompts. Any orchestration prompt instructing the model to fan out across sessions now references tools that no longer exist.

**2 NEW** - `browserbase_stagehand_get_url`, `browserbase_stagehand_agent`: a generic agent tool (`stagehand_agent`) is exactly the capability-expansion class a security reviewer wants to see gated, not silent.

**LOOSENED** - `browserbase_stagehand_observe` (input constraints relaxed); **2 NOTATION** - `stagehand_act`, `stagehand_extract`; **4 COSMETIC** - description-only rewrites across the session tools.

**Repro**

```bash
mkdir bb && cd bb && npm init -y
# mcp.json: {"mcpServers":{"browserbase":{"command":"node","args":["node_modules/@browserbasehq/mcp-server-browserbase/cli.js"],"env":{"BROWSERBASE_API_KEY":"dummy","BROWSERBASE_PROJECT_SECRET":"dummy"}}}}
npm i @browserbasehq/mcp-server-browserbase@2.0.0 && npx rugsnare scan --config mcp.json
rm -rf node_modules package-lock.json
npm i @browserbasehq/mcp-server-browserbase@2.4.3 && npx rugsnare diff --config mcp.json   # 19 findings, exit 1
```

Last verified 2026-10-18 (rugsnare 1.4.3).
