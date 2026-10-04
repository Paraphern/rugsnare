# Release procedure (DEPLOY)

One place, checked line by line. Lessons baked in come from independent
verification (2026-10-04) — see P1/P2 findings on tags and gitHead.

## Pre-flight

1. Full battery green: `cd product && npm test` (the count in `product/README.md`
   and the root README footer must match the run).
2. Working tree clean; `main` pushed.

## Release steps, in this exact order

1. **Bump `product/package.json` version and COMMIT it first.** Never publish
   from an uncommitted bump: 0.5.1's npm gitHead pointed at a commit still
   saying `0.5.0` (verified byte-level — the tarball matched the tree except
   the version line, so no integrity risk, but "release = commit" was only
   recoverable through the on-chain pin).
2. `npm publish` from `product/` — `prepack` re-runs the whole battery.
3. On-chain pin: sha256 of the published tarball → `ReleaseLog.pin` on **Base
   mainnet** (decision 2026-10-04; the Sepolia contract stays live for the
   0.1.0–0.5.1 history). The FIRST mainnet release additionally deploys the
   contract — runbook and funding note: `contracts/releaselog/DEPLOY.md`,
   section "Mainnet Base". Record the tx hash for the release notes.
4. Tag the **publish commit** (the one from step 1 plus nothing else) and push
   the tag once: `git tag vX.Y.Z <commit> && git push origin vX.Y.Z`.
5. Docker builds automatically on `v*` tag push.
6. **MCP Registry**: re-publish the `io.github.Paraphern/rugsnare` entry
   (mcp-publisher CLI) so the registry version matches npm. Found stale at
   0.4.0 vs npm 0.5.1 by verification 2026-10-04 — this step exists so it
   never lags again.
7. GitHub Release: notes + npm link + pin tx + pin page (`site/pin*.html`).
8. `node src/cli.js verify <tarball.tgz> --version X.Y.Z` — must print VERIFIED.

## The rule: release tags are immutable

**Never move, re-point, or delete a released tag.** The product's entire
message is immutable pins; a mutable release tag undermines the same guarantee
at the distribution layer. This is not theoretical: on 2026-10-04 independent
verification found `v0.5.1` pointing at the docker-fix commit while npm's
gitHead was a third commit — three identities for one release.

If something after a release needs rebuilding:

- **Docker rebuild** → `docker.yml` has `workflow_dispatch`; run it manually
  from Actions (tags `:latest` + `:<ref>`). Or push a separate tag like
  `vX.Y.Z-docker`. NEVER re-point the release tag to make CI fire.
- **Docs/content fixes** → a normal commit on `main`; the tag stays where it
  was cut. The tarball and the on-chain pin are the release, not the tag tip.

A tag may only be re-pointed BEFORE anything consumed it (npm publish, on-chain
pin, GitHub Release) — after that it is history.
