# RugSnare Diff (composite action)

Gates CI against silent MCP tool contract drift: runs `rugsnare diff` against the committed
`.rugsnare/pins.json` and fails the build when a tool contract changed after approval.

```yaml
jobs:
  rugsnare:
    runs-on: ubuntu-latest
    permissions:
      contents: write          # REQUIRED for publish-status (pushes to rugsnare/status)
    steps:
      - uses: actions/checkout@v4
      - uses: Paraphern/rugsnare/.github/actions/diff@main
        with:
          version: '1.5.0'        # pin it - floating versions are the rug-pull vector
          publish-status: 'true'  # optional: powers the live badge (rugsnare.com/badge/:owner/:repo.svg)
```

**`publish-status: 'true'` requires `permissions: { contents: write }`** on the calling job
(or workflow). The step pushes the verdict JSON to the repo's `rugsnare/status` branch using
the default `GITHUB_TOKEN` (passed via env, never embedded in a URL) - no extra secrets needed.
Without that permission the status step fails and the badge stays on its pin-state fallback.
