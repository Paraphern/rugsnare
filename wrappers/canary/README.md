# RugSnare canary replay (Action)

Replays a recorded corpus of your agent's real tool calls against a NEW version of an MCP server, and fails the job on breaking contract or behavior changes. Deterministic, no LLM, no false positives on value-only diffs. Thin wrapper around the [`canary` action in the main rugsnare repository](https://github.com/Paraphern/rugsnare), pinned to a release tag.

## Usage

```yaml
- uses: Paraphern/rugsnare-canary-action@v0.4.0
  with:
    server-name: my-server
    command: npx -y some-mcp@2.0.0   # the NEW version to test
```

Requires a recorded corpus (run `rugsnare canary record --name my-server -- <current command>` locally and work through your agent as usual; traces stay local). Full documentation: [Paraphern/rugsnare](https://github.com/Paraphern/rugsnare).
