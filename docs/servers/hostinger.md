# hostinger-api-mcp (Hostinger)

npm 264,539 installs/week - window 2.4.0 -> 2.11.0.

**Registry identity:** `io.github.hostinger/hostinger-api-mcp` exists in the official MCP Registry, but its version line (0.1.x through 1.x) is **disjoint** from the npm package (2.x). These are two separate artifacts under one name - see [registry-mapping](../../audits/drift-watch/registry-mapping.json).

**Findings: 6 injected agent-skill resources.** Between 2.4.0 and 2.11.0 six SKILL.md resources appeared, none mentioned in docs or changelog:

- audit-hosting/SKILL.md
- connect-domain/SKILL.md
- deploy-to-hosting/SKILL.md
- maintain-wordpress/SKILL.md
- migrate-to-hosting/SKILL.md
- troubleshoot-website/SKILL.md

These are model-facing instructions delivered as MCP resources: a client whose user approved the 2.4.0 surface now serves new instruction content to the agent without any approval step. Context: the default binary loads all 396 tools ([issue #71](https://github.com/hostinger/api-mcp-server/issues/71)), and a community request for a public record of tool definitions exists ([issue #67](https://github.com/hostinger/api-mcp-server/issues/67)).

Note: current rugsnare pins resources by envelope (uri/name/description); content hashing of `resources/read` payloads is on the roadmap (tracked in the improvements file).

**Repro**

```bash
npm i hostinger-api-mcp@2.4.0 && npx rugsnare scan --config mcp.json
npm i hostinger-api-mcp@2.11.0 && npx rugsnare diff --config mcp.json   # 6 NEW resources, exit 1
# config env: HOSTINGER_API_KEY=dummy
```

Watched weekly (baseline 2.4.0). Last verified 2026-10-12 (2.4.0/2.11.0/2.13.0 rescanned: six SKILL.md confirmed in-window and persistent through 2.13.0; tools clean).


## 2026-10-24 window

2.4.0 -> 3.8.1: 40 findings (graded, rugsnare 1.4.3; pins at audits/drift-watch/pins/hostinger@3.8.1.json). Cumulative corpus total: 351 across the 22 servers. See audits/drift-watch/2026-10-24.md.
