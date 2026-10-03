This is the exact failure mode we built a tool to catch.

We ran a historical backtest on all 66 stable release pairs of the four official `@modelcontextprotocol/server-*` servers. The filesystem pair you hit (`2025.8.21 → 2025.11.25`) changed **all 14 tool contracts simultaneously** — the rewrite that introduced `outputSchema`/`structuredContent` on every tool.

Full breakdown of that pair: [SILENT-CHANGES-REPORT.md](https://github.com/Paraphern/rugsnare/blob/main/repro/SILENT-CHANGES-REPORT.md) (search for `2025.8.21`)

The broader finding: 140 silent contract changes across all 66 pairs, none in a changelog. The `server-everything` package alone added 31 tools and removed 24 across its release history.

If you want to gate this before it hits your agent:

```
npx rugsnare scan    # pin the contracts you approved
npx rugsnare diff    # exit 1 in CI if anything changed
```

Zero npm dependencies, local-only, Apache-2.0. Not a scanner — it watches for drift *after* you approve a server.
