# Security review log

## 2026-11-05 — Canary and runtime validation

- Baseline: `04fb9023c9ba29e9fbf695514a116c65d8b4b7bb`.
- Draft PR [#16](https://github.com/Paraphern/rugsnare/pull/16): Canary response structure and MCP outcomes; 27 new automated scenarios; local npm test 431 passed, 0 failed.
- Draft PR [#17](https://github.com/Paraphern/rugsnare/pull/17): runtime quarantine, outputSchema and HTTP correlation; 22 new automated scenarios; local npm test 426 passed, 0 failed.
- Combined local validation: 453 passed, 0 failed; 49 adversarial scenarios. Environment: Linux / Node 24.22.1.
- New scenario files are explicitly included in test and prepack. No npm dependencies added.
- Canary code head `9d5841665f57bd99f761f62f89885d0650938062`: [CI success](https://github.com/Paraphern/rugsnare/actions/runs/42031697468). CodeQL is a separate check.
- Runtime code head `0015623361c185cf5733b8d45ba9a849f4793943`: [CI run](https://github.com/Paraphern/rugsnare/actions/runs/42031791899), queued at this journal update. Consult PR checks for the current head, including subsequent documentation commits.
- GitHub integration write access is now operational; both Draft PRs were created without a personal token.
- Public evidence covers completed changes only. Unresolved sensitive findings and reproduction details remain private.
- Constraints: separate branches and Draft PRs only; no main writes, merge, auto-merge, release, or access/secret changes.
- Next: inspect CI and CodeQL on both current heads, fix confirmed regressions in the existing branches. Preserve both test paths when combining the PRs. Reuse these PRs instead of opening duplicates. Further sensitive work requires a private disclosure path before public publication.

## 2026-11-05 — Independent review follow-up

- Canary PR #16: independent review found no material defect; targeted local checks 42 passed, 0 failed.
- Runtime PR #17: corrected combined-drift severity precedence and conflicting-name quarantine in both transports. Three new regression tests failed before correction and now pass; they exercise both duplicate orders and schema/annotation combinations.
- Runtime targeted checks: 72 passed, 0 failed. Full runtime branch npm test: 429 passed, 0 failed on Linux / Node 24.22.1. Runtime validation now includes 25 top-level adversarial tests.
- Existing CI logs confirm that the added validation files execute in the automatic test job. Prior current heads passed all six Node/OS matrix jobs, Go, dogfood, field-repro, and CodeQL; this follow-up requires a new CI run.
- Next: check CI on the follow-up head, retain Draft status, and wait for explicit owner authorization before any merge. Audit remaining integrity/fail-closed questions privately; do not disclose unresolved details in this journal.

### Follow-up verification

- Reviewed runtime code head `d580ab93a7b65fffb248bc966c3f5502512faa50`: [CI success](https://github.com/Paraphern/rugsnare/actions/runs/42035616856) and [CodeQL success](https://github.com/Paraphern/rugsnare/actions/runs/42035606474). All nine CI jobs passed, including Node 18/20/22 on Linux and Windows.
- Combined local validation after review: 456 tests passed, 0 failed; 52 top-level adversarial tests across the two validation files. A subsequent documentation-only commit does not change the tested product tree.
- Next audit priorities: signature verification integrity and fail-closed behavior. Sensitive findings stay private until an agreed fix/disclosure path is ready.
- Automation is enabled, but its last recorded run predates restored GitHub access. Confirm a successful post-recovery run and its actual environment before claiming the autonomous development loop is operational.

## 2026-11-05 — Runtime mode configuration

- Updated the existing [Draft PR #17](https://github.com/Paraphern/rugsnare/pull/17); no new audit PR.
- `run` and `canary record` resolve explicit CLI mode before saved mode, with the existing observe default. Invalid selected modes stop before server startup. Canary recording keeps an explicit fail-closed choice for the session without rewriting config.json.
- Added 27 CLI end-to-end regressions across stdio/loopback HTTP and both commands. Tests verify quarantine, actual upstream tool effects, mode precedence, invalid startup, canary capture and unchanged configuration bytes.
- Baseline: 14 passed / 13 failed; after correction: 27/27 passed; neighbouring compatibility checks: 11/11 passed.
- Full runtime branch: 456 passed, 0 failed. Combined locally with #16 and #20: 524 passed, 0 failed. Linux / Node 24.22.1.
- The new runtime-mode test is included in both test and prepack. [Current-head CI and CodeQL checks](https://github.com/Paraphern/rugsnare/pull/17/checks) must validate the published revision; local results do not stand in for that matrix.
- Discovery compatibility changes remain a separate private design review. Preserve all validation files when combining the three existing Draft PRs; no main write, merge, release, secret or access changes were performed.
