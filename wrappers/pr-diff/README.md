# RugSnare PR diff (Action)

Posts a human-readable diff of MCP tool contracts — descriptions and schemas — as a comment on pull requests. Reviewers see the changed words, not hashes. Thin wrapper around the [`pr-diff` action in the main rugsnare repository](https://github.com/Paraphern/rugsnare), pinned to a release tag.

## Usage

```yaml
- uses: Paraphern/rugsnare-pr-diff-action@v0.4.0
  with:
    config: .mcp.json          # path to your MCP config (mcpServers)
  # optional: working-directory, fail-on-drift, use-workspace, rugsnare-ref
```

Requires a committed `.rugsnare/pins.json` baseline (run `rugsnare scan` once and commit it) and a `pull_request` event. Full documentation: [Paraphern/rugsnare](https://github.com/Paraphern/rugsnare).
