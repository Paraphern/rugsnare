# We asked an LLM to find our competitors. Half of them didn't exist.

*Draft for dev.to / Medium, publish in launch week. Tone: light, factual, zero DeepSeek-bashing — the punchline is about supply chains, not about any one model. All claims below were verified with GitHub API + npm + web search on 2026-09-29; links included.*

---

Every startup does competitor research. We were feeling modern about it, so we asked a large language model: *"find analogs for our MCP security tool."* It came back confident and specific — a tidy adoption strategy, tool names, what each one covers:

- **mcp-fence** — "runtime proxy, rug pull and tool poisoning detection"
- **mcpm guard** — part of the MCPM package manager
- **mcpshark** — "mid-session change monitoring"
- **Trustline** — "config rollback and recovery"
- plus an "OWASP Gating pattern" reference

Then we did the unfashionable thing and checked. One at a time, with the GitHub API, npm, and web search.

**The scoreboard:**

| Claimed tool | Reality |
|---|---|
| mcp-fence | Exists — twice, actually. Two unrelated solo projects share the name: one at **1 star**, one at 37. Both are real humans building the same idea in their spare time (which told us the niche itches a lot of people). Neither is a product. |
| mcpm guard | MCPM exists (a genuinely good, 1000-star package manager for MCP servers). The **"guard" subcommand does not exist** — not in the repo, not in the docs. Confabulated. |
| mcpshark | Exists — a small YARA-based scanner with a nice website. Real, niche, not what we built. |
| Trustline | **Does not exist.** Full hallucination. The closest search hits were an Unisys mainframe product (a different MCP entirely — *Mainframe Communication Program*) and a DigiCert certificate manager. |
| OWASP Gating pattern | Not a tool — a design pattern. Which was the funny part: the pattern it named (TOFU pinning — trust on first use) is *literally the mechanism our tool implements*. The LLM recommended, as "architecture guidance", the thing it couldn't find on the market. |

Two out of five tools: fabricated. A third: half-fabricated. And the strategy memo wrapped them into a confident deployment plan with a layer table.

## So LLMs are dumb? No — and that's the interesting part

None of this means the model is useless. Its *structural* analysis was decent: the layering (runtime proxy / monitoring / recovery / policy) is a reasonable map of the category. It failed precisely where LLMs always fail — on **specific proper nouns that sound plausible**. "Trustline" feels like a real product the way a dream feels like a memory. Confabulated entities are fluent, specific, correctly hyphenated, and subtly wrong in exactly one dimension: existence.

If you're doing market research with an LLM, the fix is boring and effective: **every named entity gets a verification pass before it enters your strategy.** A five-minute loop of "does this exist, at what URL, how many stars, when was the last commit" would have caught both phantoms.

## The part that actually matters (to us, at least)

Here's why we're telling this story instead of quietly deleting the chat log.

An agent that "knows" a package exists will act on that knowledge. `npm install trustline-mcp` on a name that *sounds right* is not a hypothetical — attackers already register package names that LLMs are prone to hallucinating (**slopsquatting**). A coding agent asked to "set up monitoring" is one confident hallucination away from installing an attacker's package whose name the model basically invented for them. Hallucinated entities are not just an embarrassment in a research memo — they're **an attack surface with a social-engineering layer built in**: the request comes from your own agent, referencing a name your own model "remembers."

That's the same root problem our tool exists for in MCP tool descriptions: **agents act on descriptions; nobody verifies them.** Our answer is boring and effective, same as the research fix: pin what you approved (a hash), verify what arrives (against the pin), and fail loudly when they disagree. Names, vibes, and fluent explanations don't survive contact with a sha256 mismatch.

The corpus in our repo includes a benign MCP server and its "updated" twin — the descriptions differ by a paragraph your agent will obey and your eyes will skim. Try spotting it before running the diff.

---

*Everything above was verifiable and verified. The two real small projects we found (both named mcp-fence!) are by solo devs working on the same itch — if you're one of them, hi, genuinely: the more integrity pins in this ecosystem, the better.*
