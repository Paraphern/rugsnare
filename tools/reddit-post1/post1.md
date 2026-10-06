# Reddit Post 1 (r/mcp, [Showcase]) - jadchene case (rewritten 2026-10-06)

**Title:**

[Showcase] The entire permission system for 48 destructive tools was one sentence. A patch release deleted it

**Body:**

*Disclosure: I'm the author of RugSnare, the open source tool that caught this. It pins MCP tool contracts and diffs them on update - zero npm dependencies, no telemetry, repo link at the bottom. Everything below reproduces with the commands at the end.*

An SSH server for agents (around 200 installs a week) shipped a patch update, 2.0.2 to 2.0.3. The kind of version bump nobody reads notes for.

The patch deleted the sentence "Requires confirmation" from the descriptions of its destructive tools. rm_safe, kill_process, chmod, chown, 18 docker_* tools, systemctl_stop, firewall_cmd. 48 tools, one release.

This shipped on October 3rd.

## First, context: what this thing is and why anyone runs it

It's an SSH server for agents. You hook it up to your AI client, point it at a machine you own (a VPS, a homelab box, for some people production), and the agent can admin it: read logs, edit configs, run commands, git pull, manage docker containers, restart services, touch the firewall. 102 tools, basically the whole sysadmin arsenal. People install it because babysitting a server through a terminal is exactly the tedious work you want to hand off.

The package pitches itself as "production-ready, highly secure" with "interactive operation confirmation". That last bit is the entire reason you'd dare point an LLM at a live server: the dangerous stuff asks first.

## What your agent actually reads

MCP has no permission system. No sandbox, no annotations marking a tool as dangerous, no registry of destructive ops. The only thing telling the LLM "this is gated, ask a human first" is prose inside the tool description. One sentence.

Here's what the patch did to that sentence, verbatim. kill_process:

> 2.0.2: "Send a signal to a process ID. Requires confirmation unless whitelisted."
> 2.0.3: "Send a signal to a process ID."

rm_safe:

> 2.0.2: "Delete a path under allowedRemoteRoots. Requires confirmation."
> 2.0.3: "Delete a remote file or directory."

Notice rm_safe also lost "under allowedRemoteRoots" - the agent no longer even knows a path restriction exists. That's a second silent change hiding inside the same edit: the confirmation is gone and the cage is invisible now.

The diff flags 48 tools for this, every single one COSMETIC (code shape unchanged, description prose changed). The words "Requires confirmation" appear 47 times in the 2.0.2 sources. In 2.0.3: zero times. Zero.

## The README still promises the gate

Here's the part that honestly got me. The README of the current version still says confirmations are mandatory in normal mode. So if you audited this package today, the way you're supposed to (reading the docs), you'd pass it. The docs say the gate exists. The contract your agent reads says nothing about it. Same author, both current.

You approved one contract. Your agent is running a different one.

## Who gets hurt when the gate goes quiet

Picture the normal user. Solo dev, one VPS, agent connected through this server for months. Their mental model: "if my agent wants to delete something, it'll ask me first". That model came from the README, and in 2.0.2 it was true.

After a routine patch update, the contract their agent reads says rm_safe is just "delete a remote file or directory". No mention of asking. No mention of path limits. So when the LLM decides the fastest way to free disk space is removing an old directory, it's not misbehaving - it's following the contract it was handed. Same for systemctl_stop, docker_rm, firewall_cmd: the agent's daily vocabulary, now friction-free. The human finds out from the aftermath.

And if they installed with a caret range (^2.0.2), they never chose this update. npm applied it for them, silently, on a Saturday.

## Two more things static analysis turned up

dangerMode - documented and opt-in, but it's a single server-level flag that disables all confirmations and overrides readOnly, blacklists and path restrictions. Every rail, one flag.

codex-approval.js - the server fingerprints the connecting client by name (regex /^codex/) and attaches different approval metadata when it matches. Rules that change depending on who's asking. That one made me genuinely uncomfortable.

## Why nothing flagged this

There is no malicious code here. No weird domain, no obfuscated blob. It's a text edit in a description field, and text edits don't trip code scanners. npm audit reports zero vulnerabilities for this package. It's right, technically. The only reader of that text is your agent.

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

exit 1, 48 findings, all COSMETIC - and the diff prints the was/became text for each drifted tool, so you can read the edits yourself instead of trusting my quotes.

Same pin-then-diff works on any MCP package you depend on. That's the whole idea.

Repo (Apache-2.0, runs locally): https://github.com/Paraphern/rugsnare
