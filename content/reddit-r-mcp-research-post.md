# r/mcp RESEARCH post (publish NOW, before launch — softer than the launch post)

> Posting rules: from the owner's account, one subreddit at a time (start r/mcp; if it lands well, r/ChatGPTCoding or r/LLMDevs a few days later — never same day). Stay in comments the first hour. Pick the "Discussion" flair. Disclosure up front (rule 3) and a plain, human tone (rule 2 — the sub is explicitly allergic to AI-slop about "MCP security", so: no sensationalism, real artifacts only, and comments should be written by the human, short and natural).

## Title

`How does your team decide an MCP server is safe to connect? (collecting practices — 7 questions, findings public)`

## Body

Genuine research question. Full disclosure up front: we are building a tool in this space (open-source, working prototype exists — linked at the end), but this thread is research first, not a launch.

We keep hearing versions of the same shrug: install-time scanners exist (snyk agent-scan etc.), but the problems we personally keep running into happen **after approval** — a maintainer update or a compromised registry changes a tool description, and the agent starts following instructions nobody read. OWASP codified the class (tool poisoning, MCP03:2025). Mid-session it's worse: the already-connected agent just picks up the new text.

We're collecting how real teams handle this. **7 short questions, written answers, findings published openly in the thread:**

1. How many third-party MCP servers does your team run, roughly?
2. Have you ever read the text of a tool *description* after installing? (yes / no / what is that)
3. Did an agent ever do something unexpected after a server update? What happened?
4. Who on your team is responsible for the security of what agents connect to? (name / role / **nobody**)
5. How do you decide a server is safe to connect? (gut / checklist / scanner / other)
6. If a free OSS tool pinned tool descriptions at approval and alerted on any change — would you run it this week? What would stop you?
7. Gut check: independent maintainer, crypto-only payments, fully open code with on-chain verifiable releases — problem / meh / fine?

Thread with all answers so far: https://github.com/Paraphern/rugsnare/discussions/1

For transparency, the prototype we mentioned: a small CLI that hash-pins `{name, description, inputSchema}` of every tool at approval and fails CI on drift, plus a public attack corpus (a benign MCP server and its quietly modified twin). It's in the same repo as the thread. Question first, tool second — the answers decide what we build next.

If your answer to #4 is "nobody" — you're in very good company, and that's exactly the data point we're after.
