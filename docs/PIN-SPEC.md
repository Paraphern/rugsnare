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
**did anything change since approval?**

## 2. File layout

Path: `.rugsnare/pins.json` (JSON, UTF-8, LF, no BOM; readers accept CRLF).
The layout below is illustrative; the v1.1 writer emits the §3 canonical
form on disk (see byte-stability, §7).

Two non-obvious storage rules:

- `annotations` are stored but **never hashed** — they are compared through
  effective-value equality (§4), because spec defaults make raw-value
  comparison wrong. `hash` covers text + schema only.
- Skills entries hash over **raw octets** (sha256sum-compatible bytes of the
  file, exactly as `sha256sum` computes them) — no canonicalization applies.
  §3 governs tool contracts (JSON) only.

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
  install), never the selector.
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

## 3. Hash semantics (the interop core)

Three hashes per tool, all SHA-256 over the canonical serialization:

| Hash | Canonical input | Changes classified as |
|---|---|---|
| `hash` | `{ description, inputSchema, name }` - text + schema (the gate) | any text/schema drift |
| `schemaHash` | `inputSchema` only | BREAKING, LOOSENED, EXPANDED, or NOTATION |
| `proseHash` | `description` only | COSMETIC |
| — (no hash) | `annotations`, compared via effective-value equality (§4) | ANNOTATION |

**Canonicalization rules** (identical bytes → identical hash, across
implementations):

1. Object keys are sorted lexicographically (recursive).
2. Array order is **significant** and preserved (an enum's order is part of
   its meaning).
3. Whitespace between tokens: none (compact serialization, no indentation).
4. String values: exact UTF-8, no escape normalization beyond JSON's minimum
   (`"` → `\"`, `\` → `\\`, control chars → `\uXXXX`).
5. `undefined`/missing fields are **not** the same as `null`: `{ a: null }`
   hashes differently from `{ }`.
6. `$schema` is preserved **as-is** (a dialect switch is a real change -
   graded NOTATION, not invisible).
7. Numbers serialize per RFC 8785 §3.2.2.3 (ECMAScript number-to-string):
integers print without decimal point or exponent where exact, no leading
`+`, `-0` preserved as `-0`. Without this rule the same contract hashes
differently in JS (`1`) and Python (`1.0`) and cross-implementation
reproducibility is void.
8. Inputs that are not valid Unicode scalar sequences (unpaired surrogates)
are **rejected at capture** — the pinner refuses to hash them (I-JSON
discipline). No hash is defined for such content; this is what keeps
"exact UTF-8" in rule 4 well-defined.

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

`LOOSENED` and `EXPANDED` shipped in rugsnare 1.2.0 (direction-based
grading); they are listed here so the spec matches the shipped grader and
the public drift records that use them.

**Spec-default rule for annotations** (MCP 2025-06-18): an absent hint equals
its spec default (`destructiveHint` defaults `true`, `readOnlyHint` `false`).
A server that *spells out* a default it was already relying on is NOT drift;
silently *dropping* an explicit non-default value IS drift.

### 4.1 v1.1 classes (direction accepted 2026-10-13)

| driftType | meaning | exit code |
|---|---|---|
| `IDENTITY` | `identityHash` / `package` / `entryPath` / `url` changed while tool hashes hold — the surface is served by a different build, path, or endpoint than approved | 1 |
| `POLICY` | the pin's `policyVersion` differs from the verifier's policy — re-graded under a newer canonicalization policy; re-pin to accept | 1 |

Neither is server drift: `IDENTITY` is deployment drift, `POLICY` is verifier
drift. Consumers should never blame the vendor for either. `IDENTITY` may
co-occur with tool drift — both are reported.

## 5. Compatibility contract

- `version: 1` consumers MUST ignore unknown top-level keys and unknown tool
  fields (forward compatibility).
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
against a **live** `tools/list` (not a second pin file):

```
pin    = load("pins.json@approval")
live   = tools/list from the running server
if pin.policyVersion != verifier.policy → POLICY (stop for this pin, §3.1)
if identityHash(pin.identity minus the member) != same over live info
                                         → IDENTITY (§2.1)
for tool in pin.tools:
  if tool not in live            → REMOVED
  elif sha256(canonical(live[tool])) != pin.tools[tool].hash:
       classify by schemaHash first (BREAKING / LOOSENED / EXPANDED /
       NOTATION), else by proseHash (COSMETIC)
  if not annotationsEqual(pin.tools[tool].annotations,
                          effective(live[tool].annotations)) → ANNOTATION
for tool in live:
  if tool not in pin.tools       → NEW
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
- A snapshot SHOULD also bind `policyVersion` (§3.1) and `identityHash`
  (§2.1): a snapshot of half the contract pins half the contract.
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
