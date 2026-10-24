# PIN-SPEC surfaceHash × Dominion Observatory captures — format comparison (corpus side)

Companion to [Paraphern/rugsnare#6](https://github.com/Paraphern/rugsnare/issues/6). Scope: where
the two formats already match byte-for-byte, and where they do not. This is the corpus-side
comparison document promised in the join-pair thread.

## Live proof

First public join pair (also the Dominion ledger's first public entry — their ledger held no
public capture for any census-LIVE endpoint at publish time):

- **Endpoint:** `https://rugsnare-mcp.rugsnare.workers.dev/mcp` (rugsnare 1.5.0, hosted)
- **Our `surfaceHash`** (PIN-SPEC §3.2, computed locally by rugsnare 1.5.0): `a7f60d0b5cc214dada5b2c1ec51ff080e0b0828694a0104733b2cc1d5967fb2e`
- **Dominion `manifest_hash`** (their prober, their code, signed capture 2026-10-23T18:36:33Z): `a7f60d0b5cc214dada5b2c1ec51ff080e0b0828694a0104733b2cc1d5967fb2e`
- **Recompute chain:** a third digest computed from the live endpoint's `tools/list` with our code
  also equals the above (verified independently of both stored artifacts). Dominion captures are
  Ed25519-signed; verification key at their `/.well-known/capture-jwks.json`
  (`kid capture-a46fe710c055398f3b6f43a1`, OKP/Ed25519/EdDSA).
- Pin snapshot: [`pins/rugsnare-mcp-worker@1.5.0.json`](pins/rugsnare-mcp-worker@1.5.0.json)

## Where the formats match

| property | PIN-SPEC §3.2 surfaceHash | Dominion capture | match |
|---|---|---|---|
| per-tool field set | `{name, description, inputSchema}` | `{name, description, inputSchema}` | ✅ identical |
| object key order | recursive sort, every depth | recursive sort, every depth | ✅ |
| serialization | compact (no insignificant whitespace) | compact | ✅ |
| non-ASCII strings | raw UTF-8, JSON-minimum escaping | raw UTF-8 (not `\uXXXX`) | ✅ |
| tools array order | sorted by `name` (UTF-8 bytes) | sorted by `name` | ✅ (no deviation needed on our side — theirs is already name-sorted) |
| digest | SHA-256 hex over the UTF-8 bytes of the array | SHA-256 hex | ✅ (proven live, above) |

## Where they do not (yet) meet

1. **Float serialization** — the one honest divergence. PIN-SPEC follows RFC 8785 (JCS) §3.2.2.3
   number serialization; the Dominion corpus has no non-integer numbers in any captured schema, so
   their float behavior is unexercised rather than specified to match. This stays open until a
   captured schema carries a float; their recompute endpoint (public canonical array per capture)
   is the arbiter when it happens.
2. **Scope of the capture set** — Dominion captures only the three-field set above. PIN-SPEC also
   defines internal per-tool hashes over a fourth field (`icons`, PIN-SPEC §1) used for our own
   gating; those are deliberately **not** part of the interop hash, so the two digests remain
   comparable. Annotations and `outputSchema` are stored-but-never-hashed on our side and outside
   their capture — no interop impact, but a pinning host should know the interop digest is blind
   to annotation flips (our ANNOTATION class covers that gap on the client side).
3. **Vantage** — the two hashes agree only because both sides captured the same served surface.
   A publisher-attested pin and an externally-observed capture of an auth-dependent server can
   legitimately differ (per-auth surfaces); the join pair above is an unauthenticated endpoint by
   construction. This distinction is preserved in the registry design thread
   ([modelcontextprotocol/registry#82](https://github.com/modelcontextprotocol/registry/issues/82)).

## Recompute recipe (no trust in either side)

```
GET  https://dominionobservatory.com/api/drift?server=<endpoint-url>
     -> capture.tools (the canonical, name-sorted array)
     recompute SHA-256 over the compact JSON array (sorted keys, raw UTF-8)
     == capture.baseline.manifest_hash
```

Our implementation of that computation: `surfaceHash()` in
[`product/src/hash.js`](../../product/src/hash.js) — field set chosen for exactly this
interoperability (see the code comment citing issue #6).
