# G3: AlphaSignal - мейл

Канал: alpha@alphasignal.ai (их «Get Listed» из футера). Их движок - AI-ранжирование trending repos, поэтому в мейле упор на данные и траекторию (звёзды/активность уже есть).

## Мейл

Subject: `For AlphaSignal: RugSnare - integrity layer for MCP tool contracts (OSS)`

```
Hi,

listing suggestion for AlphaSignal. RugSnare
(github.com/Paraphern/rugsnare) is an OSS runtime-integrity gateway for AI
agents using MCP: it pins tool contracts by SHA-256 at approval and catches
silent post-approval changes (rug pulls, schema drift) in CI.

The reason it exists is a dataset, not a hunch: in October 2026 we pinned
and diffed every stable release pair of the most-installed MCP servers on
npm. 218 silent contract changes, including @azure-devops/mcp removing 75
tools in minor releases. Full reproducible report in the repo.

Zero deps, 394 tests, v1.5.0 this week, growing fast. Would fit your
engineering-tools section.

Repo: github.com/Paraphern/rugsnare
Report: github.com/Paraphern/rugsnare/blob/main/audits/npm-top-mcp-drift-2026-10.md
```
