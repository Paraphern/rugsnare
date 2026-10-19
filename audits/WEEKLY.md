# MCP Drift Watch - weekly report

**Run:** 2026-10-19 · pinned baselines from `audits/watch-list.json` (advance a pin deliberately, via PR, when you accept a new contract). Method: pin -> install latest -> `rugsnare diff`.

**Total findings since baselines: 235**

| server | package | pinned -> latest | findings | status |
|---|---|---|---|---|
| chrome-devtools | chrome-devtools-mcp | 1.8.0 -> 1.11.0 | 32 | ok |
| azure-devops | @azure-devops/mcp | 2.5.0 -> 2.10.0 | 110 | ok |
| currents | @currents/mcp | 2.3.3 -> 2.7.0 | 51 | ok |
| hostinger | hostinger-api-mcp | 2.4.0 -> 3.3.1 | 39 | ok |
| notion | @notionhq/notion-mcp-server | 2.4.1 -> 2.5.2 | 1 | ok |
| heroku | @heroku/mcp-server | 1.2.5 -> 1.2.12 | 1 | ok |
| context7 | @upstash/context7-mcp | 4.0.4 -> 4.4.4 | 1 | ok |
| sentry | @sentry/mcp-server | 0.42.0 -> 0.42.0 | 0 | clean |
| launchdarkly | @launchdarkly/mcp-server | 0.7.0 -> 0.7.0 | 0 | clean |

Full audit with receipts: [npm-top-mcp-drift-2026-10.md](npm-top-mcp-drift-2026-10.md). Tool: [rugsnare](https://www.npmjs.com/package/rugsnare).

## chrome-devtools - drift excerpt

```
  [DRIFT] click (BREAKING) 38eefa12b8a62af9 -> 72d90b680c02beca
  [DRIFT] close_page (BREAKING) 161f1a531c5872ab -> e0c79a064e8e058d
  [DRIFT] drag (BREAKING) 78d1b3bcd9cbc0a0 -> 1f3a955c724cefb9
  [DRIFT] emulate (BREAKING) d2bb928bb6fca78b -> 35a3fb981a6672b1
  [DRIFT] evaluate_script (BREAKING) 90d58912d3d3c247 -> 58317b4306b12215
  [DRIFT] fill (BREAKING) 8f837aa7a360751f -> 1bc52b3383722f66
  [DRIFT] fill_form (BREAKING) ef50c7f542cd4389 -> 9ae5d0c1d87e42f7
  [DRIFT] get_console_message (BREAKING) 019a3f407867c64f -> 5091333efe4f0a6e
  [NEW ] get_css_styles 90be291984b99e7a
  [DRIFT] get_network_request (BREAKING) a31511f518c67413 -> e94d61b5fd22450f
  [DRIFT] handle_dialog (BREAKING) 56a9fa19b4d3bc5e -> 2a4fceda79f47828
  [DRIFT] hover (BREAKING) 0b9ee38135e20e89 -> bb129337c3f8ff10
```

## azure-devops - drift excerpt

```
  [NEW ] work 8901a5976504428a
  [NEW ] work_iteration_write 3044855da2bfc590
  [NEW ] work_capacity_write 26a8f4073f925f2a
  [NEW ] pipelines_build 222e46b1291cb5a5
  [NEW ] pipelines_build_log 32d892b420e0959d
  [NEW ] pipelines_definition 092568ed99045bc0
  [NEW ] pipelines_run fe259e7d1ffefed9
  [NEW ] pipelines_artifact 56988ef13f597c2e
  [NEW ] pipelines_write cf73a0e774264de4
  [NEW ] repo_repository 8cf8753f7472ea31
  [NEW ] repo_pull_request f743ada180d51199
  [NEW ] repo_pull_request_thread 056172340b8b8613
```

## currents - drift excerpt

```
  [DRIFT] currents-list-actions (BREAKING) 75bcb5c277076c4d -> bc48eca464642f65
  [DRIFT] currents-create-action (BREAKING) f1b1edd894a7099b -> e3f867a764d4cb14
  [DRIFT] currents-get-action (BREAKING) e46fc5be47051043 -> e72c3dcdf8ec975e
  [DRIFT] currents-update-action (BREAKING) 09bdf0604251f8b6 -> c7031b96c602a810
  [DRIFT] currents-delete-action (BREAKING) df52ca10adfbb6d5 -> d54671541f73c216
  [DRIFT] currents-enable-action (BREAKING) e231575cef6fe4e1 -> c4a8fb6533ca98fa
  [DRIFT] currents-disable-action (BREAKING) 67284654b2e0d000 -> af42d34594c62a10
  [DRIFT] currents-list-affected-tests (BREAKING) bb74c6df47c56c16 -> 5145b8c06295e012
  [DRIFT] currents-get-affected-test-executions (BREAKING) c4b39c1ca203a511 -> 82e70a030f795f2c
  [NEW ] currents-get-action-executions 7b3325c7ebb570fb
  [DRIFT] currents-get-projects (NOTATION) 7d7c201bd43eb51e -> f3b4d0b3ed72ef99
  [DRIFT] currents-get-project (BREAKING) f47876b3693cb117 -> 37de59aa9c384264
```

## hostinger - drift excerpt

```
  [DRIFT] (identity) (IDENTITY)
  [NEW ] audit-hosting/SKILL.md (resource) 721bd0a5b0db0549
  [NEW ] connect-domain/SKILL.md (resource) fb06ea81ec871578
  [NEW ] deploy-to-hosting/SKILL.md (resource) 5f0ed3a42707c09d
  [DRIFT] hostinger-headless/SKILL.md (resource) a58a5d028a799a8a -> a58a5d028a799a8a
  [NEW ] hostinger-headless/connect/SKILL.md (resource) e9083a01dbddfbb8
  [NEW ] hostinger-headless/connect/bootstrap.mjs (resource) b44166da80115afd
  [NEW ] hostinger-headless/connect/tools/antigravity.md (resource) 16e46cad0defcd81
  [NEW ] hostinger-headless/connect/tools/claude-code.md (resource) a265d426b926b01d
  [NEW ] hostinger-headless/connect/tools/codex.md (resource) 24ee36b9b0a7d83c
  [NEW ] hostinger-headless/connect/tools/cursor.md (resource) dcc2206146400a11
  [NEW ] hostinger-headless/connect/tools/devin.md (resource) 06e658882ba4dd71
```

## notion - drift excerpt

```
  [DRIFT] (identity) (IDENTITY)
```

## heroku - drift excerpt

```
  [DRIFT] (identity) (IDENTITY)
```

## context7 - drift excerpt

```
  [DRIFT] query-docs (EXPANDED) 219df2124ef8c1a3 -> 001cabe9b73dae93
```
