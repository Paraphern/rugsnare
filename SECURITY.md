# RugSnare Security & Release Signing

## Release signing key

RugSnare releases are signed with a dedicated signing-only Ed25519 OpenPGP key.

```
Fingerprint: 8728 9542 A1FB 9A9A EA60  974B EEEA D334 8C93 D91E
UID:         RugSnare Releases <releases@rugsnare.com>
Created:     2026-09-29
Type:        ed25519, sign-only, no expiry
```

This fingerprint is published in three independent places — this file (GitHub),
the ENS text records of the project name, and the genesis transaction of the
on-chain ReleaseLog contract. If any two disagree, treat the release as
compromised and report it.

## Verify a release

```bash
# 1) against the on-chain pin (recommended once ReleaseLog is deployed):
rugsnare verify rugsnare-<version>.tgz --version <version> \
  --contract 0x<ReleaseLog address> --chain base

# 2) classic OpenPGP:
curl -sSLO https://github.com/Paraphern/rugsnare/releases/download/<tag>/rugsnare-<version>.tgz.sig
gpg --verify rugsnare-<version>.tgz.sig rugsnare-<version>.tgz
# expected: "Good signature from RugSnare Releases <releases@rugsnare.com>"
```

## Public key

```
-----BEGIN PGP PUBLIC KEY BLOCK-----
mDMEaruclBYJKwYBBAHaRw8BAQdAVVxkqm6dd38aogwLbrQmhfNllUSWfHia0z0k
8d0TxsK0KVJ1Z1NuYXJlIFJlbGVhc2VzIDxyZWxlYXNlc0BydWdzbmFyZS5jb20+
iJAEExYKADgWIQSHKJVCofuamupgl0vu6tM0jJPZHgUCaruclAIbAwULCQgHAgYV
CgkICwIEFgIDAQIeAQIXgAAKCRDu6tM0jJPZHgGVAP4iShWn3UbR94c4k3+KvMCr
//pa5rRNgMMlfDO1UjYLOgD/Qo5Cs8QfihhEXtBoq6YPk5DJbS847R9Rwug3xU2p
Nww=
=Up/v
-----END PGP PUBLIC KEY BLOCK-----
```

## Reporting a vulnerability

Open a GitHub security advisory (Security → Report a vulnerability) or email
releases@rugsnare.com. Crypto bug bounty is planned from the public treasury
once payments go live.

## Key rotation

If the signing key is ever compromised: a rotation notice will be signed with
the OLD key (if possible), published here, mirrored to the ENS text records,
and a new ReleaseLog contract will be deployed with the new fingerprint.
Releases signed by the retired key after the rotation date must be rejected.
