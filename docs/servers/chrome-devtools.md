# chrome-devtools-mcp (Chrome DevTools team)

npm 1,731,154 installs/week - window 1.8.0 -> 1.10.1 (5 weeks).

**Findings: 30 raw: 27 notation + 1 formal tightening + 1 new tool + 1 cosmetic.** The 1.9.0 -> 1.10.1 SDK v2 wave switches every tool's root `additionalProperties` from `true` to `{}` (an empty schema - semantically IDENTICAL, notation) and the declared dialect from draft-07 to 2020-12. The one parameter-level change: `wait_for.timeout` gained `minimum: -9007199254740991` / `maximum: 9007199254740991` (zod `number()` bounds). By the letter of the schema that is a real tighten - doubles beyond +/- 2^53 were valid before and are rejected now - so the grader says BREAKING; as a practical matter it is an SDK artifact (a "timeout" beyond 9 quadrillion milliseconds is not a real call), and we annotate it as such rather than hide it. First pass graded 28 BREAKING; canonicalized comparison showed the residual was SDK artifacts; the 1.3.0 re-run then split that residual into 27 representation-level notation + the one `wait_for` bounds change. Corrections were published to the affected RFC thread before anyone folded the wrong numbers in.

This page exists as a control record: a fast-moving vendor with zero practically-relevant parameter drift on the window, and an honest correction story on our side.

Separate open thread: file-write security behavior inconsistent across changelog, blog, and actual behavior since 1.9.0 - [issue #2917](https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/2917), version-pinned receipts in our comment.

**Repro**

```bash
npm i chrome-devtools-mcp@1.8.0 && npx rugsnare scan --config mcp.json
npm i chrome-devtools-mcp@1.10.1 && npx rugsnare diff --config mcp.json
```

Watched weekly (baseline 1.8.0). Re-graded with rugsnare 1.3.0 on 2026-10-12 (recursive schema traversal + additionalProperties true/{} equivalence fix; the re-run itself caught that equivalence bug - 27 false BREAKINGs until it).
