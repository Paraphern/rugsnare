# llms-install.md - installation instructions for AI agents

You are an AI coding agent. The user asked you to install RugSnare. This document is your runbook: execute it top to bottom, verify each step, and report back in the format at the end. Do not improvise alternatives to these commands.

## What you are installing

RugSnare pins the tool contracts (name + description + inputSchema, sha-256) of every MCP server the user has approved, and fails CI when a server silently changes them. It is a dev dependency plus one CI step. Zero runtime dependencies, no telemetry, Apache-2.0.

## Step 0 - Preconditions

1. Node.js 18 or newer: run `node --version`. If older, stop and tell the user.
2. Find the user's MCP config. Check, in order, and report what you found:
   - `.mcp.json` or `mcp.json` in the repo root (Cursor, VS Code, Windsurf, Cline, ZCode)
   - `.cursor/mcp.json`
   - `.claude.json` / Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` or `%APPDATA%\Claude\claude_desktop_config.json`)
   - `.vscode/mcp.json`
3. If more than one config exists, ask the user which one to pin. If none exists, ask whether they want to create `.mcp.json` from scratch. Never guess.

## Step 1 - Install

In the project that owns the config:

```bash
npm install --save-dev rugsnare@1.4.2
```

Pin the exact version. RugSnare's own upgrades are deliberate acts, same discipline it enforces on MCP servers.

## Step 2 - Pin the approved contracts (the trust anchor)

```bash
npx rugsnare scan --config <config-file>
```

This writes `.rugsnare/pins.json`. Before committing:

- Show the user the summary: every server name and its pinned tool count.
- Ask for explicit confirmation. These hashes are the baseline the user is approving; never pin silently, never pin a config the user did not name.
- Do not edit `.rugsnare/pins.json` by hand.

## Step 3 - Commit the pins

```bash
git add .rugsnare/pins.json
```

Commit message suggestion: `pin MCP tool contracts (rugsnare baseline)`. If the repository is protected, follow the normal PR flow.

## Step 4 - Wire the CI gate

Create `.github/workflows/rugsnare.yml`:

```yaml
name: rugsnare
on: [pull_request]
jobs:
  contract-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx rugsnare diff --config <config-file>
```

`diff` exits 1 when any tool's contract changed versus the committed pins, so drift breaks the build until a human re-approves. For a human-readable PR comment instead of a bare failure, use the PR diff Action: `Paraphern/rugsnare/action/pr-diff/action.yml@main`.

## Step 5 - Verify

```bash
npx rugsnare diff --config <config-file>
```

Expected output: `rugsnare diff: clean`, exit code 0. If you see drift immediately after pinning, the server is nondeterministic or environment-dependent: report it, do not re-pin in a loop.

## Optional - serve RugSnare to yourself

RugSnare runs as a read-only MCP server (tools: `drift_feed_status` - public drift data for popular MCP servers; `pins_report` - the local pin store). Add to the user's config if they ask for it:

```json
{ "mcpServers": { "rugsnare": { "command": "npx", "args": ["rugsnare@1.4.2", "mcp"] } } }
```

## Report back to the user

| item | value |
|---|---|
| config pinned | path |
| servers + tool counts | per server |
| pins committed | yes/no (commit hash) |
| CI workflow | path |
| verify result | clean / drift |

## Never do

- Never run `diff` before `scan` (no pins = nothing to diff).
- Never edit or fabricate `.rugsnare/pins.json`.
- Never commit API keys or tokens; pins contain only tool names, descriptions, schema hashes - safe to commit.
- Never upgrade rugsnare or a pinned MCP server as part of this install. Upgrades are separate, deliberate steps.
