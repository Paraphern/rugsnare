# RugSnare Pin Format — Specification (DRAFT, v1)

> **Status: internal draft.** Do not link or announce externally until the
> publication trigger fires (a client RFC or maintainer question about
> baseline format). The goal of this document is to make `.rugsnare/pins.json`
> an open interchange format so that AI clients with native contract pinning
> can export/import baselines compatible with RugSnare's CI gate.

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

## 3. Hash semantics (the interop core)

Three hashes per tool, all SHA-256 over the canonical serialization:

| Hash | Canonical input | Changes classified as |
|---|---|---|
| `hash` | `{ name, description, inputSchema }` — the full contract | any drift (the gate) |
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
6. `$schema` is preserved **as-is** (a dialect switch is a real change —
   graded NOTATION, not invisible).

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

## 5. Compatibility contract

- `version: 1` consumers MUST ignore unknown top-level keys and unknown tool
  fields (forward compatibility).
- Producers MUST bump `version` on any breaking change to this format.
- A consumer implementing v1 needs: JSON, SHA-256, and the canonicalization
  rules above. No RugSnare code required.

## 6. Verification sketch (for the compat test)

A third-party script, using only this spec:

```
pinsA = load("pins.json@approval")
pinsB = load("pins.json@now")
for tool in pinsA.tools:
  liveHash = sha256(canonicalize(liveContract))
  if liveHash != pinsA.tools[tool].hash → DRIFT (classify by schema/prose)
```

## 7. Change history

- v1 (draft 2026-10-08): initial extraction from rugsnare@1.1.0 behavior.
