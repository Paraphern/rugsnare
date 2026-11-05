# Security review log

## 2026-11-05 — canary validation

- Baseline: `04fb9023c9ba29e9fbf695514a116c65d8b4b7bb`.
- Branch: `audit/canary-validation`; Draft PR publication pending.
- Validation: `cd product && npm test` — 431 passed, 0 failed, Linux / Node 24.22.1.
- Added 27 automated scenarios, explicitly included in `test` and `prepack`.
- Combined local validation of both audit branches: 453 passed, 0 failed; 49 adversarial scenarios.
- Public log contains only completed changes and safe validation results. Unresolved sensitive findings remain private.
- Remote CI: pending publication; local results do not establish Windows or Node 18/20/22 compatibility.
- Constraints: separate branches and Draft PRs only; no main writes, merge, auto-merge, release, or access/secret changes.
- Next: inspect CI on the published head; fix confirmed regressions in this branch. Reuse existing audit PRs instead of creating duplicates.
