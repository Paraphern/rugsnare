// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * RugSnare ReleaseLog — we pin our own release hashes on-chain exactly
 * the way the RugSnare core pins MCP tool descriptions. Dogfooding as a
 * trust model: a release hash written here cannot be changed after the
 * fact; users verify installs with `rugsnare verify --onchain`.
 *
 * Design properties:
 *  - append-only: pin() refuses to overwrite (immutability IS the product)
 *  - one signer: the RugSnare release key (fingerprint published in ENS
 *    text records, GitHub SECURITY.md, and the contract deploy tx itself)
 *  - event-driven: every pin emits ReleasePinned for indexers/observers
 *  - deliberately minimal: nothing to exploit, nothing to upgrade
 */
contract ReleaseLog {
    address public immutable signer;

    // versionKey (keccak256 of the version string) => sha256 of the release artifact
    mapping(bytes32 => bytes32) public releaseHash;
    // versionKey => pinned-at block timestamp
    mapping(bytes32 => uint256) public pinnedAt;

    event ReleasePinned(bytes32 indexed versionKey, bytes32 artifactHash, string version);
    event FingerprintPublished(string pgpFingerprint);

    error NotSigner();
    error AlreadyPinned();
    error BadFingerprint();

    constructor() {
        signer = msg.sender;
    }

    /**
     * Pin a release artifact hash. Fails if this version was already
     * pinned — a re-pin would defeat the entire purpose.
     */
    function pin(bytes32 versionKey, bytes32 artifactHash, string calldata version) external {
        if (msg.sender != signer) revert NotSigner();
        if (releaseHash[versionKey] != bytes32(0)) revert AlreadyPinned();
        releaseHash[versionKey] = artifactHash;
        pinnedAt[versionKey] = block.timestamp;
        emit ReleasePinned(versionKey, artifactHash, version);
    }

    /**
     * Publish the release PGP fingerprint on-chain once at genesis.
     * Cornerstone of the "three independent places" identity scheme
     * (GitHub + ENS + this contract).
     */
    function publishFingerprint(string calldata pgpFingerprint) external {
        if (msg.sender != signer) revert NotSigner();
        if (bytes(pgpFingerprint).length < 16) revert BadFingerprint();
        emit FingerprintPublished(pgpFingerprint);
    }

    /// Read-side helper for `rugsnare verify --onchain`.
    function getRelease(bytes32 versionKey) external view returns (bytes32 artifactHash, uint256 timestamp) {
        return (releaseHash[versionKey], pinnedAt[versionKey]);
    }
}
