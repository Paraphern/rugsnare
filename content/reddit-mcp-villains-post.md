# [Showcase] I built a hash-pinning tool for MCP contracts. Ran it across 186 npm packages. 12 failed.

**Full disclosure up front: I built RugSnare, the tool I'm talking about. It's open source (Apache-2.0), zero npm dependencies. I'm not selling anything — this post is about what the tool found when I pointed it at the ecosystem.**

I've been quietly building this for a few weeks. The idea is simple: when you install an MCP server, you hash-pin every tool's `{name, description, inputSchema}`. Then when the package updates, you re-check. If anything changed — description reworded, schema broke, new tool appeared — you get an exit 1 and the change goes through review instead of silently deploying.

The backstory: a while back I noticed that the official `@modelcontextprotocol/server-filesystem` changed the contract of all 14 tools between two releases. Nobody announced it, nobody noticed. That's when I realized tool descriptions are the *only* thing telling your agent "this is destructive, ask the human first" — and nothing was pinning them.

So last weekend I pointed the tool at 186 MCP packages on npm. Downloaded the two most recent versions of each, pinned the old one, diffed against the new one.

**12 packages produced exit 1.** Here are the ones that stood out:

The one that got my attention was `@jadchene/mcp-ssh-service` (SSH automation for agents). On October 3rd they shipped v2.0.3 — a patch release — and in it, the phrase "Requires confirmation" disappeared from the description of every destructive tool. All 48 of them.

The old description for `rm_safe` said: *"Delete a path under allowedRemoteRoots. Requires confirmation."*
The new one says: *"Delete a remote file or directory."*

Same for `kill_process`, `execute_command`, `chmod`, `chown`, `docker_rm`, `systemctl_stop`, `firewall_cmd`... you get the idea.

Now, the elicitation mechanism is technically still in the code. But here's the thing — your LLM agent reads the tool description to decide whether to trigger the confirmation flow. If the description doesn't say "requires confirmation," the agent doesn't ask. The guardrail was a text string, and a patch update erased it.

They also added a `dangerMode` flag that overrides all confirmations and path restrictions, and a module that auto-approves when the client identifies itself as Codex. I'm not going to speculate about intent — could be a legitimate feature request — but the contract silently changed in a semver patch, and that's exactly what the tool is designed to catch.

Some other catches from the same scan:

`lightning-wallet-mcp` quietly added 5 prediction market tools (sports betting, BTC price) to an agent wallet in a minor release. If you approved v1.7.0 as "a Lightning wallet," v1.8.0 turned it into a gambling interface.

`47620-solana-mcp` added 21 pay-per-call tools ($0.02 USDC each via x402) without any version bump that would signal new spending.

And the control group: `@modelcontextprotocol/server-puppeteer` — the *official* Puppeteer reference server from Anthropic, 36K downloads/week — silently changed a tool's input schema between releases. Not malicious, just... nobody was watching.

The full report with reproduction commands for all 12 is in the repo: https://github.com/Paraphern/rugsnare

If you want to try it on your own MCP setup:

```
npx rugsnare scan
npx rugsnare diff
```

That's it. Scan pins the contracts, diff checks them. Exit 1 means something changed. Put diff in CI and nothing updates silently again.

Happy to answer questions about the approach, the hash-pinning mechanics, or any of the findings.

---

**Edit:** Since people are asking — yes, I notified the maintainers of the packages I found issues with. The @jadchene one was the only one where the change looked potentially intentional rather than just sloppy versioning.
