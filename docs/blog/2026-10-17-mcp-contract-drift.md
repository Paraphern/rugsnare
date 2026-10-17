# Your AI agent follows instructions you never approved

We pinned the tool contracts of 24 popular MCP servers and diffed every release for two months. Here is what changed without anyone announcing it.

## The setup

MCP servers expose tools to AI agents. Each tool has a name, a description (the instructions the model reads to decide how to call it), and an input schema (the contract for what arguments are valid). When you install an MCP server, you approve a specific set of tool contracts.

Then the server publishes a new version. Maybe a patch. Maybe a minor. The tool names stay the same, so nothing breaks visibly. But the description might now say something different. The schema might require a new parameter, or drop a constraint, or add an optional field that widens the attack surface. Your agent is now following instructions you never saw and never approved.

Nobody tells you this happened.

## What we measured

We built a CLI tool called [rugsnare](https://github.com/Paraphern/rugsnare) that pins each tool's `{name, description, inputSchema}` by canonicalized sha-256 at install time, then diffs the pins on every upgrade. It grades each change by direction: BREAKING (constraints tightened, types narrowed, params made required), LOOSENED (constraints dropped, types widened), EXPANDED (new optional params), NOTATION (serialization churn that does not change what the schema says), COSMETIC (description text changed). It exits 1 on any drift, so it works as a CI gate.

We ran it across 24 servers on npm: the most-installed MCP servers plus a set of enterprise vendors (MongoDB, SAP, Shopify, HubSpot, Supabase, Netlify, and others). Combined install base: about 3.6 million installs per week.

The corpus, per-version pins, and dated reports are public: [audits/drift-watch](https://github.com/Paraphern/rugsnare/tree/main/audits/drift-watch).

## The numbers

**336 contract changes across 24 servers** in windows ranging from a few weeks to six months.

- **MongoDB** 3.0.0 regenerated all 20 tool schemas at once: a dialect migration ($schema draft-07 to 2020-12), description rewrites, and 5 real constraint tightenings hiding inside 15 notation-level changes. The GitHub release notes were empty.
- **Currents** changed 45 input schemas between 2.3.3 and 2.7.0. 32 of them were constraint tightenings (new bounds, narrowed types). When we reported this, the maintainer responded: "These weren't so much new tightenings, as providing the validation in an additional spot. The backend already enforced these." Which is fair, and also exactly the gap: the schema now rejects calls that previously succeeded at the schema level, and no release note mentions it.
- **Shopify** removed two validators (`validate_component_codeblocks`, `validate_graphql_codeblocks`) and replaced them with a single generic `validate`. Agents calling the removed tool names by string get a protocol error.
- **HubSpot** removed `create-association`, added `batch-create-associations` and two workflow tools. The npm package ships releases; the linked GitHub repository is dead. There is no channel where these changes are announced.
- **Supabase** moved its stdio entry point from `dist/transports/stdio.js` to `dist/cli.js`. Tool contracts intact, but every pinned launch config breaks.
- **Bybit** runs a remote manifest gate: if the installed version does not match the manifest's version, the server exits at boot. We confirmed this with their ops team, who acknowledged: "We understand that this prevents users from remaining on a version they have tested and approved." They also confirmed that if the manifest service is unreachable, both version enforcement and integrity verification are skipped.
- **GitHub's official MCP server** changed 124 of 131 tool definitions in v2.0.0. The maintainer described it as "broadly a noop beyond output schemas," which is accurate from their perspective and still 124 changed contracts from a consumer's perspective.

## The pattern

Three patterns repeat:

**1. The notation wave.** A vendor migrates SDKs or regenerates schemas, and every tool's schema bytes change at once. Without canonicalization and direction grading, this reads as "everything broke." With it, you see the 4 real tightenings inside the 16 notation changes. Chrome DevTools dropped 27 false breaking findings after we added canonicalization; MongoDB's count moved from 4+16 to 5+15 when our grader learned to decompose nested constraints.

**2. The consolidation break.** A vendor removes specific tools and replaces them with a generic one (Shopify, HubSpot). The agent calling the old tool name gets a protocol error. No announcement channel covers this.

**3. The silent loosening.** A constraint is dropped or a type is widened. Nothing breaks; the schema just accepts more. Your agent now has a wider surface than what you approved.

## What the ecosystem is doing about it

The OWASP MCP Security Cheat Sheet now recommends pinning tool contracts (we contributed the grading guidance). An RFC for pin-at-approval in MCP incorporated our drift data and canonicalization requirements. Atlassian's forge-skills just merged sha-256 checksum verification for downloaded binaries, triggered by a Snyk scan. The direction is clear: the ecosystem wants pinning.

But the gap between "vendors should announce changes" and "consumers can detect changes" is where drift lives. Our answer is the second half: pin what you approved, diff what arrives, grade what changed.

## Try it

```bash
npx rugsnare@1.4.3 scan --config mcp.json    # pin the contracts you approved
npm install some-mcp-server@latest            # upgrade
npx rugsnare@1.4.3 diff --config mcp.json     # see what changed, exit 1 on drift
```

Apache-2.0, zero npm dependencies, no telemetry. The drift corpus and per-version pins are in the repo. If you run MCP servers in production, we would love to add them to the corpus.

---

*RugSnare is on [GitHub](https://github.com/Paraphern/rugsnare) and [npm](https://www.npmjs.com/package/rugsnare). The [PIN-SPEC](https://github.com/Paraphern/rugsnare/blob/main/docs/PIN-SPEC.md) defines the pin format as an open interchange standard. This post links to every vendor thread we opened while collecting this data.*
