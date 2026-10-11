# chrome-devtools-mcp (Chrome DevTools team)

npm 1,731,154 installs/week - window 1.8.0 -> 1.10.1 (5 weeks).

**Findings: 30 raw, 0 parameter-level after re-grade.** All 28 schema changes are notation (SDK integer bounds at +/- Number.MAX_SAFE_INTEGER, key order, declared dialect); 1 cosmetic description edit; 1 new tool. First pass graded 28 BREAKING; canonicalized comparison showed the residual was SDK artifacts. Correction was published to the affected RFC thread before anyone folded the wrong numbers in.

This page exists as a control record: a fast-moving vendor with zero real parameter drift on the window, and an honest correction story on our side.

Separate open thread: file-write security behavior inconsistent across changelog, blog, and actual behavior since 1.9.0 - [issue #2917](https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/2917), version-pinned receipts in our comment.

**Repro**

```bash
npm i chrome-devtools-mcp@1.8.0 && npx rugsnare scan --config mcp.json
npm i chrome-devtools-mcp@1.10.1 && npx rugsnare diff --config mcp.json
```

Watched weekly (baseline 1.8.0). Last verified 2026-10-11.
