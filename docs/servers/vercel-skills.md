# vercel-labs/skills (Vercel) - skills drift record

**Skills corpus record** (not an npm MCP server). Repository: [vercel-labs/skills](https://github.com/vercel-labs/skills) - the tooling behind the skills.sh registry for [Agent Skills](https://agentskills.io).

**Baseline captured 2026-10-12** at HEAD `13e4063`: **226 skill files pinned** across all recognized skill locations.

Layout discovered:

- `skills/find-skills/` - the one canonical skill (SKILL.md only)
- `.factory/workflows/triage/skills/triage` and `.factory/workflows/pr-labeling/skills/pr-labeling` - **workflow-embedded skills** inside the Factory agent config tree; a distinct location class the scanner walks (R25/R27)

The 226 pinned files = skill trees across all locations plus their supporting files. This is a pure watch record: no drift yet, first diff lands on the next push to `main`. Related: we are in their skills.sh discussion (#2359) on registry integrity for skills.

**Repro:**

```bash
git clone --depth 1 https://github.com/vercel-labs/skills.git vs && cd vs
npx rugsnare@1.3.0 skills scan    # pins the skill tree (226 files at 13e4063)
# later: git pull && npx rugsnare@1.3.0 skills diff
```

Baseline captured 2026-10-12 (rugsnare 1.3.0). Part of the [drift watch](../../audits/drift-watch/2026-10-12.md).
