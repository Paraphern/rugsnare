# Corpus 05: `notes-api` — key-reorder only (canonicalization proof)

Semantically identical schemas in a different key order. This is the fixture
for [heyitsjakub/KyttoMCP#12](https://github.com/heyitsjakub/KyttoMCP/issues/12):
a raw-JSON differ sees different bytes and flags BREAKING; rugsnare's
canonicalized hashing (keys sorted lexicographically before hashing) sees
the same contract and reports **CLEAN**.

## What to expect

```bash
rugsnare scan --config mcp.json
# edit mcp.json: server-v1-benign.js -> server-v2-reordered.js
rugsnare diff --config mcp.json
# output: "clean" (exit 0) — canonicalization works
```

If your differ reports BREAKING on this pair, it is comparing raw bytes.
Fix: canonicalize before hashing (sort object keys, preserve array order).

## Attribution

Requested by Jakub Hecht (KyttoMCP maintainer) as a fixture for
heyitsjakub/KyttoMCP#12. Apache-2.0.
