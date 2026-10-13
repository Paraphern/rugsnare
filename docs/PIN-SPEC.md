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

Path: `.rugsnare/pins.json` (JSON, UTF-8, LF or CRLF agnostic on read).

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
  "package": "@scope/server",
  "resolvedVersion": "1.2.3",
  "entryPath": "dist/index.js",
  "url": null,
  "identityHash": "<sha256-hex of { package, resolvedVersion, entryPath, url }>"
}
```

- `resolvedVersion` is the version **actually resolved at scan time** (after
  install), never the selector.
- `entryPath` pins the launch entry; moving it is drift even when every tool
  hash holds.
- `url` is set for remote (streamable HTTP) servers, `null` for stdio.
- `identityHash` is computed over the four identity fields **with
  `identityHash` itself absent** — a digest is never a member of the object
  it hashes; it is stored beside them. It participates in comparison; a
  mismatch emits `IDENTITY` (§4.1), not `BREAKING` — the vendor did not
  change the contract, the deployment did.
- v1 consumers MUST ignore the block (§5); adding it does not bump `version`.

## 3. Hash semantics (the interop core)

Three hashes per tool, all SHA-256 over the canonical serialization:

| Hash | Canonical input | Changes classified as |
|---|---|---|
| `hash` | `{ name, description, inputSchema }` - the full contract | any drift (the gate) |
| `schemaHash` | `inputSchema` only | BREAKING or NOTATION |
| `proseHash` | `description` only | COSMETIC |

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

## 4. Drift classification

| driftType | meaning | exit code |
|---|---|---|
| `BREAKING` | schema changed with parameter-level differences (added/removed/typed/required/enum) | 1 |
| `NOTATION` | schema bytes changed but parameters did not ($schema dialect, additionalProperties form) | 1 |
| `COSMETIC` | description text changed, schema identical | 1 |
| `ANNOTATION` | text+schema identical, behavioral hints flipped (spec-default aware) | 1 |
| `NEW` | tool present live, absent from pin | 1 |
| `REMOVED` (aka `GONE`) | tool pinned, absent live | 1 |

**Spec-default rule for annotations** (MCP 2025-06-18): an absent hint equals
its spec default (`destructiveHint` defaults `true`, `readOnlyHint` `false`).
A server that *spells out* a default it was already relying on is NOT drift;
silently *dropping* an explicit non-default value IS drift.

### 4.1 v1.1 classes (direction accepted 2026-10-13)

| driftType | meaning | exit code |
|---|---|---|
| `IDENTITY` | `identityHash` / `entryPath` / `package` changed while tool hashes hold — the surface is served by a different build or path than approved | 1 |
| `POLICY` | the pin's `policyVersion` differs from the verifier's policy — re-graded under a newer canonicalization policy; re-pin to accept | 1 |

Neither is server drift: `IDENTITY` is deployment drift, `POLICY` is verifier
drift. Consumers should never blame the vendor for either.

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

A third-party script, using only this spec:

```
pinsA = load("pins.json@approval")
pinsB = load("pins.json@now")
for tool in pinsA.tools:
  liveHash = sha256(canonicalize(liveContract))
  if liveHash != pinsA.tools[tool].hash → DRIFT (classify by schema/prose)
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

- Pin serialization MUST be byte-stable for identical inputs (sorted keys,
  no scan-time volatile fields) — third-party hashes must be reproducible.
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
