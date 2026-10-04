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

---

# Mainnet Base: первый деплой (решение принято 2026-10-04, релиз 1.0.0)

Решение: **1.0.0 пиннится в Base mainnet** (chainId 8453 / 0x2105). Sepolia-контракт остаётся
живым для истории (0.1.0–0.5.1 уже запинены там и проверяемы).

## Что нужно ДО релиза (владелец)

1. **Заправить релизный кошелёк** `0x24d0A3d0562CF4A62E5decAEB77356B51514258e`
   на **Base mainnet**. Требуется ~0.0005 ETH: вся последовательность
   (деплой + genesis + pin, ~1.5M gas при газе 0.006 gwei) ≈ 0.05–0.50 USD
   при ETH = 2700 USD (замер 2026-10-04).
   **Статус: ГОТОВО — живой eth_getBalance 2026-10-04 15:42 подтверждает
   0.002177 ETH на Base mainnet (chainId 8453). Этого хватает на весь
   релизный набор и запас на десятки пинов.**
2. Ключ/кошелек тот же, которым деплоилась Sepolia (Remix-флоу, ничего нового).

## Порядок деплоя (Remix, тот же флоу, сеть = Base Mainnet)

1. Remix → Deploy → ENVIRONMENT: Injected Provider (кошелёк 0x24d0…).
2. NETWORK: **Base Mainnet, chainId 8453 (0x2105)** — проверено живым
   eth_chainId 2026-10-04. Рядом в списке Base Sepolia = 84532 (0x14a34) —
   не перепутать: у них похожие имена и один провайдер RPC-эндпоинтов.
3. Contract: `build_ReleaseLog.bin` (solc 0.8.24, артефакты рядом с этим файлом).
4. Deploy → записать адрес и tx-хэш в таблицу ниже.
5. Genesis: вызвать `publishFingerprint(...)` тем же ключом (см. genesis-вызов
   Sepolia-деплоя; PGP fingerprint `87289542A1FB9A9AEA60974BEEEAD3348C93D91E`).
6. Сообщить адрес агенту → патч `DEFAULT_CONTRACTS.base` в
   `product/src/onchain.js` → коммит (это часть релизного коммита 1.0.0).

## Таблица (заполнить при деплое)

| Parameter | Value |
|---|---|
| Contract | ___ (mainnet Base) |
| Genesis tx | ___ |
| Explorer | https://basescan.org/address/___ |

## Первый пин 1.0.0 (после npm publish)

```bash
sha256sum rugsnare-1.0.0.tgz
node -e "import('./product/src/keccak.js').then(m=>console.log(m.keccak256('1.0.0')))"
# Remix → At Address (mainnet-адрес) → pin(versionKey, artifactHash, "1.0.0")
node product/src/cli.js verify rugsnare-1.0.0.tgz --version 1.0.0 --chain base   # VERIFIED
```

Проверка на обоих цепях после релиза:
`verify --chain base-sepolia --version 0.5.1` (история) и `verify --chain base --version 1.0.0` (текущий).
