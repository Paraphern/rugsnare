# @executeautomation/playwright-mcp-server (executeautomation)

npm ~8,500 installs/week; GitHub [executeautomation/mcp-playwright](https://github.com/executeautomation/mcp-playwright) (5.7k stars). Verified window 1.0.3 -> 1.0.12 (10 findings). Graded with rugsnare 1.4.3, 2026-10-18.

Patch-level releases (1.0.x) rewired agent capabilities:

**5 EXPANDED** - `playwright_get`, `playwright_post`, `playwright_put`, `playwright_patch`, `playwright_delete`, `playwright_get_visible_html` family: the generic HTTP-call tools gained new optional inputs. More capability per tool, delivered in a patch.

**4 NEW** - `playwright_iframe_fill`, `playwright_upload_file`, `playwright_resize`, `playwright_click_and_switch_tab`: new browser actions, including file upload (a sandbox-relevant capability).

**1 LOOSENED** - `playwright_console_logs`: input constraints relaxed.

For contrast, Microsoft's [@playwright/mcp](https://github.com/microsoft/playwright-mcp) over its 0.0.x -> current window: 30 findings including 7 BREAKING (e.g. `browser_close`, `browser_navigate`, `browser_type` schema tightenings) - [playwright issue #1796](https://github.com/microsoft/playwright-mcp/issues/1796).

**Repro**

```bash
mkdir ex && cd ex && npm init -y
# mcp.json: {"mcpServers":{"exec-playwright":{"command":"node","args":["node_modules/@executeautomation/playwright-mcp-server/dist/index.js"]}}}
npm i @executeautomation/playwright-mcp-server@1.0.3 && npx rugsnare scan --config mcp.json
rm -rf node_modules package-lock.json
npm i @executeautomation/playwright-mcp-server@1.0.12 && npx rugsnare diff --config mcp.json   # 10 findings, exit 1
```

Last verified 2026-10-18 (rugsnare 1.4.3).
