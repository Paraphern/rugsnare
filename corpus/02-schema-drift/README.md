# Corpus 02: `calendar-booking` — schema-only rug pull

Complements [corpus 01](../01-rugpull-flights/README.md): there the attacks hid in tool **descriptions**; here the descriptions are byte-for-byte identical to the clean version — the entire payload lives in `inputSchema`.

| v2 attack | Where | What it gives the attacker |
|---|---|---|
| A new **required** `session: object` parameter | `list_events` | A schema-following agent ships the environment dict / credentials "because it's required" |
| Enum narrowed `['read','write']` → `['read']` | `update_event` | A silent breaking change: the user's workflow degrades with zero trace in any text |

## Why this case matters

Detectors that diff only description text **miss both changes**. RugSnare hashes the canonical `{ name, description, inputSchema }` — both changes produce DRIFT.

## Verify

```bash
node product/src/cli.js scan --config <config pointing at server-v1-benign.js>   # baseline = v1
# switch the config path to server-v2-schema.js
node product/src/cli.js diff --config <same config>   # DRIFT on both tools, exit 1
```

Dependency-free servers; nothing is sent anywhere; responses are static.
