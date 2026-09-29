# ReleaseLog: deployment & operations

## Status: DEPLOYED ✅ (2026-09-29, Base Sepolia)

| Parameter | Value |
|---|---|
| Contract | `0x78406c32F2054C7DF91aD0A2C258Ad0936838B1e` |
| Network | Base Sepolia (chainId 84532) |
| Signer (immutable) | `0x24d0A3d0562CF4A62E5decAEB77356B51514258e` — verified via eth_call |
| Genesis fingerprint | `87289542A1FB9A9AEA60974BEEEAD3348C93D91E` — verified via the `FingerprintPublished` event |
| Genesis tx | `0x51af00900781008967de8edd0c16b3ebd38d4d5b2f944cb32202089f83813955` |
| Explorer | https://sepolia.basescan.org/address/0x78406c32F2054C7DF91aD0A2C258Ad0936838B1e |
| Compiled with | solc 0.8.24 (artifacts: `build_ReleaseLog.bin` / `.abi` next to this file) |

The contract is wired as the default in the CLI:
`rugsnare verify <file> --version <v> --chain base-sepolia` (no `--contract` needed).
Mainnet Base: on the first public release.

## Pinning a release (every release)

1. Compute the artifact hash and the version key:

```bash
sha256sum rugsnare-<ver>.tgz
node -e "import('./product/src/keccak.js').then(m=>console.log('versionKey:', m.keccak256('<ver>')))"
```

2. In Remix (same wallet `0x24d0...`, Base Sepolia) → Deployed Contracts → "At Address" → paste the contract address → `pin(versionKey, artifactHash, "<ver>")` → transact.
3. Check: `node product/src/cli.js verify rugsnare-<ver>.tgz --version <ver>` → `VERIFIED`.

## What this is

`ReleaseLog.sol` is a deliberately minimal append-only log of release artifact hashes — we pin our own releases on-chain exactly the way the RugSnare core pins MCP tool descriptions. Dogfooding as a trust model: a hash written here cannot be changed after the fact; `rugsnare verify --onchain` compares a local install against the ledger.

Design properties:

- **append-only** — `pin()` refuses to overwrite (`AlreadyPinned`); immutability IS the product
- **one signer** — the RugSnare release wallet; the PGP fingerprint is published in three independent places (GitHub SECURITY.md, ENS text records, this contract's genesis)
- **event-driven** — every pin emits `ReleasePinned` for indexers
- **no upgrades, no admin functions** — nothing to exploit, nothing to governance-attack

## Costs

Base mainnet deploy: ~$0.5–3. Each pin: <$0.05. ENS: ~$5/yr + gas for text records.

## Honest limitations

The contract guarantees hash immutability, not signer honesty — that's what the fingerprint scheme (GitHub + ENS + genesis event = three independent anchors) and PGP-signed releases are for. If the release key is ever compromised: a new contract is deployed, ENS records are re-pointed, and the old contract is marked compromised in README and SECURITY.md — there is intentionally no admin key-swap path.
