# @upstash/context7-mcp (Upstash)

npm 485,755 installs/week - window 4.0.4 -> 4.3.0.

**Finding: 1, EXPANDED.** Caught by the weekly drift watch on 2026-10-09 and verified per-version:

`query-docs` gained a new optional parameter `language` (string: "Programming language the user is writing code in... Ranks code examples in that language first. Leave it out when the language is unknown"), and the description gained the instruction "If you know the programming language the user is working in, pass it as `language` so the results match their setup." Required params unchanged (`libraryId`, `query`). Hashes deterministic across repeated scans (3x verified).

A benign, backward-compatible change - new optional input channel plus a new agent instruction - and exactly the class a pinned CI gate surfaces for re-approval instead of absorbing silently.

**2026-10-13: first LIVE hosted drift caught by the public feed (R30's first blood).** context7 joined the drift-feed's hosted monitoring on 2026-10-12; npm 4.4.0 was released 2026-10-13 13:38Z - and by the independent re-scan the same day, the hosted endpoint's `query-docs` hash had already moved (`fc3018...` on 4.3.0 -> `b812de...` live). The entire diff is prose: the version EXAMPLE inside the `libraryId` description (".../v14.3.0-canary.87" -> ".../v16.2.9"). Cosmetically harmless - but it proves the mechanism: a hosted server's contract changed server-side within ~40 minutes of a release, with no npm install, no client action, and nothing a package pin could ever cover. 4.4.1 (14:10Z) is contract-identical to 4.4.0. The feed's next run records the change with a public timestamp.

**Repro**

```bash
npm i @upstash/context7-mcp@4.0.4 && npx rugsnare scan --config mcp.json
npm i @upstash/context7-mcp@4.3.0 && npx rugsnare diff --config mcp.json   # 1 finding, exit 1
```

Watched weekly (npm baseline 4.0.4) + daily hosted (mcp.context7.com). Last verified 2026-10-13 (live hosted re-scan).
