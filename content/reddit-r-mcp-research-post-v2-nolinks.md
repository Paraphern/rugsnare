# r/mcp research post — v2, LINK-FREE (post on day 3-4 after account warm-up)

> Why this version: the first post was auto-removed by Reddit filters — most likely trigger: brand-new account + external links. This v2 has ZERO links. Flair: Discussion. The link to the GitHub thread goes into a COMMENT only after the post survives and gets a reply or two (comments are filtered much softer). Do NOT repost v2 immediately after the removal — wait until the account has 2-3 days of age, some upvotes and a few normal comments.

## Title

`How does your team decide an MCP server is safe to connect? (collecting practices — 7 questions)`

## Body

Genuine research question. Full disclosure up front: we are building an open-source tool in this space (working prototype exists), but this thread is research first, not a launch — no links, just your practices.

We keep hearing versions of the same shrug: install-time scanners exist, but the problems we personally keep running into happen **after approval** — a maintainer update or a compromised registry changes a tool description, and the agent starts following instructions nobody read. OWASP codified the class as tool poisoning (MCP03:2025). Mid-session it's worse: the already-connected agent just picks up the new text.

How do real teams handle this? 7 short questions, written answers, and I'll post the aggregated findings back into this thread:

1. How many third-party MCP servers does your team run, roughly?
2. Have you ever read the text of a tool *description* after installing? (yes / no / what is that)
3. Did an agent ever do something unexpected after a server update? What happened?
4. Who on your team is responsible for the security of what agents connect to? (name / role / nobody)
5. How do you decide a server is safe to connect? (gut / checklist / scanner / other)
6. If a free OSS tool pinned tool descriptions at approval and alerted on any change — would you run it this week? What would stop you?
7. Gut check: independent maintainer, crypto-only payments, fully open code — problem / meh / fine?

If your answer to #4 is "nobody" — you're in very good company, and that's exactly the data point we're after.

---

## Comment to add AFTER the post survives (when someone asks "where do answers go?" or after ~1 hour):

> Collecting everything in a GitHub discussion thread on our repo (rugsnare on GitHub, discussion #1) — will summarize the findings there and back here. 

(Write this comment in your own words, short — natural phrasing passes filters better than polished text.)
