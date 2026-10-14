# Machine-readable pin snapshots

One file per watched server per graded version: `<slug>@<version>.json` — the exact `.rugsnare/pins.json` captured at scan time by [rugsnare](https://www.npmjs.com/package/rugsnare) 1.3.0. Format: [PIN-SPEC](../../../docs/PIN-SPEC.md) (hash semantics, canonicalization rules, drift classes).

- **Slugs match `docs/servers/` filenames and are stable keys** — they are never renamed; third-party drift-rate columns key against them.
- Consumers may bind these as **opaque evidence records** per [PIN-SPEC §7](../../../docs/PIN-SPEC.md#7-composition-with-action-receipts-v11-normative-pattern) — on the receipt side, do not parse or canonicalize the record.
- `bybit` has no pins: the server exits at boot (remote manifest kill-switch); see its [page](../../../docs/servers/bybit.md).
- Initial catalog: **45 snapshots, 2026-10-13** — 21 npm servers at both ends of their graded window, superpowers at both tags, vercel-skills baseline. Extended by the [drift watch](../2026-10-12.md) on its 3-day cadence: every new release gets its pin appended alongside the dated report.
- Snapshot timing note: npm snapshots were captured by rugsnare 1.3.0 (the byte-level on-disk determinism and identity block described in [PIN-SPEC §7/§2.1](../../../docs/PIN-SPEC.md) landed with the v1.1 writer in 1.4.x); they are stable as artifacts - never rewritten in place. Skills snapshots were regenerated on rugsnare 1.4.2 (relative `path`, byte-stable re-scan per §7).
