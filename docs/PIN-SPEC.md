# RugSnare Pin Format - Specification (DRAFT, v1 with v1.1 direction)

> **Status: public draft.** The publication trigger fired on 2026-10-13:
> [autogen#7353](https://github.com/microsoft/autogen/issues/7353#issuecomment-6141000039)
> asked whether the pin covers server identity, and [snyk#482](https://github.com/snyk/agent-scan/issues/482#issuecomment-6141000342)
> consumes pin files as opaque evidence records for a combined drift-rate table.
> The goal of this document is to make `.rugsnare/pins.json` an open interchange
> format so that AI clients with native contract pinning can export/import
> baselines compatible with RugSnare's CI gate. Sections marked **(v1.1)** are
> accepted direction, not yet shipped in the rugsnare binary.

## 1. Purpose

A **pin file** records the approved state of every MCP tool contract at the
moment a human reviewed it. Any consumer (CI runner, AI client, audit script)
can compare a live server's tools against the pin and answer one question:
**did anything change since approval?** — and, since v1.1, a second one:
**is the deployment that serves it still the approved one?**

Terminology: the **writer** (aka producer) is the tool that writes a pin
file; the **verifier** is any consumer comparing live state against it.

## 2. File layout

Path: `.rugsnare/pins.json` (JSON, UTF-8, LF, no BOM; readers accept CRLF).
The layout below is illustrative; the v1.1 writer emits the §3 canonical
form on disk (see byte-stability, §7).

Storage rules, verified against the writer implementation:

- `annotations` are stored but **never hashed** — they are compared through
  effective-value equality (§4), because spec defaults make raw-value
  comparison wrong. `hash` covers text + schema only.
- Skills entries hash over **raw octets** (sha256sum-compatible bytes of the
  file, exactly as `sha256sum` computes them) — no canonicalization applies.
  §3 governs tool contracts (JSON) only.
- `prompts` / `resources` entries are `{ hash, description, firstSeen }`
  (description may be empty); they participate in drift detection with the
  same NEW / REMOVED / hash-change semantics as tools.
- `approved` has two write-paths: `rugsnare scan` writes `true` (pinning is
  the act of approval); the proxy pinning on first sight writes `false`, and
  such entries require an explicit approval before they count as a baseline.
- Skills entries are `{ hash, app, scope, relative, path, size, content,
  firstSeen, pinnedAt, approved, advisory }`; `relative` is the stable key
  component. ***(v1.1)*** `path` MUST be stored **relative to the skill
  root** — the 1.3.0 writer emits machine-absolute paths, which breaks §7
  byte-stability across machines and leaks local layout; fixed in the v1.1
  writer. Skills entries carry **no identity block**; their identity is the
  file path (`relative`) and content hash — server identity (§2.1) applies
  to MCP server launches only.
- `scannedAgainst` (server-level, string) records the installed package
  version at scan time (e.g. `"@hubspot/mcp-server@0.2.0"`). The diff uses
  it to warn when pins were taken against a different installed version
  than the one currently on disk — a convenience signal, not a drift class.
- A companion file `.rugsnare/pins.sig` (ECDSA signature over pins.json
  bytes) may exist alongside the pin store. When present, the diff verifies
  it and fails with exit 2 on mismatch (an edited pins.json in CI is an
  integrity attack, not drift). `--allow-unsigned-pins` skips the check for
  bootstrap workflows. The signature file is outside this format spec —
  it covers transport integrity, not the pin format itself.

```json
{
  "version": 1,
  "servers": {
    "<server-name>": {
      "cmd": {
        "command": "npx",
        "args": ["-y", "@scope/server"],
        "env": { }
      },
      "pinnedAt": "2026-10-07T18:30:00.000Z",
      "tools": {
        "<tool-name>": {
          "hash": "<sha256-hex>",
          "schemaHash": "<sha256-hex>",
          "proseHash": "<sha256-hex>",
          "description": "<the exact description string at approval>",
          "inputSchema": { },
          "annotations": { },
          "firstSeen": "2026-10-07T18:30:00.000Z",
          "approved": true
        }
      },
      "prompts": { },
      "resources": { }
    }
  },
  "skills": {
    "<app>/<scope>/<relative-path>": {
      "hash": "<sha256-hex>",
      "app": "claude-code",
      "scope": "user",
      "relative": "<path relative to the skill root>",
      "path": "<v1.1: same as relative; 1.3.0 wrote absolute - see storage rules>",
      "size": 881,
      "content": "<full text>",
      "firstSeen": "…",
      "pinnedAt": "…",
      "approved": false,
      "advisory": null
    }
  }
}
```

### 2.1 Server identity (v1.1, direction accepted 2026-10-13)

Tool hashes commit to **what** the server serves, not **who** serves it: two
servers with identical surfaces produce identical tool hashes, and a floating
npx selector (`-y @scope/server`) records no version at all. Live corpus
receipts for both gaps: `mongodb-mcp-server@2.1.2` with a floating `zod` range
served different contracts under the same pin; `@supabase/mcp-server-supabase`
moved its stdio entry path while every tool hash held.

v1.1 binds identity into the envelope:

```json
"identity": {
  "entryPath": "dist/index.js",
  "identityHash": "<sha256-hex of the §3 canonical form of { entryPath, package, resolvedVersion, url }>",
  "package": "@scope/server",
  "resolvedVersion": "1.2.3",
  "url": null
}
```

- `resolvedVersion` is the version **actually resolved at scan time** (after
  install), never the selector. For npx-style launches the writer MUST
  resolve what actually ran (npx cache or lockfile); if it cannot determine
  the version it records `null` — an unresolvable selector is a weak
  identity, not a fabricated one.
- `entryPath` pins the launch entry; moving it is drift even when every tool
  hash holds.
- `url` is set for remote (streamable HTTP) servers, `null` for stdio.
  **Field presence is fixed for both transports — `null`, never omitted**
  (rule 5 makes null/absent/`""` hash differently; an unspecified choice is
  an interop break): stdio pins carry `package`, `resolvedVersion`,
  `entryPath`, `url: null`; remote pins carry `url`, with `package: null`,
  `entryPath: null`, and `resolvedVersion` from the server's `initialize`
  response (`serverInfo.version`) when disclosed, `null` otherwise.
- `identityHash` is computed over the four identity fields **with
  `identityHash` itself absent** — a digest is never a member of the object
  it hashes; it is stored beside them. **The hash input is the §3 canonical
  (sorted-key) form — `entryPath, package, resolvedVersion, url` — regardless
  of field display order in the file.** A digest of any other order will not
  match. `url: null` (stdio) is part of the input: per §3 rule 5, `null` is
  not the same as an absent field. It participates in comparison; a
  mismatch emits `IDENTITY` (§4.1), not `BREAKING` — the vendor did not
  change the contract, the deployment did.
- v1 consumers MUST ignore the block (§5); adding it does not bump `version`.
- **Legacy pins (no `identity` block):** the IDENTITY check is skipped and
  reported as an *identity-unpinned* advisory — a pin without identity
  answers "what", never "who". Re-pin to close it; the advisory is not an
  error and does not fail the gate by itself.

## 3. Hash semantics (the interop core)

Three hashes per tool, all SHA-256 over the canonical serialization:

| Hash | Canonical input | Changes classified as |
|---|---|---|
| `hash` | `{ description, inputSchema, name }` - text + input schema (the gate) | any text/schema drift |
| `schemaHash` | `inputSchema` only | BREAKING, LOOSENED, EXPANDED, or NOTATION |
| `proseHash` | `description` only | COSMETIC |
| `outputHash` | `outputSchema` only; `null` when the tool declares no output schema | NOTATION (schema appeared/disappeared, SDK wave) or BREAKING (output shape narrowed) |
| — (no hash) | `annotations`, compared via effective-value equality (§4) | ANNOTATION |

**`outputHash`** covers the response half of the contract. A tool that declares no `outputSchema` pins `null`; a schema appearing later (where none was declared) grades NOTATION (SDK serialization wave); a declared schema narrowing grades BREAKING (output shape changed for consumers who parse it). Reference case: GitHub's official MCP server changed 123 of 131 tool definitions in a single release, all outputSchema additions from a Go SDK migration.

**Canonicalization rules** (identical bytes → identical hash, across
implementations):

1. Object keys are sorted lexicographically (recursive).
2. Array order is **significant** and preserved (an enum's order is part of
   its meaning).
3. Whitespace between tokens: none (compact serialization, no indentation).
4. String values: exact UTF-8, no escape normalization beyond JSON's minimum
   (`"` → `\"`, `\` → `\\`, control chars → `\uXXXX`), and no Unicode
   normalization — NFC vs NFD differences are distinct content and hash
   differently.
5. `undefined`/missing fields are **not** the same as `null`: `{ a: null }`
   hashes differently from `{ }`.
6. `$schema` is preserved **as-is** (a dialect switch is a real change -
   graded NOTATION, not invisible).
7. *(v1.1)* Numbers serialize per RFC 8785 §3.2.2.3 (ECMAScript
number-to-string): `1` — never `1.0` or `1e0` — and `-0` serializes as `0`
(ES6 semantics; JSON.stringify(-0) is `"0"`). Without this rule the same
contract hashes differently in JS (`1`) and Python (`1.0`) and
cross-implementation reproducibility is void. (JS-based writers already
conform de facto; the marker commits every writer to it.)
8. *(v1.1)* Inputs that are not valid Unicode scalar sequences (unpaired
surrogates) are **rejected at capture** — the writer refuses to hash them
(I-JSON discipline). No hash is defined for such content; this is what
keeps "exact UTF-8" in rule 4 well-defined.

These rules govern **hash inputs** (the canonical form that gets digested).
They do not oblige any particular display order when a human or tool *shows*
pin fields — but the v1.1 writer emits this canonical form on disk as well,
because file-level determinism is required for composition (§7). Wherever
this spec names the fields of a hash input, they are listed in this sorted
order.

### 3.1 Canonicalization policy version (v1.1, direction accepted 2026-10-13)

The rules in §3 are a **policy**, not a constant. rugsnare 1.3.0 changed one
rule (the `additionalProperties` `true`/`{}` equivalence) and byte-identical
schemas regraded: chrome-devtools dropped 27 false BREAKINGs on the re-run;
mongodb moved from 4 BREAKING + 16 NOTATION (graded on 1.2.0) to 5 + 15 with
no server release in between. Verifier drift must never masquerade as server
drift:

- Every pin carries `"policyVersion": "<string>"` (top level, next to `version`).
- On comparison, if the pin's `policyVersion` differs from the verifier's
  current policy, the run emits `POLICY` (§4.1) recommending a re-pin —
  classes are NOT silently recomputed under a policy the approver never saw.
  **On `POLICY`, the run reports the class and stops for that pin**; no
  re-graded tool classes are emitted against it.
- **Legacy pins (no `policyVersion`, i.e. everything written before v1.1)
  are policy-unknown**: the verifier emits `POLICY` once and asks for a
  re-pin to stamp it. It never grades legacy pins silently under a policy
  the approver never saw. (All 45 snapshots in the initial drift-watch
  catalog are legacy pins — this path is the rule for them, not the
  exception.)

## 4. Drift classification

| driftType | meaning | exit code |
|---|---|---|
| `BREAKING` | schema changed with parameter-level differences (added/removed/typed/required/enum) | 1 |
| `LOOSENED` | constraints dropped, types widened, params removed — validation loosened | 1 |
| `EXPANDED` | new optional parameter added — attack surface widened | 1 |
| `NOTATION` | schema bytes changed but parameters did not ($schema dialect, additionalProperties form) | 1 |
| `COSMETIC` | description text changed, schema identical | 1 |
| `ANNOTATION` | text+schema identical, behavioral hints flipped (spec-default aware) | 1 |
| `NEW` | tool present live, absent from pin | 1 |
| `REMOVED` (aka `GONE`) | tool pinned, absent live | 1 |

Class semantics are per-tool and apply to whole surfaces: a server absent
from the live config reports every pinned tool as `REMOVED`; a server not in
the pin reports every live tool as `NEW`.

`LOOSENED` and `EXPANDED` shipped in rugsnare 1.2.0 (direction-based
grading); they are listed here so the spec matches the shipped grader and
the public drift records that use them.

**Spec-default rule for annotations** (MCP 2025-06-18): an absent hint equals
its spec default (`destructiveHint` defaults `true`, `readOnlyHint` `false`).
A server that *spells out* a default it was already relying on is NOT drift;
silently *dropping or flipping* an explicit non-default value IS drift.

### 4.1 v1.1 classes (direction accepted 2026-10-13)

| driftType | meaning | exit code |
|---|---|---|
| `IDENTITY` | identity changed — a different build, path, or endpoint than approved (`identityHash` covers `package`/`entryPath`/`url`/`resolvedVersion`); may co-occur with tool drift, both are reported | 1 |
| `POLICY` | the pin's `policyVersion` differs from the verifier's policy — re-graded under a newer canonicalization policy; re-pin to accept | 1 |

Neither is server drift: `IDENTITY` is deployment drift, `POLICY` is verifier
drift. Consumers should never blame the vendor for either. `IDENTITY` may
co-occur with tool drift — both are reported.

## 5. Compatibility contract

- `version: 1` consumers MUST ignore unknown keys at every level — top-level,
  server-level, and tool-level (forward compatibility). This matters because
  the v1.1 `identity` block is a **server-level** field: "version stays 1"
  holds only if the ignore-unknown rule covers server objects, not just
  top-level and tool fields.
- Producers MUST bump `version` on any breaking change to this format.
- A consumer implementing v1 needs: JSON, SHA-256, and the canonicalization
  rules above. No RugSnare code required.
- **Format decision (2026-10-13):** the v1.1 additions (identity block,
  `policyVersion`, `IDENTITY`/`POLICY` classes) are additive — **`version`
  stays `1`.** v1 readers ignore the new keys per the rule above; no bump
  required. A future change that breaks a v1 consumer's ability to read the
  file still MUST bump `version`.

## 6. Verification sketch (for the compat test)

A third-party script, using only this spec, comparing the approval pin
against a **live** `tools/list` (not a second pin file). Shown for one
server; wrap in `for s in pin.servers` for multi-server pins:

```
pin    = load("pins.json@approval")
live   = tools/list from the running server
if pin.policyVersion != verifier.policy → POLICY (stop for this pin, §3.1)
if identityHash(pin.identity minus the member) != same over identity
       reconstructed from the launch config / install (§2.1) → IDENTITY
for tool in pin.servers[s].tools:
  if tool not in live            → REMOVED
  elif sha256(canonical(live[tool])) != pin.servers[s].tools[tool].hash:
       classify by schemaHash first (BREAKING / LOOSENED / EXPANDED /
       NOTATION), else by proseHash (COSMETIC)
  if not annotationsEqual(pin.servers[s].tools[tool].annotations,
                          effective(live[tool].annotations)) → ANNOTATION
for tool in live:
  if tool not in pin.servers[s].tools → NEW
any finding → exit 1
```

## 7. Composition with action receipts (v1.1, normative pattern)

Third-party verifiers — approval ledgers, agent governance systems — that
already bind their own action receipts may bind a rugsnare pin as the
evidence of the approved surface:

```
evidence_type: "tool_surface_snapshot"
record:        the pins.json content (or its per-server subobject), opaque
```

Record scope: bind the **whole file** or a **single-server pin file**. With a
multi-server pin, a change to any server's contract invalidates receipts
bound to the whole file. Extracting a per-server subobject yourself is a
transformation, not saved text — its bytes are not the writer's, so do not
do it ad hoc; re-scan the server alone instead.

The receipt system does **not** canonicalize `record` — it stays the pin's
saved text, untouched. What enters the `decision_ref` preimage is
`external_evidence_hash`: `sha256:` plus the SHA-256 of the RFC 8785
encoding of the whole evidence array (§7.1). A verifier who runs JCS on the
pin itself and hashes those bytes will not recompute the receipt. Two
independent checks result:

1. **The receipt recomputes** → the action was approved against these exact
   bytes.
2. **The bound snapshot matches a fresh `tools/list`** under this spec's
   graded diff (identity block included) → it was approved against *this*
   surface.

### 7.1 Byte-level semantics on the receipt side

As implemented by the preaction-governance receipts in autogen#7353
(2026-10-13), so producers know exactly which bytes verify:

- `action_binding_tool_hash` = `sha256:` + SHA-256 of the tool **name as raw
  UTF-8** — not a JSON-quoted string, which will not match. Description and
  inputSchema are outside it; server identity stays out of it too (that is
  what the pin layer's `identityHash` is for).
- `action_binding_args_hash` = `sha256:` + SHA-256 of the RFC 8785 encoding
  of `args`.
- The pin is **one `external_evidence` entry**. `evidence_type` is the
  caller's label — `tool_surface_snapshot` is the recommended example, not a
  reserved type the receipt side special-cases. `record` is the pin's own
  saved text, kept opaque: the receipt side does not parse it and does not
  canonicalize it.
- `external_evidence_hash` = `sha256:` + SHA-256 of the RFC 8785 encoding of
  the whole evidence array; that field sits in the `decision_ref` preimage.
- `canonicalization_version` is its own preimage field on the receipt side —
  a canonicalizer change is visible independently. Same principle as this
  spec's `POLICY` (§3.1, §4.1), at the other layer: **they are distinct
  fields and neither derives from the other.**
- The binding commits to the bytes the caller supplied. It does **not**
  check `record_sha256`, does **not** authenticate the pin, and does **not**
  compare the snapshot to a later `tools/list` — check 2 is the pin layer's
  job, forever.

Requirements for the composition to be sound:

- Pin **file** serialization is deterministic (v1.1 writer): §3 canonical
  form on disk — sorted keys, compact, UTF-8, LF, no BOM, one trailing
  newline. `pinnedAt` changes only when the pin's content actually changes;
  a re-scan of identical contracts reproduces the file **byte-for-byte**,
  and `firstSeen` never changes for a tool. Without this, "identical
  inputs" has no byte-level meaning and third-party hashes are not
  reproducible.
- Bind a **v1.1 pin** as the record: `external_evidence_hash` then covers
  `policyVersion` and `identityHash` transitively — they are inside the
  record. A v1 pin (no identity block, no policy stamp) is a snapshot of
  half the contract, and no receipt-side mechanism can repair that from
  outside; re-pin first.
- The canonicalization-profile discipline applies to digests of **structured
  fields** (such as the evidence array in §7.1) — wherever a verifier
  canonicalizes structured fields, it records the profile used next to the
  digest. `record` has no structured digest; it is opaque text. Otherwise
  two verifiers that canonicalize differently both "verify" and disagree —
  the lone-surrogate lesson from autogen#7353.

## 8. Change history

- v1 (draft 2026-10-08): initial extraction from rugsnare@1.1.0 behavior.
- v1.1 (draft 2026-10-13, direction accepted): server identity block +
  `identityHash` (§2.1), `policyVersion` stamp (§3.1), `IDENTITY`/`POLICY`
  classes (§4.1), action-receipt composition (§7, §7.1 receipt-side byte
  semantics). Publicly committed in autogen#7353 and snyk#482. Format
  decision 2026-10-13: `version` stays `1` (§5). Implementation lands in
  rugsnare 1.4.0.
- v1.1 same-day revision (receipt-side review, autogen#7353): §7 opening
  corrected — the preimage field is `external_evidence_hash` over the RFC
  8785 encoding of the whole evidence array, the record itself is never
  canonicalized; the canonicalization-profile bullet reframed to
  structured-field digests; §2.1 fixed a self-reference bug —
  `identityHash` hashes the four identity fields with the member absent.
- v1.1 same-day revision 2 (autogen#7353 follow-up): hash-input field lists
  normalized to §3 sorted-key order everywhere (§2.1 example and annotation,
  §3 table row for `hash`); §2.1 now states explicitly that the input is the
  §3 canonical form regardless of file display order, `url: null` included
  per rule 5; §3 closes with the hash-input vs file-display distinction.
- v1.1 same-day revision 3 (self-run hostile pass, the review rule this
  thread triggered): drift-class table synced with the shipped grader —
  `LOOSENED` and `EXPANDED` added (§4), §3 classification column updated;
  §3 gains rule 7 (RFC 8785 number serialization — cross-language hash
  reproducibility) and rule 8 (unpaired surrogates rejected at capture);
  §2.1 fixes the nullability matrix for remote servers (fixed field
  presence, `serverInfo.version` as remote `resolvedVersion`); §2 states
  annotations are never hashed and skills hash over raw octets; §6 sketch
  rewritten (was: unused `pinsB`, no NEW/REMOVED/ANNOTATION, undefined
  `liveContract`); §7 byte-stability made precise (canonical on-disk form,
  `pinnedAt` volatility rule, LF/no-BOM/trailing newline); §3.1 defines
  POLICY as stop-for-that-pin; §4.1 IDENTITY covers `url` changes and may
  co-occur with tool drift.
- v1.1 same-day revision 4 (second self-pass over revision 3): rule 7
  corrected — it claimed "`-0` preserved as `-0`" while citing RFC 8785,
  whose ES6 semantics serialize `-0` as `0` (verified against
  JSON.stringify); rule 4 gains the no-Unicode-normalization clause
  (NFC/NFD are distinct content); §2.1 adds the npx honesty rule — an
  unresolvable selector records `null`, never a fabricated version
  (the §2 layout example is itself an npx launch). Skills raw-octet hashing
  verified against implementation (sha256 of file bytes, sha256sum-
  compatible).

- v1.1 same-day revision 5 (third self-pass, fresh lenses): §5 ignore-unknown
  rule extended to **server-level** fields — the v1.1 `identity` block lives
  exactly there, and the "version stays 1" decision rests on that rule
  covering it; legacy-pin behavior defined in both directions — no
  `policyVersion` → `POLICY` once, re-pin to stamp (all 45 initial catalog
  snapshots are legacy pins); no `identity` block → IDENTITY check skipped
  with an *identity-unpinned* advisory, not a gate failure; §7 snapshot
  bullet corrected to the transitive truth (a v1.1 record covers policy and
  identity inside `external_evidence_hash`; a v1 record cannot be repaired
  receipt-side — re-pin first); §3 rules 7-8 marked *(v1.1)*; §4.1 IDENTITY
  row reworded (identity change per se, co-occurrence explicit). Catalog
  validated: 45/45 parse, all legacy (no policyVersion, no identity).
- v1.1 same-day revision 6 (fourth self-pass, implementer lens + code
  cross-check): storage rules verified against the writer — `prompts`/
  `resources` entry shape documented (`{ hash, description, firstSeen }`);
  `approved` two-write-path semantics documented (scan = true, proxy
  first-sight = false pending explicit approval); skills entry shape
  completed (`relative`, `path`, `size` were missing from the layout) and a
  real interop bug found in the 1.3.0 writer — **skills `path` is
  machine-absolute**, breaking §7 byte-stability across machines and leaking
  local layout (the published catalog's skills snapshots carry it); v1.1
  mandates relative paths. §4 annotation prose tightened (dropping *or
  flipping*); §6 sketch identity line now references §2.1 reconstruction.
- v1.1 same-day revision 7 (convergence pass, fifth and sixth lenses):
  §2 skills layout example synced with the documented 11-field shape;
  terminology normalized (writer/producer/verifier defined in §1, "pinner"
  removed); §1 states both questions a pin answers; §4 server-level
  add/remove semantics defined (absent server → every tool REMOVED / NEW);
  §6 sketch made multi-server-correct (`pin.servers[s].tools`, loop noted);
  §7 record-scope guidance (bind whole file or single-server pin; ad-hoc
  subobject extraction is a transformation, not saved text); §5 wording
  de-holed; history line-break repaired (rev 6 was glued to rev 5).
- v1.1 rollout completion (2026-10-14, rugsnare 1.4.1/1.4.2): skills `path`
  relative (1.4.1) and skills timestamp stability (1.4.2 - `firstSeen` preserved,
  `pinnedAt` moves only on content change) close the §7 byte-stability promise for
  the skills arm; verified cross-directory with a carried pin store (identical bytes
  from a different checkout location). The drift-watch catalog's skills snapshots
  regenerated on 1.4.2 (812 entries, zero absolute paths).
- v1.1 same-day revision 8 (final pre-B5 pass, undocumented fields found by
  comparing real pins against the spec layout): §2 documents `scannedAgainst`
  (records installed package version at scan time; powers the version-mismatch
  warning in diff) and the `pins.sig` companion file (ECDSA signature over
  pins.json; exit 2 on mismatch when present and not `--allow-unsigned-pins`;
  transport integrity, not pin format). §2.1 skills-entry note: no identity
  block, identity is the file path + content hash. All three fields exist in
  every rugsnare-written pin since 1.0; this revision documents what the
  implementation has always done.
- v1.1 same-day revision 9 (outputHash gap found during pre-bbv audit):
  §3 hash table gains `outputHash` (sha256 over canonicalized `outputSchema`,
  null when absent). Grading: NOTATION when outputSchema appears/disappears
  (SDK serialization wave), BREAKING when a declared schema narrows. Reference:
  GitHub 123/131 outputSchema-only changes in one release. The field exists
  in the rugsnare 1.4.x writer since R14; this revision documents it.
