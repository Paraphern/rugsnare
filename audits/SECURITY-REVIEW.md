# Security review log

## 2026-11-05 — Signature validation and runtime preflight

- Baseline: `7ac32a360dc8c3e5e5c31740d6768cc1d2aed86d`. Work branch: `audit/signature-validation`.
- Signed pin verification now produces a structured failure when a signed store cannot be verified. Verification keeps the intended committed/local trust-source semantics and legacy never-signed compatibility.
- `run`, `canary record`, `canary replay`, and both direct proxy constructors validate integrity before runtime startup. An explicit unsigned-store override never bypasses an invalid signature.
- Regression evidence: verifier baseline 5 passed / 7 failed; runtime baseline 8 expected failures. After correction: verifier profile 26/26; runtime suite 32/32 and compatibility profile 94/94.
- Full isolated branch npm test: 445 passed, 0 failed. Combined local validation with [Canary #16](https://github.com/Paraphern/rugsnare/pull/16) and [Runtime #17](https://github.com/Paraphern/rugsnare/pull/17): 497 passed, 0 failed. Linux / Node 24.22.1.
- Added 41 top-level regression tests (9 verifier + 32 runtime); new runtime test file is explicitly included in test and prepack. All keys generated in these tests are temporary fixtures.
- Remote CI: pending publication; inspect current-head PR checks. No dependency, secret, access, main, merge, auto-merge or release changes.
- Compatibility: legacy bootstrap and genuine local-key fallback remain supported. Runtime discovery can change a signed store; review and deliberately re-sign it before restarting. Startup verification is not continuous filesystem monitoring or an external trust anchor.
- Coordination: [audit/automation-state](https://github.com/Paraphern/rugsnare/tree/audit/automation-state) holds the single audit-write ownership record; do not merge the coordination branch into main. Only a successful expected-SHA update grants ownership; another owner means read-only/local work only. No age-based lock stealing.
- Next: inspect CI on this branch, retain all three validation files in test/prepack when integrating the independent PRs, and inspect existing audit PRs instead of opening duplicates. Further unaddressed security details remain private.
