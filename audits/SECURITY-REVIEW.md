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
