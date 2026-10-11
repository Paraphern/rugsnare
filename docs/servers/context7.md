# @upstash/context7-mcp (Upstash)

npm 485,755 installs/week - window 4.0.4 -> 4.3.0.

**Finding: 1, EXPANDED.** Caught by the weekly drift watch on 2026-10-09 and verified per-version:

`query-docs` gained a new optional parameter `language` (string: "Programming language the user is writing code in... Ranks code examples in that language first. Leave it out when the language is unknown"), and the description gained the instruction "If you know the programming language the user is working in, pass it as `language` so the results match their setup." Required params unchanged (`libraryId`, `query`). Hashes deterministic across repeated scans (3x verified).

A benign, backward-compatible change - new optional input channel plus a new agent instruction - and exactly the class a pinned CI gate surfaces for re-approval instead of absorbing silently.

**Repro**

```bash
npm i @upstash/context7-mcp@4.0.4 && npx rugsnare scan --config mcp.json
npm i @upstash/context7-mcp@4.3.0 && npx rugsnare diff --config mcp.json   # 1 finding, exit 1
```

Watched weekly (baseline 4.0.4). Last verified 2026-10-11.
