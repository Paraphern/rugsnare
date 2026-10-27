# RugSnare to OWASP mapping (Agentic Top 10, AI Testing Guide, AISVS)

RugSnare findings cross-reference three OWASP deliverables:

- **[OWASP Top 10 for Agentic Applications](https://genai.owasp.org/resources/)** (ASI01-ASI10,
  Agentic Security Initiative, published 2025-12-09) - the risk taxonomy;
- **[OWASP AI Testing Guide](https://github.com/OWASP/www-project-ai-testing-guide)**
  (AITG-APP / AITG-DAT / AITG-INF tests) - how to test for those risks;
- **[OWASP AISVS](https://github.com/OWASP/AISVS)** section 0x10-C09
  (Orchestration and Agentic Action) - verification requirements.

The mapping serves two audiences. For a security team: RugSnare findings arrive
already labeled with the OWASP risk they operationalize, so they slot into an
existing GRC vocabulary instead of inventing one. For the OWASP projects: this
document is the substantiation for tool references contributed upstream
(AITG "Suggested Tools", ASI incidents tracker) - every claim below is
reproducible from this repository (corpus fixtures, field audits, tests).

Scope note: RugSnare is a *pre-invocation* integrity gate for the MCP tool
layer. It is not an agent-behavior monitor; runtime controls (observe/enforce
proxies) exist but the core is contract verification. Gaps are listed honestly
at the bottom.

## ASI01-ASI10: risk by risk

| OWASP risk | RugSnare coverage | How |
|---|---|---|
| **ASI01** Agent Behaviour Hijack | advisory signals A12, A13, A14, A15, A20; prompts drift; resource content drift (R13) | poisoned tool descriptions and prompt/resource files carry hijack directives ("ignore previous instructions", `<IMPORTANT>` blocks, zero-width Unicode, ChatML markers). RugSnare hashes prompts/resource bodies and advisories descriptions on first contact - the hijack payload is caught *before* the agent reads it. A15 and A20 are FORCED (always surface). |
| **ASI02** Tool Misuse and Exploitation | SHADOW detection, EXPANDED grade, A09, A16, A19, A02, A04, A05, A11, ANNOTATION | unapproved new tools (shadow), widened input surface (EXPANDED - new optional params are exfil carriers), descriptions that redirect the agent to a "preferred" twin (A09), optional exfil params (A16), payment-credential transmission (A19), credential/env exfil instructions (A02/A04/A11), silent renames that hide a tool's purpose (ANNOTATION: "Safe File Reader" -> "Data Export Utility"). |
| **ASI03** Identity and Privilege Abuse | IDENTITY drift class, A07, guard-parameter warnings | every pin carries an identity block (package, resolvedVersion, entryPath, url) bound by identityHash: tool contracts intact but served from a different build/path = IDENTITY (the approval was bypassed, not the contract). A07 flags mandatory context/session/auth parameters introduced silently. Guard-parameter detection (dry_run/confirm/force removed, defanged, or default-flipped) catches safety controls being stripped from tools. |
| **ASI04** Agentic Supply Chain Vulnerabilities | the core: BREAKING, LOOSENED, EXPANDED, NOTATION, MIRRORED, POLICY; pins.sig tamper detection; floating-version detection; `history` whole-version scans; schema-dep provenance; launch-entry pinning; on-chain ReleaseLog `verify` | the complete drift gradation is a supply-chain control: any contract change after approval is a finding with a direction. Ed25519-signed pins.json makes the "attacker edits the pin store" scenario detectable (the CI badge verifies it publicly). `rugsnare history <pkg>` reproduces silent changes across every published version (field results: 140 findings across 23 of 66 scanned version pairs (43 pairs clean) of the official MCP reference servers - [report](../repro/SILENT-CHANGES-REPORT.md)). Provenance records which zod/SDK version rewrote a contract, so dependency drift does not masquerade as server drift. Release artifacts are pinned on-chain (Base Mainnet) and verified by `rugsnare verify`. |
| **ASI05** Unexpected Code Execution | IDENTITY drift (entryPath), A18, resource content drift | a moved stdio entry with identical contracts is still unapproved code being executed - IDENTITY catches it. ANSI escape sequences in contracts (A18) fake terminal output. R13 hashes resource bodies: injected code/instructions inside resource text are a finding. Honest limit: RugSnare does not sandbox execution itself. |
| **ASI06** Memory and Context Poisoning | prompts drift, resource content drift (R13), skills drift, A06, A08 | the agent's instruction surface (system prompts, resource bodies, SKILL.md files across 14 platforms) is hashed and diffed - poisoning the context store is a drift finding. A06 catches "internal/maintainer note" labels; A08 catches "read X *before* calling" instructions. |
| **ASI07** Insecure Inter-Agent Communication | partial: A10 (non-standard exfil domains), skills/instruction file drift | RugSnare does not inspect agent-to-agent traffic. Closest coverage: instruction files shared across agents (skills pinning) and exfil endpoints named in contracts (A10). Listed as a gap. |
| **ASI08** Cascading Failures | partial: REMOVED/GONE tools, PAYWALL flag, BREAKING, proxy budgets (loop/result thresholds) | a dependency disappearing (REMOVED - the azure-devops case: 75 tools removed between minor versions) or silently turning paid ([PAYWALL] - schema-silent) breaks multi-step runs mid-flight. The live proxy enforces loop/result budgets. Honest limit: no runtime failure-propagation modeling. |
| **ASI09** Human-Agent Trust Exploitation | ANNOTATION, CHAMELEON, A01, A17, A18 | silent renames deceive the human reviewer (ANNOTATION); serving a different contract per client (Claude Desktop vs Cursor - CHAMELEON) defeats audit; A01 catches "do not tell the user"; A17 catches phone-number exfil recipients; A18 (ANSI) fakes terminal output visually. |
| **ASI10** Rogue Agents | partial: undeclared-tool detection in both proxies (observe + enforce) | a proxy flagging tools the agent calls that no config declares is the closest control. Behavior-level rogue detection is out of scope. |

## AI Testing Guide: test by test

Where RugSnare serves as the testing tool for an existing AITG test:

| AITG test | RugSnare as the tool |
|---|---|
| **AITG-INF-01** Testing for Supply Chain Tampering | the direct hit: pin contracts at approval (sha-256 over name/description/inputSchema/outputSchema/annotations/icons), diff in CI (exit 1), Ed25519-signed pin store (`receipts sign/verify`), whole-history pair scans (`history`), on-chain artifact verification (`verify`). Zero npm dependencies - the verifier is not itself a supply-chain liability. |
| **AITG-INF-03** Testing for Plugin Boundary Violations | MCP tools are the plugin layer: SHADOW (undeclared tools), IDENTITY (served from a different build), `--expect-tool/--forbid-tool` contract assertions. |
| **AITG-INF-04** Testing for Capability Misuse | EXPANDED grade (new optional params = new capability surface), guard-parameter warnings (safety controls stripped), A16 (exfil carrier params). |
| **AITG-APP-02** Testing for Indirect Prompt Injection | A12/A13/A15/A20 on tool descriptions (zero-width Unicode, bidi, hijack phrases, `<IMPORTANT>`/ChatML/HTML-comment directive blocks), R13 resource-body hashing (the injection payload hidden in resource text). |
| **AITG-APP-03** / **AITG-DAT-02** (sensitive data leak / runtime exfiltration) | A02, A03, A04, A05, A10, A11, A17, A19 (credential references, base64 exfil prep, verbatim passing, non-standard domains, full-env transmission, phone recipients, payment credentials); the secret vault scrubs `{{VAULT:*}}` values from results in the live proxy. |
| **AITG-APP-06** Testing for Agentic Behavior Limits | pinned tool inventory (any new/removed tool is a finding), undeclared-tool detection in the proxy, advisory scores on changed descriptions. |

Proposed upstream (not yet filed): a dedicated test
**"Testing for MCP Tool Contract Drift"** - the methodology exists here end to end
(pin at approval -> diff in CI -> direction-graded findings -> signed store -> badge),
with three working repros in `corpus/01-rugpull-flights/`.

## AISVS 0x10-C09: requirement by requirement

| AISVS requirement | RugSnare as a verification aid |
|---|---|
| **C9.2** High-Impact Action Approval and Irreversibility Controls | the approval workflow is the product: contracts are pinned at human approval (`scan` -> review -> `approve`), and guard-parameter warnings flag when dry_run/confirm/force controls are removed, defanged, or default-flipped. |
| **C9.3** Component Isolation and Tool Authorization | SHADOW detection, `--forbid-tool` assertions, undeclared-tool detection in the live proxy (observe logs, enforce blocks). |
| **C9.4** Agent and Orchestrator Identity | identity blocks + identityHash per server; IDENTITY drift when the surface moves to a different build/path than approved. |
| **C9.5** Agent Authorization, Delegation, and Continuous Enforcement | the CI diff gate runs on every PR; the badge independently re-verifies the signed pin store on every render; live proxies re-check contracts at runtime (observe/enforce, fail-open/fail-closed). |
| **C9.1 / C9.6** budgets, shutdown, graceful degradation | partial: proxy loop/result thresholds and `--fail-closed`; canary record/replay for regression gating. Not a full budget/kill-switch implementation. |

## Gaps (honest)

1. **ASI07 (inter-agent communication)**: no traffic inspection between agents. Adjacent
   coverage only (shared instruction files, exfil domains in contracts).
2. **ASI08 (cascading failures)**: structural signals only (REMOVED, PAYWALL, BREAKING);
   no runtime failure-propagation model.
3. **ASI10 (rogue agents)**: undeclared-tool detection is the extent of it.
4. Behavior monitoring, sandboxing, and output filtering are explicitly out of scope -
   RugSnare is the contract-integrity layer, not a runtime EDR for agents.

## Reproducibility

- Corpus: `corpus/01-rugpull-flights/` (all three ASI02/ASI01 demo attacks with a
  live CI catch), `corpus/05-key-reorder/` (byte-stability fixture).
- Field evidence: [audits/npm-top-mcp-drift-2026-10.md](../audits/npm-top-mcp-drift-2026-10.md)
  (azure-devops, currents, hostinger, chrome-devtools - the ASI04 incident candidates
  for the [ASI Agentic Exploits & Incidents Tracker](https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/initiatives/agent_security_initiative/ASI%20Agentic%20Exploits%20%26%20Incidents/ASI_Agentic_Exploits_Incidents.md)).
- Every advisory row above is a signal in `product/src/advisory.js` with tests in
  `product/test/advisory.test.js` (394 tests total).

## Status

Documentation-grade mapping maintained by the RugSnare project. OWASP names and
lists referenced here belong to their respective OWASP projects; this document
claims no OWASP endorsement. Upstream contributions planned: AITG "Suggested
Tools" references, ASI incidents, and the contract-drift test proposal above.
