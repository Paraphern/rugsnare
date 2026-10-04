# Release notes 1.0.0 — блок эрраты (вставить в GitHub Release)

## Erratum: on-chain pin for 0.5.1 (pre-existing, Sepolia)

The Base Sepolia pin for **0.5.1** carries a correct `versionKey`
(keccak256 of "0.5.1") and a correct `artifactHash` (byte-verified against the
npm tarball, `ca81c1b4…`), but the human-readable version string inside the
transaction payload reads **"0.5.0"** — a single-byte slip (`0x30` vs `0x31`).
Verification is unaffected: `rugsnare verify --version 0.5.1` derives the key
from your local flag, matches the pin, and prints VERIFIED. The contract is
append-only (`AlreadyPinned`), so the string remains on-chain as-is; the pin
page (`site/pin051.html`) displays the intended 0.5.1 and this note is the
permanent record. From 1.0.0 onward the release checklist includes a
post-pin readback of the version string (see DEPLOY.md, step 3).
