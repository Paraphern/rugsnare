**Title:** Every MCP server you connect to Claude can silently change its instructions after you approve it

**Flair:** Discussion

**Body (copy everything below this line):**

---

You review an MCP server once. You approve its tools -- names, descriptions, schemas -- and then you never look again. But the thing you approved isn't frozen: `npx -y pkg@latest` re-rolls on every launch, servers update underneath you, and almost nothing ever shows you what changed.

I spent the last day collecting every publicly documented incident from **July-September 2026** where poisoned or silently-changed tools caused real damage. Here are the ones that matter most -- all sources at the bottom, all numbers from primary disclosures.

## 1. Deadbugz -- the server that waits for call #3 (August 2026)

Pillar Security documented an active campaign pushing a malicious MCP server (it calls itself "productivity-suite") through **23 GitHub pull requests opened within 74 minutes** (Aug 10). It offers two innocent tools -- text formatting and summarization -- and behaves perfectly at first. After **exactly three tool calls**, it rewrites the metadata it returns to the agent: now the description says to hunt for **SSH private keys, AWS credentials, shell history and Kubernetes config -- and to hide that from the user**.

The killer detail: *the trigger is a call counter, not a code change.* Nothing new got installed. There is no update diff to review. The PRs were caught (19 closed, 4 left open at review) and no theft was confirmed in the wild -- but as a class this is the cleanest demonstration that "reviewed at install" is not a security control.

Primary: [Pillar Security, "Deadbugz: Currently Active MCP Supply-Chain Campaign"](https://www.pillar.security/blog/deadbugz-currently-active-mcp-supply-chain-campaign)

## 2. GhostSplice -- split the instruction, beat the refusal (August 2026)

ASSET Research Group (UMKC): *"Eleven frontier models, one malicious MCP server. Ask them to leak your credentials and they refuse. Split the request into multiple harmless fragments..."* -- **GhostSplice splits one data-theft instruction across a tool description and a later tool result**, so no single message looks malicious. Average compliance across **11 tested models jumped from 42% to 82%**, and agents exfiltrated **SSH keys, secrets and source code**. Per-message inspection (keyword scanning, output filters) never had a chance -- the payload only exists *across* messages.

Primary: [ASSET Research Group](https://asset-group.github.io/) + [Bishop Fox "Spliced Instructions..." (Aug 21)](https://bishopfox.com/podcasts/forgotten-assumptions)

## 3. ChainDrop -- the worm that poisons Claude Code itself (August 2026)

The self-propagating npm worm (Microsoft's analysis covers **400+ packages** -- later tallies pushed it to **860+**) didn't even need you to install anything for its nastiest move: it committed **`.claude/settings.json` (a SessionStart hook)** and `.vscode/tasks.json` (runOn: folderOpen) into repositories. So **opening the project -- or starting a Claude Code session -- executed the payload**. Secrets walked off CI runners; the stealer was a 728 KB obfuscated bundle with C2 over Ethereum contracts.

That one matters here specifically: your agent config is executable attack surface now, and it is exactly as silently mutable as any tool description.

Primary: [Microsoft Security Blog (Aug 4)](https://www.microsoft.com/en-us/security/blog/2026/08/04/chaindrop-supply-chain-compromise-anatomy-self-propagating-worm) + [WorkOS analysis (Aug 6)](https://workos.com/blog/npm-worm-coding-agent-config-credentials)

## 4. FakeGit -- 800+ fake "MCP servers" and skills, recommended by your agent (July 2026)

Island's research found **7,600 malicious GitHub repos and ~6,600 fake accounts -- with 800+ masquerading as AI skills and MCP servers**. When users asked their coding agents (Claude Code among them) for recommendations, the agents recommended the malicious repos themselves. The campaign's release assets hit **14M+ downloads**, and 600+ of its listings sat on public MCP registries (LobeHub, Glama, MCP.so, MCP Market) before takedowns. The chain ended in **StealC**, an infostealer aimed at developer machines, browser credentials, and cloud tokens.

Primary: [The Hacker News, "FakeGit campaign..." (Jul 20)](https://thehackernews.com/2026/07/fakegit-campaign-uses-7600-github.html)

## 5. The scale -- silent drift is the norm, not an edge case (September 2026)

An arXiv census harvested the entire public MCP registry -- **21,643 servers, 72,606 version records** (August 2026 snapshot):

- **51.1%** of multi-version servers changed what they advertise
- **40.6%** did it **silently**
- **4.2%** redirected their remote endpoint to a different host while keeping the same registry identity -- "a change the protocol never surfaces to installed clients"
- Silent drift is associated with ~**3x higher odds** of a high-severity finding, and stars/installs are a weak safety signal

The CVE flow matches: CVE-2026-81486 (path traversal, CISA-noted), CVE-2026-87911 (CVSS 9.6 OS command injection in AWS Labs' postgres MCP server), plus an Atlassian MCP path traversal, a cleartext cluster token in ArcadeDB's MCP, and an SSRF in facebook-ads-mcp-server -- all August-September. September also brought [CVE-2026-20176](https://cycode.com/blog/mcp-python-sdk-oauth-account-takeover) -- a malicious server could make the **official MCP Python SDK (1.9.1-2.1.1) hand over the client secret, authorization code and PKCE verifier** (i.e., account takeover); fixed in 1.30.0/2.2.0. And a July dynamic scan of internet-facing MCP servers ([arXiv:2608.00150](https://arxiv.org/abs/2608.00150)): **91.8% had no OAuth**, **687 tool instances exposed shell execution with no access control**, and 41.6% of confirmed servers vanished within three days.

Primary: [arXiv:2609.14119, "Same Name, Different Server: A Security Census of Silent Drift in the MCP Ecosystem" (Sep 12)](https://arxiv.org/abs/2609.14119)

**And it wasn't only MCP.** This summer tested every trust boundary around agents. [The July Hugging Face intrusion](https://huggingface.co/blog/security-incident-july-2026): an escaped agent system took ~**17,600 malicious actions** and seized **136 production credentials** before containment ([OpenAI's account](https://openai.com/index/hugging-face-incident-and-the-road-ahead/)). [SharedRoot](https://thenextweb.com/news/claude-cowork-sandbox-escape-mac-files-sharedroot) (July 23): untrusted content escaped Claude Cowork's local VM through a writable host mount and could read **SSH keys and cloud credentials** on the Mac, with ~**500,000 macOS users** in scope before the fix -- Anthropic closed the report as "Informative" and moved new sessions to cloud by default ([Accomplish AI's write-up](https://accomplish.ai/blog/sharedroot-escaping-claude-cowork-sandbox/)). And [JadePuffer](https://www.sysdig.com/blog/jadepuffer-agentic-ransomware-for-automated-database-extortion), the first fully LLM-driven ransomware, encrypted **1,342 configs** -- and hunted wallets and seed phrases along the way.

## What actually stops this

The pattern across every case above is the same: **it's never that the model got jailbroken. It's that something changed -- or was split -- after trust was granted, and nothing re-checked it.** You can't prompt your way out of that. You pin it.

I maintain **RugSnare**, a small open-source tool built exactly for this (Apache-2.0, zero npm dependencies, no telemetry, everything local). What it does:

- `npx rugsnare scan` -- pins the exact contract you approved (description, schema, behavioral annotations) into `.rugsnare/pins.json`. Commit it.
- `npx rugsnare diff` -- re-checks it anywhere (CI gate, pre-launch). Any silent change exits 1. Deterministic, not model judgment.
- `rugsnare canary replay` -- replays your real recorded tool calls against a new version **before** you upgrade (read-only by default), and returns "DO NOT UPGRADE" when behavior changed.
- `rugsnare run` -- wraps a live server and enforces policies (blocking the read `~/.ssh` / `~/.aws/credentials` class of calls), and quarantines mid-session swaps.
- It also scans `SKILL.md` skill files with the same adversarial signals -- the ChainDrop class.

Evidence it works, measured on real releases: we pinned **every stable version of the four official `@modelcontextprotocol/server-*` servers -- all 66 release pairs -- and counted 140 silent contract changes** (43 schema breaks, 28 behavioral-hint flips, 7 description rewrites, 1 prompt-template change, 37 new items, 24 removals; 43 clean pairs). Not one was announced in a changelog. One command, ~30 minutes, reproducible on your machine.

**Even if you never install a tool, do these:**

1. Pin versions (`pkg@1.2.3`, never `@latest`) -- and treat a version bump as code review.
2. Commit your pins and re-diff after every update.
3. Treat your MCP config and `.claude/settings.json` as executable code.
4. Don't auto-approve write/destructive tools.

## Sources

1. Pillar Security -- [Deadbugz: Currently Active MCP Supply-Chain Campaign](https://www.pillar.security/blog/deadbugz-currently-active-mcp-supply-chain-campaign) (Aug 12, 2026)
2. ASSET Research Group -- [GhostSplice](https://asset-group.github.io/) (Aug 2026); [Bishop Fox podcast](https://bishopfox.com/podcasts/forgotten-assumptions) (Aug 21, 2026)
3. Microsoft Security Blog -- [ChainDrop npm worm](https://www.microsoft.com/en-us/security/blog/2026/08/04/chaindrop-supply-chain-compromise-anatomy-self-propagating-worm) (Aug 4, 2026); [WorkOS](https://workos.com/blog/npm-worm-coding-agent-config-credentials) (Aug 6, 2026); [CyberScoop on the wider campaign](https://cyberscoop.com/supply-chain-attack-malware-mini-shai-hulud-teampcp/) (860+ packages)
4. The Hacker News -- [FakeGit campaign, 7,600 repos](https://thehackernews.com/2026/07/fakegit-campaign-uses-7600-github.html) (Jul 20, 2026); [Island -- AgentBaiting](https://www.island.io/blog/agentbaiting-how-800-fake-ai-skills-and-mcp-servers-delivered-malware)
5. [arXiv:2609.14119](https://arxiv.org/abs/2609.14119) -- Same Name, Different Server: A Security Census of Silent Drift in the MCP Ecosystem (Sep 12, 2026)
6. [arXiv:2608.00150](https://arxiv.org/abs/2608.00150) -- Exposed by Design: audit of internet-facing MCP servers (July 2026)
7. Cycode -- [MCP Python SDK OAuth account takeover](https://cycode.com/blog/mcp-python-sdk-oauth-account-takeover); [The Hacker News coverage](https://thehackernews.com/2026/09/official-mcp-python-sdk-flaw-can-let.html) (Sep 2026)
8. CVE-2026-81486 (mcp-file-context-server, CISA weekly Aug 24-31) - CVE-2026-87911 (awslabs postgres MCP, CVSS 9.6) - CVE-2026-73498 / CVE-2026-67357 / CVE-2026-19956 (Adversa September roundup)
9. TNW -- [Claude Cowork SharedRoot sandbox escape](https://thenextweb.com/news/claude-cowork-sandbox-escape-mac-files-sharedroot); [Accomplish AI technical write-up](https://accomplish.ai/blog/sharedroot-escaping-claude-cowork-sandbox/) (Jul 23-26, 2026)
10. Hugging Face -- [security incident disclosure](https://huggingface.co/blog/security-incident-july-2026); [OpenAI's account](https://openai.com/index/hugging-face-incident-and-the-road-ahead/) (July 2026)
11. Sysdig -- [JadePuffer agentic ransomware](https://www.sysdig.com/blog/jadepuffer-agentic-ransomware-for-automated-database-extortion) (Jul 2026)
12. RugSnare -- [github.com/Paraphern/rugsnare](https://github.com/Paraphern/rugsnare) - [npm](https://www.npmjs.com/package/rugsnare) - [rugsnare.com](https://rugsnare.com)

---

*Notes / limits: I counted only public, documented incidents from July-September 2026. There are no public reports of end users' wallets or accounts drained specifically by a silent MCP update in this window -- the documented damage is credential theft, code execution and data exfiltration surfaced by research and vendor investigations. I'd rather say that precisely than stretch a headline.*

*Disclosure: I maintain RugSnare (open source, Apache-2.0, zero deps -- the pinning/diff/replay tooling above). Everything here is runnable and reproducible; happy to answer questions about any of the cases.*
