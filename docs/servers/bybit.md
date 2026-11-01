# bybit trading-mcp (Bybit)

Window 2.1.20 -> 2.1.23 (patch releases).

**Findings: 9 silent contract changes in patches**, plus a pattern rare enough to document on its own:

**Remote kill-switch.** Versions older than latest refuse to start: on launch the server fetches a manifest from `api.bybit.com` and exits if the version is not current. Old versions are bricked remotely regardless of local pinning - the contract cannot even be listed for a diff. Combined with fail-open behavior on manifest fetch errors (verified at audit time), this gives the vendor silent, remote control over which versions run. Reported in [issue #38](https://github.com/bybit-exchange/trading-mcp/issues/38).

**Repro**

```bash
npm i trading-mcp@2.1.20 && npx rugsnare scan --config mcp.json   # server exits: manifest gate
npx rugsnare history trading-mcp --last 4                          # gate visible as GATED/exited-early versions
```

Last verified 2026-10-09 (issue open, no vendor response).

**Delisted from npm.** 2026-10-31: the `trading-mcp` registry document returns 404 (`npm view trading-mcp` fails; second consecutive drift-watch run). The boot-gated watch policy is unchanged, but there is currently nothing on npm to watch under this name. If the package returns or reappears under a new name, the corpus entry gets re-pointed.
