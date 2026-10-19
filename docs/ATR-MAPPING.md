# RugSnare to ATR rule mapping

RugSnare findings cross-reference [ATR (Agent Threat Rules)](https://github.com/Agent-Threat-Rule/agent-threat-rules),
the open detection-rule format for AI agent threats (Sigma-style YAML, 800+ community rules).

The two projects are complementary, not competing:

- **ATR rules** fire at *runtime* on content the agent already received (tool responses, SKILL.md text).
- **RugSnare** fires *before invocation* on the tool contract itself: SHA-256 pins catch any change
  after approval, and advisory heuristics catch poisoned descriptions on first contact.

Every RugSnare advisory signal now carries an `atr` field listing the ATR rule(s) that cover the same
technique, so findings from both tools can be correlated in one pipeline (SIEM, GitHub code scanning,
or an ATR engine). Signals with no ATR counterpart are listed as [gaps](#gaps-rules-that-do-not-exist-yet).

Rule IDs below are stable ATR IDs. Categories: `tool-poisoning`, `skill-compromise`, `prompt-injection`.

## Core detections (cryptographic, not heuristic)

These have no false-positive question - a hash change is a fact - and map to the ATR rules
on post-approval redefinition and supply-chain poisoning.

| RugSnare detection | ATR rule | Notes |
|---|---|---|
| Tool contract changed after approval (`RS001`, gradation BREAKING / LOOSENED / EXPANDED / NOTATION) | `ATR-2026-00581` - MCP Tool Rug-Pull, Post-Approval Redefinition | The core of both projects. RugSnare answers "did it change" cryptographically; 00581 detects what the redefined text tries to do. |
| Schema change outside `description` (inputSchema fields, anyOf branches, enums) | `ATR-2026-02025` - MCP Full Schema Poisoning, Non-Description Field | RugSnare pins the whole inputSchema, so non-description poison lands in the same DRIFT verdict. |
| Semantic drift in tool manifest (renames, description rewrites) | `ATR-2026-01775` - Semantic MCP Tool Manifest Poisoning | Related: our R11 rename inference and prose diff cover the same surface. |
| Unapproved new tool (`RS002`) | `ATR-2026-00581` | Post-approval attack-surface growth is the EXPANDED end of the same rug pull. |
| Approved tool disappeared (`RS003`) | `ATR-2026-00581` | Removal after approval is a contract change too. |
| Whole-history registry scan (every published version actually executed) | `ATR-2026-00096` - Skill Registry Poisoning | RugSnare provides per-version evidence for what 00096 treats as a category. |
| Skills Security: SKILL.md changed after pinning | `ATR-2026-00065` - Malicious Skill Update or Mutation | Primary. |
| Skills Security: drift plus risk patterns in the added lines | `ATR-2026-00126` - Skill Rug Pull Setup | The benign-now, hostile-later setup pattern. |
| Shadow: same tool name on multiple servers (`RS004`) | `ATR-2026-00161` - IMPORTANT Tag Cross-Tool Shadowing | Related: `ATR-2026-00715` - Tool Knowledge Hijack. |
| Guard-parameter warning (dry_run / confirm / force removed, defanged, or default-flipped) | `ATR-2026-00100` - Consent Bypass Instruction | Related: `ATR-2026-00103` - Hidden Safety Bypass. |

## Advisory signals (heuristics, A01-A18)

Weights and forced-fire logic are unchanged; the `atr` field is additive metadata on each hit.
"Related" means the ATR rule covers a narrower or wider slice of the same technique.

| Signal | Fires on | ATR rule(s) |
|---|---|---|
| A01 (w3) | "do not tell the user" concealment | `ATR-2026-00105` - Silent Action Concealment |
| A02 (w3) | private keys / .ssh / .env / credentials | `ATR-2026-00214` - Credential Theft |
| A03 (w2) | base64 encode/decode instruction | `ATR-2026-00095` - Supply Chain Poisoning (base64 co-signal) |
| A04 (w2) | names specific credential variables | `ATR-2026-00214` - Credential Theft |
| A05 (w2) | "pass it verbatim in the X parameter" | `ATR-2026-01300` - MCP Notes Param Chat-History Exfil |
| A06 (w1) | "internal" / "maintainer note" labeling | `ATR-2026-00062` - Hidden Capability (related) |
| A07 (w1) | mandatory context/session/auth parameter | `ATR-2026-01300` - MCP Notes Param Chat-History Exfil |
| A08 (w2) | read/send something BEFORE calling | `ATR-2026-00095` - Supply Chain Poisoning (exfil directive) |
| A09 (w2) | "preferred" / "supersedes" shadowing hint | `ATR-2026-00161` - IMPORTANT Tag Cross-Tool Shadowing; related `ATR-2026-00715` |
| A10 (w3) | link to a non-standard domain | `ATR-2026-00135` - Exfil URL in Instructions; related `ATR-2026-00095` |
| A11 (w3) | send the full environment / host variables | `ATR-2026-01310` - MCP Tool Description Compliance-History Exfil; related `ATR-2026-00095` |
| A12 (w3, forced) | invisible Unicode (zero-width) | `ATR-2026-00129` - Unicode Tag Character Smuggling; related `ATR-2026-00276` |
| A13 (w2, forced) | bidi control characters | `ATR-2026-00276` - Invisible Unicode Bidi Injection |
| A14 (w2) | imperative opening directed at the agent | `ATR-2026-00120` - SKILL.md Prompt Injection (related - 00120 requires override verbs) |
| A15 (w3, forced) | "ignore previous instructions" hijack | `ATR-2026-00120` - SKILL.md Prompt Injection; related `ATR-2026-00095` cond. 1 |
| A16 (schema) | optional param named feedback/debug/webhook/... | `ATR-2026-01300` - MCP Notes Param Chat-History Exfil |
| A17 (w3) | international phone number in a tool description | none yet - see gaps |
| A18 (w3, forced) | ANSI escape sequences | `ATR-2026-00259` - ANSI Escape Code Terminal Injection; related `ATR-2026-00393` |
| A19 (w3) | instructs to send/post payment credentials (card number, CVC, expiry) | none yet - candidate: the payments variant of `ATR-2026-00214` cond. 2 (credential transmission); kept `atr: []` until a rule ID exists (see gaps) |
| A20 (w3, forced) | hidden directive block: importance/system tags or HTML comments | `ATR-2026-00120` - SKILL.md Prompt Injection (markup-directed variant); related `ATR-2026-00276` (invisible channel; class surfaced by the packachuz/mcp-shield list, teleport#61434) |

## Gaps: filed upstream, pending review

Rules that did not exist when this table was written. We filed proposals via the ATR
Red Team Probe path (issues, per their CONTRIBUTING) on 2026-10-12:

1. [Agent-Threat-Rule/agent-threat-rules#653](https://github.com/Agent-Threat-Rule/agent-threat-rules/issues/653) -
   invisible Unicode / bidi in STATIC tool descriptions. Existing rules 00129/00276
   cover SKILL.md content and tool responses; the static description surface was
   uncovered. On acceptance, the issued rule ID joins the `atr` arrays of A12/A13.
2. [Agent-Threat-Rule/agent-threat-rules#654](https://github.com/Agent-Threat-Rule/agent-threat-rules/issues/654) -
   the phone-number exfil channel (our A17, honestly empty today). On acceptance,
   A17 gains its first rule ID.
3. [Agent-Threat-Rule/agent-threat-rules#655](https://github.com/Agent-Threat-Rule/agent-threat-rules/issues/655) -
   floating-version references in MCP configs (our FLOATING advisory in `rugsnare scan`).
4. Unfiled: payment-credential transmission in a tool description (our A19). Closest
   existing rule is `ATR-2026-00214` cond. 2, which covers credential ACCESS, not the
   "POST the card number to X" instruction. Will file with the next probe batch.

A fourth gap remains unfiled as a rule because it is not a content pattern:
**pre-invocation contract drift** - no ATR rule expresses "the contract hash changed
after approval, regardless of content". The P3-P6 gradation (BREAKING / LOOSENED /
EXPANDED / NOTATION) is a taxonomy contribution, not a regex.

## Machine-readable consumption

- CLI JSON output: advisory hits include `"atr": ["ATR-2026-00129", ...]`.
- SARIF export: rules `RS001`-`RS004` carry `properties.atrRuleIds`; GitHub code scanning
  shows them on each finding.

## Verification

Rule IDs, titles and categories above were verified against the ATR repository on 2026-10-11.
If an ID stops resolving upstream, `npm test` fails: the mapping test in
`test/advisory.test.js` asserts every mapped ID matches `^ATR-2026-\d{5}$` and every forced
signal (A12/A13/A15/A18) carries at least one rule.
