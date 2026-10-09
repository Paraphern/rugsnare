# I diffed the npm MCP top for silent contract changes. 218 findings in one week.

*How pinning tool contracts caught Microsoft removing 75 tools in minor versions, Google turning off a sandbox default, and why your agent reads instructions nobody approved.*

**Disclosure:** I'm the author of RugSnare, the open-source tool behind every number in this article. Zero npm dependencies, no telemetry. Repo at the bottom. Everything here reproduces in 4 commands.

---

## The method (boring on purpose)

I took the most-installed MCP servers on npm, pinned their tool contracts (name + description + inputSchema, sha-256 hashed), ran the update, and diffed. Pin, update, diff. That's it.

The method found **218 silent contract changes** at the top of the charts. Below are the cases that matter, with receipts.

## The scoreboard

| server | installs/week | window | findings | announced? |
|---|---|---|---|---|
| @azure-devops/mcp (Microsoft) | 120k | 2.5.0→2.10.0, 6 months of minors | **110**: 75 tools gone, 29 new, 6 rewritten | warning shipped *after* the change |
| chrome-devtools-mcp (Google) | 1.73M | 1.8.0→1.10.1, 5 weeks | **30**: all 28 schemas changed; sandbox default flipped | blog + config doc, not at update time |
| @currents/mcp | 103k | 2.3.3→2.6.1, minors | **45**: 37 BREAKING | changelog never says "breaking" |
| hostinger-api-mcp | 265k | 2.4.0→2.9.0, one week | **6**: agent-skill resources injected | not mentioned anywhere |
| @notionhq/notion-mcp-server | 195k | 2.4.1→2.5.2, 3 months | **0** | — |
| @heroku/mcp-server | 11k | 1.2.5→1.2.11, six patches | **0** | — |

Notion and Heroku are the control group. Three months of silence from Notion, six patches from Heroku, zero drift. Fast-moving vendors without silent rewrites exist. The method separates them from the quiet ones.

## Case 1: Microsoft rebuilt the tool contract in minor releases

Between 2.5.0 (March) and 2.10.0 (September):

- **75 tools vanished**: `work_list_team_iterations`, `pipelines_create_pipeline`, `pipelines_get_builds`, most of the `repo_*`/`wiki_*`/`wit_*` families
- **29 appeared** under a new naming scheme with a read/write split: `work_iteration_write`, `pipelines_run`, `repo_pull_request_write`
- **6 were rewritten hard**: worst is `repo_search_commits` — 15 parameters removed, `project` went from `string` to untyped

This broke real people: [issue #1448 — "Local MCP tools rename breaks allowed-tools for skills"](https://github.com/microsoft/azure-devops-mcp/issues/1448). Allowlists across the board started pointing at dead names.

The [npm page](https://www.npmjs.com/package/@azure-devops/mcp) currently advises: *"If this is a breaking change for your agents or skills, you can temporarily pin the version to @azure-devops/mcp@2.8.1."*

**Microsoft's own advice is pinning.**

## Case 2: The #1 MCP server on npm, file-write sandbox off by default

chrome-devtools-mcp gets 1,731,154 installs a week. Maintainers include the Chrome DevTools team.

Run version 1.8.0 and the server prints at startup:

```
File-writing tools will be restricted to the OS temp directory.
```

Run 1.9.0+ and that line is gone. The changelog says "Add --allow-unrestricted-paths by default for CLI". The official Chrome blog confirms: "The CLI now includes --allow-unrestricted-paths by default." The configuration docs still document the flag's default as `false`.

The repo's own open issues report the behavior contradicting itself: [#2917](https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/2917) observes writes outside temp still refused under default flags, while [#2909](https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/2909) reports `--allowUnrestrictedPaths=false` failing to restrict.

An operator reading the changelog, the blog, and `--help` gets three different stories about the same security property.

## Case 3: Hostinger shipped an agent-instruction layer inside the contract

Hostinger's MCP is three generic tools (search / execute / multi-execute). Their changelog announces the three-tool design proudly.

What it doesn't announce: in one week, six releases added **SKILL.md resources** — complete behavioral playbooks for your agent, trigger phrases included ("Triggers: deploy this project, push my app live..."). The tool schemas didn't change at all. A schema-only gate sees nothing here. The **instruction layer** changed — and the instruction layer is what your agent obeys.

## What I actually think

None of these vendors is a villain. Microsoft consolidated a messy toolset. Google documented a default change in a blog. Hostinger shipped features. Currents moves fast.

The problem is the channel. `npm update` delivers contract changes with no re-approval step. Agents obey whatever the new contract says. Humans audit nothing at update time. When Microsoft ends up advising people to pin versions on npm, that's the system telling you what it lacks.

## The fix: pin, diff, fail the build

```bash
npm i -g rugsnare

# pin the approved version
mkdir check && cd check
npm i --ignore-scripts @azure-devops/mcp@2.5.0

# tell rugsnare how to launch it
echo '{"mcpServers":{"azure-devops":{"command":"node","args":["node_modules/@azure-devops/mcp/dist/index.js","dummy-org","--authentication","envvar"],"env":{"AZURE_DEVOPS_EXT_PAT":"dummy"}}}}' > mcp.json
rugsnare scan --config mcp.json

# update and diff
npm i --ignore-scripts @azure-devops/mcp@2.10.0
rugsnare diff --config mcp.json
# DRIFT DETECTED (110 findings), exit 1 — CI fails
```

Same pin-then-diff works on any MCP package you depend on. That's the whole idea.

## Grading: not all drift is equal

After field-testing, we added a NOTATION class — schema bytes changed but parameters didn't (key order, declared dialect, `additionalProperties` form). The chrome-devtools migration wave (MCP SDK v2) re-serialized all 28 schemas: with grading, it scores **0 BREAKING + 30 NOTATION** instead of 28 BREAKING flags. The SDK-generated integer bounds (`±9007199254740991` on `timeout`/`pageSize`) are pure serialization artifact.

We also added a LOOSENED class (credit to [@heyitsjakub](https://github.com/heyitsjakub) of KyttoMCP for the direction-based grading proposal): constraints dropped, types widened, params removed. Still exit 1 — it's drift — but the failure mode is different from BREAKING, and the reviewer needs to know which.

## Ongoing

The weekly automated tracker is live: [audits/WEEKLY.md](https://github.com/Paraphern/rugsnare/blob/main/audits/WEEKLY.md). Every Monday, CI re-pins all watched servers, diffs against baselines, and commits the report. In two days of running it already caught context7's first drift (4.3.0, clean→1 finding).

**Repo (Apache-2.0, zero dependencies, runs locally): [github.com/Paraphern/rugsnare](https://github.com/Paraphern/rugsnare)**

---

*Every number in this article came from a run documented in [audits/npm-top-mcp-drift-2026-10.md](https://github.com/Paraphern/rugsnare/blob/main/audits/npm-top-mcp-drift-2026-10.md). If a vendor shipped an announcement we missed, PRs to that file are welcome.*
