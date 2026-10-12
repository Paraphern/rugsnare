# @netlify/mcp (Netlify)

npm 42,748 installs/week. Verified window 1.14.0 -> 1.18.0 (58 findings over 24 scanned versions; only three GitHub releases exist, 1.16.0+).

The nine tools are routers: a `selectSchema` union of operation branches, and the tool description enumerates the operation list the model reads. Operation-set changes are surface changes.

**1.15.1 (patch, no GitHub release at all)** - exactly 8 tools, exactly one change each: `required: ["operation","params"]` -> `["operation"]` in every operation branch. With the required arrays removed, schemas are byte-identical (verified mechanically).

**1.16.0 (2026-09-25)** - `netlify-team-services-reader` gained a `get-team-env-vars` operation branch (`teamId` required, optional `envVarKey`) and the description entry. A new data channel - team environment variables - attached to a read-only tool. Release notes cover OAuth only; the adding commit ("Add team-level env var read tool", Sep 3) has no conventional-commit prefix, so the generated changelog skipped it.

**1.18.0 (2026-10-07)** - `initialize-database` moved from `netlify-extension-services-updater` (write) to `netlify-extension-services-reader` (read-only), in both union and description. PR [#61](https://github.com/netlify/netlify-mcp/pull/61) documents that the operation returns setup steps and provisions nothing (genuinely read-only) and that the misleading grouped-surface name was kept deliberately to avoid breaking grouped callers. Release notes do not mention the move.

Per-client surfaces: per PR [#60](https://github.com/netlify/netlify-mcp/pull/60), clients with an `openai-mcp` user agent get 21 granular tools; everyone else gets the 9 grouped routers. Documented - but a pin taken by one client does not cover what another client sees.

**Re-graded with rugsnare 1.3.0 (2026-10-12)** - the patch-loosening now grades explicitly: 1.15.0 -> 1.15.1 = 8 LOOSENED (the `params` requirement dropped in every operation branch). The 1.18.0 move is now visible from both sides with WAS/NOW operation lists: reader gains `initialize-database` (BREAKING), updater loses it (BREAKING). Third finding at 1.18.0: `netlify-coding-rules` BREAKING (schema-level, previously lumped into the router wave). Current npm keeps 6 versions in the window; the 24-version chain of the original pass included since-unpublished prereleases.

**Repro**

```bash
mkdir nm && cd nm && npm init -y
# mcp.json: {"mcpServers":{"netlify":{"command":"node","args":["node_modules/@netlify/mcp/dist/netlify-mcp.js"]}}}
npm i @netlify/mcp@1.15.0 && npx rugsnare scan --config mcp.json
npm i @netlify/mcp@1.16.0 && npx rugsnare diff --config mcp.json   # 9 findings, exit 1
```

Last verified 2026-10-12 (1.3.0 re-run).
