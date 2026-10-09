# MCP Drift Watch - weekly report

**Run:** 2026-10-09 · pinned baselines from `audits/watch-list.json` (advance a pin deliberately, via PR, when you accept a new contract). Method: pin -> install latest -> `rugsnare diff`.

**Total findings since baselines: 192**

| server | package | pinned -> latest | findings | status |
|---|---|---|---|---|
| chrome-devtools | chrome-devtools-mcp | 1.8.0 -> 1.10.1 | 30 | ok |
| azure-devops | @azure-devops/mcp | 2.5.0 -> 2.10.0 | 110 | ok |
| currents | @currents/mcp | 2.3.3 -> 2.6.1 | 45 | ok |
| hostinger | hostinger-api-mcp | 2.4.0 -> 2.11.0 | 6 | ok |
| notion | @notionhq/notion-mcp-server | 2.4.1 -> 2.5.2 | 0 | clean |
| heroku | @heroku/mcp-server | 1.2.5 -> 1.2.11 | 0 | clean |
| context7 | @upstash/context7-mcp | 4.0.4 -> 4.3.0 | 1 | ok |

Full audit with receipts: [npm-top-mcp-drift-2026-10.md](npm-top-mcp-drift-2026-10.md). Tool: [rugsnare](https://www.npmjs.com/package/rugsnare).

## chrome-devtools - drift excerpt

```
  [DRIFT] click (BREAKING) 607cfba5721feff9 -> 58e274c38fa0c9b6
  [DRIFT] close_page (BREAKING) 57aa6d235ddb7d0f -> 9856ee221b854002
  [DRIFT] drag (BREAKING) 57f6b8e417ab6b22 -> 212a0ef996d87101
  [DRIFT] emulate (BREAKING) c8781dc5cc1d30ce -> cac1c310fee80b90
  [DRIFT] evaluate_script (BREAKING) 3161aa4dde4934da -> 9051517720295dc2
  [DRIFT] fill (BREAKING) 9f344e641c1c8ca5 -> 57a3096ddf68a8e3
  [DRIFT] fill_form (BREAKING) f2ddb65b122a79e3 -> efe1c29f4dc38f19
  [DRIFT] get_console_message (BREAKING) 85317c236f7ef618 -> d15fbfc7ea24473f
  [NEW ] get_css_styles 85d7b470afb117ed
  [DRIFT] get_network_request (BREAKING) 4a237243f2f8b76f -> a103d494849731c6
  [DRIFT] handle_dialog (BREAKING) 92edbd8908d2af0f -> c6b7420b18d81c22
  [DRIFT] hover (BREAKING) 83c4498a63264c64 -> bf1420a3cf73769a
```

## azure-devops - drift excerpt

```
  [NEW ] work 84cdf228fe422618
  [NEW ] work_iteration_write 799dce298dad180f
  [NEW ] work_capacity_write fb49c6de6c9737ba
  [NEW ] pipelines_build d598224e5738cd6d
  [NEW ] pipelines_build_log 1275ddf932f37bd2
  [NEW ] pipelines_definition df795f00c5825ea4
  [NEW ] pipelines_run 540a175b8bffb49d
  [NEW ] pipelines_artifact 3a93d673dc0e9a10
  [NEW ] pipelines_write 3bed8e2baadda2b4
  [NEW ] repo_repository 918e63eb3b0f4973
  [NEW ] repo_pull_request 57b8226a257ba6d8
  [NEW ] repo_pull_request_thread 9f3e20249d80afd3
```

## currents - drift excerpt

```
  [DRIFT] currents-list-actions (BREAKING) 03ae8259a2914346 -> 7823934d28dd9304
  [DRIFT] currents-create-action (BREAKING) 73a3e64082e11db3 -> 79ffe4eb3d35e659
  [DRIFT] currents-get-action (BREAKING) 304ddc3c389e5dcf -> 76869bbbfea42799
  [DRIFT] currents-update-action (BREAKING) dceaba35a05a2cd1 -> d6050f2ae3070edb
  [DRIFT] currents-delete-action (BREAKING) fa2d54456215a15a -> 01ce7b9c7721be96
  [DRIFT] currents-enable-action (BREAKING) adff2dc16d3980f1 -> 32d9e36a04d36897
  [DRIFT] currents-disable-action (BREAKING) d843f6119efc8f8a -> f3cbc4df60dc655d
  [DRIFT] currents-list-affected-tests (BREAKING) 3ce992e42e88c0bc -> dd4b2821d7d4bddd
  [DRIFT] currents-get-affected-test-executions (BREAKING) 99e6f67443ac1d35 -> 1de5b02d99ac7f36
  [NEW ] currents-get-action-executions a0d28f21842d7f8f
  [DRIFT] currents-get-projects (BREAKING) c56389c92a016e27 -> f5edb7f5288dd7f4
  [DRIFT] currents-get-project (BREAKING) bbc93238007ef845 -> 954a71e01198e90b
```

## hostinger - drift excerpt

```
  [NEW ] audit-hosting/SKILL.md (resource) 721bd0a5b0db0549
  [NEW ] connect-domain/SKILL.md (resource) fb06ea81ec871578
  [NEW ] deploy-to-hosting/SKILL.md (resource) 5f0ed3a42707c09d
  [NEW ] maintain-wordpress/SKILL.md (resource) 110bc0369451bdd3
  [NEW ] migrate-to-hosting/SKILL.md (resource) 93d40883073c2d16
  [NEW ] troubleshoot-website/SKILL.md (resource) 1ed262038535c9d6
```

## context7 - drift excerpt

```
  [DRIFT] query-docs (BREAKING) f2e95030d4e00be6 -> fc3018160ad356fb
```
