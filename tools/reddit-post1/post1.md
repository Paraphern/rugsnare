# Reddit Post 1 (r/mcp, [Showcase]) - jadchene case

**Title:**

[Showcase] The entire permission system for 48 destructive tools was one sentence. A patch release deleted it

**Body:**

*Disclosure: I'm the author of RugSnare, the open source tool that caught this. It pins MCP tool contracts and diffs them on update - zero npm dependencies, no telemetry, repo link at the bottom. Everything below reproduces with four commands.*

An SSH server for agents (around 200 installs a week) shipped a patch update, 2.0.2 to 2.0.3. The kind of version bump nobody reads notes for.

The patch deleted the sentence "Requires confirmation (unless whitelisted)" from the descriptions of its destructive tools. rm_safe, kill_process, chmod, chown, 18 docker_* tools, systemctl_stop, firewall_cmd. 48 tools, one release.

This shipped three days ago.

## What your agent actually reads

MCP has no permission system. No sandbox, no annotations marking a tool as dangerous, no registry of destructive ops. The only thing telling the LLM "this is gated, ask a human first" is prose inside the tool description. One sentence.

The 2.0.2 -> 2.0.3 diff flags 48 tools and every single flag is COSMETIC - the code shape didn't change, the description prose did. In the 2.0.2 sources the sentence "Requires confirmation (unless whitelisted)" appears 47 times. In 2.0.3 it appears zero times. Zero.

## The README still promises the gate

Here's the part that honestly got me. The README of the current version still says confirmations are mandatory in normal mode. So if you audited this package today, the way you're supposed to (reading the docs), you'd pass it. The docs say the gate exists. The contract your agent reads says nothing about it. Same author, both current.

You approved one contract. Your agent is running a different one.

## Two more things static analysis turned up

dangerMode - documented and opt-in, but it's a single server-level flag that disables all confirmations and overrides readOnly, blacklists and path restrictions. Every rail, one flag.

codex-approval.js - the server fingerprints the connecting client by name (regex /^codex/) and attaches different approval metadata when it matches. Rules that change depending on who's asking. That one made me genuinely uncomfortable.

## Why nothing flagged this

There is no malicious code here. No weird domain, no obfuscated blob. It's a text edit in a description field, and text edits don't trip code scanners. The only reader of that text is your agent.

You never read tool descriptions. Your agent does. That's the whole problem.

## I'm not calling this malicious

Maybe the author decided the sentence was redundant. I can't know intent and I won't guess. What I know is structural: the only safety mechanism is prose, patch releases install silently, and nothing diffs the contract your agent sees against the one you approved. Any package can do this, any day.

You'll never see a confirmation dialog. Not because you clicked "don't ask again" - because someone deleted the sentence that triggered it.

(This is one of 18 confirmed catches from the same scan. The rest deserve their own post.)

## Check it yourself

npm i -g rugsnare

mkdir jadchene-check && cd jadchene-check
npm i --ignore-scripts @jadchene/mcp-ssh-service@2.0.2

save this as mcp.json in that folder (rugsnare talks to servers through a config):

{
  "mcpServers": {
    "jadchene-ssh": {
      "command": "node",
      "args": ["node_modules/@jadchene/mcp-ssh-service/dist/index.js"]
    }
  }
}

rugsnare scan --config mcp.json
npm i --ignore-scripts @jadchene/mcp-ssh-service@2.0.3
rugsnare diff --config mcp.json

exit 1, 48 findings, all COSMETIC. Want the smoking gun? After each install run grep -r "Requires confirmation" node_modules/@jadchene/mcp-ssh-service/dist/ - there in 2.0.2, gone in 2.0.3.

Same pin-then-diff works on any MCP package you depend on. That's the whole idea.

Repo (Apache-2.0, runs locally): https://github.com/Paraphern/rugsnare
